from typing import Optional, List
from app.models.user import User, UserCreate, UserProfile
from app.utils.storage import Storage
from app.utils.security import get_password_hash, verify_password


class UserService:
    """Service for user management"""
    
    def __init__(self, storage: Storage):
        self.storage = storage
    
    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user with hashed password"""
        # Check if user already exists
        existing = await self.get_user_by_email(user_data.email)
        if existing:
            raise ValueError("User with this email already exists")
        
        user_dict = user_data.model_dump(exclude={"password"})
        # Hash password
        user_dict["hashed_password"] = get_password_hash(user_data.password)
        user_dict["poi_score"] = 0
        user_dict["photo_score"] = 0
        user_dict["total_score"] = 0
        
        created = await self.storage.data_db.create("users", user_dict)
        # Remove password from response
        created.pop("hashed_password", None)
        return User(**created)
    
    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """
        Authenticate a user by email and password
        
        Args:
            email: User email
            password: Plain text password
            
        Returns:
            User if authentication successful, None otherwise
        """
        user_dict = await self.storage.data_db.read_one("users", {"email": email})
        if not user_dict:
            return None
        
        hashed_password = user_dict.get("hashed_password")
        if not hashed_password or not verify_password(password, hashed_password):
            return None
        
        # Remove password from response
        user_dict.pop("hashed_password", None)
        return User(**user_dict)
    
    async def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        user = await self.storage.data_db.read_one("users", {"_id": user_id})
        if user:
            user.pop("hashed_password", None)
            return User(**user)
        return None
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        user = await self.storage.data_db.read_one("users", {"email": email})
        if user:
            user.pop("hashed_password", None)
            return User(**user)
        return None
    
    async def get_user_profile(self, user_id: str) -> Optional[UserProfile]:
        """Get user profile with contribution counts"""
        user = await self.get_user_by_id(user_id)
        if not user:
            return None
        
        # Count POIs
        pois = await self.storage.data_db.read_many(
            "pois",
            {"author_id": user_id}
        )
        poi_count = len(pois)
        
        # Count photos
        photos = await self.storage.data_db.read_many(
            "photos",
            {"author_id": user_id}
        )
        photo_count = len(photos)
        
        # Count ratings
        ratings = await self.storage.data_db.read_many(
            "ratings",
            {"user_id": user_id}
        )
        rating_count = len(ratings)
        
        return UserProfile(
            id=user.id,
            name=user.name,
            email=user.email,
            poi_score=user.poi_score,
            photo_score=user.photo_score,
            total_score=user.total_score,
            poi_count=poi_count,
            photo_count=photo_count,
            rating_count=rating_count
        )
    
    async def get_ranking(self, limit: int = 100) -> List[UserProfile]:
        """Get global ranking of users by total score"""
        users = await self.storage.data_db.read_many(
            "users",
            sort_dict={"total_score": -1},
            limit=limit
        )
        
        profiles = []
        for user in users:
            profile = await self.get_user_profile(user["_id"])
            if profile:
                profiles.append(profile)
        
        return profiles

