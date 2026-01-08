import aiohttp
from io import BytesIO
from typing import Optional

from app.config import config
from app.utils.protocols import FileDB


class ImgBBFileDB(FileDB):
    """ImgBB API implementation of FileDB protocol"""

    def __init__(self):
        self.api_key = config.IMGBB_API_KEY
        self.api_url = "https://api.imgbb.com/1/upload"
        if not self.api_key:
            raise ValueError(
                "IMGBB_API_KEY is not set. Please configure it in your .env file. "
                "You can get an API key from https://api.imgbb.com/"
            )

    async def upload_file(
        self, file_content: BytesIO, file_name: str, content_type: str, folder: Optional[str] = None
    ) -> str:
        """
        Upload a file to ImgBB and return its URL

        Args:
            file_content: File content as BytesIO
            file_name: Name of the file
            content_type: MIME type of the file
            folder: Optional folder/path prefix (not used in ImgBB, kept for compatibility)

        Returns:
            URL of the uploaded file
        """
        try:
            # Reset file pointer to beginning
            file_content.seek(0)
            
            # Read file content
            file_data = file_content.read()
            
            # Prepare form data
            data = aiohttp.FormData()
            data.add_field('key', self.api_key)
            data.add_field('image', file_data, filename=file_name, content_type=content_type)

            # Upload to ImgBB
            async with aiohttp.ClientSession() as session:
                async with session.post(self.api_url, data=data) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(
                            f"Error uploading file to ImgBB: HTTP {response.status} - {error_text}"
                        )
                    
                    result = await response.json()
                    
                    # Check if upload was successful
                    if not result.get("success", False):
                        error_msg = result.get("error", {}).get("message", "Unknown error")
                        raise Exception(f"ImgBB API error: {error_msg}")
                    
                    # Return the image URL
                    image_url = result.get("data", {}).get("url")
                    if not image_url:
                        raise Exception("ImgBB response missing image URL")
                    
                    return image_url

        except aiohttp.ClientError as e:
            raise Exception(f"Error uploading file to ImgBB: {str(e)}")
        except Exception as e:
            raise Exception(f"Error uploading file to ImgBB: {str(e)}")

    async def delete_file(self, file_url: str) -> bool:
        """
        Delete a file from ImgBB by its URL

        Note: ImgBB API does not provide a direct delete endpoint.
        This method returns False as deletion is not supported via API.

        Args:
            file_url: URL of the file to delete

        Returns:
            False (deletion not supported via ImgBB API)
        """
        # ImgBB does not provide a public API endpoint for deleting images
        # Images can be deleted manually through the web interface using the delete_url
        # For automatic deletion, you would need to store the delete_url when uploading
        # For now, we return False to indicate deletion is not supported
        return False

    async def get_file_url(self, file_path: str) -> str:
        """
        Get the public URL of a file in ImgBB

        Note: If file_path is already a full URL, it is returned as-is.
        If it's a relative path, it may not work as ImgBB uses unique URLs.

        Args:
            file_path: Path or URL to the file in ImgBB

        Returns:
            Public URL of the file
        """
        # If it's already a full URL, return it
        if file_path.startswith("http://") or file_path.startswith("https://"):
            return file_path
        
        # ImgBB URLs are unique and cannot be constructed from a path
        # Return the path as-is (it might be a full URL stored as path)
        return file_path

