from datetime import datetime, timezone
from sqlalchemy import or_
from src.celery_app import celery_app
from src.helpers.db import SessionLocal
from src.models.goal_schemas import Goal
from src.tasks.evaluations import evaluate_submission

@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def scan_overdue_goals(self):
    now = datetime.now(timezone.utc)

    db = SessionLocal()
    try:
        with db.begin():
            overdue = (
                db.query(Goal)
                  .filter(Goal.deadline <= now)
                  .filter(Goal.finalized_at.is_(None))
                  .filter(or_(Goal.status == "pending", Goal.status.is_(None)))
                  .with_for_update(skip_locked=True)
                  .limit(50)
                  .all()
            )

            # Claim them so other scanner runs don't re-queue them
            submission_ids = []
            for g in overdue:
                g.status = "validating"
                # g.processing_started_at = now  # strongly recommended
                submission_ids.append(g.submission_id)  # <-- whatever id eval needs

        # Outside transaction: fan out tasks
        for sid in submission_ids:
            evaluate_submission.delay(sid)

        return {"queued": len(submission_ids)}

    finally:
        db.close()