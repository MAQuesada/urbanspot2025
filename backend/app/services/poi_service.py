from typing import Optional, List
from app.models.poi import POI, POICreate, POIUpdate, POIDetail
from app.utils.storage import Storage
from app.services.gamification import GamificationService


class POIService:
    """Service for POI management"""
    
    def __init__(self, storage: Storage, gamification: GamificationService):
        self.storage = storage
        self.gamification = gamification
    
    async def create_poi(self, poi_data: POICreate) -> POI:
        """Create a new POI"""
        poi_dict = poi_data.model_dump()
        poi_dict["rating_count"] = 0
        poi_dict["average_rating"] = 0.0
        
        created = await self.storage.data_db.create("pois", poi_dict)
        
        # Award points for creating POI
        await self.gamification.award_poi_created(poi_data.author_id)
        
        return POI(**created)
    
    async def get_poi_by_id(self, poi_id: str) -> Optional[POI]:
        """Get POI by ID"""
        poi = await self.storage.data_db.read_one("pois", {"_id": poi_id})
        return POI(**poi) if poi else None
    
    async def get_poi_detail(self, poi_id: str) -> Optional[POIDetail]:
        """Get POI with additional details"""
        poi = await self.get_poi_by_id(poi_id)
        if not poi:
            return None
        
        # Get author name
        author = await self.storage.data_db.read_one("users", {"_id": poi.author_id})
        author_name = author.get("name") if author else None
        
        # Count photos
        photos = await self.storage.data_db.read_many(
            "photos",
            {"poi_id": poi_id}
        )
        photo_count = len(photos)
        
        return POIDetail(
            **poi.model_dump(),
            author_name=author_name,
            photo_count=photo_count
        )
    
    async def get_all_pois(
        self, 
        skip: int = 0, 
        limit: int = 100,
        tags: Optional[List[str]] = None
    ) -> List[POI]:
        """Get all POIs with optional tag filtering"""
        filter_dict = {}
        if tags:
            filter_dict["tags"] = {"$in": tags}
        
        pois = await self.storage.data_db.read_many(
            "pois",
            filter_dict=filter_dict if filter_dict else None,
            skip=skip,
            limit=limit,
            sort_dict={"created_at": -1}
        )
        return [POI(**poi) for poi in pois]
    
    async def update_poi(self, poi_id: str, poi_update: POIUpdate) -> Optional[POI]:
        """Update a POI"""
        update_dict = {}
        update_data = poi_update.model_dump(exclude_unset=True)
        
        for key, value in update_data.items():
            if value is not None:
                update_dict[key] = value
        
        if not update_dict:
            return await self.get_poi_by_id(poi_id)
        
        await self.storage.data_db.update_one(
            "pois",
            {"_id": poi_id},
            {"$set": update_dict}
        )
        
        return await self.get_poi_by_id(poi_id)
    
    async def delete_poi(self, poi_id: str) -> bool:
        """Delete a POI and its associated photos"""
        poi = await self.get_poi_by_id(poi_id)
        if not poi:
            return False
        
        # Delete associated photos
        photos = await self.storage.data_db.read_many("photos", {"poi_id": poi_id})
        for photo in photos:
            # Delete photo file from S3
            await self.storage.file_db.delete_file(photo.get("image_url", ""))
            # Delete photo from database
            await self.storage.data_db.delete_one("photos", {"_id": photo["_id"]})
        
        # Delete POI image from S3
        await self.storage.file_db.delete_file(poi.image_url)
        
        # Delete POI
        return await self.storage.data_db.delete_one("pois", {"_id": poi_id})
    
    async def update_rating_stats(self, poi_id: str) -> None:
        """Update rating count and average rating for a POI"""
        ratings = await self.storage.data_db.read_many("ratings", {
            "target_type": "poi",
            "target_id": poi_id
        })
        
        if not ratings:
            await self.storage.data_db.update_one(
                "pois",
                {"_id": poi_id},
                {"$set": {"rating_count": 0, "average_rating": 0.0}}
            )
            return
        
        rating_count = len(ratings)
        total_score = sum(r["score"] for r in ratings)
        average_rating = total_score / rating_count
        
        await self.storage.data_db.update_one(
            "pois",
            {"_id": poi_id},
            {"$set": {"rating_count": rating_count, "average_rating": round(average_rating, 1)}}
        )
        
        # Check for high rating bonus
        poi = await self.get_poi_by_id(poi_id)
        if poi:
            await self.gamification.check_and_award_high_rating(
                poi.author_id,
                average_rating,
                "poi"
            )

