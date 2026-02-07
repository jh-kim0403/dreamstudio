import os
from dotenv import load_dotenv
from celery import Celery
from celery.schedules import crontab
from src.config import settings

load_dotenv("dreamstudio.env")  # or ".env" if you standardize

REDIS_URL = settings.CELERY_REDIS_URL

celery_app = Celery(
    "dreamstudio",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "src.tasks.deadline_tasks",
        "src.tasks.evaluations",
        "src.tasks.quiz_tasks",
        "src.tasks.verification_cleanup",
    ],
)

celery_app.conf.update(
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_reject_on_worker_lost=True,
)


celery_app.conf.beat_schedule = {
    "scan-overdue-goals-every-minute": {
        "task": "src.tasks.deadline_tasks.scan_overdue_goals",
        "schedule": crontab(minute="*/5"),
    },
    "cleanup-abandoned-photo-verifications-hourly": {
        "task": "src.tasks.verification_cleanup.cleanup_abandoned_photo_verifications",
        "schedule": crontab(minute=0, hour="*/1"),
    },
}
