"""
JWT AUTH
Versioning
Query String, Pagination
Idempotency
Rate Limiting

Celery - Django (Async)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routes import auth_manual, auth_google, goals, auth_refresh, verifications, payments
from src.gpt import apicalls# no leading dot

app = FastAPI(title="DreamStudio Auth API")

# Enable CORS for mobile app development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development - restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_manual.router)
app.include_router(auth_google.router)
app.include_router(goals.router)
app.include_router(auth_refresh.router)
app.include_router(apicalls.router)
app.include_router(verifications.router)
app.include_router(payments.router)
