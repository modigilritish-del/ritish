"""category/category_models.py - Category Management"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Category(Base):
    """
    Category Table — table name: item_master_categories
    """
    __tablename__ = "item_master_categories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Item-Type linkage
    item_type_id = Column(Integer, ForeignKey("item_type_master.id", ondelete="CASCADE"), nullable=True, index=True)

    category_name = Column(String(255), nullable=False, index=True)
    category_code = Column(String(80), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = ({'extend_existing': True})

    # Relationships
    item_type = relationship("ItemTypeMaster", foreign_keys=[item_type_id])
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])


class SubCategory(Base):
    """Sub-Category Table — table name: item_master_sub_categories"""
    __tablename__ = "item_master_sub_categories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("item_master_categories.id", ondelete="CASCADE"), nullable=False, index=True)

    sub_category_name = Column(String(255), nullable=False, index=True)
    sub_category_code = Column(String(80), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('category_id', 'sub_category_name', name='unique_item_master_subcat_per_cat'),
        {'extend_existing': True}
    )

    category = relationship("Category", foreign_keys=[category_id], backref="subcategories")
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])