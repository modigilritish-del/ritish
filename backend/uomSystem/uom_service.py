"""
backend/uomSystem/uom_service.py
UOM Service Layer - ERP GRADE Business Logic
Complete validations for production use
"""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import List, Optional, Tuple
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID
from fastapi import HTTPException, status

from .uom_models import UOMCategory, UOM
from .uom_schemas import (
    UOMCategoryCreate, UOMCategoryUpdate,
    UOMCreate, UOMUpdate,
    UOMConvertRequest, UOMConvertResponse
)


class UOMService:
    """Service class for UOM operations with ERP-grade validations"""

    # ==================== UOM Category Operations ====================

    @staticmethod
    def create_category(db: Session, data: UOMCategoryCreate) -> UOMCategory:
        """Create new UOM category"""
        # Check duplicate code
        existing = db.query(UOMCategory).filter(UOMCategory.code == data.code.upper()).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"❌ Category code '{data.code}' already exists"
            )

        category = UOMCategory(
            code=data.code.upper(),
            name=data.name,
            description=data.description,
            is_active=data.is_active
        )
        db.add(category)
        db.commit()
        db.refresh(category)
        return category

    @staticmethod
    def get_category(db: Session, category_id: UUID) -> UOMCategory:
        """Get category by ID"""
        category = db.query(UOMCategory).filter(UOMCategory.id == category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"❌ Category not found"
            )
        return category

    @staticmethod
    def get_category_by_code(db: Session, code: str) -> Optional[UOMCategory]:
        """Get category by code"""
        return db.query(UOMCategory).filter(UOMCategory.code == code.upper()).first()

    @staticmethod
    def get_categories(
        db: Session,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[UOMCategory], int]:
        """Get all categories with filters"""
        query = db.query(UOMCategory)
        
        if is_active is not None:
            query = query.filter(UOMCategory.is_active == is_active)
        
        total = query.count()
        categories = query.offset(skip).limit(limit).all()
        return categories, total

    @staticmethod
    def update_category(db: Session, category_id: UUID, data: UOMCategoryUpdate) -> UOMCategory:
        """Update category"""
        category = UOMService.get_category(db, category_id)
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(category, key, value)
        
        db.commit()
        db.refresh(category)
        return category

    @staticmethod
    def delete_category(db: Session, category_id: UUID) -> dict:
        """Soft delete category (deactivate)"""
        category = UOMService.get_category(db, category_id)
        
        # 🔐 RULE: Cannot delete if has active UOMs
        active_uoms = db.query(UOM).filter(
            and_(UOM.category_id == category_id, UOM.is_active == True)
        ).count()
        
        if active_uoms > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"❌ Cannot delete category with {active_uoms} active UOMs. Deactivate UOMs first."
            )
        
        category.is_active = False  # type: ignore[assignment]
        db.commit()
        return {"message": "✅ Category deactivated successfully"}

    # ==================== UOM Operations ====================

    @staticmethod
    def create_uom(db: Session, data: UOMCreate) -> UOM:
        """
        Create new UOM with COMPLETE VALIDATION
        🔐 ERP RULES ENFORCED:
        1. Only ONE base unit per category
        2. Base unit MUST have factor = 1
        3. Derived units CANNOT have factor = 1
        4. No duplicate codes in same category
        """
        # Validate category exists
        category = UOMService.get_category(db, data.category_id)
        
        # 🔐 RULE 1: Check duplicate code in category
        existing = db.query(UOM).filter(
            and_(
                UOM.category_id == data.category_id,
                UOM.code == data.code.upper()
            )
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"❌ UOM code '{data.code}' already exists in category '{category.code}'"
            )
        
        # 🔐 VALIDATE BASE UNIT LOGIC
        if data.is_base:
            # RULE 2: Only ONE base unit per category
            existing_base = db.query(UOM).filter(
                and_(UOM.category_id == data.category_id, UOM.is_base == True)
            ).first()
            if existing_base:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"❌ BASE UNIT ALREADY EXISTS: {existing_base.code} ({existing_base.name}). Only ONE base unit allowed per category!"
                )
            
            # RULE 3: Base unit MUST have factor = 1
            if data.conversion_factor != 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="❌ Base UOM MUST have conversion_factor = 1"
                )
            
            base_uom_id = None
            
        else:
            # 🔐 VALIDATE DERIVED UNIT
            
            # RULE 4: Derived unit CANNOT have factor = 1
            if data.conversion_factor == 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="❌ Derived unit CANNOT have conversion_factor = 1. Use 'Is Base Unit' checkbox instead!"
                )
            
            # RULE 5: Must have base_uom_id
            if not data.base_uom_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="❌ Derived UOM MUST reference a base unit. Select Base UOM from dropdown!"
                )
            
            # RULE 6: Base UOM must exist
            base_uom = db.query(UOM).filter(UOM.id == data.base_uom_id).first()
            if not base_uom:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="❌ Base UOM not found"
                )
            
            # RULE 7: Base UOM must be in same category
            if bool(base_uom.category_id != data.category_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="❌ Base UOM must be in SAME category"
                )
            
            # RULE 8: Referenced UOM must actually be a base unit
            if not bool(base_uom.is_base):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"❌ {base_uom.code} is NOT a base unit. Select the base unit instead!"
                )
            
            # RULE 9: Conversion factor must be > 0
            if data.conversion_factor <= 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="❌ Conversion factor must be greater than 0"
                )
            
            base_uom_id = data.base_uom_id

        # ✅ ALL VALIDATIONS PASSED - Create UOM
        uom = UOM(
            category_id=data.category_id,
            code=data.code.upper(),
            name=data.name,
            symbol=data.symbol,
            is_base=data.is_base,
            base_uom_id=base_uom_id,
            conversion_factor=data.conversion_factor,
            rounding_precision=data.rounding_precision,
            is_active=data.is_active
        )
        
        db.add(uom)
        db.commit()
        db.refresh(uom)
        return uom

    @staticmethod
    def get_uom(db: Session, uom_id: UUID) -> UOM:
        """Get UOM by ID with relationships"""
        uom = db.query(UOM).options(
            joinedload(UOM.category),
            joinedload(UOM.base_uom)
        ).filter(UOM.id == uom_id).first()
        
        if not uom:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="❌ UOM not found"
            )
        return uom

    @staticmethod
    def get_uom_by_code(db: Session, code: str, category_code: Optional[str] = None) -> Optional[UOM]:
        """Get UOM by code"""
        query = db.query(UOM).options(
            joinedload(UOM.category),
            joinedload(UOM.base_uom)
        ).filter(UOM.code == code.upper())
        
        if category_code:
            query = query.join(UOMCategory).filter(UOMCategory.code == category_code.upper())
        
        return query.first()

    @staticmethod
    def get_uoms(
        db: Session,
        category_id: Optional[UUID] = None,
        category_code: Optional[str] = None,
        is_active: Optional[bool] = None,
        is_base: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[UOM], int]:
        """Get UOMs with filters"""
        query = db.query(UOM).options(
            joinedload(UOM.category),
            joinedload(UOM.base_uom)
        )
        
        if category_id:
            query = query.filter(UOM.category_id == category_id)
        
        if category_code:
            query = query.join(UOMCategory).filter(UOMCategory.code == category_code.upper())
        
        if is_active is not None:
            query = query.filter(UOM.is_active == is_active)
        
        if is_base is not None:
            query = query.filter(UOM.is_base == is_base)
        
        total = query.count()
        uoms = query.offset(skip).limit(limit).all()
        return uoms, total

    @staticmethod
    def update_uom(db: Session, uom_id: UUID, data: UOMUpdate) -> UOM:
        """
        Update UOM with SAFETY RULES
        🔐 CANNOT change factor if base unit
        """
        uom = UOMService.get_uom(db, uom_id)
        
        # 🔐 RULE: Prevent modifying base UOM conversion factor
        if bool(uom.is_base) and data.conversion_factor and data.conversion_factor != 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="❌ Cannot change BASE unit conversion factor. It must remain 1!"
            )
        
        # 🔐 RULE: Derived unit cannot have factor = 1
        if not bool(uom.is_base) and data.conversion_factor == 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="❌ Derived unit cannot have conversion_factor = 1"
            )
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(uom, key, value)
        
        db.commit()
        db.refresh(uom)
        return uom

    @staticmethod
    def delete_uom(db: Session, uom_id: UUID) -> dict:
        """
        Soft delete UOM
        🔐 RULE: Cannot delete base unit if derived units exist
        """
        uom = UOMService.get_uom(db, uom_id)
        
        # 🔐 RULE: Prevent deleting base UOM if derived UOMs exist
        if bool(uom.is_base):
            derived_count = db.query(UOM).filter(
                and_(UOM.base_uom_id == uom_id, UOM.is_active == True)
            ).count()
            
            if derived_count > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"❌ Cannot delete BASE unit with {derived_count} active derived units. Delete derived units first!"
                )
        
        uom.is_active = False  # type: ignore[assignment]
        db.commit()
        return {"message": "✅ UOM deactivated successfully"}

    # ==================== Conversion Operations ====================

    @staticmethod
    def convert(db: Session, request: UOMConvertRequest) -> UOMConvertResponse:
        """
        Convert quantity between UOMs
        🔥 ALGORITHM (ERP Standard):
        1. Convert source to base: qty_base = qty × from.factor
        2. Convert base to target: qty_target = qty_base ÷ to.factor
        
        ✅ ALWAYS goes via base unit (never direct conversion)
        """
        # Get UOMs
        from_uom = UOMService.get_uom_by_code(db, request.from_uom, request.category_code)
        to_uom = UOMService.get_uom_by_code(db, request.to_uom, request.category_code)
        
        if not from_uom:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"❌ Source UOM '{request.from_uom}' not found"
            )
        
        if not to_uom:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"❌ Target UOM '{request.to_uom}' not found"
            )
        
        # 🔐 RULE: Cannot convert between different categories
        if bool(from_uom.category_id != to_uom.category_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"❌ Cannot convert between different categories: {from_uom.category.code} → {to_uom.category.code}"
            )
        
        # 🔥 STEP 1: Convert to base unit
        base_quantity = request.quantity * from_uom.conversion_factor
        
        # 🔥 STEP 2: Convert base to target unit
        target_quantity = base_quantity / to_uom.conversion_factor
        
        # 🔥 STEP 3: Round according to target unit's precision
        target_quantity = target_quantity.quantize(
            to_uom.rounding_precision,
            rounding=ROUND_HALF_UP
        )
        
        # Get base UOM for display
        base_uom = db.query(UOM).filter(
            and_(
                UOM.category_id == from_uom.category_id,
                UOM.is_base == True
            )
        ).first()
        
        # Calculate effective conversion factor
        conversion_factor = from_uom.conversion_factor / to_uom.conversion_factor
        
        return UOMConvertResponse(
            from_uom=str(from_uom.code),
            to_uom=str(to_uom.code),
            from_quantity=request.quantity,
            to_quantity=target_quantity,
            base_quantity=Decimal(str(base_quantity)),
            base_uom=str(base_uom.code) if base_uom else "N/A",
            conversion_factor=Decimal(str(conversion_factor)),
            category=str(from_uom.category.code),
            calculation=f"{request.quantity} {from_uom.code} = {base_quantity} {base_uom.code if base_uom else 'BASE'} = {target_quantity} {to_uom.code}"
        )

    @staticmethod
    def get_conversion_factor(db: Session, from_code: str, to_code: str, category_code: Optional[str] = None) -> Decimal:
        """Get direct conversion factor between two UOMs"""
        from_uom = UOMService.get_uom_by_code(db, from_code, category_code)
        to_uom = UOMService.get_uom_by_code(db, to_code, category_code)
        
        if not from_uom or not to_uom:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="❌ One or both UOMs not found"
            )
        
        if bool(from_uom.category_id != to_uom.category_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="❌ UOMs must be in same category"
            )
        
        return Decimal(str(from_uom.conversion_factor / to_uom.conversion_factor))