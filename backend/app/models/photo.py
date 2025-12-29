from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PhotoBase(BaseModel):
    """Base photo model"""
    poi_id: str = Field(..., description="ID of the POI this photo belongs to")
    image_url: str = Field(..., description="URL of the photo")
    description: Optional[str] = Field(None, description="Brief description of the photo")


class PhotoCreate(PhotoBase):
    """Photo creation model"""
    author_id: str = Field(..., description="ID of the user uploading the photo")


class Photo(PhotoBase):
    """Photo model with metadata"""
    id: str = Field(..., alias="_id", description="Photo ID")
    author_id: str = Field(..., description="ID of the user who uploaded the photo")
    rating_count: int = Field(default=0, description="Number of ratings")
    average_rating: float = Field(default=0.0, description="Average rating (0-10)", ge=0, le=10)
    created_at: datetime = Field(..., description="Upload timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        populate_by_name = True


class PhotoDetail(Photo):
    """Photo model with additional details"""
    author_name: Optional[str] = Field(None, description="Name of the author")
    poi_name: Optional[str] = Field(None, description="Name of the associated POI")

