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
from src.helpers.db import Base

class quiz_questions(Base):
    __tablename__ = "verification_quiz_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("goals.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    correct_answer = Column(Text, nullable=False)
    metadata = Column(Text)
    created_at = Column(DateTime(timezone=True),server_default=func.now(),nullable=False)

    goal = relationship("Goals", back_populates="Goals")
    