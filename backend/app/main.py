from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.health import router as health_router
from app.routes.auth import router as auth_router
from app.routes.captures import router as captures_router
from app.routes.search import router as search_router

app = FastAPI(
    title="PrivBit API",
    description="Privacy-first personal knowledge base API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/health")
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(search_router, prefix="/search", tags=["search"])
app.include_router(captures_router, prefix="/captures", tags=["captures"])