from src.models import verifications_schemas, goal_schemas, auth_schemas
from datetime import datetime, timezone
from src.models.verifications_models import UserSubmission
from sqlalchemy.orm import Session
from uuid import UUID
from fastapi import HTTPException

def get_user(db: Session, user_id: UUID) -> auth_schemas.User:
    user = db.query(auth_schemas.User).filter(auth_schemas.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")
    return user

def get_quizzes(db: Session, goal_id: UUID) -> tuple[verifications_schemas.QuizQuestions]:
    rows = (db.query(verifications_schemas.QuizQuestions)
                          .filter(verifications_schemas.QuizQuestions.goal_id == goal_id))
    if not rows:
        raise HTTPException(status_code=401, detail="No quiz")
    questions = [{"quiz_id": q.id, "question": q.question} for q in rows]
    return questions

def get_verification_and_goal(db: Session, verification_id: str) -> tuple[verifications_schemas.Verification, goal_schemas.Goal]:
    """
    Returns verification, goal joined record of matching verification_id

    Args:
        db: Session()
        verification_id: goal's verification id
    """
    record = (
        db.query(verifications_schemas.Verification, goal_schemas.Goal)
        .join(goal_schemas.Goal, verifications_schemas.Verification.goal_id == goal_schemas.Goal.id)
        .filter(verifications_schemas.Verification.id == verification_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Verification not found")
    return record

def is_admin_or_owner(user: auth_schemas.User, goal_user_id: UUID) -> bool:
    return user.role == "admin" or str(goal_user_id) == str(user.id)

def evaluate_quiz_submission(
    db: Session,
    goal_id: UUID,
    user_submission: list[UserSubmission],
) -> str:
    rows = (
        db.query(verifications_schemas.QuizQuestions)
        .filter(verifications_schemas.QuizQuestions.goal_id == goal_id)
        .all()
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Quiz not found for goal")

    answers_by_id = {row.id: row.answer for row in rows}
    total = len(user_submission)
    if total == 0:
        raise HTTPException(status_code=400, detail="No answers submitted")
    goal = db.query(goal_schemas.Goal).filter(goal_schemas.Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=400, detail="No corresponding goal")

    correct = 0
    graded_submissions: list[tuple[UserSubmission, bool]] = []
    for submission in user_submission:
        answer = answers_by_id.get(submission.quiz_id)
        if answer is None:
            raise HTTPException(status_code=400, detail="Invalid quiz_id for this goal")
        is_correct = submission.user_answer.strip().lower() == answer.strip().lower()
        graded_submissions.append((submission, is_correct))
        if is_correct:
            correct += 1

    score = (correct / total) * 100
    result = "pass" if score >= 80 else "fail"


    if result == "pass":
        goal.status = "finalized"
        goal.verification_status = "completed"
    else:
        goal.status = "submitted"
        goal.verification_status = "failed"
    goal.finalized_at = datetime.now(timezone.utc)

    verification = verifications_schemas.Verification(
        goal_id=goal_id,
        type="quiz",
        result="approved" if result == "pass" else "rejected",
    )
    db.add(verification)
    db.flush()

    inputs = [
        verifications_schemas.QuizUserInput(
            verification_id=verification.id,
            question_id=submission.quiz_id,
            user_answer=submission.user_answer,
            is_correct=is_correct,
        )
        for submission, is_correct in graded_submissions
    ]
    db.add_all(inputs)
    db.commit()
    return result
