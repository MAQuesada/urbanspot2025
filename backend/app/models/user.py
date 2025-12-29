from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserBase(BaseModel):
    """Base user model"""

    name: str = Field(..., description="User name", min_length=1)
    email: EmailStr = Field(..., description="User email")


class UserCreate(UserBase):
    """User creation model"""

    password: str = Field(
        ...,
        description="User password",
        min_length=6,
        pattern="^[^\x00-\x1F]*$"  # No control characters
    )

    @field_validator('password')
    @classmethod
    def validate_password_bytes(cls, v: str) -> str:
        """Validate password byte length (bcrypt limit is 72 bytes)"""
        if not v:
            raise ValueError("Password cannot be empty")

        # Check byte length, not character length
        password_bytes = v.encode('utf-8')
        if len(password_bytes) > 72:
            raise ValueError(
                "Password cannot be longer than 72 bytes. Please use a shorter password."
            )

        return v


class UserLogin(BaseModel):
    """User login model"""

    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., description="User password")


class User(UserBase):
    """User model with ID and scores"""

    id: str = Field(..., alias="_id", description="User ID")
    poi_score: int = Field(default=0, description="Points from POI contributions")
    photo_score: int = Field(default=0, description="Points from photo contributions")
    total_score: int = Field(default=0, description="Total points")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        populate_by_name = True


class UserProfile(BaseModel):
    """User profile for display"""

    id: str
    name: str
    email: str
    poi_score: int
    photo_score: int
    total_score: int
    poi_count: int = Field(default=0, description="Number of POIs created")
    photo_count: int = Field(default=0, description="Number of photos uploaded")
    rating_count: int = Field(default=0, description="Number of ratings given")
