import uuid
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    DateTime,
    Interval,
    ForeignKey,
    CheckConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from ..helpers.db import Base  # same Base used in user_schemas.py


class GoalType(Base):
    __tablename__ = "goal_types"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    description = Column(Text)
    verification_type = Column(
        String,
        CheckConstraint("verification_type IN ('photo','quiz')"),
        nullable=False,
    )
    question_count = Column(Integer, server_default=text("10"))
    gpt_prompt = Column(Text)
    meta = Column(JSONB, server_default=text("'{}'::jsonb"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    goals = relationship("Goal", back_populates="goal_type")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    goal_type_id = Column(UUID(as_uuid=True), ForeignKey("goal_types.id"))
    title = Column(Text, nullable=False)
    description = Column(Text)
    user_input = Column(Text)
    bounty_amount = Column(Integer, CheckConstraint("bounty_amount > 0"), nullable=False)
    deadline = Column(DateTime(timezone=True), nullable=False)
    #verifcation_type = Column(Text,  CheckConstraint("verifcation_type IN ('photo','quiz')"), nullable=False)
    status = Column(
        String,
        CheckConstraint("status IN ('pending', 'canceled', 'validating', 'finalized')"),
        server_default=text("'pending'"),
        nullable=False,
    )
    final_status = Column(String, CheckConstraint("final_status IN ('completed', 'failed')"))
    finalized_at = Column(DateTime(timezone=True))
    stripe_setup_intent_id = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    goal_type = relationship("GoalType", back_populates="goals")
    # Optionally: user = relationship("User")  # if you want easy access to the owning user
