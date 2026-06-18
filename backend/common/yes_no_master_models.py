"""common/yes_no_master_models.py
   SQLAlchemy ORM model for Yes / No Master
   ─────────────────────────────────────────
   Each row = ONE label with its own unique PK (id).
   label_type  → 'yes' or 'no'
   yes_no_pair_id → links the YES row and NO row that form a pair
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class YesNoMaster(Base):
    __tablename__ = "yes_no_master"

    id             = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # ── Core fields ───────────────────────────────────────────────────────────
    label          = Column(String(100), nullable=False)   # e.g. "YES", "NO", "APPLICABLE"
    label_type     = Column(String(10),  nullable=False)   # 'yes' or 'no'
    yes_no_pair_id = Column(Integer,     nullable=False, index=True)  # same value for paired rows

    # ── Status ────────────────────────────────────────────────────────────────
    is_active      = Column(Boolean, default=True, nullable=False)

    # ── Audit ─────────────────────────────────────────────────────────────────
    created_by     = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by     = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at     = Column(DateTime(timezone=True), server_default=func.now(),
                            onupdate=func.now(), nullable=False)

    creator        = relationship("User", foreign_keys=[created_by])
    updater        = relationship("User", foreign_keys=[updated_by])