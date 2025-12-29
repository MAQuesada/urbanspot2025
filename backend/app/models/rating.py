from pydantic import BaseModel, Field, field_validator
from typing import Literal
from datetime import datetime


class RatingBase(BaseModel):
    """Base rating model"""
    user_id: str = Field(..., description="ID of the user giving the rating")
    score: float = Field(..., description="Rating score (0-10)", ge=0, le=10)
    target_type: Literal["poi", "photo"] = Field(..., description="Type of target being rated")
    target_id: str = Field(..., description="ID of the POI or Photo being rated")
    
    @field_validator('score')
    @classmethod
    def validate_score(cls, v):
        if not 0 <= v <= 10:
            raise ValueError('Score must be between 0 and 10')
        return round(v, 1)


class RatingCreate(RatingBase):
    """Rating creation model"""
    pass


class Rating(RatingBase):
    """Rating model with metadata"""
    id: str = Field(..., alias="_id", description="Rating ID")
    created_at: datetime = Field(..., description="Rating timestamp")
    
    class Config:
        populate_by_name = True

