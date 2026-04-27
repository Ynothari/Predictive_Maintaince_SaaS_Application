"""
Supabase database initialization script.
Run this once to create all tables in your Supabase PostgreSQL database.

Usage:
    python scripts/setup_supabase.py

Requires SUPABASE_DB_URL to be set in .env
"""
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from app.database import engine, Base, init_db
from app.models.db_models import (
    User, UploadedFile, MachineReading, Analysis,
    PredictionResult, AuditLog, ScheduledJob, WebhookConfig, ModelVersion,
)


def main():
    print("=" * 60)
    print("PredictIQ — Supabase Database Setup")
    print("=" * 60)

    db_url = os.getenv("SUPABASE_DB_URL", os.getenv("DATABASE_URL", ""))
    if not db_url:
        print("\n❌ Error: SUPABASE_DB_URL not found in environment.")
        print("   Set it in your .env file or environment variables.")
        print("   Format: postgresql://postgres.[ref]:[pw]@...pooler.supabase.com:6543/postgres")
        sys.exit(1)

    # Mask password in output
    masked_url = db_url
    if "@" in db_url and ":" in db_url:
        parts = db_url.split("@")
        prefix = parts[0].rsplit(":", 1)[0]
        masked_url = f"{prefix}:****@{parts[1]}"
    print(f"\nConnecting to: {masked_url}")

    try:
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(__import__("sqlalchemy").text("SELECT 1"))
            print("✅ Database connection successful")

        # Create all tables
        print("\nCreating tables...")
        Base.metadata.create_all(bind=engine)

        # List created tables
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"\n✅ {len(tables)} tables ready:")
        for t in sorted(tables):
            cols = inspector.get_columns(t)
            print(f"   📋 {t} ({len(cols)} columns)")

        print("\n" + "=" * 60)
        print("Database setup complete! You can now start the backend.")
        print("  python -m uvicorn app.main:app --reload")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Database setup failed: {e}")
        print("\nTroubleshooting:")
        print("  1. Check your SUPABASE_DB_URL in .env")
        print("  2. Ensure your Supabase project is active")
        print("  3. Check if your IP is allowed in Supabase → Settings → Database → Network")
        sys.exit(1)


if __name__ == "__main__":
    main()
