from datetime import datetime, timezone
from sqlalchemy import or_
from src.celery_app import celery_app
from src.helpers.db import SessionLocal
from src.models.goal_schemas import Goal
from src.tasks.evaluations import evaluate_submission

@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def scan_overdue_goals(self):
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        # 1) Claim a batch atomically
        with db.begin():  # starts a transaction; commits/rolls back automatically
            overdue = (
                db.query(Goal)
                .filter(Goal.deadline <= now)
                .filter(Goal.finalized_at.is_(None))
                .filter(or_(Goal.status == "pending", Goal.status.is_(None)))
                .order_by(Goal.deadline.asc())
                .with_for_update(skip_locked=True)
                .limit(50)
                .all()
            )

            for goal in overdue:
                goal.status = "validating"
                # optional: goal.processing_started_at = now


        # 2) Do work outside the claim transaction
        processed = 0
        for goal in overdue:
            # compute results... call gpt validation if else
            if(evaluate_submission("X")):
                goal.final_status = "success"
                goal.finalized_at = now
                goal.status = "finalized"

            db.add(goal)
            processed += 1

        db.commit()
        return {"processed": processed}

    except Exception as e:
        db.rollback()
        raise self.retry(exc=e)
    finally:
        db.close()
