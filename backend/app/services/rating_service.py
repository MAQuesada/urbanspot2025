from typing import Optional
from app.models.rating import Rating, RatingCreate
from app.utils.storage import Storage
from app.services.gamification import GamificationService
from app.services.poi_service import POIService
from app.services.photo_service import PhotoService


class RatingService:
    """Service for rating management"""
    
    def __init__(
        self, 
        storage: Storage, 
        gamification: GamificationService,
        poi_service: POIService,
        photo_service: PhotoService
    ):
        self.storage = storage
        self.gamification = gamification
        self.poi_service = poi_service
        self.photo_service = photo_service
    
    async def create_rating(self, rating_data: RatingCreate) -> Optional[Rating]:
        """Create a new rating"""
        # Check if user already rated this target
        existing = await self.storage.data_db.read_one("ratings", {
            "user_id": rating_data.user_id,
            "target_type": rating_data.target_type,
            "target_id": rating_data.target_id
        })
        
        if existing:
            return None  # User already rated this
        
        # Check if user is rating their own contribution
        if rating_data.target_type == "poi":
            poi = await self.poi_service.get_poi_by_id(rating_data.target_id)
            if poi and poi.author_id == rating_data.user_id:
                return None  # Cannot rate own POI
        elif rating_data.target_type == "photo":
            photo = await self.photo_service.get_photo_by_id(rating_data.target_id)
            if photo and photo.author_id == rating_data.user_id:
                return None  # Cannot rate own photo
        
        # Create rating
        rating_dict = rating_data.model_dump()
        created = await self.storage.data_db.create("ratings", rating_dict)
        
        # Award points for giving rating
        await self.gamification.award_rating_given(rating_data.user_id)
        
        # Update rating stats for target
        if rating_data.target_type == "poi":
            await self.poi_service.update_rating_stats(rating_data.target_id)
        elif rating_data.target_type == "photo":
            await self.photo_service.update_rating_stats(rating_data.target_id)
        
        return Rating(**created)
    
    async def get_rating_by_id(self, rating_id: str) -> Optional[Rating]:
        """Get rating by ID"""
        rating = await self.storage.data_db.read_one("ratings", {"_id": rating_id})
        return Rating(**rating) if rating else None
    
    async def delete_rating(self, rating_id: str) -> bool:
        """Delete a rating and update stats"""
        rating = await self.get_rating_by_id(rating_id)
        if not rating:
            return False
        
        # Delete rating
        deleted = await self.storage.data_db.delete_one("ratings", {"_id": rating_id})
        
        if deleted:
            # Update rating stats for target
            if rating.target_type == "poi":
                await self.poi_service.update_rating_stats(rating.target_id)
            elif rating.target_type == "photo":
                await self.photo_service.update_rating_stats(rating.target_id)
        
        return deleted

