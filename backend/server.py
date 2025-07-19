from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    first_name: str
    last_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    first_name: str
    last_name: str
    created_at: datetime
    is_active: bool

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class Hotel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    location: str
    rating: float  # 1-5 stars
    price_tier: str  # "Luxury", "Ultra-Luxury", "Presidential"
    thumbnail_image: str
    description: str
    amenities: List[str]
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def validate_password(password: str) -> dict:
    """Validate password strength"""
    errors = []
    
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    
    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter")
    
    if not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter")
    
    if not re.search(r"\d", password):
        errors.append("Password must contain at least one number")
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        errors.append("Password must contain at least one special character")
    
    return {"valid": len(errors) == 0, "errors": errors}

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return UserResponse(**user)

# Authentication routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate password
    password_validation = validate_password(user_data.password)
    if not password_validation["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Password validation failed", "errors": password_validation["errors"]}
        )
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        password_hash=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name
    )
    
    # Save to database
    await db.users.insert_one(user.dict())
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    user_response = UserResponse(**user.dict())
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

@api_router.post("/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    # Find user
    user = await db.users.find_one({"email": user_credentials.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(user_credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["id"]}, expires_delta=access_token_expires
    )
    
    user_response = UserResponse(**user)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/logout")
async def logout():
    return {"message": "Successfully logged out"}

# Existing routes
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate, current_user: UserResponse = Depends(get_current_user)):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(current_user: UserResponse = Depends(get_current_user)):
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

@api_router.get("/hotels", response_model=List[Hotel])
async def get_hotels():
    """Get list of luxury hotels - public endpoint for demo"""
    # Sample luxury hotel data
    luxury_hotels = [
        Hotel(
            name="The Ritz-Carlton New York",
            location="New York, NY",
            rating=4.8,
            price_tier="Ultra-Luxury",
            thumbnail_image="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop&crop=faces",
            description="Iconic luxury hotel in the heart of Manhattan with world-class service.",
            amenities=["Spa", "Fine Dining", "Concierge", "Fitness Center", "Business Center"]
        ),
        Hotel(
            name="Four Seasons Hotel George V",
            location="Paris, France",
            rating=4.9,
            price_tier="Presidential",
            thumbnail_image="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400&h=300&fit=crop&crop=faces",
            description="Palace hotel offering unparalleled luxury near the Champs-Élysées.",
            amenities=["Michelin Star Restaurant", "Luxury Spa", "Personal Butler", "Private Gardens"]
        ),
        Hotel(
            name="Burj Al Arab",
            location="Dubai, UAE",
            rating=4.7,
            price_tier="Ultra-Luxury",
            thumbnail_image="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=300&fit=crop&crop=faces",
            description="The world's most luxurious hotel, shaped like the sail of a dhow.",
            amenities=["Private Beach", "Helicopter Service", "Royal Suite", "Underwater Restaurant"]
        ),
        Hotel(
            name="Aman Tokyo",
            location="Tokyo, Japan",
            rating=4.6,
            price_tier="Luxury",
            thumbnail_image="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop&crop=faces",
            description="Serene urban sanctuary combining traditional Japanese aesthetics with modern luxury.",
            amenities=["Traditional Spa", "Zen Gardens", "Kaiseki Restaurant", "Tea Ceremony"]
        ),
        Hotel(
            name="Hotel Plaza Athénée",
            location="Paris, France",
            rating=4.8,
            price_tier="Ultra-Luxury",
            thumbnail_image="https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400&h=300&fit=crop&crop=faces",
            description="Parisian palace hotel with breathtaking views of the Eiffel Tower.",
            amenities=["Eiffel Tower Views", "Haute Couture Shopping", "Alain Ducasse Restaurant", "Dior Spa"]
        ),
        Hotel(
            name="The St. Regis Bora Bora",
            location="Bora Bora, French Polynesia",
            rating=4.9,
            price_tier="Presidential",
            thumbnail_image="https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=400&h=300&fit=crop&crop=faces",
            description="Overwater villas in a tropical paradise with crystal-clear lagoon views.",
            amenities=["Overwater Villas", "Private Beach", "Lagoon Spa", "Sunset Sailing"]
        ),
        Hotel(
            name="The Savoy London",
            location="London, UK",
            rating=4.7,
            price_tier="Luxury",
            thumbnail_image="https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop&crop=faces",
            description="Historic luxury hotel on the Strand with legendary afternoon tea service.",
            amenities=["Thames River Views", "Afternoon Tea", "Art Deco Bar", "Royal Suite"]
        ),
        Hotel(
            name="One&Only Cape Town",
            location="Cape Town, South Africa",
            rating=4.6,
            price_tier="Ultra-Luxury",
            thumbnail_image="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=faces",
            description="Contemporary luxury resort with stunning views of Table Mountain.",
            amenities=["Mountain Views", "Marina Access", "Wine Cellar", "Spa Island"]
        )
    ]
    
    return luxury_hotels

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()