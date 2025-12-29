from typing import Optional, List
from app.models.photo import Photo, PhotoCreate, PhotoDetail
from app.utils.storage import Storage
from app.services.gamification import GamificationService


class PhotoService:
    """Service for photo management"""
    
    def __init__(self, storage: Storage, gamification: GamificationService):
        self.storage = storage
        self.gamification = gamification
    
    async def create_photo(self, photo_data: PhotoCreate) -> Photo:
        """Create a new photo"""
        photo_dict = photo_data.model_dump()
        photo_dict["rating_count"] = 0
        photo_dict["average_rating"] = 0.0
        
        created = await self.storage.data_db.create("photos", photo_dict)
        
        # Award points for uploading photo
        await self.gamification.award_photo_uploaded(photo_data.author_id)
        
        return Photo(**created)
    
    async def get_photo_by_id(self, photo_id: str) -> Optional[Photo]:
        """Get photo by ID"""
        photo = await self.storage.data_db.read_one("photos", {"_id": photo_id})
        return Photo(**photo) if photo else None
    
    async def get_photo_detail(self, photo_id: str) -> Optional[PhotoDetail]:
        """Get photo with additional details"""
        photo = await self.get_photo_by_id(photo_id)
        if not photo:
            return None
        
        # Get author name
        author = await self.storage.data_db.read_one("users", {"_id": photo.author_id})
        author_name = author.get("name") if author else None
        
        # Get POI name
        poi = await self.storage.data_db.read_one("pois", {"_id": photo.poi_id})
        poi_name = poi.get("name") if poi else None
        
        return PhotoDetail(
            **photo.model_dump(),
            author_name=author_name,
            poi_name=poi_name
        )
    
    async def get_photos_by_poi(self, poi_id: str) -> List[Photo]:
        """Get all photos for a specific POI"""
        photos = await self.storage.data_db.read_many(
            "photos",
            {"poi_id": poi_id},
            sort_dict={"created_at": -1}
        )
        return [Photo(**photo) for photo in photos]
    
    async def delete_photo(self, photo_id: str) -> bool:
        """Delete a photo"""
        photo = await self.get_photo_by_id(photo_id)
        if not photo:
            return False
        
        # Delete photo file from S3
        await self.storage.file_db.delete_file(photo.image_url)
        
        # Delete photo from database
        return await self.storage.data_db.delete_one("photos", {"_id": photo_id})
    
    async def update_rating_stats(self, photo_id: str) -> None:
        """Update rating count and average rating for a photo"""
        ratings = await self.storage.data_db.read_many("ratings", {
            "target_type": "photo",
            "target_id": photo_id
        })
        
        if not ratings:
            await self.storage.data_db.update_one(
                "photos",
                {"_id": photo_id},
                {"$set": {"rating_count": 0, "average_rating": 0.0}}
            )
            return
        
        rating_count = len(ratings)
        total_score = sum(r["score"] for r in ratings)
        average_rating = total_score / rating_count
        
        await self.storage.data_db.update_one(
            "photos",
            {"_id": photo_id},
            {"$set": {"rating_count": rating_count, "average_rating": round(average_rating, 1)}}
        )
        
        # Check for high rating bonus
        photo = await self.get_photo_by_id(photo_id)
        if photo:
            await self.gamification.check_and_award_high_rating(
                photo.author_id,
                average_rating,
                "photo"
            )

