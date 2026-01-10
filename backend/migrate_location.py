#!/usr/bin/env python3
"""
Migration script to add latitude and longitude columns to User table
Run this once to update your database schema
"""
import sqlite3
import os

DB_PATH = 'dating_app.db'

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(user)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'latitude' not in columns:
            print("Adding latitude column...")
            cursor.execute("ALTER TABLE user ADD COLUMN latitude REAL")
        else:
            print("latitude column already exists")
            
        if 'longitude' not in columns:
            print("Adding longitude column...")
            cursor.execute("ALTER TABLE user ADD COLUMN longitude REAL")
        else:
            print("longitude column already exists")
        
        conn.commit()
        print("✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()


