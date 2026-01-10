# src/tasks/submission_tasks.py
from src.celery_app import celery_app

@celery_app.task(bind=True, max_retries=2, default_retry_delay=20)
def evaluate_submission(self, submission_id: str):
    """
    Evaluate a user submission (photo/quiz answers).
    Call GPT here, update DB with results.
    """
    try:
        # 1) load submission + evidence from DB
        # 2) call GPT
        # 3) store result
        return {"submission_id": submission_id, "status": "ok"}
    except Exception as e:
        raise self.retry(exc=e)