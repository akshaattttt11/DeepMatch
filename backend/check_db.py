import sqlite3
from datetime import datetime

# Connect to your database
conn = sqlite3.connect('dating_app.db')
cursor = conn.cursor()

# Check all users with more details
cursor.execute("SELECT * FROM User")
users = cursor.fetchall()

print("=== ALL USERS IN DATABASE ===")
for user in users:
    print(f"ID: {user[0]}")
    print(f"Username: {user[1]}")
    print(f"Email: {user[2]}")
    print(f"Password Hash: {user[3][:20]}...")
    print(f"Created: {user[4]}")
    print(f"First Name: {user[5]}")
    print(f"Last Name: {user[6]}")
    print(f"Age: {user[7]}")
    print("---")

# Check how many users total
cursor.execute("SELECT COUNT(*) FROM User")
total_users = cursor.fetchone()[0]
print(f"\nTotal Users: {total_users}")

conn.close()