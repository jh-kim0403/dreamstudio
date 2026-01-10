import logging
from datetime import datetime, timezone
from src.celery_app import celery_app
from src.helpers.db import SessionLocal
from src.models import goal_schemas  # adjust imports
# from app.openai_client import generate_quiz  # your function that calls OpenAI


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def generate_quiz_for_goal(self, goal_id: str):
    db = SessionLocal()
    try:
        goal = db.query(goal_schemas.Goal).filter(goal_schemas.Goal.id == goal_id).first()
        if not goal:
            logging.warning("Goal not found: %s", goal_id)
            return
        #If quiz is already created, then do nothing
        #If quiz is None then call the openai api
        #with the results back from the openai api, insert them into the quiz answers and questions


        existing_q = (
            db.query(goal_schemas.VerificationQuizQuestion)
            .filter(goal_schemas.VerificationQuizQuestion.goal_id == goal_id)
            .first()
        )
        if existing_q:
            goal.verification_status = "ready"
            goal.verification_error = None
            db.commit()
            return

        goal.verification_status = "pending"
        goal.verification_error = None
        db.commit()

        # ---- Call OpenAI here ----
        # quiz = generate_quiz(goal.user_input, goal.title, goal.description)
        # quiz = {"questions":[{"question":"...","answers":[...],"correct_index":0}, ...]}

        # For now, placeholder structure:
        quiz = {
            "questions": [
                {
                    "question": "Placeholder question?",
                    "answers": ["A", "B", "C", "D"],
                    "correct_index": 1,
                }
            ]
        }

        # Persist questions/answers (wrap in transaction)
        for q in quiz["questions"]:
            qq = goal_schemas.VerificationQuizQuestion(
                goal_id=goal_id,
                question_text=q["question"],
                created_at=datetime.now(timezone.utc),
            )
            db.add(qq)
            db.flush()  # get qq.id without committing

            for idx, ans in enumerate(q["answers"]):
                db.add(
                    goal_schemas.VerificationQuizAnswer(
                        question_id=qq.id,
                        answer_text=ans,
                        is_correct=(idx == q["correct_index"]),
                        created_at=datetime.now(timezone.utc),
                    )
                )

        goal.verification_status = "ready"
        goal.verification_error = None
        db.commit()

    except Exception as e:
        # mark failed for visibility, then re-raise to trigger retry
        try:
            goal = db.query(goal_schemas.Goal).filter(goal_schemas.Goal.id == goal_id).first()
            if goal:
                goal.verification_status = "failed"
                goal.verification_error = str(e)[:500]
                db.commit()
        except Exception:
            db.rollback()
        raise
    finally:
        db.close()
