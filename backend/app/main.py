import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core import security
from app.core.vector_store import ensure_collection

from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.captures import router as captures_router
from app.routes.search import router as search_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        await asyncio.to_thread(ensure_collection)
    except Exception:
        logger.exception(
            "Qdrant collection check failed; captures cannot be indexed until Qdrant is reachable"
        )
    yield


app = FastAPI(
    title="PrivBit API",
    description="Privacy-first personal knowledge base API",
    version="0.1.0",
    lifespan=lifespan,
)

cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/health")
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(
    search_router,
    prefix="/search",
    tags=["search"],
    dependencies=[Depends(security.verify_csrf)],
)
app.include_router(
    captures_router,
    prefix="/captures",
    tags=["captures"],
    dependencies=[Depends(security.verify_csrf)],
)