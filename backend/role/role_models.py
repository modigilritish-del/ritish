"""role/role_models.py - Role-Based Access Control Database Models"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Page(Base):
    """
    Master table for all pages/modules in the system.
    Stores the URL and metadata for every page registered in the application.
    """
    __tablename__ = "pages"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    page_name = Column(String(255), nullable=False, unique=True, index=True)
    page_code = Column(String(50), nullable=False, unique=True, index=True)
    page_url = Column(String(500), nullable=False)  # Frontend route like '/dashboard', '/inventory'
    icon_name = Column(String(100), nullable=True)  # Icon identifier for UI
    parent_page_id = Column(Integer, ForeignKey('pages.id'), nullable=True)  # For nested menus
    display_order = Column(Integer, default=0)  # Menu ordering
    is_active = Column(Boolean, default=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    parent_page = relationship("Page", remote_side=[id], backref="sub_pages")
    permissions = relationship("PagePermission", back_populates="page", cascade="all, delete-orphan")
    company_permissions = relationship("CompanyRolePageAccess", back_populates="page", cascade="all, delete-orphan")


class PagePermission(Base):
    """
    Defines what actions are available for each page
    Example: Dashboard page can have READ only, Inventory page can have CREATE, READ, UPDATE, DELETE
    """
    __tablename__ = "page_permissions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    page_id = Column(Integer, ForeignKey('pages.id', ondelete='CASCADE'), nullable=False)
    permission_type = Column(String(50), nullable=False)  # 'CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', etc.
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('page_id', 'permission_type', name='unique_page_permission'),
    )
    
    # Relationships
    page = relationship("Page", back_populates="permissions")
    company_accesses = relationship("CompanyRolePageAccess", back_populates="permission")


class CompanyRolePageAccess(Base):
    """
    Main RBAC table: Links Company -> Role -> Department -> Designation -> Page -> Permission.
    Determines which page and permission is accessible to which role/department/designation within a company.
    """
    __tablename__ = "company_role_page_access"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='CASCADE'), nullable=False)
    role_id = Column(Integer, ForeignKey('roles.id', ondelete='CASCADE'), nullable=False)
    department_id = Column(Integer, ForeignKey('departments.id', ondelete='CASCADE'), nullable=False)
    designation_id = Column(Integer, ForeignKey('designations.id', ondelete='CASCADE'), nullable=False)
    page_id = Column(Integer, ForeignKey('pages.id', ondelete='CASCADE'), nullable=False)
    permission_id = Column(Integer, ForeignKey('page_permissions.id', ondelete='CASCADE'), nullable=False)
    is_granted = Column(Boolean, default=True)  # True = access granted, False = access denied
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('company_id', 'role_id', 'department_id', 'designation_id', 
                        'page_id', 'permission_id', name='unique_rbac_access'),
    )
    
    # Relationships
    company = relationship("Company")
    role = relationship("Role")
    department = relationship("Department")
    designation = relationship("Designation")
    page = relationship("Page", back_populates="company_permissions")
    permission = relationship("PagePermission", back_populates="company_accesses")


class UserPageAccessCache(Base):
    """
    Cache table for faster user permission lookup
    Automatically updated when CompanyRolePageAccess changes
    """
    __tablename__ = "user_page_access_cache"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='CASCADE'), nullable=False)
    page_id = Column(Integer, ForeignKey('pages.id', ondelete='CASCADE'), nullable=False)
    permission_id = Column(Integer, ForeignKey('page_permissions.id', ondelete='CASCADE'), nullable=False)
    is_granted = Column(Boolean, default=True)
    cached_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('user_id', 'company_id', 'page_id', 'permission_id', 
                        name='unique_user_page_cache'),
    )
    
    # Relationships
    user = relationship("User")
    company = relationship("Company")
    page = relationship("Page")
    permission = relationship("PagePermission")