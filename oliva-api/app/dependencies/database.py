from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from typing import AsyncGenerator
import aiosqlite


class Database:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.engine = None
        self.session_factory = None

    async def init(self):
        db_path = self.database_url.replace("sqlite+aiosqlite:///", "")
        self.engine = create_async_engine(self.database_url, echo=False, pool_pre_ping=True)
        self.session_factory = sessionmaker(
            bind=self.engine, class_=AsyncSession, expire_on_commit=False
        )

        async with self.engine.begin() as conn:
            await conn.execute(
                text("""
                CREATE TABLE IF NOT EXISTS clima_cache (
                    id INTEGER PRIMARY KEY,
                    datos TEXT,
                    cached_at INTEGER
                )
            """)
            )

            await conn.execute(
                text("""
                CREATE TABLE IF NOT EXISTS alertas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT,
                    email TEXT,
                    provincia TEXT,
                    variedad TEXT DEFAULT '',
                    tipo TEXT DEFAULT 'calor',
                    fenologia TEXT DEFAULT '',
                    activa INTEGER DEFAULT 1,
                    last_notified_at INTEGER DEFAULT 0,
                    created_at INTEGER
                )
            """)
            )

            await conn.execute(
                text("""
                CREATE TABLE IF NOT EXISTS pending_verifications (
                    token TEXT PRIMARY KEY,
                    data TEXT,
                    expires INTEGER
                )
            """)
            )

            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS idx_alertas_email ON alertas(email)")
            )
            await conn.execute(
                text("CREATE INDEX IF NOT EXISTS idx_alertas_provincia ON alertas(provincia)")
            )

    def get_session(self):
        return self.session_factory()

    async def close(self):
        if self.engine:
            await self.engine.dispose()


_db: Database | None = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    global _db
    if _db is None:
        from app.config import get_settings

        settings = get_settings()
        _db = Database(settings.database_url)
        await _db.init()

    async with _db.get_session() as session:
        yield session


async def close_db():
    global _db
    if _db:
        await _db.close()
        _db = None
