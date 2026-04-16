from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    rate_limit: int = 3000
    rate_limit_window_ms: int = 3600000

    cors_origins: str = "http://localhost:4321,http://127.0.0.1:4321,http://45.90.237.135:4321"

    database_url: str = "sqlite+aiosqlite:///./olivaxi.db"

    open_meteo_url: str = "https://api.open-meteo.com/v1/forecast"

    groq_key: str = ""
    gemini_key: str = ""
    openrouter_key: str = ""
    gemini_alertas_key: str = ""
    cerebras_key_1: str = ""
    cerebras_key_2: str = ""

    gmail_user: str = ""
    gmail_app_password: str = ""

    alertas_audit_key: str = ""
    alertas_check_key: str = ""
    public_api_url: str = ""

    ml_python_path: str = "python3"
    ml_predict_script: str = "./ml/predict.py"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
