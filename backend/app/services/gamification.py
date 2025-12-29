from typing import Dict, Any
from app.utils.storage import Storage


class GamificationService:
    """Service for managing user points and gamification"""
    
    # Point values
    POINTS_POI_CREATED = 20
    POINTS_POI_HIGH_RATING = 10  # When average rating > 7
    POINTS_PHOTO_UPLOADED = 5
    POINTS_PHOTO_HIGH_RATING = 10  # When average rating > 7
    POINTS_RATING_GIVEN = 1
    
    def __init__(self, storage: Storage):
        self.storage = storage
    
    async def award_poi_created(self, user_id: str) -> None:
        """Award points for creating a POI"""
        await self._add_points(user_id, self.POINTS_POI_CREATED, "poi")
    
    async def award_photo_uploaded(self, user_id: str) -> None:
        """Award points for uploading a photo"""
        await self._add_points(user_id, self.POINTS_PHOTO_UPLOADED, "photo")
    
    async def award_rating_given(self, user_id: str) -> None:
        """Award points for giving a rating"""
        await self._add_points(user_id, self.POINTS_RATING_GIVEN, "rating")
    
    async def check_and_award_high_rating(
        self, 
        author_id: str, 
        average_rating: float, 
        target_type: str
    ) -> None:
        """
        Check if average rating is > 7 and award bonus points
        
        Args:
            author_id: ID of the author of the POI/Photo
            average_rating: Current average rating
            target_type: "poi" or "photo"
        """
        if average_rating > 7:
            if target_type == "poi":
                await self._add_points(author_id, self.POINTS_POI_HIGH_RATING, "poi")
            elif target_type == "photo":
                await self._add_points(author_id, self.POINTS_PHOTO_HIGH_RATING, "photo")
    
    async def _add_points(self, user_id: str, points: int, score_type: str) -> None:
        """
        Add points to user's score
        
        Args:
            user_id: ID of the user
            points: Points to add
            score_type: "poi", "photo", or "rating"
        """
        user = await self.storage.data_db.read_one("users", {"_id": user_id})
        if not user:
            return
        
        update_dict: Dict[str, Any] = {}
        
        if score_type == "poi":
            new_poi_score = user.get("poi_score", 0) + points
            update_dict["poi_score"] = new_poi_score
        elif score_type == "photo":
            new_photo_score = user.get("photo_score", 0) + points
            update_dict["photo_score"] = new_photo_score
        
        # Update total score
        current_total = user.get("total_score", 0)
        update_dict["total_score"] = current_total + points
        
        await self.storage.data_db.update_one(
            "users",
            {"_id": user_id},
            {"$set": update_dict}
        )

