from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from jose import jwt, JWTError, ExpiredSignatureError
from ..config import settings
from ..helpers.auth_utils import validate_access_token
from uuid import UUID
from ..models import goal_models, goal_schemas
from ..helpers.db import get_db
from datetime import datetime, timezone
import logging


router = APIRouter(prefix="/api/v1/goals", tags=["Goals"])

@router.post("/newgoal", response_model=goal_models.goalResponse)
def create_goal(payload: goal_models.goalRequest, user_id: UUID = Depends(validate_access_token), 
                db: Session = Depends(get_db)):
    try:
        goaltype = db.query(goal_schemas.GoalType).filter(goal_schemas.GoalType.id == payload.goal_type_id).first()
        if goaltype is None:
            logging.log(msg="Invalid Goal type was given. Was not able to return a resultset with the given goal type id.")
            raise HTTPException(status_code=400, detail="New goal creation failed") #TO DO change status code later
        if goaltype.verification_type == "quiz":
            #MAKE A OPENAI CALL/ MAKE QUIZ 
            #INSERT INTO verifications_quiz_questions
            #INSERT INTO verifications_quiz_answers
            
        

        new_goal = goal_schemas.Goal(
        user_id = user_id,
        goal_type_id = payload.goal_type_id,
        title = payload.title,
        description = payload.description,
        user_input = payload.user_input,
        bounty_amount = payload.bounty_amount,
        deadline = payload.deadline,
        created_at = datetime.now(timezone.utc)
        )
        db.add(new_goal)
        db.commit()
        db.refresh(new_goal)
        return goal_models.goalResponse.model_validate(new_goal)
    except(Exception):

    



    
@router.get("/goaltypes", response_model=list[goal_models.goalTypeResponse])
def get_goal_types(user_id: UUID = Depends(validate_access_token), db: Session = Depends(get_db)):
    goal_types = db.query(goal_schemas.GoalType).all()
    if not goal_types:
        raise HTTPException(402, "Goal type not found")

    return [goal_models.goalTypeResponse.model_validate(r) for r in goal_types]

"""
TO DO IMPLEMENT
"""