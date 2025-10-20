#!/usr/bin/env python3
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get admin credentials
admin_username = os.getenv('ADMIN_USERNAME', 'admin')
admin_password = os.getenv('ADMIN_PASSWORD', 'change_me_in_production')

print(f"Testing admin credentials:")
print(f"Username: '{admin_username}'")
print(f"Password: '{admin_password}'")

# Test the exact comparison that happens in admin.py
test_username = "admin"
test_password = "Princeofegypt1"

print(f"\nTesting login with:")
print(f"Test Username: '{test_username}'")
print(f"Test Password: '{test_password}'")

username_match = test_username == admin_username
password_match = test_password == admin_password

print(f"\nResults:")
print(f"Username match: {username_match}")
print(f"Password match: {password_match}")
print(f"Login should work: {username_match and password_match}")

if username_match and password_match:
    print("✅ Admin login should work!")
    sys.exit(0)
else:
    print("❌ Admin login will fail!")
    sys.exit(1)