import boto3
from botocore.exceptions import ClientError
from io import BytesIO
from typing import Optional
from urllib.parse import urlparse
import uuid
from datetime import datetime

from app.config import config
from app.utils.protocols import FileDB


class S3FileDB(FileDB):
    """S3 implementation of FileDB protocol"""

    def __init__(self):
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=config.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
            region_name=config.AWS_REGION,
        )
        self.bucket_name = config.S3_BUCKET_NAME

    async def upload_file(
        self, file_content: BytesIO, file_name: str, content_type: str, folder: Optional[str] = None
    ) -> str:
        """
        Upload a file to S3 and return its URL

        Args:
            file_content: File content as BytesIO
            file_name: Name of the file
            content_type: MIME type of the file
            folder: Optional folder/path prefix

        Returns:
            URL of the uploaded file
        """
        # Generate unique file name
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        file_extension = file_name.split(".")[-1] if "." in file_name else ""
        safe_file_name = (
            f"{timestamp}_{unique_id}.{file_extension}"
            if file_extension
            else f"{timestamp}_{unique_id}"
        )

        # Construct S3 key
        if folder:
            s3_key = f"{folder}/{safe_file_name}"
        else:
            s3_key = safe_file_name

        try:
            # Reset file pointer to beginning
            file_content.seek(0)

            # Upload to S3
            self.s3_client.upload_fileobj(
                file_content,
                self.bucket_name,
                s3_key,
                ExtraArgs={
                    "ContentType": content_type,
                    # "ACL": "public-read",  # Make file publicly accessible
                },
            )

            # Generate public URL
            url = f"https://{self.bucket_name}.s3.{config.AWS_REGION}.amazonaws.com/{s3_key}"
            return url

        except ClientError as e:
            raise Exception(f"Error uploading file to S3: {str(e)}")

    async def delete_file(self, file_url: str) -> bool:
        """
        Delete a file from S3 by its URL

        Args:
            file_url: URL of the file to delete

        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            # Extract S3 key from URL
            parsed_url = urlparse(file_url)
            s3_key = parsed_url.path.lstrip("/")

            # Delete from S3
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            return True

        except ClientError as e:
            print(f"Error deleting file from S3: {str(e)}")
            return False

    async def get_file_url(self, file_path: str) -> str:
        """
        Get the public URL of a file in S3

        Args:
            file_path: Path to the file in S3

        Returns:
            Public URL of the file
        """
        return f"https://{self.bucket_name}.s3.{config.AWS_REGION}.amazonaws.com/{file_path}"
