"""user/user_models.py - User Management Database Models"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

# Association Tables for Many-to-Many Relationships
user_companies = Table(
    'user_companies',
    Base.metadata,
    Column('id', Integer, primary_key=True, autoincrement=True),
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
    Column('company_id', Integer, ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
    Column('is_primary', Boolean, default=False, nullable=False),
    Column('created_at', DateTime(timezone=True), server_default=func.now()),
    UniqueConstraint('user_id', 'company_id', name='unique_user_company')
)

user_plants = Table(
    'user_plants',
    Base.metadata,
    Column('id', Integer, primary_key=True, autoincrement=True),
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
    Column('plant_id', Integer, ForeignKey('plants.id', ondelete='CASCADE'), nullable=False),
    Column('company_id', Integer, ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
    Column('is_primary', Boolean, default=False, nullable=False),
    Column('created_at', DateTime(timezone=True), server_default=func.now()),
    UniqueConstraint('user_id', 'plant_id', name='unique_user_plant')
)


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    full_name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    phone = Column(String(20), nullable=False, unique=True, index=True)
    user_id = Column(String(100), nullable=False, unique=True, index=True)  # Auto-set to email initially
    password = Column(String(255), nullable=False)  # Auto-generated
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    company_accesses = relationship("UserCompanyAccess", back_populates="user", cascade="all, delete-orphan")
    companies = relationship("Company", secondary=user_companies, backref="users")
    plants = relationship("Plant", secondary=user_plants, backref="users")


class UserCompanyAccess(Base):
    """
    Tracks which user has access to which company/plant with specific role/department/designation.
    This is the main table for role-based access control.
    """
    __tablename__ = "user_company_access"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    company_id = Column(Integer, ForeignKey('companies.id', ondelete='CASCADE'), nullable=False)
    plant_id = Column(Integer, ForeignKey('plants.id', ondelete='CASCADE'), nullable=True)  # NULL means company-level access
    role_id = Column(Integer, ForeignKey('roles.id', ondelete='CASCADE'), nullable=False)
    department_id = Column(Integer, ForeignKey('departments.id', ondelete='CASCADE'), nullable=False)
    designation_id = Column(Integer, ForeignKey('designations.id', ondelete='CASCADE'), nullable=False)
    is_primary_company = Column(Boolean, default=False, nullable=False)
    is_primary_plant = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    __table_args__ = (
        UniqueConstraint('user_id', 'company_id', 'plant_id', 'role_id', 'department_id', 'designation_id', 
                        name='unique_user_access'),
    )
    
    # Relationships
    user = relationship("User", back_populates="company_accesses")
    company = relationship("Company")
    plant = relationship("Plant")
    role = relationship("Role")
    department = relationship("Department")
    designation = relationship("Designation")