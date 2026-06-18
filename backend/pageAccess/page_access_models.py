"""pageAccess/page_access_models.py
   SQLAlchemy ORM models for Page–Company Access Control System

   Tables
   ──────
   page_registry          – master list of all registered pages
   page_company_access    – page ↔ company mapping  (ONE primary company per page)

   REMOVED: page_user_override  (per-user override table — removed)
   REMOVED: plant_id column from page_company_access (plant support removed)
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean,
    DateTime, ForeignKey, UniqueConstraint, func
)
from sqlalchemy.orm import relationship
from database import Base


class PageRegistry(Base):
    __tablename__ = "pageregistoryforcompaccess"

    id          = Column(Integer, primary_key=True, autoincrement=True, index=True)
    page_key    = Column(String(200), nullable=False, unique=True, index=True)
    page_name   = Column(String(255), nullable=False)
    page_route  = Column(String(500), nullable=False)
    icon        = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    is_active   = Column(Boolean, default=True, nullable=False)

    created_by  = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(),
                         onupdate=func.now(), nullable=False)

    creator          = relationship("User", foreign_keys=[created_by])
    company_accesses = relationship("PageCompanyAccess", back_populates="page",
                                    cascade="all, delete-orphan")


class PageCompanyAccess(Base):
    """
    ONE PRIMARY COMPANY PER PAGE.
    page_id has unique=True — each page can only be linked to one company.
    REMOVED: plant_id, PageUserOverride.
    """
    __tablename__ = "pgeaccessforcompregistorypages"

    id         = Column(Integer, primary_key=True, autoincrement=True, index=True)
    page_id    = Column(Integer, ForeignKey("pageregistoryforcompaccess.id", ondelete="CASCADE"),
                        nullable=False, index=True, unique=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"),
                        nullable=False, index=True)

    is_active  = Column(Boolean, default=True, nullable=False)

    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    page    = relationship("PageRegistry", back_populates="company_accesses")
    company = relationship("Company", foreign_keys=[company_id])
    creator = relationship("User",    foreign_keys=[created_by])