"""database.py - Database configuration"""
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:Khushi.12@localhost:5432/item_management_master"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Database dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations():
    """
    Safe incremental migrations — ADD COLUMN IF NOT EXISTS means this can
    run on every startup without errors, even if columns already exist.
    """
    migrations = [
        # GL Master — gl_sub_category_id column
        """
        ALTER TABLE gl_master
        ADD COLUMN IF NOT EXISTS gl_sub_category_id INTEGER
        REFERENCES gl_sub_category_master(id);
        """,
        # GL Master — gl_head_id column (the one causing the 500 error)
        """
        ALTER TABLE gl_master
        ADD COLUMN IF NOT EXISTS gl_head_id INTEGER
        REFERENCES gl_head_master(id);
        """,
    ]

    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception as e:
                conn.rollback()
                print(f"⚠️  Migration skipped (already applied or error): {e}")

    print("✅ [DB] Migrations complete.")
