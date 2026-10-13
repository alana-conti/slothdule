from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://slothdule:slothdule@localhost:5432/slothdule"
    jwt_secret: str = "dev-only-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_ttl_seconds: int = 3600
    refresh_ttl_days: int = 30
    data_dir: str = "./data"
    max_upload_mb: int = 10
    cors_origins: str = "http://localhost:3000"
    cookie_secure: bool = False
    # Fase 7 (OAuth): preencher quando for implementar Google.
    google_client_id: str = ""
    google_client_secret: str = ""

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
