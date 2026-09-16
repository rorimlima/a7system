"""
SQLAlchemy PostgreSQL connection and session management for Supabase.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres.vjzuqdjmadjxyvrfzbod:reivax%40rorim7@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
)

# Pool configuration optimized for Supabase Pooler
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_recycle=1800,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """FastAPI dependency for yielding database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
