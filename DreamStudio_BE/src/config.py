from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent 

class Settings(BaseSettings):
    google_client_id_web: str
    google_client_secret_web: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    OPENAI_API_KEY: str
    CELERY_REDIS_URL: str
    SLOWAPI_REDIS_URL: str
    AWS_REGION: str
    S3_BUCKET: str
    AWS_ACCESS_KEY: str
    AWS_SECRET_KEY: str
    STRIPE_SECRET_KEY: str

    class Config:
        env_file=BASE_DIR / "dreamstudio.env",

settings = Settings()

