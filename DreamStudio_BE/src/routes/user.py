import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from uuid import UUID
from src.helpers.db import get_db
from src.helpers.auth_utils import validate_access_token
from src.models.users_models import UsersResponseModel
from src.models.auth_schemas import User


router = APIRouter(prefix="/api/v1/user", tags=["User"])

@router.get(path="/profile", response_model=UsersResponseModel)
def get_profile(user_id: UUID = Depends(validate_access_token), db: Session = Depends(get_db)):
    rs = db.query(User).filter(User.id == user_id).first()
    if rs is None:
        raise HTTPException(status_code=404, detail="User not found")

    logging.info(rs.email)
    return rs
