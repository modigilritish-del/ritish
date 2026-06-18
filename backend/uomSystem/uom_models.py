"""
backend/uomSystem/uom_models.py
UOM Models - Database Schema
Enterprise-grade UOM system following industry standards
"""
from sqlalchemy import Column, String, Boolean, TIMESTAMP, ForeignKey, NUMERIC, text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class UOMCategory(Base):
    """
    UOM Category - Groups related units (WEIGHT, LENGTH, VOLUME, etc.)
    """
    __tablename__ = "uom_category"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    code = Column(String(50), nullable=False, unique=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500))
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("TRUE"))
    created_at = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    uoms = relationship("UOM", back_populates="category", foreign_keys="[UOM.category_id]")

    def __repr__(self):
        return f"<UOMCategory(code='{self.code}', name='{self.name}')>"


class UOM(Base):
    """
    Unit of Measure - Individual units with conversion factors
    """
    __tablename__ = "uom"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    category_id = Column(UUID(as_uuid=True), ForeignKey("uom_category.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Unit identification
    code = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    symbol = Column(String(20))
    
    # Conversion logic
    is_base = Column(Boolean, nullable=False, default=False, server_default=text("FALSE"))
    base_uom_id = Column(UUID(as_uuid=True), ForeignKey("uom.id", ondelete="RESTRICT"))
    conversion_factor = Column(NUMERIC(20, 10), nullable=False, default=1, server_default=text("1"))
    rounding_precision = Column(NUMERIC(10, 6), nullable=False, default=0.0001, server_default=text("0.0001"))
    
    # Metadata
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("TRUE"))
    created_at = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    category = relationship("UOMCategory", back_populates="uoms", foreign_keys=[category_id])
    base_uom = relationship("UOM", remote_side=[id], backref="derived_uoms")
    
    # Constraints
    __table_args__ = (
        Index('idx_uom_category', 'category_id'),
        Index('idx_uom_active', 'is_active'),
        Index('idx_uom_code_category', 'category_id', 'code', unique=True),
    )

    def __repr__(self):
        return f"<UOM(code='{self.code}', name='{self.name}', category='{self.category.code if self.category else None}')>"