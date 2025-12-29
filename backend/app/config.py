from pydantic_settings import BaseSettings, SettingsConfigDict


class AppConfig(BaseSettings):
    """APP Configurations"""

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow",
    )

    # App settings
    LOG_LEVEL: str = "INFO"
    SECRET_KEY: str = ""
    API_KEY: str = ""  # API Key for authentication
    
    # MongoDB Atlas settings
    MONGODB_URI: str = ""
    MONGODB_DATABASE: str = "urbanspot"
    
    # AWS S3 settings
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = ""
    
    # OAuth settings (for future frontend integration)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    def __hash__(self):
        return hash(self.model_dump_json())


# Global config instance
config = AppConfig()

