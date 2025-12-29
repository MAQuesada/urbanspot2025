from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List
from app.models.user import User, UserCreate, UserLogin, UserProfile
from app.services.user_service import UserService
from app.utils.dependencies import get_storage
from app.utils.auth import verify_api_key

router = APIRouter(prefix="/users", tags=["users"])


def get_user_service() -> UserService:
    """Dependency to get UserService instance"""
    storage = get_storage()
    return UserService(storage)


@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    _: bool = Depends(verify_api_key),
    user_service: UserService = Depends(get_user_service)
):
    """Create a new user with email and password"""
    try:
        # Validate password is not empty
        if not user_data.password or not user_data.password.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password cannot be empty"
            )
        
        # Validate password byte length (bcrypt limit is 72 bytes)
        password_bytes = user_data.password.encode('utf-8')
        if len(password_bytes) > 72:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password cannot be longer than 72 bytes. Please use a shorter password."
            )

        return await user_service.create_user(user_data)
    except HTTPException:
        raise
    except ValueError as e:
        error_msg = str(e)
        # Handle password-related errors
        if "password" in error_msg.lower() or "cannot be longer" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg if "cannot be longer" in error_msg.lower() 
                else "Invalid password format"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    except Exception as e:
        error_msg = str(e)
        # Handle bcrypt/passlib-specific errors
        if "cannot be longer than 72 bytes" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password cannot be longer than 72 bytes. Please use a shorter password."
            )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid user data: {error_msg}"
        )


@router.post("/authenticate", response_model=User)
async def authenticate_user(
    login_data: UserLogin,
    _: bool = Depends(verify_api_key),
    user_service: UserService = Depends(get_user_service)
):
    """Authenticate user with email and password, returns user if valid"""
    user = await user_service.authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    return user


@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: str,
    _: bool = Depends(verify_api_key),
    user_service: UserService = Depends(get_user_service)
):
    """Get user by ID"""
    user = await user_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.get("/{user_id}/profile", response_model=UserProfile)
async def get_user_profile(
    user_id: str,
    _: bool = Depends(verify_api_key),
    user_service: UserService = Depends(get_user_service)
):
    """Get user profile with contribution counts"""
    profile = await user_service.get_user_profile(user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return profile


@router.get("/ranking/global", response_model=List[UserProfile])
async def get_global_ranking(
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of users to return"),
    _: bool = Depends(verify_api_key),
    user_service: UserService = Depends(get_user_service)
):
    """Get global ranking of users by total score"""
    return await user_service.get_ranking(limit=limit)

