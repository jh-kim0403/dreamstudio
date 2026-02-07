from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from typing import Optional

class goalRequest(BaseModel):
    goal_type_id: UUID
    title: str
    description: str
    user_input: str
    bounty_amount: int
    deadline: datetime


class goalResponse(BaseModel):
    id: UUID
    user_id: UUID
    goal_type_id: UUID
    title: str
    description: str
    deadline: datetime
    created_at: datetime
    status: str
    quiz_question_status: str
    verification_status: str
    goal_type: "goalTypeResponse"

    model_config = ConfigDict(from_attributes=True)

class goalTypeResponse(BaseModel):
    id: UUID
    name: str
    description: str
    verification_type: str
    question_count: int
    
    model_config = ConfigDict(from_attributes=True)

class currentGoalResponse(BaseModel):
    id: UUID
    user_id: UUID
    goal_type_id: UUID
    title: str
    description: Optional[str] = None
    user_input: Optional[str] = None
    bounty_amount: int
    deadline: datetime
    status: str
    quiz_question_status: str
    verification_status: str
    finalized_at: Optional[datetime] = None
    stripe_setup_intent_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    verification_id: Optional[UUID] = None
    verification_type: Optional[str] = None
    verification_result: Optional[str] = None
    verification_updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

goalResponse.model_rebuild()
