"""
Script to update specific user heights manually.
Usage: python update_specific_heights.py
"""

import os
from app import app, db, User
from sqlalchemy import text

def list_all_users():
    """List all users with their current heights"""
    with app.app_context():
        users = User.query.all()
        print("\n📋 All Users:")
        print("-" * 80)
        print(f"{'ID':<5} {'Username':<25} {'Name':<25} {'Height':<10}")
        print("-" * 80)
        for user in users:
            height = user.height if user.height else "Not set"
            name = f"{user.first_name} {user.last_name}"
            print(f"{user.id:<5} {user.username:<25} {name:<25} {height:<10}")
        print("-" * 80)
        return users

def update_height_by_username(username, height):
    """Update height for a user by username"""
    with app.app_context():
        user = User.query.filter_by(username=username).first()
        if not user:
            print(f"❌ User '{username}' not found!")
            return False
        
        old_height = user.height if user.height else "Not set"
        user.height = height
        db.session.commit()
        print(f"✅ Updated {user.first_name} {user.last_name} ({username}): {old_height} -> {height}")
        return True

def update_height_by_email(email, height):
    """Update height for a user by email"""
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        if not user:
            print(f"❌ User with email '{email}' not found!")
            return False
        
        old_height = user.height if user.height else "Not set"
        user.height = height
        db.session.commit()
        print(f"✅ Updated {user.first_name} {user.last_name} ({user.username}): {old_height} -> {height}")
        return True

def update_height_by_id(user_id, height):
    """Update height for a user by ID"""
    with app.app_context():
        user = User.query.get(user_id)
        if not user:
            print(f"❌ User with ID {user_id} not found!")
            return False
        
        old_height = user.height if user.height else "Not set"
        user.height = height
        db.session.commit()
        print(f"✅ Updated {user.first_name} {user.last_name} ({user.username}): {old_height} -> {height}")
        return True

def batch_update_heights(updates):
    """
    Batch update multiple users at once.
    updates: list of dicts with 'identifier' (username/email/id), 'type' ('username'/'email'/'id'), and 'height'
    Example: [
        {'identifier': 'akshat_shetye', 'type': 'username', 'height': "5'6\""},
        {'identifier': 'arya_bansode', 'type': 'username', 'height': "5'7\""},
        {'identifier': 'zion_john', 'type': 'username', 'height': "5'11\""},
        {'identifier': 'harshal_khade', 'type': 'username', 'height': "5'8\""},
        {'identifier': 'archee_patel', 'type': 'username', 'height': "5'4\""},
        {'identifier': 'manthan_surve', 'type': 'username', 'height': "5'7\""},
        {'identifier': 'vanshita_shah', 'type': 'username', 'height': "5'5\""},
        {'identifier': 'priyanshi_siddhapura', 'type': 'username', 'height': "5'5\""},
     ]
    """
    with app.app_context():
        success_count = 0
        for update in updates:
            identifier = update['identifier']
            height = update['height']
            update_type = update.get('type', 'username')
            
            if update_type == 'username':
                if update_height_by_username(identifier, height):
                    success_count += 1
            elif update_type == 'email':
                if update_height_by_email(identifier, height):
                    success_count += 1
            elif update_type == 'id':
                if update_height_by_id(int(identifier), height):
                    success_count += 1
        
        print(f"\n✅ Successfully updated {success_count}/{len(updates)} users")

if __name__ == '__main__':
    print("=" * 80)
    print("📏 Height Update Script")
    print("=" * 80)
    
    # Show all users first
    users = list_all_users()
    
    print("\n💡 How to use:")
    print("1. Edit this script and add your updates in the 'updates' list below")
    print("2. Or use the individual functions in Python:")
    print("   - update_height_by_username('username', \"5'11\"\")")
    print("   - update_height_by_email('email@example.com', \"6'0\"\")")
    print("   - update_height_by_id(1, \"5'9\"\")")
    print("\n📝 Example batch update:")
    print("   batch_update_heights([")
    print("       {'identifier': 'akshat_shetye', 'type': 'username', 'height': \"5'11\"\"},")
    print("       {'identifier': 'arya_bansode', 'type': 'username', 'height': \"6'1\"\"},")
    print("   ])")
    print("\n" + "=" * 80)
    
    # Update heights with your real values
    batch_update_heights([
        {'identifier': 'akshat_shetye', 'type': 'username', 'height': "5'6\""},
        {'identifier': 'arya_bansode', 'type': 'username', 'height': "5'7\""},
        {'identifier': 'zion_john', 'type': 'username', 'height': "5'11\""},
        {'identifier': 'harshal_khade', 'type': 'username', 'height': "5'8\""},
        {'identifier': 'archee_patel', 'type': 'username', 'height': "5'4\""},
        {'identifier': 'manthan_surve', 'type': 'username', 'height': "5'7\""},
        {'identifier': 'vanshita_shah', 'type': 'username', 'height': "5'5\""},
        {'identifier': 'priyanshi_siddhapura', 'type': 'username', 'height': "5'5\""},
    ])

