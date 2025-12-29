from app.utils.protocols import FileDB, DataDB


class Storage:
    """Storage class that manages file and data storage operations"""
    
    def __init__(self, file_db: FileDB, data_db: DataDB):
        """
        Initialize Storage with file and data storage implementations
        
        Args:
            file_db: Implementation of FileDB protocol (e.g., S3FileDB)
            data_db: Implementation of DataDB protocol (e.g., MongoDBDataDB)
        """
        self.file_db = file_db
        self.data_db = data_db
    
    async def initialize(self) -> None:
        """Initialize connections to storage systems"""
        await self.data_db.connect()
    
    async def shutdown(self) -> None:
        """Close connections to storage systems"""
        await self.data_db.disconnect()

