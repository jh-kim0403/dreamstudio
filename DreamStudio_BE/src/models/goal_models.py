from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

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

    model_config = ConfigDict(from_attributes=True)

class goalTypeResponse(BaseModel):
    id: UUID
    name: str
    description: str
    question_count: int
    
    model_config = ConfigDict(from_attributes=True)