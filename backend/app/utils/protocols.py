from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from io import BytesIO


class FileDB(ABC):
    """Protocol for file storage operations"""
    
    @abstractmethod
    async def upload_file(
        self, 
        file_content: BytesIO, 
        file_name: str, 
        content_type: str,
        folder: Optional[str] = None
    ) -> str:
        """
        Upload a file and return its URL
        
        Args:
            file_content: File content as BytesIO
            file_name: Name of the file
            content_type: MIME type of the file
            folder: Optional folder/path prefix
            
        Returns:
            URL of the uploaded file
        """
        pass
    
    @abstractmethod
    async def delete_file(self, file_url: str) -> bool:
        """
        Delete a file by its URL
        
        Args:
            file_url: URL of the file to delete
            
        Returns:
            True if deleted successfully, False otherwise
        """
        pass
    
    @abstractmethod
    async def get_file_url(self, file_path: str) -> str:
        """
        Get the public URL of a file
        
        Args:
            file_path: Path to the file
            
        Returns:
            Public URL of the file
        """
        pass


class DataDB(ABC):
    """Protocol for database operations"""
    
    @abstractmethod
    async def connect(self) -> None:
        """Establish connection to the database"""
        pass
    
    @abstractmethod
    async def disconnect(self) -> None:
        """Close connection to the database"""
        pass
    
    @abstractmethod
    async def create(self, collection: str, document: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new document in a collection
        
        Args:
            collection: Name of the collection
            document: Document data as dictionary
            
        Returns:
            Created document with generated ID
        """
        pass
    
    @abstractmethod
    async def read_one(
        self, 
        collection: str, 
        filter_dict: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Read a single document from a collection
        
        Args:
            collection: Name of the collection
            filter_dict: Filter criteria
            
        Returns:
            Document if found, None otherwise
        """
        pass
    
    @abstractmethod
    async def read_many(
        self, 
        collection: str, 
        filter_dict: Optional[Dict[str, Any]] = None,
        skip: int = 0,
        limit: int = 100,
        sort_dict: Optional[Dict[str, int]] = None
    ) -> List[Dict[str, Any]]:
        """
        Read multiple documents from a collection
        
        Args:
            collection: Name of the collection
            filter_dict: Filter criteria
            skip: Number of documents to skip
            limit: Maximum number of documents to return
            sort_dict: Sort criteria (e.g., {"field": 1} for ascending, {"field": -1} for descending)
            
        Returns:
            List of documents
        """
        pass
    
    @abstractmethod
    async def update_one(
        self, 
        collection: str, 
        filter_dict: Dict[str, Any],
        update_dict: Dict[str, Any]
    ) -> bool:
        """
        Update a single document in a collection
        
        Args:
            collection: Name of the collection
            filter_dict: Filter criteria
            update_dict: Update operations
            
        Returns:
            True if updated successfully, False otherwise
        """
        pass
    
    @abstractmethod
    async def delete_one(
        self, 
        collection: str, 
        filter_dict: Dict[str, Any]
    ) -> bool:
        """
        Delete a single document from a collection
        
        Args:
            collection: Name of the collection
            filter_dict: Filter criteria
            
        Returns:
            True if deleted successfully, False otherwise
        """
        pass
    
    @abstractmethod
    async def aggregate(
        self, 
        collection: str, 
        pipeline: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Perform aggregation operations
        
        Args:
            collection: Name of the collection
            pipeline: Aggregation pipeline
            
        Returns:
            List of aggregated results
        """
        pass

