import base64
import uuid
import hashlib
import bcrypt
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import tenseal as ts
from jose import JWTError, jwt
from pydantic import BaseModel

import database
import schemas

# --- Configuration ---
SECRET_KEY = "super-secret-key-for-dev-only"  # In prod, read from env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

app = FastAPI(title="CipherSpend Cloud API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ContextUpload(BaseModel):
    contextBase64: str

# Database setup
database.Base.metadata.create_all(bind=database.engine)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Security Utilities ---
def verify_password(plain_password, hashed_password):
    pwd_bytes = plain_password.encode('utf-8')
    sha256_hex = hashlib.sha256(pwd_bytes).hexdigest().encode('utf-8')
    return bcrypt.checkpw(sha256_hex, hashed_password.encode('utf-8'))

def get_password_hash(password):
    pwd_bytes = password.encode('utf-8')
    sha256_hex = hashlib.sha256(pwd_bytes).hexdigest().encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(sha256_hex, salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = db.query(database.UserDB).filter(database.UserDB.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

# --- FHE Utilities ---
ctx = ts.context(ts.SCHEME_TYPE.CKKS, poly_modulus_degree=8192, coeff_mod_bit_sizes=[60, 40, 40, 60])
ctx.global_scale = 2**40

def varint_encode(value: int) -> bytes:
    result = bytearray()
    while True:
        byte = value & 0x7F
        value >>= 7
        if value:
            result.append(byte | 0x80)
        else:
            result.append(byte)
            break
    return bytes(result)

def decode_varint(data: bytes, offset: int = 1):
    length = 0
    shift = 0
    i = offset
    while True:
        b = data[i]
        length |= (b & 0x7F) << shift
        i += 1
        if not (b & 0x80):
            break
        shift += 7
    return length, i

def raw_seal_to_tenseal(raw_bytes: bytes) -> ts.CKKSVector:
    proto_bytes = b'\x0A' + varint_encode(len(raw_bytes)) + raw_bytes
    return ts.ckks_vector_from(ctx, proto_bytes)

def tenseal_to_raw_seal(ts_vec: ts.CKKSVector) -> bytes:
    full_proto = ts_vec.serialize()
    length, ptr = decode_varint(full_proto, offset=1)
    return full_proto[ptr:ptr+length]

# --- Endpoints ---

@app.post("/api/users/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(database.UserDB).filter(database.UserDB.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    user_id = str(uuid.uuid4())
    new_user = database.UserDB(
        id=user_id,
        email=user.email,
        hashed_password=hashed_password,
        salt=user.salt,
        public_key=user.public_key,
        wrapped_sk=user.wrapped_sk,
        vault_id=user_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.put("/api/users/key")
def rotate_key(
    request: schemas.KeyRotationRequest,
    db: Session = Depends(get_db),
    current_user: database.UserDB = Depends(get_current_user)
):
    current_user.salt = request.salt
    current_user.wrapped_sk = request.wrapped_sk
    db.commit()
    return {"status": "success"}

@app.post("/api/token", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(database.UserDB).filter(database.UserDB.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or passphrase",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "salt": user.salt,
        "public_key": user.public_key,
        "wrapped_sk": user.wrapped_sk
    }

@app.post("/api/context")
def upload_context(payload: ContextUpload):
    return {"status": "Public Context Synchronized"}

@app.post("/api/expenses", response_model=schemas.ExpenseResponse)
def create_expense(
    expense: schemas.ExpenseCreate, 
    db: Session = Depends(get_db), 
    current_user: database.UserDB = Depends(get_current_user)
):
    db_exp = database.ExpenseDB(
        id=expense.id,
        user_id=current_user.id,
        vault_id=current_user.vault_id or current_user.id,
        description=expense.description,
        category=expense.category,
        timestamp=expense.timestamp,
        ciphertext=expense.amountCiphertext
    )
    db.add(db_exp)
    db.commit()
    return expense

@app.get("/api/expenses", response_model=list[schemas.ExpenseResponse])
def get_expenses(
    db: Session = Depends(get_db),
    current_user: database.UserDB = Depends(get_current_user)
):
    vault_id = current_user.vault_id or current_user.id
    expenses = db.query(database.ExpenseDB).filter(database.ExpenseDB.vault_id == vault_id).all()
    return [
        schemas.ExpenseResponse(
            id=e.id,
            description=e.description,
            category=e.category,
            timestamp=e.timestamp,
            amountCiphertext=e.ciphertext
        ) for e in expenses
    ]

@app.get("/api/expenses/total")
def get_total(
    db: Session = Depends(get_db),
    current_user: database.UserDB = Depends(get_current_user)
):
    import logging
    logger = logging.getLogger("uvicorn.error")
    vault_id = current_user.vault_id or current_user.id
    expenses = db.query(database.ExpenseDB).filter(database.ExpenseDB.vault_id == vault_id).all()
    logger.info(f"GET /totals - User {current_user.id} (Vault {vault_id}). Found {len(expenses)} rows.")
    if not expenses:
        return {"totalCiphertext": None}

    total = None
    for exp in expenses:
        raw_seal = base64.b64decode(exp.ciphertext)
        try:
            ts_vec = raw_seal_to_tenseal(raw_seal)
            if total is None:
                total = ts_vec
            else:
                total += ts_vec
        except Exception:
            continue
            
    if total is None:
        return {"totalCiphertext": None}

    raw_computed_seal = tenseal_to_raw_seal(total)
    return {"totalCiphertext": base64.b64encode(raw_computed_seal).decode('ascii')}

@app.get("/api/totals/breakdown")
def get_totals_breakdown(
    db: Session = Depends(get_db),
    current_user: database.UserDB = Depends(get_current_user)
):
    from collections import defaultdict
    import logging
    logger = logging.getLogger("uvicorn.error")
    vault_id = current_user.vault_id or current_user.id
    expenses = db.query(database.ExpenseDB).filter(database.ExpenseDB.vault_id == vault_id).all()
    logger.info(f"GET /totals/breakdown - User {current_user.id} (Vault {vault_id}). Found {len(expenses)} rows.")
    grouped = defaultdict(list)
    for exp in expenses:
        grouped[exp.category].append(exp)
        
    result = {}
    if not expenses:
        return {}

    for cat, exps in grouped.items():
        total = None
        for exp in exps:
            raw_seal = base64.b64decode(exp.ciphertext)
            try:
                ts_vec = raw_seal_to_tenseal(raw_seal)
                if total is None:
                    total = ts_vec
                else:
                    total += ts_vec
            except Exception:
                continue
        if total is None:
            result[cat] = None
        else:
            raw_computed_seal = tenseal_to_raw_seal(total)
            result[cat] = base64.b64encode(raw_computed_seal).decode('ascii')
            
    return result
