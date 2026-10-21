from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://slothdule:slothdule@localhost:5432/slothdule"
    jwt_secret: str = "dev-only-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_ttl_seconds: int = 3600
    refresh_ttl_days: int = 30
    data_dir: str = "./data"
    max_upload_mb: int = 20
    cors_origins: str = "http://localhost:3000"
    cookie_secure: bool = False
    # URL do frontend; destino dos redirects pós-oAuth (callback/session).
    frontend_url: str = "http://localhost:3000"
    # Fase 7 (OAuth Google): preencha no Google Cloud. O redirect_uri da
    # credencial no Google Cloud deve apontar para /auth/google/callback.
    google_client_id: str = ""
    google_client_secret: str = ""
    # Opcional: força o redirect_uri (por trás de proxy/reverso o Host pode
    # vir errado). Vazio = derive do próprio request.
    google_redirect_uri: str = ""

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
