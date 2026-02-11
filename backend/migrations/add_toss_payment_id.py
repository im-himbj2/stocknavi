"""
Add toss_payment_id column to subscriptions table
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

def migrate():
    """Add toss_payment_id column if it doesn't exist"""
    try:
        with engine.connect() as conn:
            # Check if column exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'subscriptions' 
                AND column_name = 'toss_payment_id'
            """))
            
            if result.fetchone() is None:
                print("Adding toss_payment_id column...")
                conn.execute(text("""
                    ALTER TABLE subscriptions 
                    ADD COLUMN toss_payment_id VARCHAR UNIQUE
                """))
                conn.commit()
                print("✓ Column added successfully!")
            else:
                print("✓ Column already exists, skipping migration")
            
            # Verify
            result = conn.execute(text("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'subscriptions' 
                ORDER BY ordinal_position
            """))
            
            print("\nCurrent subscriptions table schema:")
            for row in result:
                print(f"  - {row[0]}: {row[1]} (nullable: {row[2]})")
                
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    migrate()
