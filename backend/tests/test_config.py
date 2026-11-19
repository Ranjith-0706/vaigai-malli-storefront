from app.config import Settings


def test_standard_provider_postgres_url_uses_psycopg() -> None:
    settings = Settings(database_url="postgresql://user:password@db:5432/store")
    assert settings.sqlalchemy_database_url == "postgresql+psycopg://user:password@db:5432/store"


def test_existing_psycopg_url_is_preserved() -> None:
    url = "postgresql+psycopg://user:password@db:5432/store"
    assert Settings(database_url=url).sqlalchemy_database_url == url
