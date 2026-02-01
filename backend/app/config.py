"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Global application settings.

    All values can be overridden via environment variables or a .env file
    located in the project root.
    """

    # Database
    database_url: str = "postgresql+asyncpg://man:man_secret@localhost:5432/man_db"
    redis_url: str = "redis://localhost:6379/0"

    # Solana
    helius_api_key: str = ""
    solana_rpc_url: str = ""

    # AI
    openai_api_key: str = ""

    # App
    cors_origins: str = "http://localhost:3000"
    secret_key: str = "change-me"

    # Rate limiting
    free_scans_per_hour: int = 10

    class Config:
        env_file = ".env"


settings = Settings()
