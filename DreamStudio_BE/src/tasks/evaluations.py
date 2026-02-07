import json
import logging
from openai import OpenAI
from src.celery_app import celery_app
from src.config import settings
from src.helpers.db import SessionLocal
from src.helpers.s3 import presign_get
from src.models import verifications_schemas, goal_schemas

client = OpenAI(api_key=settings.OPENAI_API_KEY)

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

        prompt = goal_type.gpt_prompt

        resp = client.responses.create(
            model="gpt-4o-mini",
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt},
                        {"type": "input_image", "image_url": image_url},
                    ],
                }
            ],
            text={"format": {"type": "json_object"}},
            temperature=0.2,
            max_output_tokens=200,
            store=False,
        )

        try:
            data = json.loads(resp.output_text)
            is_true = bool(data.get("is_true"))
            confidence = data.get("confidence")
            reason = data.get("reason")
        except Exception as e:
            raise ValueError(f"invalid model response: {e}")

        if is_true:
            verification.result = "approved"
            goal.verification_status = "completed"
            goal.status = "finalized"
        else:
            verification.result = "rejected"
            goal.verification_status = "failed"
            goal.status = "submitted"

        
        meta = dict(photo.meta or {})
        meta["ai_check"] = {
            "is_true": is_true,
            "confidence": confidence,
            "reason": reason,
            "model": "gpt-4o-mini",
        }
        photo.meta = meta
        db.commit()
        logging.info("Reason: %s \n Confidence: %s", reason, confidence)
        return {"verification_id": verification_id, "result": verification.result}
    except Exception as e:
        logging.exception("Photo verification failed: %s", verification_id)
        db.rollback()
        raise self.retry(exc=e)
    finally:
        db.close()
