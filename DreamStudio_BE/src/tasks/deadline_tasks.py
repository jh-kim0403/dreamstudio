from datetime import datetime, timezone
from sqlalchemy import or_
from src.celery_app import celery_app
from src.helpers.bounty_ledger_utils import apply_bounty_ledger_entry
from src.helpers.db import SessionLocal
from src.models.bounty_schemas import BountyLedger
from src.models.goal_schemas import Goal
from src.models.verifications_schemas import Verification


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def finalize_goal_at_deadline(self, goal_id: str):
    db = SessionLocal()
    try:
        with db.begin():
            goal = (
                db.query(Goal)
                .filter(Goal.id == goal_id)
                .with_for_update()
                .first()
            )
            if goal is None:
                return {"status": "missing", "goal_id": goal_id}

            if goal.finalized_at is not None or goal.status == "finalized":
                return {"status": "already_finalized", "goal_id": goal_id}

            now = datetime.now(timezone.utc)
            if goal.deadline > now:
                return {"status": "not_due_yet", "goal_id": goal_id}

            terminal_entry = (
                db.query(BountyLedger)
                .filter(BountyLedger.goal_id == goal.id)
                .filter(BountyLedger.type.in_(("release", "forfeit")))
                .first()
            )
            if terminal_entry is not None:
                goal.status = "finalized"
                goal.finalized_at = now
                if terminal_entry.type == "release":
                    goal.verification_status = "completed"
                else:
                    goal.verification_status = "failed"
                return {"status": "already_settled", "goal_id": goal_id}

            latest_verification = (
                db.query(Verification)
                .filter(Verification.goal_id == goal.id)
                .order_by(Verification.updated_at.desc())
                .first()
            )
            is_approved = bool(
                latest_verification is not None and latest_verification.result == "approved"
            )

            if is_approved:
                apply_bounty_ledger_entry(
                    user_id=goal.user_id,
                    goal_id=goal.id,
                    ledger_type="release",
                    bounty_amount=goal.bounty_amount,
                    db=db,
                )
                goal.verification_status = "completed"
            else:
                apply_bounty_ledger_entry(
                    user_id=goal.user_id,
                    goal_id=goal.id,
                    ledger_type="forfeit",
                    bounty_amount=goal.bounty_amount,
                    db=db,
                )
                goal.verification_status = "failed"

            goal.status = "finalized"
            goal.finalized_at = now

        return {"status": "ok", "goal_id": goal_id}
    except Exception as e:
        db.rollback()
        raise self.retry(exc=e)
    finally:
        db.close()


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def sweep_overdue_goals(self):
    now = datetime.now(timezone.utc)
    db = SessionLocal()
    try:
        overdue_goal_ids = (
            db.query(Goal.id)
            .filter(Goal.deadline <= now)
            .filter(Goal.finalized_at.is_(None))
            .filter(
                or_(
                    Goal.status == "pending",
                    Goal.status == "validating",
                    Goal.status.is_(None),
                )
            )
            .limit(500)
            .all()
        )

        for (goal_id,) in overdue_goal_ids:
            finalize_goal_at_deadline.delay(str(goal_id))

        return {"queued": len(overdue_goal_ids)}
    finally:
        db.close()
