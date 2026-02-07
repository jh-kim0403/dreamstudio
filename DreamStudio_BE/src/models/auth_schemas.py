from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID, INET, CITEXT
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from ..helpers.db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(CITEXT, unique=True, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    photo_url = Column(String)
    bounty_balance =Column(Integer, CheckConstraint("bounty_balance >= 0"), default=0, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    role = Column(String, CheckConstraint("role IN ('user','admin')"), default="user")
    signup_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True))
    signup_ip = Column(INET)

    identities = relationship("AuthIdentity", back_populates="user")

class AuthIdentity(Base):
    __tablename__ = "auth_identities"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String, CheckConstraint("provider IN ('password','google')"), nullable=False)
    provider_user_id = Column(String)
    email = Column(CITEXT, nullable=False)
    password_hash = Column(Text)
    password_updated_at = Column(DateTime(timezone=True))
    password_needs_reset = Column(Boolean, default=False, nullable=False)
    meta = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="identities")

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    refresh_token = Column(Text, nullable=False, unique=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=func.now())
    revoked_at = Column(DateTime(timezone=True))
    user = relationship("User")