from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from typing import List, Optional
from io import BytesIO
from app.models.poi import POI, POICreate, POIUpdate, POIDetail
from app.services.poi_service import POIService
from app.services.gamification import GamificationService
from app.utils.dependencies import get_storage
from app.utils.auth import verify_api_key

router = APIRouter(prefix="/pois", tags=["pois"])


def get_poi_service() -> POIService:
    """Dependency to get POIService instance"""
    storage = get_storage()
    gamification = GamificationService(storage)
    return POIService(storage, gamification)


@router.post("/", response_model=POI, status_code=status.HTTP_201_CREATED)
async def create_poi(
    name: str,
    description: str,
    latitude: float = Query(..., ge=-90, le=90, description="Latitude coordinate (-90 to 90)"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude coordinate (-180 to 180)"),
    author_id: str = Query(..., description="ID of the user creating the POI"),
    tags: Optional[str] = Query(None, description="Comma-separated list of tags"),
    image: UploadFile = File(...),
    _: bool = Depends(verify_api_key),
    poi_service: POIService = Depends(get_poi_service)
):
    """Create a new POI with image upload"""
    storage = get_storage()

    # Parse tags
    tag_list = []
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]

    # Upload image to S3
    image_content = await image.read()
    image_bytes = BytesIO(image_content)
    image_url = await storage.file_db.upload_file(
        image_bytes,
        image.filename or "poi_image.jpg",
        image.content_type or "image/jpeg",
        folder="pois"
    )

    # Create POI
    try:
        poi_data = POICreate(
            name=name,
            description=description,
            latitude=latitude,
            longitude=longitude,
            tags=tag_list,
            image_url=image_url,
            author_id=author_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid POI data: {str(e)}"
        )

    return await poi_service.create_poi(poi_data)


@router.get("/", response_model=List[POI])
async def get_all_pois(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    tags: Optional[str] = Query(None, description="Comma-separated list of tags to filter by"),
    _: bool = Depends(verify_api_key),
    poi_service: POIService = Depends(get_poi_service)
):
    """Get all POIs with optional filtering"""
    tag_list = None
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]

    return await poi_service.get_all_pois(skip=skip, limit=limit, tags=tag_list)


@router.get("/{poi_id}", response_model=POIDetail)
async def get_poi(
    poi_id: str,
    _: bool = Depends(verify_api_key),
    poi_service: POIService = Depends(get_poi_service)
):
    """Get POI by ID with details"""
    poi = await poi_service.get_poi_detail(poi_id)
    if not poi:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="POI not found"
        )
    return poi


@router.put("/{poi_id}", response_model=POI)
async def update_poi(
    poi_id: str,
    poi_update: POIUpdate,
    _: bool = Depends(verify_api_key),
    poi_service: POIService = Depends(get_poi_service)
):
    """Update a POI"""
    try:
        poi = await poi_service.update_poi(poi_id, poi_update)
        if not poi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="POI not found"
            )
        return poi
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid POI update data: {str(e)}"
        )


@router.delete("/{poi_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_poi(
    poi_id: str,
    _: bool = Depends(verify_api_key),
    poi_service: POIService = Depends(get_poi_service)
):
    """Delete a POI"""
    deleted = await poi_service.delete_poi(poi_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="POI not found"
        )

