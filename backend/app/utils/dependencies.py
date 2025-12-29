from app.utils.storage import Storage
from app.utils.s3_storage import S3FileDB
from app.utils.mongodb_storage import MongoDBDataDB

# Global storage instance
_storage: Storage | None = None


def get_storage() -> Storage:
    """Get or create the global Storage instance"""
    global _storage
    if _storage is None:
        file_db = S3FileDB()
        data_db = MongoDBDataDB()
        _storage = Storage(file_db, data_db)
    return _storage


async def startup_storage():
    """Initialize storage on application startup"""
    storage = get_storage()
    await storage.initialize()


async def shutdown_storage():
    """Shutdown storage on application shutdown"""
    global _storage
    if _storage:
        await _storage.shutdown()
        _storage = None

