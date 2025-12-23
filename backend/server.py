from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import shutil
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import base64
import csv
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI()

# Mount uploads directory for static access
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

api_router = APIRouter(prefix="/api")

# ============ UPDATED MODELS ============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    password_hash: str
    role: str
    division: Optional[str] = None
    account_status: str = "pending"  # NEW: pending, approved, rejected
    profile_photo: Optional[str] = None  # NEW: Base64 encoded photo
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str
    division: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    division: Optional[str] = None
    account_status: Optional[str] = None
    profile_photo: Optional[str] = None

class UserProfileUpdate(BaseModel):  # NEW
    username: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
    confirm_password: Optional[str] = None

class AccountApprovalAction(BaseModel):  # NEW
    user_id: str
    action: str  # approve or reject

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# NEW: Site Model
class Site(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    location: Optional[str] = None
    description: Optional[str] = None
    status: str = "active"  # active, inactive
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SiteCreate(BaseModel):
    name: str
    location: Optional[str] = None
    description: Optional[str] = None


class SiteUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

# NEW: Activity Category Model
class ActivityCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str

class Schedule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    division: str
    category_id: Optional[str] = None  # NEW: Activity category
    category_name: Optional[str] = None  # NEW: Activity category name
    title: str
    description: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None  # PHASE 2: Made optional - only start date required
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ticket_id: Optional[str] = None
    site_id: Optional[str] = None  # NEW
    site_name: Optional[str] = None  # NEW

class ScheduleCreate(BaseModel):
    user_id: str
    user_name: str
    division: str
    category_id: Optional[str] = None  # NEW: Activity category
    title: str
    description: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None  # PHASE 2: Made optional
    ticket_id: Optional[str] = None
    site_id: str  # Required

class ScheduleUpdate(BaseModel):  # PHASE 2: New model for editing
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    category_id: Optional[str] = None  # NEW: Activity category
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    site_id: Optional[str] = None  # NEW

# NEW: Activity Models
class Activity(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    schedule_id: str
    user_id: str
    user_name: str
    division: str
    action_type: str  # start, finish, cancel, hold
    status: str  # In Progress, Finished, Cancelled, On Hold
    notes: Optional[str] = None
    reason: Optional[str] = None  # Required for cancel
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    progress_updates: List[dict] = []  # NEW: Array of timestamped progress updates
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ActivityCreate(BaseModel):
    schedule_id: str
    action_type: str  # start, finish, cancel, hold
    schedule_id: str
    action_type: str
    notes: Optional[str] = None
    reason: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None  # Required when action_type is cancel

class ActivityProgressUpdate(BaseModel):
    activity_id: str
    update_text: str  # The progress update/comment


# NEW: Shift Change Request
class ShiftChangeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    schedule_id: str
    requested_by: str
    requested_by_name: str
    reason: str
    new_start_date: datetime
    new_end_date: datetime
    status: str = "pending"  # pending, approved, rejected
    reviewed_by: Optional[str] = None
    review_comment: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ShiftChangeRequestCreate(BaseModel):
    schedule_id: str
    reason: str
    new_start_date: str
    new_end_date: str

class ShiftChangeReviewAction(BaseModel):
    request_id: str
    action: str  # approve or reject
    comment: Optional[str] = None

class CommentCreate(BaseModel):
    text: str

class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    text: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Report(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category_id: Optional[str] = None  # NEW: Activity category
    category_name: Optional[str] = None  # NEW: Activity category name
    title: str
    description: str
    file_name: str
    file_data: str
    status: str
    submitted_by: str
    submitted_by_name: str
    current_approver: Optional[str] = None
    ticket_id: Optional[str] = None
    site_id: Optional[str] = None  # NEW
    site_name: Optional[str] = None  # NEW
    version: int = 1
    rejection_comment: Optional[str] = None
    comments: List[Comment] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ApprovalAction(BaseModel):
    report_id: str
    action: str
    comment: Optional[str] = None

class ReportUpdate(BaseModel):
    category_id: Optional[str] = None  # NEW: Activity category
    title: Optional[str] = None
    description: Optional[str] = None
    site_id: Optional[str] = None
    ticket_id: Optional[str] = None

class Ticket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    priority: str
    status: str
    assigned_to_division: str
    assigned_to: Optional[str] = None
    created_by: str
    created_by_name: str
    linked_report_id: Optional[str] = None
    site_id: Optional[str] = None  # NEW
    site_name: Optional[str] = None  # NEW
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    comments: List[dict] = []

class TicketCreate(BaseModel):
    title: str
    description: str
    priority: str
    assigned_to_division: str
    site_id: Optional[str] = None

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None

# PHASE 4: Full ticket edit model
class TicketEdit(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_division: Optional[str] = None
    site_id: Optional[str] = None

class TicketComment(BaseModel):
    ticket_id: str
    comment: str

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    type: str
    related_id: Optional[str] = None
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============ HELPER FUNCTIONS ============

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

async def create_notification(user_id: str, title: str, message: str, notification_type: str, related_id: Optional[str] = None):
    notification = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=notification_type,
        related_id=related_id
    )
    doc = notification.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.notifications.insert_one(doc)

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    # Validate email domain - only @varnion.net.id allowed
    if not user_data.email.lower().endswith("@varnion.net.id"):
        raise HTTPException(status_code=400, detail="Only @varnion.net.id email addresses are allowed for registration")
    
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # NEW: Validate that Apps and Fiberzone can only be Staff
    if user_data.division in ["Apps", "Fiberzone"] and user_data.role != "Staff":
        raise HTTPException(status_code=400, detail="Apps and Fiberzone divisions can only register as Staff")
    
    # NEW: Staff and Manager registrations are pending by default
    account_status = "pending" if user_data.role in ["Staff", "Manager"] else "approved"
    
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        division=user_data.division,
        account_status=account_status
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    # NEW: Notify appropriate approver
    if user_data.role == "Staff" and user_data.division:
        # Determine target division for approval
        target_division = user_data.division
        if user_data.division == "Apps":
            target_division = "TS"
        elif user_data.division == "Fiberzone":
            target_division = "Infra"
            
        manager = await db.users.find_one({"role": "Manager", "division": target_division}, {"_id": 0})
        if manager:
            await create_notification(
                user_id=manager["id"],
                title="New Account Approval Required",
                message=f"{user_data.username} (Staff - {user_data.division}) has registered and needs approval",
                notification_type="account_approval",
                related_id=user.id
            )
    elif user_data.role == "Manager":
        vp = await db.users.find_one({"role": "VP"}, {"_id": 0})
        if vp:
            await create_notification(
                user_id=vp["id"],
                title="New Manager Approval Required",
                message=f"{user_data.username} (Manager) has registered and needs approval",
                notification_type="account_approval",
                related_id=user.id
            )
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        division=user.division,
        account_status=account_status,
        profile_photo=None
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # NEW: Check account status
    if user.get("account_status") == "pending":
        raise HTTPException(status_code=403, detail="Account pending approval")
    if user.get("account_status") == "rejected":
        raise HTTPException(status_code=403, detail="Account has been rejected")
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            role=user["role"],
            division=user.get("division"),
            account_status=user.get("account_status"),
            profile_photo=user.get("profile_photo")
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        username=current_user["username"],
        email=current_user["email"],
        role=current_user["role"],
        division=current_user.get("division"),
        account_status=current_user.get("account_status"),
        profile_photo=current_user.get("profile_photo")
    )

# NEW: Profile Management
@api_router.put("/auth/profile")
async def update_profile(profile_data: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {}
    
    if profile_data.username:
        update_dict["username"] = profile_data.username
    
    if profile_data.new_password:
        if not profile_data.current_password or not profile_data.confirm_password:
            raise HTTPException(status_code=400, detail="Current password and confirmation required")
        
        if not verify_password(profile_data.current_password, current_user["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        if profile_data.new_password != profile_data.confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match")
        
        update_dict["password_hash"] = get_password_hash(profile_data.new_password)
    
    if update_dict:
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": update_dict}
        )
    
    return {"message": "Profile updated successfully"}

@api_router.post("/auth/profile/photo")
async def upload_profile_photo(
    photo: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Read file and encode to base64
    file_content = await photo.read()
    photo_data = base64.b64encode(file_content).decode('utf-8')
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"profile_photo": photo_data}}
    )
    
    return {"message": "Profile photo updated successfully", "photo_data": photo_data}

# NEW: Account Approval Endpoints
@api_router.get("/accounts/pending")
async def get_pending_accounts(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["Manager", "VP"]:
        raise HTTPException(status_code=403, detail="Only managers and VP can view pending accounts")
    
    query = {"account_status": "pending"}
    if current_user["role"] == "Manager":
        user_division = current_user.get("division")
        
        # Build division filter to include sub-divisions
        division_filter = [user_division]
        if user_division == "TS":
            division_filter.append("Apps")
        elif user_division == "Infra":
            division_filter.append("Fiberzone")
        
        query["division"] = {"$in": division_filter}
        # FIX: Managers cannot see pending Manager accounts
        query["role"] = {"$ne": "Manager"}
    
    pending_users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(1000)
    return pending_users

@api_router.post("/accounts/review")
async def review_account(action_data: AccountApprovalAction, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["Manager", "VP"]:
        raise HTTPException(status_code=403, detail="Only managers and VP can review accounts")
    
    user = await db.users.find_one({"id": action_data.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if current_user["role"] == "Manager":
        user_division = current_user.get("division")
        target_user_division = user.get("division")
        
        # Check if manager can review this user
        allowed = False
        if target_user_division == user_division:
            allowed = True
        elif user_division == "TS" and target_user_division == "Apps":
            allowed = True
        elif user_division == "Infra" and target_user_division == "Fiberzone":
            allowed = True
        
        if not allowed:
            raise HTTPException(status_code=403, detail="Can only review accounts from your division or its sub-divisions")
        
        # FIX: Managers cannot review Manager accounts
        if user.get("role") == "Manager":
            raise HTTPException(status_code=403, detail="Managers cannot review other Manager accounts")
    
    new_status = "approved" if action_data.action == "approve" else "rejected"
    
    await db.users.update_one(
        {"id": action_data.user_id},
        {"$set": {"account_status": new_status}}
    )
    
    await create_notification(
        user_id=action_data.user_id,
        title=f"Account {new_status.capitalize()}",
        message=f"Your account has been {new_status} by {current_user['username']}",
        notification_type="account_status"
    )
    
    return {"message": f"Account {new_status}"}

# ============ SITE MANAGEMENT ENDPOINTS (NEW) ============

@api_router.post("/sites")
async def create_site(site_data: SiteCreate, current_user: dict = Depends(get_current_user)):
    # FIX 2: All roles (including Staff and SPV) can create sites
    site = Site(
        name=site_data.name,
        location=site_data.location,
        description=site_data.description,
        created_by=current_user["id"]
    )
    
    doc = site.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.sites.insert_one(doc)
    
    return {"message": "Site created successfully", "id": site.id}

@api_router.get("/sites")
async def get_sites(current_user: dict = Depends(get_current_user)):
    # FIX: Return all sites (including inactive) so they show up in the list
    sites = await db.sites.find({}, {"_id": 0}).to_list(1000)
    return sites

@api_router.get("/sites/{site_id}")
async def get_site(site_id: str, current_user: dict = Depends(get_current_user)):
    site = await db.sites.find_one({"id": site_id}, {"_id": 0})
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site

@api_router.put("/sites/{site_id}")
async def update_site(site_id: str, site_data: SiteUpdate, current_user: dict = Depends(get_current_user)):
    # FIX 2: All roles (including Staff and SPV) can update sites
    update_dict = {k: v for k, v in site_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.sites.update_one(
            {"id": site_id},
            {"$set": update_dict}
        )
    
    return {"message": "Site updated successfully"}

@api_router.delete("/sites/{site_id}")
async def delete_site(site_id: str, current_user: dict = Depends(get_current_user)):
    # FIX 2: All roles (including Staff and SPV) can delete sites
    # Soft delete
    await db.sites.update_one(
        {"id": site_id},
        {"$set": {"status": "inactive"}}
    )
    
    return {"message": "Site deleted successfully"}

# ============ ACTIVITY CATEGORY ENDPOINTS (NEW) ============

@api_router.get("/activity-categories")
async def get_activity_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.activity_categories.find({}, {"_id": 0}).to_list(100)
    return categories

@api_router.post("/activity-categories")
async def create_activity_category(category_data: CategoryCreate, current_user: dict = Depends(get_current_user)):
    # Only SuperUser can create categories
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can create activity categories")
    
    # Check if category name already exists
    existing = await db.activity_categories.find_one({"name": category_data.name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
    
    category = ActivityCategory(
        name=category_data.name,
        created_by=current_user["id"]
    )
    
    doc = category.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.activity_categories.insert_one(doc)
    
    return {"message": "Category created successfully", "id": category.id}

@api_router.delete("/activity-categories/{category_id}")
async def delete_activity_category(category_id: str, current_user: dict = Depends(get_current_user)):
    # Only SuperUser can delete categories
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can delete activity categories")
    
    result = await db.activity_categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted successfully"}

# ============ USER DELETE ENDPOINT (SuperUser only) ============

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    # Only SuperUser can delete users
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can delete users")
    
    # Prevent self-deletion
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

# ============ USER ENDPOINTS ============

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(get_current_user)):
    users = await db.users.find({"account_status": "approved"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(**user) for user in users]

@api_router.get("/users/by-division/{division}", response_model=List[UserResponse])
async def get_users_by_division(division: str, current_user: dict = Depends(get_current_user)):
    users = await db.users.find({"division": division, "account_status": "approved"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(**user) for user in users]

# ============ SCHEDULE ENDPOINTS (V1) ============

@api_router.post("/schedules")
async def create_schedule(schedule_data: ScheduleCreate, current_user: dict = Depends(get_current_user)):
    # PHASE 2: Extended permissions to include SPV
    if current_user["role"] not in ["VP", "Manager", "SPV"]:
        raise HTTPException(status_code=403, detail="Only VP, Managers, and SPV can create schedules")
    
    # NEW: Monitoring division cannot create schedules
    if current_user.get("division") == "Monitoring":
        raise HTTPException(status_code=403, detail="Monitoring division cannot create schedules")
    
    # PHASE 2: Managers and SPV can only create for their division
    # NEW: Allow TS&Apps Manager to assign for Apps, and Infra Manager to assign for Fiberzone
    if current_user["role"] in ["Manager", "SPV"]:
        user_division = current_user.get("division")
        target_division = schedule_data.division
        
        # Check if assignment is allowed
        allowed = False
        if target_division == user_division:
            allowed = True
        elif user_division == "TS" and target_division == "Apps":
            allowed = True
        elif user_division == "Infra" and target_division == "Fiberzone":
            allowed = True
        
        if not allowed:
            raise HTTPException(status_code=403, detail="You can only create schedules for your division or its sub-divisions")
    
    # Enforce end_date to be 23:59:59 of the start_date
    start_dt = datetime.fromisoformat(schedule_data.start_date)
    end_date = start_dt.replace(hour=23, minute=59, second=59, microsecond=0)
    
    schedule = Schedule(
        user_id=schedule_data.user_id,
        user_name=schedule_data.user_name,
        division=schedule_data.division,
        category_id=schedule_data.category_id,
        title=schedule_data.title,
        description=schedule_data.description,
        start_date=datetime.fromisoformat(schedule_data.start_date),
        end_date=end_date,
        created_by=current_user["id"],
        ticket_id=schedule_data.ticket_id,
        site_id=schedule_data.site_id
    )

    # Get category name if category_id provided
    if schedule_data.category_id:
        category = await db.activity_categories.find_one({"id": schedule_data.category_id}, {"_id": 0})
        if category:
            schedule.category_name = category["name"]

    # Get site name if site_id provided
    if schedule_data.site_id:
        site = await db.sites.find_one({"id": schedule_data.site_id}, {"_id": 0})
        if site:
            schedule.site_name = site["name"]
    
    doc = schedule.model_dump()
    doc['start_date'] = doc['start_date'].isoformat()
    doc['end_date'] = doc['end_date'].isoformat() if doc['end_date'] else None
    doc['created_at'] = doc['created_at'].isoformat()
    await db.schedules.insert_one(doc)
    
    await create_notification(
        user_id=schedule_data.user_id,
        title="New Schedule Assigned",
        message=f"You have been assigned: {schedule_data.title}",
        notification_type="schedule",
        related_id=schedule.id
    )
    
    return {"message": "Schedule created successfully", "id": schedule.id}

# NEW: Bulk Schedule Upload
@api_router.post("/schedules/bulk-upload")
async def bulk_upload_schedules(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # PHASE 2: Extended to SPV
    if current_user["role"] not in ["VP", "Manager", "SPV"]:
        raise HTTPException(status_code=403, detail="Only VP, Managers, and SPV can bulk upload")
    
    # NEW: Monitoring division cannot create schedules
    if current_user.get("division") == "Monitoring":
        raise HTTPException(status_code=403, detail="Monitoring division cannot create schedules")
    
    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(status_code=400, detail="Only CSV or XLSX files are supported")
    
    content = await file.read()
    
    try:
        # Parse CSV
        decoded = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(decoded))
        
        created_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                # Expected columns: user_email, title, description, start_date, end_date
                user = await db.users.find_one({"email": row['user_email']}, {"_id": 0})
                if not user:
                    errors.append(f"Row {row_num}: User not found - {row['user_email']}")
                    continue
                
                
                # NEW: Allow cross-division assignment for Apps and Fiberzone
                if current_user["role"] in ["Manager", "SPV"]:
                    user_division = current_user.get("division")
                    target_division = user.get("division")
                    
                    allowed = False
                    if target_division == user_division:
                        allowed = True
                    elif user_division == "TS" and target_division == "Apps":
                        allowed = True
                    elif user_division == "Infra" and target_division == "Fiberzone":
                        allowed = True
                    
                    if not allowed:
                        errors.append(f"Row {row_num}: Cannot assign schedule to user from different division")
                        continue
                
                schedule = Schedule(
                    user_id=user["id"],
                    user_name=user["username"],
                    division=user.get("division", ""),
                    title=row['title'],
                    description=row.get('description', ''),
                    start_date=datetime.fromisoformat(row['start_date']),
                    end_date=datetime.fromisoformat(row['end_date']),
                    created_by=current_user["id"]
                )
                
                doc = schedule.model_dump()
                doc['start_date'] = doc['start_date'].isoformat()
                doc['end_date'] = doc['end_date'].isoformat()
                doc['created_at'] = doc['created_at'].isoformat()
                await db.schedules.insert_one(doc)
                
                await create_notification(
                    user_id=user["id"],
                    title="New Schedule Assigned",
                    message=f"You have been assigned: {row['title']}",
                    notification_type="schedule",
                    related_id=schedule.id
                )
                
                created_count += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        return {
            "message": f"Bulk upload completed. {created_count} schedules created.",
            "created_count": created_count,
            "errors": errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")

@api_router.get("/schedules")
async def get_schedules(current_user: dict = Depends(get_current_user)):
    schedules = await db.schedules.find({}, {"_id": 0}).to_list(10000)
    return schedules

@api_router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, current_user: dict = Depends(get_current_user)):
    # Get schedule to check division
    schedule = await db.schedules.find_one({"id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Grant access if user is the creator
    if schedule.get("created_by") == current_user["id"]:
        pass # Created by current user, proceed!
    else:
        # PHASE 2: Extended to SPV, with division check
        if current_user["role"] not in ["VP", "Manager", "SPV"]:
            raise HTTPException(status_code=403, detail="Only VP, Managers, and SPV can delete schedules")
        
        # NEW: Monitoring division cannot delete schedules
        if current_user.get("division") == "Monitoring":
            raise HTTPException(status_code=403, detail="Monitoring division cannot delete schedules")
        
        # PHASE 2: Manager and SPV can only delete from their division
        # NEW: Allow cross-division for Apps and Fiberzone
        if current_user["role"] in ["Manager", "SPV"]:
            user_division = current_user.get("division")
            schedule_division = schedule["division"]
            
            allowed = False
            if schedule_division == user_division:
                allowed = True
            elif user_division == "TS" and schedule_division == "Apps":
                allowed = True
            elif user_division == "Infra" and schedule_division == "Fiberzone":
                allowed = True
            
            if not allowed:
                raise HTTPException(status_code=403, detail="You can only delete schedules from your division or its sub-divisions")
    
    result = await db.schedules.delete_one({"id": schedule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    return {"message": "Schedule deleted successfully"}

# PHASE 2: Edit Schedule Endpoint
@api_router.put("/schedules/{schedule_id}")
async def update_schedule(schedule_id: str, update_data: ScheduleUpdate, current_user: dict = Depends(get_current_user)):
    # Get schedule to check division
    schedule = await db.schedules.find_one({"id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Grant access if user is the creator
    if schedule.get("created_by") == current_user["id"]:
        pass # Created by current user, proceed!
    else:

        # PHASE 2: Extended to SPV, with division check
        if current_user["role"] not in ["VP", "Manager", "SPV"]:
            raise HTTPException(status_code=403, detail="Only VP, Managers, and SPV can edit schedules")
        
        # NEW: Monitoring division cannot edit schedules
        if current_user.get("division") == "Monitoring":
            raise HTTPException(status_code=403, detail="Monitoring division cannot edit schedules")
        
        
        # PHASE 2: Manager and SPV can only edit from their division
        # NEW: Allow cross-division for Apps and Fiberzone
        if current_user["role"] in ["Manager", "SPV"]:
            user_division = current_user.get("division")
            schedule_division = schedule["division"]
            
            allowed = False
            if schedule_division == user_division:
                allowed = True
            elif user_division == "TS" and schedule_division == "Apps":
                allowed = True
            elif user_division == "Infra" and schedule_division == "Fiberzone":
                allowed = True
            
            if not allowed:
                raise HTTPException(status_code=403, detail="You can only edit schedules from your division or its sub-divisions")
    
    update_dict = {}
    if update_data.user_id:
        update_dict["user_id"] = update_data.user_id
    if update_data.user_name:
        update_dict["user_name"] = update_data.user_name
    if update_data.title:
        update_dict["title"] = update_data.title
    if update_data.description is not None:
        update_dict["description"] = update_data.description
    if update_data.start_date:
        update_dict["start_date"] = datetime.fromisoformat(update_data.start_date).isoformat()
    if update_data.end_date:
        update_dict["end_date"] = datetime.fromisoformat(update_data.end_date).isoformat()
    if update_data.site_id is not None:
        update_dict["site_id"] = update_data.site_id
        # Get site name
        if update_data.site_id:
            site = await db.sites.find_one({"id": update_data.site_id}, {"_id": 0})
            if site:
                update_dict["site_name"] = site["name"]
        else:
            update_dict["site_name"] = None
    
    if update_dict:
        await db.schedules.update_one(
            {"id": schedule_id},
            {"$set": update_dict}
        )
    
    return {"message": "Schedule updated successfully"}

# NEW: Shift Change Request Endpoints
@api_router.post("/schedules/change-request")
async def create_shift_change_request(
    request_data: ShiftChangeRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    # Get the schedule
    schedule = await db.schedules.find_one({"id": request_data.schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Check if user owns this schedule
    if schedule["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only request changes to your own schedules")
    
    request = ShiftChangeRequest(
        schedule_id=request_data.schedule_id,
        requested_by=current_user["id"],
        requested_by_name=current_user["username"],
        reason=request_data.reason,
        new_start_date=datetime.fromisoformat(request_data.new_start_date),
        new_end_date=datetime.fromisoformat(request_data.new_end_date)
    )
    
    doc = request.model_dump()
    doc['new_start_date'] = doc['new_start_date'].isoformat()
    doc['new_end_date'] = doc['new_end_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.shift_change_requests.insert_one(doc)
    
    # Notify division manager
    manager = await db.users.find_one({"role": "Manager", "division": schedule["division"]}, {"_id": 0})
    if manager:
        await create_notification(
            user_id=manager["id"],
            title="Shift Change Request",
            message=f"{current_user['username']} requested a shift change",
            notification_type="shift_change",
            related_id=request.id
        )
    
    return {"message": "Shift change request submitted", "id": request.id}

@api_router.get("/schedules/change-requests")
async def get_shift_change_requests(current_user: dict = Depends(get_current_user)):
    if current_user["role"] in ["Manager", "VP"]:
        # Managers see requests from their division
        query = {"status": "pending"}
        if current_user["role"] == "Manager":
            # Get all schedules from manager's division
            schedules = await db.schedules.find({"division": current_user.get("division")}, {"_id": 0}).to_list(10000)
            schedule_ids = [s["id"] for s in schedules]
            query["schedule_id"] = {"$in": schedule_ids}
        
        requests = await db.shift_change_requests.find(query, {"_id": 0}).to_list(1000)
    else:
        # Staff see their own requests
        requests = await db.shift_change_requests.find({"requested_by": current_user["id"]}, {"_id": 0}).to_list(1000)
    
    return requests

@api_router.post("/schedules/change-requests/review")
async def review_shift_change_request(
    action_data: ShiftChangeReviewAction,
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] not in ["Manager", "VP"]:
        raise HTTPException(status_code=403, detail="Only managers can review shift change requests")
    
    request = await db.shift_change_requests.find_one({"id": action_data.request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Get schedule to check division
    schedule = await db.schedules.find_one({"id": request["schedule_id"]}, {"_id": 0})
    if current_user["role"] == "Manager" and schedule["division"] != current_user.get("division"):
        raise HTTPException(status_code=403, detail="Can only review requests from your division")
    
    new_status = "approved" if action_data.action == "approve" else "rejected"
    
    # Update request
    await db.shift_change_requests.update_one(
        {"id": action_data.request_id},
        {
            "$set": {
                "status": new_status,
                "reviewed_by": current_user["id"],
                "review_comment": action_data.comment,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # If approved, update the schedule
    if action_data.action == "approve":
        await db.schedules.update_one(
            {"id": request["schedule_id"]},
            {
                "$set": {
                    "start_date": request["new_start_date"],
                    "end_date": request["new_end_date"]
                }
            }
        )
    
    # Notify requester
    await create_notification(
        user_id=request["requested_by"],
        title=f"Shift Change Request {new_status.capitalize()}",
        message=f"Your shift change request has been {new_status}",
        notification_type="shift_change",
        related_id=action_data.request_id
    )
    
    return {"message": f"Request {new_status}"}

# ============ ACTIVITY ENDPOINTS (NEW) ============

@api_router.get("/activities/today")
async def get_todays_schedules(current_user: dict = Depends(get_current_user)):
    """Get today's schedules for the logged-in user (primarily for Staff)"""
    # Get today's date range (start and end of day)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = datetime.now(timezone.utc).replace(hour=23, minute=59, second=59, microsecond=999999)
    
    # Query schedules for current user where start_date is today
    schedules = await db.schedules.find({
        "user_id": current_user["id"],
        "start_date": {
            "$gte": today_start.isoformat(),
            "$lte": today_end.isoformat()
        }
    }, {"_id": 0}).to_list(1000)
    
    # For each schedule, get the latest activity status if exists
    for schedule in schedules:
        # Fetch ALL activities for this schedule to aggregate progress updates
        all_activities = await db.activities.find(
            {"schedule_id": schedule["id"]},
            {"_id": 0}
        ).sort("created_at", 1).to_list(length=None)
        
        all_progress_updates = []
        latest_activity = None
        
        if all_activities:
            latest_activity = all_activities[-1] # Last one is latest due to sort
            for act in all_activities:
                if "progress_updates" in act and act["progress_updates"]:
                    all_progress_updates.extend(act["progress_updates"])
            
            # Sort updates by timestamp
            all_progress_updates.sort(key=lambda x: x["timestamp"])


            
        schedule["activity_status"] = latest_activity["status"] if latest_activity else "Pending"
        schedule["latest_activity"] = latest_activity
        schedule["all_progress_updates"] = all_progress_updates
    
    return schedules

@api_router.post("/activities")
async def create_activity(activity_data: ActivityCreate, current_user: dict = Depends(get_current_user)):
    """Record an activity action for a schedule"""
    # Get the schedule
    schedule = await db.schedules.find_one({"id": activity_data.schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Verify schedule belongs to current user
    if schedule["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only create activities for your own schedules")
    
    # Validate action_type
    # Validate action_type
    valid_actions = ["start", "finish", "cancel", "hold", "restore"]
    if activity_data.action_type not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action_type. Must be one of: {', '.join(valid_actions)}")
    
    # Validate cancel requires reason
    if activity_data.action_type == "cancel" and not activity_data.reason:
        raise HTTPException(status_code=400, detail="Reason is required when cancelling an activity")
    
    # Map action_type to status
    status_mapping = {
        "start": "In Progress",
        "finish": "Finished",
        "cancel": "Cancelled",
        "hold": "On Hold",
        "restore": "Pending"
    }
    
    activity = Activity(
        schedule_id=activity_data.schedule_id,
        user_id=current_user["id"],
        user_name=current_user["username"],
        division=schedule["division"],
        action_type=activity_data.action_type,
        status=status_mapping[activity_data.action_type],
        notes=activity_data.notes,
        reason=activity_data.reason,
        latitude=activity_data.latitude,
        longitude=activity_data.longitude
    )
    
    doc = activity.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.activities.insert_one(doc)

    # Special logic for Hold status - notify Manager
    if activity_data.action_type == "hold":
        manager = await db.users.find_one({"role": "Manager", "division": schedule["division"]}, {"_id": 0})
        if manager:
            await create_notification(
                user_id=manager["id"],
                title="Task On Hold",
                message=f"{current_user['username']} has put task '{schedule['title']}' on hold",
                notification_type="activity",
                related_id=activity.id
            )
    
    return {"message": f"Activity recorded successfully", "id": activity.id, "status": activity.status}

@api_router.get("/activities")
async def get_activities(current_user: dict = Depends(get_current_user)):
    """Get activity history - Staff see only their own, Managers/VP see division/all"""
    query = {}
    
    if current_user["role"] == "Staff":
        # Staff only see their own activities
        query["user_id"] = current_user["id"]
    elif current_user["role"] in ["Manager", "SPV"]:
        # Managers and SPV see activities from their division
        query["division"] = current_user.get("division")
    # VP sees all activities (no filter)
    
    activities = await db.activities.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return activities

@api_router.post("/activities/progress-update")
async def add_progress_update(
    activity_id: str = Form(...),
    update_text: str = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Add a timestamped progress update to an activity"""
    # Get the activity
    activity = await db.activities.find_one({"id": activity_id}, {"_id": 0})
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    # Verify activity belongs to current user
    if activity["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only add updates to your own activities")
    
    image_url = None
    if file:
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{timestamp}_{uuid.uuid4().hex[:8]}{file_extension}"
        
        # Create activity-specific folder
        activity_dir = UPLOAD_DIR / "activities" / activity_id
        activity_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = activity_dir / unique_filename
        
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Set URL
        image_url = f"/uploads/activities/{activity_id}/{unique_filename}"

    # Create the progress update with timestamp
    progress_update = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "update_text": update_text,
        "update_text": update_text,
        "user_name": current_user["username"],
        "image_url": image_url,
        "latitude": latitude,
        "longitude": longitude
    }
    
    # Add to the activity's progress_updates array
    await db.activities.update_one(
        {"id": activity_id},
        {
            "$push": {"progress_updates": progress_update},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"message": "Progress update added successfully"}

@api_router.get("/activities/schedule/{schedule_id}")
async def get_schedule_activity(schedule_id: str, current_user: dict = Depends(get_current_user)):
    # Public endpoint for authenticated users to see activity details
    # Fetch ALL activities to aggregate updates
    all_activities = await db.activities.find(
        {"schedule_id": schedule_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(length=None)
    
    if not all_activities:
        return None
        
    latest_activity = all_activities[-1]
    all_progress_updates = []
    
    for act in all_activities:
        if "progress_updates" in act and act["progress_updates"]:
            all_progress_updates.extend(act["progress_updates"])
            
    all_progress_updates.sort(key=lambda x: x["timestamp"])
    
    # Prepare response based on latest activity but with ALL updates
    response = latest_activity.copy()
    

        
    response["progress_updates"] = all_progress_updates # Override with aggregated list
        
    return response


# ============ REPORT ENDPOINTS (V2) - UPDATED ============

@api_router.post("/reports")
async def create_report(
    title: str = Form(...),
    description: str = Form(...),
    ticket_id: Optional[str] = Form(None),
    site_id: Optional[str] = Form(None),  # NEW
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Get site name if site_id provided for Folder Organization
    site_name = None
    folder_name = "Unassigned"
    
    if site_id:
        site = await db.sites.find_one({"id": site_id}, {"_id": 0})
        if site:
            site_name = site["name"]
            # Sanitize folder name
            folder_name = "".join(c for c in site_name if c.isalnum() or c in (' ', '-', '_')).strip().replace(' ', '_')

    # Prepare file storage for report
    reports_dir = UPLOAD_DIR / "reports" / folder_name
    reports_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"report_{timestamp}_{uuid.uuid4().hex[:8]}{file_extension}"
    file_path = reports_dir / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    file_url = f"/uploads/reports/{folder_name}/{unique_filename}"
    file_data = None # No longer storing base64 for new reports
    
    # Get category name if category_id provided
    category_name = None
    if category_id:
        category = await db.activity_categories.find_one({"id": category_id}, {"_id": 0})
        if category:
            category_name = category["name"]
    
    if current_user["role"] == "Staff":
        status = "Pending SPV"
        # NEW: Route Apps to TS SPV, Fiberzone to Infra SPV
        target_division = current_user.get("division")
        if target_division == "Apps":
            target_division = "TS"
        elif target_division == "Fiberzone":
            target_division = "Infra"
            
        spv = await db.users.find_one({"role": "SPV", "division": target_division}, {"_id": 0})
        current_approver = spv["id"] if spv else None
    else:
        status = "Pending Manager"
        # NEW: Route Apps to TS Manager, Fiberzone to Infra Manager
        target_division = current_user.get("division")
        if target_division == "Apps":
            target_division = "TS"
        elif target_division == "Fiberzone":
            target_division = "Infra"
            
        manager = await db.users.find_one({"role": "Manager", "division": target_division}, {"_id": 0})
        current_approver = manager["id"] if manager else None
    
    report = Report(
        category_id=category_id,
        category_name=category_name,
        title=title,
        description=description,
        file_name=file.filename,
        file_data=file_data,
        file_url=file_url, # NEW
        status=status,
        submitted_by=current_user["id"],
        submitted_by_name=current_user["username"],
        current_approver=current_approver,
        ticket_id=ticket_id,
        site_id=site_id,
        site_name=site_name
    )
    
    doc = report.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.reports.insert_one(doc)
    
    if current_approver:
        await create_notification(
            user_id=current_approver,
            title="New Report for Approval",
            message=f"{current_user['username']} submitted: {title}",
            notification_type="report",
            related_id=report.id
        )
    
    return {"message": "Report submitted successfully", "id": report.id}

@api_router.get("/reports")
async def get_reports(site_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    # Universal visibility - all users can view all reports
    query = {}
    if site_id:
        query["site_id"] = site_id
    
    reports = await db.reports.find(query, {"_id": 0, "file_data": 0}).to_list(1000)
    return reports

@api_router.get("/reports/{report_id}")
async def get_report(report_id: str, current_user: dict = Depends(get_current_user)):
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report

@api_router.get("/reports/statistics/user-counts")
async def get_user_report_statistics(
    month: int,
    year: int,
    category_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # Calculate date range
    try:
        start_date = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
        else:
            end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month or year")
    
    query = {
        "created_at": {
            "$gte": start_date.isoformat(),
            "$lte": end_date.isoformat()
        }
    }
    
    if category_id and category_id != "all":
        query["category_id"] = category_id
        
    # Aggregate
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$submitted_by_name",
            "count": {"$sum": 1}
        }},
        {"$project": {
            "name": "$_id",
            "value": "$count",
            "_id": 0
        }}
    ]
    
    stats = await db.reports.aggregate(pipeline).to_list(None)
    return stats

@api_router.post("/reports/approve")
async def approve_report(approval: ApprovalAction, current_user: dict = Depends(get_current_user)):
    report = await db.reports.find_one({"id": approval.report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # PHASE 3: Non-linear approval logic
    # VP can approve at any stage
    # Manager can approve if status is "Pending SPV" or "Pending Manager" AND it's their division
    # SPV can only approve if they are the current approver
    can_approve = False
    if current_user["role"] == "VP":
        can_approve = True
    elif current_user["role"] == "Manager" and report["status"] in ["Pending SPV", "Pending Manager"]:
        # NEW: Check if Manager's division matches the report's division hierarchy
        submitter = await db.users.find_one({"id": report["submitted_by"]}, {"_id": 0})
        if submitter:
            submitter_division = submitter.get("division")
            manager_division = current_user.get("division")
            
            # Determine the correct manager division for the submitter
            correct_manager_division = submitter_division
            if submitter_division == "Apps":
                correct_manager_division = "TS"
            elif submitter_division == "Fiberzone":
                correct_manager_division = "Infra"
            
            # Only allow if manager's division matches the correct hierarchy
            if manager_division == correct_manager_division:
                can_approve = True
    elif report["current_approver"] == current_user["id"]:
        can_approve = True
    
    if not can_approve:
        raise HTTPException(status_code=403, detail="You are not authorized to approve this report")
    
    # PHASE 3: Rename reject to revisi
    if approval.action == "revisi":
        if not approval.comment:
            raise HTTPException(status_code=400, detail="Comment is required for revisi")
        
        await db.reports.update_one(
            {"id": approval.report_id},
            {
                "$set": {
                    "status": "Revisi",
                    "rejection_comment": approval.comment,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        await create_notification(
            user_id=report["submitted_by"],
            title="Report Needs Revision",
            message=f"Your report '{report['title']}' needs revision: {approval.comment}",
            notification_type="report",
            related_id=approval.report_id
        )
        
        return {"message": "Report sent for revision"}
    
    # PHASE 3: Non-linear approval - determine next status based on current role
    new_status = ""
    new_approver = None
    
    # If VP approves, skip all intermediate stages and go to Final
    if current_user["role"] == "VP":
        new_status = "Final"
        new_approver = None
    # If Manager approves and current status is "Pending SPV", skip to VP
    elif current_user["role"] == "Manager" and report["status"] == "Pending SPV":
        new_status = "Pending VP"
        vp = await db.users.find_one({"role": "VP"}, {"_id": 0})
        new_approver = vp["id"] if vp else None
    # Normal flow for SPV
    elif report["status"] == "Pending SPV":
        new_status = "Pending Manager"
        submitter = await db.users.find_one({"id": report["submitted_by"]}, {"_id": 0})
        
        # NEW: Route Apps to TS Manager, Fiberzone to Infra Manager
        target_division = submitter.get("division")
        if target_division == "Apps":
            target_division = "TS"
        elif target_division == "Fiberzone":
            target_division = "Infra"
            
        manager = await db.users.find_one({"role": "Manager", "division": target_division}, {"_id": 0})
        new_approver = manager["id"] if manager else None
    # Normal flow for Manager
    elif report["status"] == "Pending Manager":
        new_status = "Pending VP"
        vp = await db.users.find_one({"role": "VP"}, {"_id": 0})
        new_approver = vp["id"] if vp else None
    # Normal flow for VP
    elif report["status"] == "Pending VP":
        new_status = "Final"
        new_approver = None
    
    await db.reports.update_one(
        {"id": approval.report_id},
        {
            "$set": {
                "status": new_status,
                "current_approver": new_approver,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if new_status == "Final":
        await create_notification(
            user_id=report["submitted_by"],
            title="Report Approved",
            message=f"Your report '{report['title']}' has been fully approved!",
            notification_type="report",
            related_id=approval.report_id
        )
    elif new_approver:
        await create_notification(
            user_id=new_approver,
            title="Report Needs Approval",
            message=f"Report '{report['title']}' is awaiting your approval",
            notification_type="report",
            related_id=approval.report_id
        )
    
    return {"message": "Report approved", "new_status": new_status}

# PHASE 3: Edit Report Endpoint
@api_router.put("/reports/{report_id}")
async def edit_report(
    report_id: str, 
    title: str = Form(None),
    description: str = Form(None),
    site_id: str = Form(None),
    ticket_id: str = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Only the creator can edit their report
    if report["submitted_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only edit your own reports")
    
    # Prepare update data
    update_dict = {}
    if title:
        update_dict["title"] = title
    if description:
        update_dict["description"] = description
    if site_id is not None:
        update_dict["site_id"] = site_id if site_id != "" else None
        # Get site name
        if update_dict["site_id"]:
            site = await db.sites.find_one({"id": update_dict["site_id"]}, {"_id": 0})
            if site:
                update_dict["site_name"] = site["name"]
        else:
            update_dict["site_name"] = None
    if ticket_id is not None:
        update_dict["ticket_id"] = ticket_id if ticket_id != "" else None

    # Handle file update
    if file:
        # Determine folder name (use current site or new site if changed)
        # Note: ticket_id/site_id/title/desc might be updated above independently
        # We need the EFFECTIVE site_id for the file organization
        effective_site_id = site_id if site_id is not None else report.get("site_id")
        
        folder_name = "Unassigned"
        if effective_site_id:
             # If site_id came from form (site_id is not None), we might need to fetch it
             # If it came from DB record, we might need to fetch it too properly
             site = await db.sites.find_one({"id": effective_site_id}, {"_id": 0})
             if site:
                 folder_name = "".join(c for c in site["name"] if c.isalnum() or c in (' ', '-', '_')).strip().replace(' ', '_')
        
        # Prepare file storage for report
        reports_dir = UPLOAD_DIR / "reports" / folder_name
        reports_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"report_{timestamp}_{uuid.uuid4().hex[:8]}{file_extension}"
        file_path = reports_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        update_dict["file_name"] = file.filename
        update_dict["file_url"] = f"/uploads/reports/{folder_name}/{unique_filename}"
        update_dict["file_data"] = None # Clear old data if exists
    
    # NEW: If status is 'Revisi', reset to start of approval flow
    if report["status"] == "Revisi":
        # Get the division from the report creator (user who submitted the report)
        report_creator = await db.users.find_one({"id": report["submitted_by"]}, {"_id": 0})
        if not report_creator:
            raise HTTPException(status_code=404, detail="Report creator not found")
        
        creator_division = report_creator.get("division")
        
        # Determine first approver (similar to create_report logic)
        first_approver = None
        current_approver_role = "SPV"
        
        # Route Apps to TS, Fiberzone to Infra
        target_division = creator_division
        if target_division == "Apps":
            target_division = "TS"
        elif target_division == "Fiberzone":
            target_division = "Infra"
        
        # Find SPV of the target division
        spv = await db.users.find_one({"role": "SPV", "division": target_division})
        if spv:
            first_approver = spv["id"]
        else:
            # Fallback to Manager
            current_approver_role = "Manager"
            manager = await db.users.find_one({"role": "Manager", "division": target_division})
            if manager:
                first_approver = manager["id"]
            else:
                 # Fallback to VP
                current_approver_role = "VP"
                vp = await db.users.find_one({"role": "VP"})
                if vp:
                    first_approver = vp["id"]
        
        if first_approver:
            update_dict["status"] = f"Pending {current_approver_role}"
            update_dict["current_approver"] = first_approver
            update_dict["rejection_comment"] = None # Clear rejection comment
            
            # Notify the new approver
            await create_notification(
                user_id=first_approver,
                title="Resubmitted Report Needs Approval",
                message=f"Resubmitted report '{report['title']}' is awaiting your approval",
                notification_type="report",
                related_id=report["id"]
            )

    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_dict["version"] = report["version"] + 1
    
    await db.reports.update_one(
        {"id": report_id},
        {"$set": update_dict}
    )
    
    return {"message": "Report updated successfully"}

@api_router.delete("/reports/{report_id}")
async def delete_report(report_id: str, current_user: dict = Depends(get_current_user)):
    report = await db.reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Only the creator or Admin/SuperUser can delete
    if report["submitted_by"] != current_user["id"] and current_user["role"] not in ["Admin", "SuperUser"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this report")
    
    await db.reports.delete_one({"id": report_id})
    return {"message": "Report deleted successfully"}

@api_router.post("/reports/{report_id}/comments")
async def add_report_comment(report_id: str, comment_data: CommentCreate, current_user: dict = Depends(get_current_user)):
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    comment = Comment(
        user_id=current_user["id"],
        user_name=current_user["username"],
        text=comment_data.text
    )
    
    comment_doc = comment.model_dump()
    comment_doc['created_at'] = comment_doc['created_at'].isoformat()
    
    await db.reports.update_one(
        {"id": report_id},
        {"$push": {"comments": comment_doc}}
    )
    
    # Notify report creator if someone else comments
    if report["submitted_by"] != current_user["id"]:
        await create_notification(
            user_id=report["submitted_by"],
            title="New Comment on Report",
            message=f"{current_user['username']} commented on '{report['title']}'",
            notification_type="report",
            related_id=report_id
        )
        
    return {"message": "Comment added successfully"}

# ============ TICKET ENDPOINTS (V3) - UPDATED ============

@api_router.post("/tickets")
async def create_ticket(ticket_data: TicketCreate, current_user: dict = Depends(get_current_user)):
    # Get site name if site_id provided
    site_name = None
    if ticket_data.site_id:
        site = await db.sites.find_one({"id": ticket_data.site_id}, {"_id": 0})
        if site:
            site_name = site["name"]
    
    ticket = Ticket(
        title=ticket_data.title,
        description=ticket_data.description,
        priority=ticket_data.priority,
        status="Open",
        assigned_to_division=ticket_data.assigned_to_division,
        created_by=current_user["id"],
        created_by_name=current_user["username"],
        site_id=ticket_data.site_id,
        site_name=site_name
    )
    
    doc = ticket.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.tickets.insert_one(doc)
    
    manager = await db.users.find_one({"role": "Manager", "division": ticket_data.assigned_to_division}, {"_id": 0})
    if manager:
        await create_notification(
            user_id=manager["id"],
            title="New Ticket Assigned",
            message=f"New {ticket_data.priority} priority ticket: {ticket_data.title}",
            notification_type="ticket",
            related_id=ticket.id
        )
    
    return {"message": "Ticket created successfully", "id": ticket.id}

@api_router.get("/tickets")
async def get_tickets(site_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    # Universal visibility - all users can view all tickets
    query = {}
    if site_id:
        query["site_id"] = site_id
    
    tickets = await db.tickets.find(query, {"_id": 0}).to_list(1000)
    return tickets

@api_router.get("/tickets/list/all")
async def get_all_tickets_list(current_user: dict = Depends(get_current_user)):
    # Simple list of all tickets for dropdown selection
    tickets = await db.tickets.find({}, {"_id": 0, "id": 1, "title": 1, "created_at": 1}).to_list(1000)
    return tickets

@api_router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, current_user: dict = Depends(get_current_user)):
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

@api_router.patch("/tickets/{ticket_id}")
async def update_ticket(ticket_id: str, update_data: TicketUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": update_dict}
    )
    
    return {"message": "Ticket updated successfully"}

# PHASE 4 FIX: Full ticket edit endpoint (All authenticated users can edit)
@api_router.put("/tickets/{ticket_id}")
async def edit_ticket(ticket_id: str, edit_data: TicketEdit, current_user: dict = Depends(get_current_user)):
    
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Prepare update data
    update_dict = {}
    if edit_data.title:
        update_dict["title"] = edit_data.title
    if edit_data.description:
        update_dict["description"] = edit_data.description
    if edit_data.priority:
        update_dict["priority"] = edit_data.priority
    if edit_data.assigned_to_division:
        update_dict["assigned_to_division"] = edit_data.assigned_to_division
    if edit_data.site_id is not None:
        update_dict["site_id"] = edit_data.site_id
        # Get site name
        if edit_data.site_id:
            site = await db.sites.find_one({"id": edit_data.site_id}, {"_id": 0})
            if site:
                update_dict["site_name"] = site["name"]
        else:
            update_dict["site_name"] = None
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": update_dict}
    )
    
    return {"message": "Ticket edited successfully"}

@api_router.post("/tickets/{ticket_id}/close")
async def close_ticket(ticket_id: str, current_user: dict = Depends(get_current_user)):
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket.get("linked_report_id"):
        report = await db.reports.find_one({"id": ticket["linked_report_id"]}, {"_id": 0})
        if not report or report["status"] != "Final":
            raise HTTPException(status_code=400, detail="Cannot close ticket: linked report is not yet approved")
    
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": {"status": "Closed", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Ticket closed successfully"}

@api_router.post("/tickets/{ticket_id}/comments")
async def add_ticket_comment(ticket_id: str, comment_data: TicketComment, current_user: dict = Depends(get_current_user)):
    comment = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "user_name": current_user["username"],
        "comment": comment_data.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$push": {"comments": comment}}
    )
    
    return {"message": "Comment added successfully"}

@api_router.post("/tickets/{ticket_id}/link-report/{report_id}")
async def link_report_to_ticket(ticket_id: str, report_id: str, current_user: dict = Depends(get_current_user)):
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": {"linked_report_id": report_id}}
    )
    
    return {"message": "Report linked to ticket successfully"}

# ============ NOTIFICATION ENDPOINTS ============

@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return notifications

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}

@api_router.get("/notifications/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": current_user["id"], "read": False})
    return {"count": count}

# ============ DASHBOARD ENDPOINT ============

@api_router.get("/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc)
    today_str = today.isoformat()
    
    schedules_today = await db.schedules.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    schedules_today = [
        s for s in schedules_today 
        if datetime.fromisoformat(s["start_date"]).date() <= today.date() <= datetime.fromisoformat(s["end_date"]).date()
    ]
    
    pending_approvals = []
    if current_user["role"] in ["SPV", "Manager", "VP"]:
        pending_approvals = await db.reports.find(
            {"current_approver": current_user["id"]},
            {"_id": 0, "file_data": 0}
        ).to_list(100)
    
    open_tickets = []
    if current_user["role"] in ["Manager", "VP"]:
        query = {"status": {"$ne": "Closed"}}
        if current_user["role"] == "Manager":
            query["assigned_to_division"] = current_user.get("division")
        open_tickets = await db.tickets.find(query, {"_id": 0}).to_list(100)
    
    # NEW: Add pending account approvals and shift change requests
    pending_accounts = []
    pending_shift_changes = []
    
    if current_user["role"] in ["Manager", "VP"]:
        query = {"account_status": "pending"}
        if current_user["role"] == "Manager":
            query["division"] = current_user.get("division")
        pending_accounts = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(100)
        
        # Shift change requests
        query = {"status": "pending"}
        if current_user["role"] == "Manager":
            schedules = await db.schedules.find({"division": current_user.get("division")}, {"_id": 0}).to_list(10000)
            schedule_ids = [s["id"] for s in schedules]
            query["schedule_id"] = {"$in": schedule_ids}
        pending_shift_changes = await db.shift_change_requests.find(query, {"_id": 0}).to_list(100)
    
    return {
        "schedules_today": schedules_today,
        "pending_approvals": pending_approvals,
        "open_tickets": open_tickets,
        "pending_accounts": pending_accounts,
        "pending_shift_changes": pending_shift_changes
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.on_event("startup")
async def create_seed_data():
    existing_users = await db.users.count_documents({})
    if existing_users > 0:
        return
    
    logger.info("Creating seed data...")
    
    seed_users = [
        UserCreate(username="VP John", email="vp@company.com", password="password123", role="VP", division=None),
        UserCreate(username="Manager Mike", email="manager.monitoring@company.com", password="password123", role="Manager", division="Monitoring"),
        UserCreate(username="Manager Sarah", email="manager.infra@company.com", password="password123", role="Manager", division="Infra"),
        UserCreate(username="Manager Alex", email="manager.ts@company.com", password="password123", role="Manager", division="TS"),
        UserCreate(username="SPV Tom", email="spv.monitoring@company.com", password="password123", role="SPV", division="Monitoring"),
        UserCreate(username="SPV Lisa", email="spv.infra@company.com", password="password123", role="SPV", division="Infra"),
        UserCreate(username="SPV Mark", email="spv.ts@company.com", password="password123", role="SPV", division="TS"),
        UserCreate(username="Staff Alice", email="staff1.monitoring@company.com", password="password123", role="Staff", division="Monitoring"),
        UserCreate(username="Staff Bob", email="staff2.monitoring@company.com", password="password123", role="Staff", division="Monitoring"),
        UserCreate(username="Staff Charlie", email="staff1.infra@company.com", password="password123", role="Staff", division="Infra"),
        UserCreate(username="Staff Diana", email="staff2.infra@company.com", password="password123", role="Staff", division="Infra"),
        UserCreate(username="Staff Eve", email="staff1.ts@company.com", password="password123", role="Staff", division="TS"),
        UserCreate(username="Staff Frank", email="staff2.ts@company.com", password="password123", role="Staff", division="TS"),
        UserCreate(username="Super Admin", email="superuser@company.com", password="password123", role="SuperUser", division=None),  # NEW: SuperUser
    ]
    
    for user_data in seed_users:
        # All seed users are pre-approved
        user = User(
            username=user_data.username,
            email=user_data.email,
            password_hash=get_password_hash(user_data.password),
            role=user_data.role,
            division=user_data.division,
            account_status="approved"
        )
        doc = user.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.users.insert_one(doc)
    
    # Create sample sites
    sample_sites = [
        SiteCreate(name="Site A - Main Office", location="Jakarta", description="Main office location"),
        SiteCreate(name="Site B - Data Center", location="Bali", description="Primary data center"),
        SiteCreate(name="Site C - Branch Office", location="Surabaya", description="Regional branch"),
    ]
    
    vp = await db.users.find_one({"role": "VP"}, {"_id": 0})
    if vp:
        for site_data in sample_sites:
            site = Site(
                name=site_data.name,
                location=site_data.location,
                description=site_data.description,
                created_by=vp["id"]
            )
            doc = site.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.sites.insert_one(doc)
    
    # Create default activity categories
    default_categories = [
        "Meeting",
        "Survey",
        "Troubleshoot",
        "Visit",
        "Maintenance",
        "Installasi",
        "Others"
    ]
    
    for cat_name in default_categories:
        category = ActivityCategory(
            name=cat_name,
            created_by=vp["id"] if vp else "system"
        )
        doc = category.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.activity_categories.insert_one(doc)
    
    logger.info("Seed data created successfully!")
    logger.info("Sample login credentials: vp@company.com / password123")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
