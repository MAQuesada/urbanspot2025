from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from typing import List
from io import BytesIO
from app.models.photo import Photo, PhotoCreate, PhotoDetail
from app.services.photo_service import PhotoService
from app.services.gamification import GamificationService
from app.utils.dependencies import get_storage
from app.utils.auth import verify_api_key

router = APIRouter(prefix="/photos", tags=["photos"])


def get_photo_service() -> PhotoService:
    """Dependency to get PhotoService instance"""
    storage = get_storage()
    gamification = GamificationService(storage)
    return PhotoService(storage, gamification)


@router.post("/", response_model=Photo, status_code=status.HTTP_201_CREATED)
async def create_photo(
    poi_id: str,
    author_id: str = Query(..., description="ID of the user uploading the photo"),
    description: str = "",
    image: UploadFile = File(...),
    _: bool = Depends(verify_api_key),
    photo_service: PhotoService = Depends(get_photo_service)
):
    """Upload a new photo to a POI"""
    storage = get_storage()
    
    # Verify POI exists
    from app.services.poi_service import POIService
    poi_service = POIService(storage, GamificationService(storage))
    poi = await poi_service.get_poi_by_id(poi_id)
    if not poi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="POI not found"
        )
    
    # Upload image to S3
    image_content = await image.read()
    image_bytes = BytesIO(image_content)
    image_url = await storage.file_db.upload_file(
        image_bytes,
        image.filename or "photo.jpg",
        image.content_type or "image/jpeg",
        folder="photos"
    )
    
    # Create photo
    try:
        photo_data = PhotoCreate(
            poi_id=poi_id,
            author_id=author_id,
            image_url=image_url,
            description=description if description else None
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid photo data: {str(e)}"
        )
    
    return await photo_service.create_photo(photo_data)


@router.get("/poi/{poi_id}", response_model=List[Photo])
async def get_photos_by_poi(
    poi_id: str,
    _: bool = Depends(verify_api_key),
    photo_service: PhotoService = Depends(get_photo_service)
):
    """Get all photos for a specific POI"""
    return await photo_service.get_photos_by_poi(poi_id)


@router.get("/{photo_id}", response_model=PhotoDetail)
async def get_photo(
    photo_id: str,
    _: bool = Depends(verify_api_key),
    photo_service: PhotoService = Depends(get_photo_service)
):
    """Get photo by ID with details"""
    photo = await photo_service.get_photo_detail(photo_id)
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )
    return photo


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: str,
    _: bool = Depends(verify_api_key),
    photo_service: PhotoService = Depends(get_photo_service)
):
    """Delete a photo"""
    deleted = await photo_service.delete_photo(photo_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo not found"
        )

