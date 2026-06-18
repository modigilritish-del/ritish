"""productClassification/product_models.py - Product & Classification Models"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Product(Base):
    """
    Product Table — table name: item_master_products
    Directly linked to SubCategory.
    Scope is OPTIONAL — can be global (no company/plant) or company/plant specific.
    Multi-company support via ProductCompanyMapping table.
    """
    __tablename__ = "item_master_products"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    # Direct link to sub-category
    sub_category_id = Column(Integer, ForeignKey("item_master_sub_categories.id", ondelete="CASCADE"), nullable=False, index=True)

    # ── Scope fields (all optional — NULL = global) ──────────────────────────
    company_id       = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True)
    plant_id         = Column(Integer, ForeignKey("plants.id",    ondelete="SET NULL"), nullable=True, index=True)
    is_multi_company = Column(Boolean, default=False, nullable=False)
    # ────────────────────────────────────────────────────────────────────────

    product_name = Column(String(255), nullable=False, index=True)
    product_code = Column(String(100), nullable=False, unique=True, index=True)
    description  = Column(Text, nullable=True)

    sku     = Column(String(100), nullable=True, unique=True, index=True)
    barcode = Column(String(100), nullable=True, unique=True, index=True)

    is_active = Column(Boolean, default=True, nullable=False)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('sub_category_id', 'product_name', name='unique_item_master_product_per_subcat'),
        {'extend_existing': True}
    )

    # Relationships
    sub_category    = relationship("SubCategory", foreign_keys=[sub_category_id], backref="products")
    company         = relationship("Company", foreign_keys=[company_id])
    plant           = relationship("Plant",   foreign_keys=[plant_id])
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])


# ═════════════════════════════════════════════════════════════════════════════
#  FUTURE MAPPING TABLES
#  These tables are READY TO USE whenever you want to map a product to
#  multiple companies and/or multiple plants dynamically.
#  To activate: just insert rows here and read via the helper endpoints below.
# ═════════════════════════════════════════════════════════════════════════════

class ProductCompanyMapping(Base):
    """
    Multi-company mapping — table name: item_master_product_company_mapping

    HOW TO USE:
      1. Set Product.is_multi_company = True
      2. Set Product.company_id = None
      3. Insert one row here per company you want to map:
            ProductCompanyMapping(product_id=X, company_id=Y)
      4. Read all companies for a product via GET /api/item-product/{id}/companies
    """
    __tablename__ = "item_master_product_company_mapping"

    id         = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("item_master_products.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(Integer, ForeignKey("companies.id",            ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('product_id', 'company_id', name='unique_item_master_prod_company'),
        {'extend_existing': True}
    )

    product = relationship("Product", backref="company_mappings")
    company = relationship("Company")


class ProductPlantMapping(Base):
    """
    Multi-plant mapping — table name: item_master_product_plant_mapping

    HOW TO USE:
      1. Insert one row here per plant you want to map:
            ProductPlantMapping(product_id=X, plant_id=Y, is_primary=True/False)
      2. is_primary=True marks the default/primary plant for the product
      3. Read all plants for a product via GET /api/item-product/{id}/plants
      4. A product can be mapped to plants across different companies
    """
    __tablename__ = "item_master_product_plant_mapping"

    id         = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("item_master_products.id", ondelete="CASCADE"), nullable=False, index=True)
    plant_id   = Column(Integer, ForeignKey("plants.id",               ondelete="CASCADE"), nullable=False, index=True)
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('product_id', 'plant_id', name='unique_item_master_prod_plant'),
        {'extend_existing': True}
    )

    product = relationship("Product", backref="plant_mappings")
    plant   = relationship("Plant")

# ═════════════════════════════════════════════════════════════════════════════


class ProductClassification(Base):
    """
    Product Classification — table name: item_master_product_classifications
    """
    __tablename__ = "item_master_product_classifications"

    id         = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("item_master_products.id", ondelete="CASCADE"), nullable=False, index=True)

    classification_name = Column(String(255), nullable=False, index=True)
    classification_code = Column(String(120), nullable=False, unique=True, index=True)
    description         = Column(Text, nullable=True)

    grade            = Column(String(50),  nullable=True)
    quality_standard = Column(String(100), nullable=True)
    certification    = Column(String(100), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('product_id', 'classification_name', name='unique_item_master_cls_per_product'),
        {'extend_existing': True}
    )

    product         = relationship("Product", foreign_keys=[product_id], backref="classifications")
    created_by_user = relationship("User", foreign_keys=[created_by])
    updated_by_user = relationship("User", foreign_keys=[updated_by])