import logging
from src.celery_app import celery_app
from src.helpers.db import SessionLocal
from src.helpers.s3 import presign_get
from src.helpers.openai import evaluate_photo
from src.models import verifications_schemas, goal_schemas


@celery_app.task(bind=True, max_retries=0, default_retry_delay=20)
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


@celery_app.task(bind=True, max_retries=0, default_retry_delay=20)
def evaluate_photo_verification(self, verification_id: str):
    """
    Evaluate a photo verification with GPT.
    """
    db = SessionLocal()
    try:
        record = (
            db.query(verifications_schemas.Verification, verifications_schemas.VerificationPhoto, goal_schemas.Goal, goal_schemas.GoalType)
            .join(verifications_schemas.VerificationPhoto,
                  verifications_schemas.VerificationPhoto.verification_id == verifications_schemas.Verification.id)
            .join(goal_schemas.Goal, verifications_schemas.Verification.goal_id == goal_schemas.Goal.id)
            .join(goal_schemas.GoalType, goal_schemas.Goal.goal_type_id == goal_schemas.GoalType.id)
            .filter(verifications_schemas.Verification.id == verification_id)
            .first()
        )
        if not record:
            raise ValueError("verification not found")

        verification, photo, goal, goal_type = record
        if verification.type != "photo":
            raise ValueError("verification type must be photo")

        image_url = presign_get(photo.s3_key, expires_seconds=300)

        result = evaluate_photo(prompt=goal_type.gpt_prompt, image_url=image_url)
        
        if result.is_true:
            verification.result = "approved"
            goal.verification_status = "completed"
            goal.status = "validating"
        else:
            verification.result = "rejected"
            goal.verification_status = "failed"
            goal.status = "pending"

        meta = dict(photo.meta or {})
        meta["ai_check"] = {
            "is_true": result.is_true,
            "prob_true": result.prob_true,
            "prob_false": result.prob_false,
            "reason": result.reason,
        }
        photo.meta = meta
        db.commit()
        return {"verification_id": verification_id, "result": verification.result}
    except Exception as e:
        logging.exception("Photo verification failed: %s", verification_id)
        db.rollback()
        raise self.retry(exc=e)
    finally:
        db.close()
