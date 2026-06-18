"""itemmaster/item_type_master_models.py
   SQLAlchemy ORM models for Item Type Master
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class ItemTypeMaster(Base):
    """
    Item Type Master — table name: item_type_master
    Root of the item classification hierarchy:
      ItemTypeMaster → Category → SubCategory → Product → ProductClassification
    """
    __tablename__ = "item_type_master"

    id          = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code        = Column(String(30),  nullable=False, unique=True, index=True)
    name        = Column(String(150), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    is_active   = Column(Boolean, default=True, nullable=False)

    created_by  = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by  = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = {'extend_existing': True}

    # Relationships
    creator      = relationship("User", foreign_keys=[created_by])
    updater      = relationship("User", foreign_keys=[updated_by])
    name_history = relationship(
        "ItemTypeNameHistory",
        back_populates="item_type",
        cascade="all, delete-orphan",
        order_by="ItemTypeNameHistory.changed_at.desc()",
    )


class ItemTypeNameHistory(Base):
    """
    Audit log — every name change on ItemTypeMaster is recorded here.
    table name: item_type_name_history
    """
    __tablename__ = "item_type_name_history"

    id           = Column(Integer, primary_key=True, index=True, autoincrement=True)
    item_type_id = Column(
        Integer,
        ForeignKey("item_type_master.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    old_name   = Column(String(150), nullable=False)
    new_name   = Column(String(150), nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = {'extend_existing': True}

    # Relationships
    item_type = relationship("ItemTypeMaster", back_populates="name_history")
    changer   = relationship("User", foreign_keys=[changed_by])