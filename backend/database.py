from sqlalchemy import create_engine, Column, String, Text, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

SQLALCHEMY_DATABASE_URL = "sqlite:///./cloud_ledger.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class UserDB(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    salt = Column(String, nullable=False)
    public_key = Column(Text, nullable=False)
    wrapped_sk = Column(Text, nullable=False)
    vault_id = Column(String, index=True, nullable=True)

    expenses = relationship("ExpenseDB", back_populates="owner")

class ExpenseDB(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    vault_id = Column(String, index=True, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False)
    currency = Column(String, nullable=False, default="LKR")
    timestamp = Column(String, nullable=False)
    ciphertext = Column(Text, nullable=False)  # Base64 node-seal ciphertext

    owner = relationship("UserDB", back_populates="expenses")
