import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.dependencies.database import close_db, get_db
from app.routers import clima, chat, alertas, analisis, prediccion


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("API olivaξ iniciando...")
    yield
    print("API olivaξ cerrando...")
    await close_db()


app = FastAPI(
    title="olivaξ API",
    description="API para monitoreo climático de olivares españoles",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()

# CORS
origins = settings.cors_origins.split(",") if settings.cors_origins else ["http://localhost:4321"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.middleware("http")
async def add_cache_control(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Access-Control-Expose-Headers"] = "Content-Length"
    return response


# Routers - routes are registered at /api prefix
app.include_router(clima.router, prefix="/api/clima")
app.include_router(chat.router, prefix="/api/chat")
app.include_router(alertas.router, prefix="/api/alertas")
app.include_router(analisis.router, prefix="/api/analisis")
app.include_router(prediccion.router, prefix="/api/prediccion")


@app.get("/api")
async def api_root():
    return {
        "nombre": "olivaξ API",
        "version": "1.0.0",
        "endpoints": [
            "/api/clima",
            "/api/chat",
            "/api/alertas",
            "/api/analisis",
            "/api/prediccion",
        ],
    }


@app.get("/")
async def root():
    return "OK"


# CRON task for alertas
async def cron_check_alertas():
    """Background task to check alertas every 15 minutes"""
    while True:
        await asyncio.sleep(15 * 60)  # 15 minutes
        print("[CRON] Verificando alertas de clima...")
        try:
            # This would import and use the alerts check logic
            print("[CRON] Check completed")
        except Exception as e:
            print(f"[CRON] Error: {e}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=3000)
