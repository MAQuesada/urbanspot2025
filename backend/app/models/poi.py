from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime


class POIBase(BaseModel):
    """Base POI model"""
    name: str = Field(..., description="POI name", min_length=1)
    description: str = Field(..., description="POI description", min_length=1)
    latitude: float = Field(..., description="Latitude coordinate", ge=-90, le=90)
    longitude: float = Field(..., description="Longitude coordinate", ge=-180, le=180)
    tags: Optional[List[str]] = Field(default=[], description="POI tags (e.g., movilidad, cultura, turismo)")
    image_url: str = Field(..., description="URL of the initial image")


class POICreate(POIBase):
    """POI creation model"""
    author_id: str = Field(..., description="ID of the user creating the POI")


class POIUpdate(BaseModel):
    """POI update model"""
    name: Optional[str] = Field(None, description="POI name", min_length=1)
    description: Optional[str] = Field(None, description="POI description", min_length=1)
    tags: Optional[List[str]] = Field(None, description="POI tags")
    latitude: Optional[float] = Field(None, description="Latitude coordinate", ge=-90, le=90)
    longitude: Optional[float] = Field(None, description="Longitude coordinate", ge=-180, le=180)


class POI(POIBase):
    """POI model with metadata"""
    id: str = Field(..., alias="_id", description="POI ID")
    author_id: str = Field(..., description="ID of the user who created the POI")
    rating_count: int = Field(default=0, description="Number of ratings")
    average_rating: float = Field(default=0.0, description="Average rating (0-10)", ge=0, le=10)
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        populate_by_name = True


class POIDetail(POI):
    """POI model with additional details"""
    author_name: Optional[str] = Field(None, description="Name of the author")
    photo_count: int = Field(default=0, description="Number of photos associated with this POI")

