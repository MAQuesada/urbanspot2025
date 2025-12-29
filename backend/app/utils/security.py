import bcrypt

# Use bcrypt directly instead of passlib to avoid initialization issues
# with bcrypt 4.x and 5.x compatibility


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    try:
        # bcrypt.checkpw expects bytes
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt directly.

    Note: bcrypt has a 72-byte limit. Password validation should be done
    before calling this function.

    Args:
        password: Plain text password (should be validated for length before calling)

    Returns:
        Hashed password string

    Raises:
        ValueError: If password is empty or invalid
    """
    if not password:
        raise ValueError("Password cannot be empty")

    # Ensure password is a string
    if not isinstance(password, str):
        password = str(password)

    # Check byte length (not character length) since bcrypt uses bytes
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        raise ValueError(
            "Password cannot be longer than 72 bytes. Please use a shorter password."
        )

    # Use bcrypt directly
    try:
        # bcrypt.hashpw expects bytes and returns bytes
        hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
        return hashed.decode('utf-8')
    except (ValueError, TypeError) as e:
        # Re-raise with a clearer message
        error_msg = str(e)
        if "cannot be longer than 72 bytes" in error_msg.lower():
            raise ValueError(
                "Password cannot be longer than 72 bytes. Please use a shorter password."
            ) from e
        # If it's a different error, re-raise with context
        raise ValueError(f"Error hashing password: {error_msg}") from e

