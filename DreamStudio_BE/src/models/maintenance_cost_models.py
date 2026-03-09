from datetime import datetime
from pydantic import BaseModel, Field


class MaintenanceCostIngestRequest(BaseModel):
    week_start: datetime
    week_end: datetime


class MaintenanceCostUpsertRequest(BaseModel):
    week_start: datetime
    week_end: datetime
    aws_cost_cents: int = Field(ge=0)
    openai_cost_cents: int = Field(ge=0)
    notes: str | None = None


class MaintenanceCostResponse(BaseModel):
    week_start: datetime
    week_end: datetime
    aws_cost_cents: int
    openai_cost_cents: int
    fee_amount_cents: int
    source: str
    notes: str | None = None
