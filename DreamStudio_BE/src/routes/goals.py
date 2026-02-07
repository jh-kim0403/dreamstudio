from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from jose import jwt, JWTError, ExpiredSignatureError

from src.helpers.goals_utils import current_goals_for_user
from ..config import settings
from ..helpers.auth_utils import validate_access_token
from uuid import UUID
from ..models import goal_models, goal_schemas
from ..helpers.db import get_db
from datetime import datetime, timezone
import logging
from src.tasks.quiz_tasks import generate_quiz_for_goal


router = APIRouter(prefix="/api/v1/goals", tags=["Goals"])
@router.post("/newgoal", response_model=goal_models.goalResponse)
def create_goal(
    payload: goal_models.goalRequest,
    user_id: UUID = Depends(validate_access_token),
    db: Session = Depends(get_db),
):
    goaltype = (
        db.query(goal_schemas.GoalType)
          .filter(goal_schemas.GoalType.id == payload.goal_type_id)
          .first()
    )
    if goaltype is None:
        raise HTTPException(status_code=400, detail="Invalid goal type")

    new_goal = goal_schemas.Goal(
        user_id=user_id,
        goal_type_id=payload.goal_type_id,
        title=payload.title,
        description=payload.description,
        user_input=payload.user_input,
        bounty_amount=payload.bounty_amount,
        deadline=payload.deadline,
        created_at=datetime.now(timezone.utc),
    )

    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)

    # IMPORTANT: enqueue only AFTER commit
    if goaltype.verification_type == "quiz":
        generate_quiz_for_goal.delay(str(new_goal.id))

    return new_goal



    
@router.get("/goaltypes", response_model=list[goal_models.goalTypeResponse])
def get_goal_types(user_id: UUID = Depends(validate_access_token), db: Session = Depends(get_db)):
    goal_types = db.query(goal_schemas.GoalType).all()
    if not goal_types:
        raise HTTPException(402, "Goal types not found")

    return [goal_models.goalTypeResponse.model_validate(r) for r in goal_types]

@router.get("/getcurrentgoals", response_model=list[goal_models.currentGoalResponse])
def get_current_goals(user_id: UUID = Depends(validate_access_token), db: Session = Depends(get_db)):
    all_goals = current_goals_for_user(user_id, db)
    logging.info("Getting all goals for: " + str(user_id))
    return [goal_models.currentGoalResponse.model_validate(r._mapping) for r in all_goals]
