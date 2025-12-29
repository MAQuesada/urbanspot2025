from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional, Dict, Any, List
from bson import ObjectId
from datetime import datetime

from app.config import config
from app.utils.protocols import DataDB


class MongoDBDataDB(DataDB):
    """MongoDB Atlas implementation of DataDB protocol"""

    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database: Optional[AsyncIOMotorDatabase] = None
        self.uri = config.MONGODB_URI
        self.db_name = config.MONGODB_DATABASE

    async def connect(self) -> None:
        """Establish connection to MongoDB Atlas"""
        # Validate URI is set
        if not self.uri or self.uri.strip() == "":
            raise ValueError(
                "MONGODB_URI is not set. Please configure it in your .env file. "
                "Format: mongodb+srv://username:password@cluster-name.mongodb.net/dbname?retryWrites=true&w=majority"
            )

        # Validate URI format
        if not (self.uri.startswith("mongodb://") or self.uri.startswith("mongodb+srv://")):
            raise ValueError(
                f"Invalid MongoDB URI format. URI must start with 'mongodb://' or 'mongodb+srv://'. "
                f"Current URI starts with: {self.uri[:20] if len(self.uri) > 20 else self.uri}..."
            )

        try:
            self.client = AsyncIOMotorClient(self.uri)
            self.database = self.client[self.db_name]
            # Test connection
            await self.client.admin.command("ping")
        except Exception as e:
            error_msg = str(e)
            # Provide more helpful error messages
            if "DNS query name does not exist" in error_msg:
                raise ValueError(
                    f"Invalid MongoDB cluster name in URI. The DNS record for your cluster cannot be found. "
                    f"Please verify:\n"
                    f"1. The cluster name in your URI is correct (not 'cluster' but your actual cluster name)\n"
                    f"2. The cluster exists in MongoDB Atlas\n"
                    f"3. Your network has access to MongoDB Atlas\n"
                    f"Original error: {error_msg}"
                )
            elif "authentication failed" in error_msg.lower():
                raise ValueError(
                    f"MongoDB authentication failed. Please check your username and password in the URI. "
                    f"Original error: {error_msg}"
                )
            else:
                raise Exception(f"Error connecting to MongoDB: {error_msg}")

    async def disconnect(self) -> None:
        """Close connection to MongoDB"""
        if self.client:
            self.client.close()

    def _convert_objectid(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convert ObjectId to string in document"""
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    def _convert_objectids_in_list(self, docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert ObjectIds to strings in list of documents"""
        return [self._convert_objectid(doc) for doc in docs]

    async def create(self, collection: str, document: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new document in a collection"""
        if self.database is None:
            raise Exception("Database not connected")

        # Add timestamp
        document["created_at"] = datetime.utcnow()
        document["updated_at"] = datetime.utcnow()

        result = await self.database[collection].insert_one(document)
        created_doc = await self.database[collection].find_one({"_id": result.inserted_id})
        return self._convert_objectid(created_doc)

    async def read_one(
        self, collection: str, filter_dict: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Read a single document from a collection"""
        if self.database is None:
            raise Exception("Database not connected")

        # Convert string IDs to ObjectId if needed
        if "_id" in filter_dict and isinstance(filter_dict["_id"], str):
            try:
                filter_dict["_id"] = ObjectId(filter_dict["_id"])
            except:
                pass

        doc = await self.database[collection].find_one(filter_dict)
        return self._convert_objectid(doc) if doc else None

    async def read_many(
        self,
        collection: str,
        filter_dict: Optional[Dict[str, Any]] = None,
        skip: int = 0,
        limit: int = 100,
        sort_dict: Optional[Dict[str, int]] = None,
    ) -> List[Dict[str, Any]]:
        """Read multiple documents from a collection"""
        if self.database is None:
            raise Exception("Database not connected")

        if filter_dict is None:
            filter_dict = {}

        # Convert string IDs to ObjectId if needed
        if "_id" in filter_dict and isinstance(filter_dict["_id"], str):
            try:
                filter_dict["_id"] = ObjectId(filter_dict["_id"])
            except:
                pass

        cursor = self.database[collection].find(filter_dict)

        if sort_dict:
            cursor = cursor.sort(list(sort_dict.items()))

        cursor = cursor.skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return self._convert_objectids_in_list(docs)

    async def update_one(
        self, collection: str, filter_dict: Dict[str, Any], update_dict: Dict[str, Any]
    ) -> bool:
        """Update a single document in a collection"""
        if self.database is None:
            raise Exception("Database not connected")

        # Convert string IDs to ObjectId if needed
        if "_id" in filter_dict and isinstance(filter_dict["_id"], str):
            try:
                filter_dict["_id"] = ObjectId(filter_dict["_id"])
            except:
                pass

        # Add updated_at timestamp
        if "$set" in update_dict:
            update_dict["$set"]["updated_at"] = datetime.utcnow()
        else:
            update_dict["$set"] = {"updated_at": datetime.utcnow()}

        result = await self.database[collection].update_one(filter_dict, update_dict)
        return result.modified_count > 0

    async def delete_one(self, collection: str, filter_dict: Dict[str, Any]) -> bool:
        """Delete a single document from a collection"""
        if self.database is None:
            raise Exception("Database not connected")

        # Convert string IDs to ObjectId if needed
        if "_id" in filter_dict and isinstance(filter_dict["_id"], str):
            try:
                filter_dict["_id"] = ObjectId(filter_dict["_id"])
            except:
                pass

        result = await self.database[collection].delete_one(filter_dict)
        return result.deleted_count > 0

    async def aggregate(
        self, collection: str, pipeline: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Perform aggregation operations"""
        if self.database is None:
            raise Exception("Database not connected")

        cursor = self.database[collection].aggregate(pipeline)
        docs = await cursor.to_list(length=None)
        return self._convert_objectids_in_list(docs)
