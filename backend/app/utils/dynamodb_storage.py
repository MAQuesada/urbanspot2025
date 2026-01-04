import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import boto3
from botocore.exceptions import ClientError

from app.config import config
from app.utils.protocols import DataDB


class DynamoDBDataDB(DataDB):
    """DynamoDB implementation of DataDB protocol"""

    def __init__(self):
        self.client: Any = None
        self.region = config.AWS_REGION
        self.table_prefix = config.DYNAMODB_TABLE_PREFIX

    async def connect(self) -> None:
        """Establish connection to DynamoDB"""
        try:
            # Initialize DynamoDB client
            self.client = boto3.client(
                'dynamodb',
                region_name=self.region,
                aws_access_key_id=config.AWS_ACCESS_KEY_ID if config.AWS_ACCESS_KEY_ID else None,
                aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY if config.AWS_SECRET_ACCESS_KEY else None
            )

            # Test connection by listing tables
            self.client.list_tables()
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            if error_code == 'ResourceNotFoundException':
                raise ValueError(
                    f"DynamoDB service not found in region {self.region}. "
                    f"Please verify your AWS configuration and region."
                )
            elif error_code in ['InvalidClientTokenId', 'SignatureDoesNotMatch']:
                raise ValueError(
                    f"DynamoDB authentication failed. Please check your AWS credentials. "
                    f"Original error: {str(e)}"
                )
            else:
                raise Exception(f"Error connecting to DynamoDB: {str(e)}")
        except Exception as e:
            raise Exception(f"Error initializing DynamoDB client: {str(e)}")

    async def disconnect(self) -> None:
        """Close connection to DynamoDB"""
        # DynamoDB client doesn't require explicit closing, but we can set it to None
        self.client = None

    def _get_table_name(self, collection: str) -> str:
        """Get DynamoDB table name from collection name"""
        return f"{self.table_prefix}-{collection}"

    def _ensure_table_exists(self, table_name: str) -> None:
        """Ensure table exists, create if it doesn't"""
        if self.client is None:
            raise Exception("Database not connected")
        try:
            # Check if table exists
            self.client.describe_table(TableName=table_name)
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                # Table doesn't exist, create it
                self._create_table(table_name)
            else:
                raise

    def _create_table(self, table_name: str) -> None:
        """Create a DynamoDB table"""
        if self.client is None:
            raise Exception("Database not connected")
        try:
            self.client.create_table(
                TableName=table_name,
                KeySchema=[
                    {
                        'AttributeName': '_id',
                        'KeyType': 'HASH'  # Partition key
                    }
                ],
                AttributeDefinitions=[
                    {
                        'AttributeName': '_id',
                        'AttributeType': 'S'  # String
                    }
                ],
                BillingMode='PAY_PER_REQUEST'  # On-demand pricing (Free Tier compatible)
            )
            # Wait for table to be created
            waiter = self.client.get_waiter('table_exists')
            waiter.wait(TableName=table_name)
        except ClientError as e:
            # If table already exists, ignore the error
            if e.response['Error']['Code'] != 'ResourceInUseException':
                raise Exception(f"Error creating DynamoDB table {table_name}: {str(e)}")

    def _dynamodb_to_dict(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Convert DynamoDB item format to Python dict"""
        result = {}
        for key, value in item.items():
            # DynamoDB uses type descriptors like {'S': 'value'} for strings
            if 'S' in value:
                result[key] = value['S']
            elif 'N' in value:
                # Try to convert to int first, then float
                num_str = value['N']
                try:
                    result[key] = int(num_str)
                except ValueError:
                    result[key] = float(num_str)
            elif 'BOOL' in value:
                result[key] = value['BOOL']
            elif 'NULL' in value:
                result[key] = None
            elif 'L' in value:
                result[key] = [self._dynamodb_to_dict({'item': v})['item'] if isinstance(v, dict) else v for v in value['L']]
            elif 'M' in value:
                result[key] = self._dynamodb_to_dict(value['M'])
            elif 'SS' in value:
                result[key] = list(value['SS'])
            elif 'NS' in value:
                result[key] = [int(n) if '.' not in n else float(n) for n in value['NS']]
        return result

    def _dict_to_dynamodb(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Convert Python dict to DynamoDB item format"""
        result = {}
        for key, value in item.items():
            if isinstance(value, str):
                result[key] = {'S': value}
            elif isinstance(value, (int, float)):
                result[key] = {'N': str(value)}
            elif isinstance(value, bool):
                result[key] = {'BOOL': value}
            elif value is None:
                result[key] = {'NULL': True}
            elif isinstance(value, list):
                # Check if it's a list of strings (SS) or numbers (NS)
                if value and isinstance(value[0], str):
                    result[key] = {'SS': value}
                elif value and isinstance(value[0], (int, float)):
                    result[key] = {'NS': [str(v) for v in value]}
                else:
                    result[key] = {'L': [self._dict_to_dynamodb({'item': v})['item'] if isinstance(v, dict) else {'S': str(v)} for v in value]}
            elif isinstance(value, dict):
                result[key] = {'M': self._dict_to_dynamodb(value)}
            else:
                result[key] = {'S': str(value)}
        return result

    async def create(self, collection: str, document: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new document in a collection"""
        if self.client is None:
            raise Exception("Database not connected")

        table_name = self._get_table_name(collection)
        self._ensure_table_exists(table_name)

        # Generate ID if not provided
        if "_id" not in document:
            document["_id"] = str(uuid.uuid4())

        # Add timestamps
        document["created_at"] = datetime.utcnow().isoformat()
        document["updated_at"] = datetime.utcnow().isoformat()

        # Convert to DynamoDB format
        dynamodb_item = self._dict_to_dynamodb(document)

        try:
            self.client.put_item(TableName=table_name, Item=dynamodb_item)
            # Return the created document
            return document
        except ClientError as e:
            raise Exception(f"Error creating document in DynamoDB: {str(e)}")

    async def read_one(
        self, collection: str, filter_dict: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Read a single document from a collection"""
        if self.client is None:
            raise Exception("Database not connected")

        table_name = self._get_table_name(collection)

        # If filtering by _id, use get_item (more efficient)
        if "_id" in filter_dict and len(filter_dict) == 1:
            try:
                response = self.client.get_item(
                    TableName=table_name,
                    Key={'_id': {'S': str(filter_dict["_id"])}}
                )
                if 'Item' in response:
                    return self._dynamodb_to_dict(response['Item'])
                return None
            except ClientError as e:
                if e.response['Error']['Code'] == 'ResourceNotFoundException':
                    return None
                raise Exception(f"Error reading document from DynamoDB: {str(e)}")

        # For other filters, use scan (less efficient but necessary for non-key attributes)
        try:
            # Build filter expression
            filter_expression_parts = []
            expression_attribute_names = {}
            expression_attribute_values = {}

            for idx, (key, value) in enumerate(filter_dict.items()):
                attr_name = f"#attr{idx}"
                attr_value = f":val{idx}"
                filter_expression_parts.append(f"{attr_name} = {attr_value}")
                expression_attribute_names[attr_name] = key
                if isinstance(value, str):
                    expression_attribute_values[attr_value] = {'S': str(value)}
                else:
                    expression_attribute_values[attr_value] = {'N': str(value)}

            filter_expression = " AND ".join(filter_expression_parts)

            response = self.client.scan(
                TableName=table_name,
                FilterExpression=filter_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values,
                Limit=1
            )

            if response.get('Items'):
                return self._dynamodb_to_dict(response['Items'][0])
            return None
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                return None
            raise Exception(f"Error reading document from DynamoDB: {str(e)}")

    async def read_many(
        self,
        collection: str,
        filter_dict: Optional[Dict[str, Any]] = None,
        skip: int = 0,
        limit: int = 100,
        sort_dict: Optional[Dict[str, int]] = None,
    ) -> List[Dict[str, Any]]:
        """Read multiple documents from a collection"""
        if self.client is None:
            raise Exception("Database not connected")

        table_name = self._get_table_name(collection)

        try:
            if filter_dict is None or len(filter_dict) == 0:
                # Simple scan without filters
                response = self.client.scan(
                    TableName=table_name,
                    Limit=limit + skip
                )
            else:
                # Build filter expression
                filter_expression_parts = []
                expression_attribute_names = {}
                expression_attribute_values = {}

                for idx, (key, value) in enumerate(filter_dict.items()):
                    attr_name = f"#attr{idx}"
                    attr_value = f":val{idx}"
                    filter_expression_parts.append(f"{attr_name} = {attr_value}")
                    expression_attribute_names[attr_name] = key
                    if isinstance(value, str):
                        expression_attribute_values[attr_value] = {'S': str(value)}
                    else:
                        expression_attribute_values[attr_value] = {'N': str(value)}

                filter_expression = " AND ".join(filter_expression_parts)

                response = self.client.scan(
                    TableName=table_name,
                    FilterExpression=filter_expression,
                    ExpressionAttributeNames=expression_attribute_names,
                    ExpressionAttributeValues=expression_attribute_values,
                    Limit=limit + skip
                )

            items = [self._dynamodb_to_dict(item) for item in response.get('Items', [])]

            # Apply skip
            if skip > 0:
                items = items[skip:]

            # Apply limit
            items = items[:limit]

            # Apply sorting (Note: DynamoDB doesn't support server-side sorting easily,
            # so we do it client-side. For production, consider using GSIs)
            if sort_dict:
                for field, direction in sort_dict.items():
                    reverse = direction == -1
                    items.sort(key=lambda x: x.get(field, ""), reverse=reverse)

            return items
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                return []
            raise Exception(f"Error reading documents from DynamoDB: {str(e)}")

    async def update_one(
        self, collection: str, filter_dict: Dict[str, Any], update_dict: Dict[str, Any]
    ) -> bool:
        """Update a single document in a collection"""
        if self.client is None:
            raise Exception("Database not connected")

        table_name = self._get_table_name(collection)

        # DynamoDB requires _id for updates
        if "_id" not in filter_dict:
            raise ValueError("DynamoDB update_one requires '_id' in filter_dict")

        # Extract update operations
        update_expression_parts = []
        expression_attribute_names = {}
        expression_attribute_values = {}

        # Handle $set operations (MongoDB-style)
        if "$set" in update_dict:
            updates = update_dict["$set"]
        else:
            updates = update_dict

        # Add updated_at timestamp
        updates["updated_at"] = datetime.utcnow().isoformat()

        for idx, (key, value) in enumerate(updates.items()):
            attr_name = f"#attr{idx}"
            attr_value = f":val{idx}"
            update_expression_parts.append(f"{attr_name} = {attr_value}")
            expression_attribute_names[attr_name] = key
            if isinstance(value, str):
                expression_attribute_values[attr_value] = {'S': value}
            elif isinstance(value, (int, float)):
                expression_attribute_values[attr_value] = {'N': str(value)}
            elif isinstance(value, bool):
                expression_attribute_values[attr_value] = {'BOOL': value}
            else:
                expression_attribute_values[attr_value] = {'S': str(value)}

        update_expression = "SET " + ", ".join(update_expression_parts)

        try:
            self.client.update_item(
                TableName=table_name,
                Key={'_id': {'S': str(filter_dict["_id"])}},
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values
            )
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                return False
            raise Exception(f"Error updating document in DynamoDB: {str(e)}")

    async def delete_one(self, collection: str, filter_dict: Dict[str, Any]) -> bool:
        """Delete a single document from a collection"""
        if self.client is None:
            raise Exception("Database not connected")

        table_name = self._get_table_name(collection)

        # DynamoDB requires _id for deletes
        if "_id" not in filter_dict:
            raise ValueError("DynamoDB delete_one requires '_id' in filter_dict")

        try:
            self.client.delete_item(
                TableName=table_name,
                Key={'_id': {'S': str(filter_dict["_id"])}}
            )
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                return False
            raise Exception(f"Error deleting document from DynamoDB: {str(e)}")

    async def aggregate(
        self, collection: str, pipeline: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Perform aggregation operations"""
        if self.client is None:
            raise Exception("Database not connected")

        table_name = self._get_table_name(collection)

        # DynamoDB doesn't have native aggregation like MongoDB
        # This is a simplified implementation that handles basic $match and $group operations
        # For complex aggregations, consider using DynamoDB Streams + Lambda or AWS AppSync

        try:
            # Start with a scan
            response = self.client.scan(TableName=table_name)
            items = [self._dynamodb_to_dict(item) for item in response.get('Items', [])]

            # Apply pipeline stages
            for stage in pipeline:
                if "$match" in stage:
                    # Filter documents
                    match_filter = stage["$match"]
                    items = [
                        item for item in items
                        if all(item.get(k) == v for k, v in match_filter.items())
                    ]
                elif "$group" in stage:
                    # Group documents (simplified implementation)
                    group_by = stage["$group"]
                    _id = group_by.get("_id", {})
                    # This is a basic implementation - complex grouping may require more logic
                    grouped = {}
                    for item in items:
                        group_key = tuple(item.get(k) for k in (_id if isinstance(_id, dict) else [_id]))
                        if group_key not in grouped:
                            grouped[group_key] = []
                        grouped[group_key].append(item)
                    items = [{"_id": key, "items": group} for key, group in grouped.items()]
                # Add more pipeline stages as needed

            return items
        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                return []
            raise Exception(f"Error aggregating documents in DynamoDB: {str(e)}")

