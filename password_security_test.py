#!/usr/bin/env python3
"""
Password Security Verification Test
Verifies that passwords are properly hashed and not stored in plain text
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
ROOT_DIR = Path(__file__).parent / "backend"
load_dotenv(ROOT_DIR / '.env')

async def verify_password_security():
    """Verify passwords are hashed in database"""
    print("=" * 60)
    print("PASSWORD SECURITY VERIFICATION")
    print("=" * 60)
    
    try:
        # Connect to MongoDB
        mongo_url = os.environ['MONGO_URL']
        client = AsyncIOMotorClient(mongo_url)
        db = client[os.environ['DB_NAME']]
        
        # Find a test user
        user = await db.users.find_one({"email": {"$regex": "testuser_.*@example.com"}})
        
        if user:
            password_hash = user.get("password_hash", "")
            
            # Check if password is hashed (bcrypt hashes start with $2b$)
            if password_hash.startswith("$2b$"):
                print("✅ PASS: Password Security - Passwords are properly hashed")
                print(f"   Details: Password hash format: {password_hash[:20]}...")
                
                # Verify it's not plain text
                if "SecurePass123!" not in password_hash:
                    print("✅ PASS: Password Security - Plain text password not stored")
                else:
                    print("❌ FAIL: Password Security - Plain text password found in hash")
                    
            else:
                print("❌ FAIL: Password Security - Password not properly hashed")
                print(f"   Details: Found: {password_hash[:50]}...")
        else:
            print("⚠️  WARNING: No test user found in database")
            
        client.close()
        
    except Exception as e:
        print(f"❌ FAIL: Password Security Test - {str(e)}")
    
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(verify_password_security())