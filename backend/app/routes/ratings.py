from fastapi import APIRouter, Depends, HTTPException, status
from app.models.rating import Rating, RatingCreate
from app.services.rating_service import RatingService
from app.services.poi_service import POIService
from app.services.photo_service import PhotoService
from app.services.gamification import GamificationService
from app.utils.dependencies import get_storage
from app.utils.auth import verify_api_key

router = APIRouter(prefix="/ratings", tags=["ratings"])


def get_rating_service() -> RatingService:
    """Dependency to get RatingService instance"""
    storage = get_storage()
    gamification = GamificationService(storage)
    poi_service = POIService(storage, gamification)
    photo_service = PhotoService(storage, gamification)
    return RatingService(storage, gamification, poi_service, photo_service)


@router.post("/", response_model=Rating, status_code=status.HTTP_201_CREATED)
async def create_rating(
    rating_data: RatingCreate,
    _: bool = Depends(verify_api_key),
    rating_service: RatingService = Depends(get_rating_service)
):
    """Create a new rating for a POI or photo"""
    try:
        rating = await rating_service.create_rating(rating_data)
        if not rating:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create rating. User may have already rated this item or is trying to rate their own contribution."
            )
        return rating
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid rating data: {str(e)}"
        )


@router.get("/{rating_id}", response_model=Rating)
async def get_rating(
    rating_id: str,
    _: bool = Depends(verify_api_key),
    rating_service: RatingService = Depends(get_rating_service)
):
    """Get rating by ID"""
    rating = await rating_service.get_rating_by_id(rating_id)
    if not rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rating not found"
        )
    return rating


@router.delete("/{rating_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rating(
    rating_id: str,
    _: bool = Depends(verify_api_key),
    rating_service: RatingService = Depends(get_rating_service)
):
    """Delete a rating"""
    deleted = await rating_service.delete_rating(rating_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rating not found"
        )

