import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid
from datetime import datetime, timezone

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
client = AsyncIOMotorClient('mongodb://localhost:27017')
db = client['flux_db']

async def seed():
    users = [
        {'username': 'Super Admin', 'email': 'superuser@company.com', 'role': 'SuperUser', 'division': None},
        {'username': 'VP John', 'email': 'vp@company.com', 'role': 'VP', 'division': None},
        {'username': 'Manager Sarah', 'email': 'manager.infra@company.com', 'role': 'Manager', 'division': 'Infra'},
        {'username': 'Manager Alex', 'email': 'manager.ts@company.com', 'role': 'Manager', 'division': 'TS'},
        {'username': 'SPV Lisa', 'email': 'spv.infra@company.com', 'role': 'SPV', 'division': 'Infra'},
        {'username': 'SPV Mark', 'email': 'spv.ts@company.com', 'role': 'SPV', 'division': 'TS'},
        {'username': 'Staff Charlie', 'email': 'staff1.infra@company.com', 'role': 'Staff', 'division': 'Infra'},
        {'username': 'Staff Eve', 'email': 'staff1.ts@company.com', 'role': 'Staff', 'division': 'TS'},
    ]
    
    for u in users:
        doc = {
            'id': str(uuid.uuid4()),
            'username': u['username'],
            'email': u['email'],
            'password_hash': pwd_context.hash('password123'),
            'role': u['role'],
            'division': u['division'],
            'account_status': 'approved',
            'profile_photo': None,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(doc)
        print(f"Created: {u['email']}")
    
    categories = ['Meeting', 'Survey', 'Troubleshoot', 'Visit', 'Maintenance', 'Installasi', 'Others']
    for cat in categories:
        doc = {
            'id': str(uuid.uuid4()),
            'name': cat,
            'created_by': 'system',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.activity_categories.insert_one(doc)
    print('Categories created!')

asyncio.run(seed())
