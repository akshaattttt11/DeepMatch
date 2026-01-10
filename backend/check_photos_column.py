#!/usr/bin/env python3
"""
Check if photos column exists in the user table
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from sqlalchemy import text

def check_photos_column():
    """Check if photos column exists"""
    with app.app_context():
        try:
            is_postgres = 'postgresql' in str(db.engine.url)
            
            if is_postgres:
                result = db.session.execute(text(
                    "SELECT column_name, data_type FROM information_schema.columns "
                    "WHERE table_name='user' AND column_name='photos'"
                )).fetchone()
                
                if result:
                    print(f"✅ photos column exists: {result[0]} ({result[1]})")
                    return True
                else:
                    print("❌ photos column does NOT exist")
                    return False
            else:
                result = db.session.execute(text("PRAGMA table_info(user)")).fetchall()
                columns = {row[1]: row[2] for row in result}
                if 'photos' in columns:
                    print(f"✅ photos column exists: {columns['photos']}")
                    return True
                else:
                    print("❌ photos column does NOT exist")
                    print(f"Existing columns: {list(columns.keys())}")
                    return False
        except Exception as e:
            print(f"❌ Error checking column: {e}")
            return False

if __name__ == '__main__':
    check_photos_column()



