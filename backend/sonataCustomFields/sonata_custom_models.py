"""sonataCustomFields/sonata_custom_models.py - Sonata Item Capacity & Item Grade Models"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


# ==================== SONATA ITEM CAPACITY ====================
class SonataItemCapacity(Base):
    """
    Sonata Item Capacity Master
    - Company + Plant wise (multiple each)
    - Code auto-generated: {COMPCODE}-CAP-{0001}
    """
    __tablename__ = "sonata_item_capacity"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    name        = Column(String(150), nullable=False)
    code        = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    is_active   = Column(Boolean, default=True, nullable=False)

    created_by  = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by  = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    creator   = relationship("User",    foreign_keys=[created_by])
    updater   = relationship("User",    foreign_keys=[updated_by])
    companies = relationship("SonataItemCapacityCompany", back_populates="item_capacity", cascade="all, delete-orphan")
    plants    = relationship("SonataItemCapacityPlant",   back_populates="item_capacity", cascade="all, delete-orphan")


class SonataItemCapacityCompany(Base):
    """Junction: Item Capacity ↔ Company"""
    __tablename__ = "sonata_item_capacity_companies"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    item_capacity_id = Column(Integer, ForeignKey("sonata_item_capacity.id", ondelete="CASCADE"), nullable=False)
    company_id       = Column(Integer, ForeignKey("companies.id",            ondelete="CASCADE"), nullable=False)

    __table_args__ = (UniqueConstraint('item_capacity_id', 'company_id', name='uq_item_cap_company'),)

    item_capacity = relationship("SonataItemCapacity", back_populates="companies")
    company       = relationship("Company", foreign_keys=[company_id])


class SonataItemCapacityPlant(Base):
    """Junction: Item Capacity ↔ Plant (optional)"""
    __tablename__ = "sonata_item_capacity_plants"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    item_capacity_id = Column(Integer, ForeignKey("sonata_item_capacity.id", ondelete="CASCADE"), nullable=False)
    plant_id         = Column(Integer, ForeignKey("plants.id",               ondelete="CASCADE"), nullable=False)

    __table_args__ = (UniqueConstraint('item_capacity_id', 'plant_id', name='uq_item_cap_plant'),)

    item_capacity = relationship("SonataItemCapacity", back_populates="plants")
    plant         = relationship("Plant", foreign_keys=[plant_id])


# ==================== SONATA ITEM GRADE ====================
class SonataItemGrade(Base):
    """
    Sonata Item Grade Master
    - Company + Plant wise (multiple each)
    - Code auto-generated: {COMPCODE}-GRD-{0001}
    """
    __tablename__ = "sonata_item_grade"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    name        = Column(String(150), nullable=False)
    code        = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    is_active   = Column(Boolean, default=True, nullable=False)

    created_by  = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by  = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())

    creator   = relationship("User",    foreign_keys=[created_by])
    updater   = relationship("User",    foreign_keys=[updated_by])
    companies = relationship("SonataItemGradeCompany", back_populates="item_grade", cascade="all, delete-orphan")
    plants    = relationship("SonataItemGradePlant",   back_populates="item_grade", cascade="all, delete-orphan")


class SonataItemGradeCompany(Base):
    """Junction: Item Grade ↔ Company"""
    __tablename__ = "sonata_item_grade_companies"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    item_grade_id = Column(Integer, ForeignKey("sonata_item_grade.id", ondelete="CASCADE"), nullable=False)
    company_id    = Column(Integer, ForeignKey("companies.id",         ondelete="CASCADE"), nullable=False)

    __table_args__ = (UniqueConstraint('item_grade_id', 'company_id', name='uq_item_grade_company'),)

    item_grade = relationship("SonataItemGrade", back_populates="companies")
    company    = relationship("Company", foreign_keys=[company_id])


class SonataItemGradePlant(Base):
    """Junction: Item Grade ↔ Plant (optional)"""
    __tablename__ = "sonata_item_grade_plants"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    item_grade_id = Column(Integer, ForeignKey("sonata_item_grade.id", ondelete="CASCADE"), nullable=False)
    plant_id      = Column(Integer, ForeignKey("plants.id",            ondelete="CASCADE"), nullable=False)

    __table_args__ = (UniqueConstraint('item_grade_id', 'plant_id', name='uq_item_grade_plant'),)

    item_grade = relationship("SonataItemGrade", back_populates="plants")
    plant      = relationship("Plant", foreign_keys=[plant_id])