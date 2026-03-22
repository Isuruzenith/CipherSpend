from pydantic import BaseModel, EmailStr

# User Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    salt: str
    public_key: str
    wrapped_sk: str

class KeyRotationRequest(BaseModel):
    salt: str
    wrapped_sk: str

class UserResponse(BaseModel):
    id: str
    email: str
    salt: str
    public_key: str
    wrapped_sk: str

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    salt: str
    public_key: str
    wrapped_sk: str

class TokenData(BaseModel):
    email: str | None = None

# Expense Schemas
class ExpenseCreate(BaseModel):
    id: str
    description: str
    category: str
    currency: str = "LKR"
    timestamp: str
    amountCiphertext: str

class ExpenseResponse(BaseModel):
    id: str
    description: str
    category: str
    currency: str = "LKR"
    timestamp: str
    amountCiphertext: str

    class Config:
        from_attributes = True

class ExpenseUpdate(BaseModel):
    description: str
    category: str
    currency: str = "LKR"
    timestamp: str
    amountCiphertext: str
