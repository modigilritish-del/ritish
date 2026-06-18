"""
financeAccounting/finance_report_models.py
─────────────────────────────────────────────────────────────────────────────
Tables:
  report_fw_types        — Framework types (IFRS, Ind AS…) — user-extensible
  report_rpt_types       — Report types (Balance Sheet, P&L…) — user-extensible
  report_frameworks      — Saved frameworks (system templates + user-created)
  report_line_items      — Line items per framework
  gl_line_item_mappings  — GL account → line item, company-scoped
─────────────────────────────────────────────────────────────────────────────
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, SmallInteger, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class ReportFwType(Base):
    """Framework type master — IFRS, IND_AS, SCHEDULE_III, CUSTOM + user-added"""
    __tablename__ = "report_fw_types"
    id            = Column(Integer,     primary_key=True, autoincrement=True)
    code          = Column(String(60),  nullable=False, unique=True, index=True)
    label         = Column(String(120), nullable=False)
    description   = Column(Text,        nullable=True)
    is_system     = Column(Boolean,     default=False, nullable=False)
    is_active     = Column(Boolean,     default=True,  nullable=False)
    display_order = Column(Integer,     default=99)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())


class ReportRptType(Base):
    """Report type master — BALANCE_SHEET, PNL, CASH_FLOW, CUSTOM + user-added"""
    __tablename__ = "report_rpt_types"
    id            = Column(Integer,     primary_key=True, autoincrement=True)
    code          = Column(String(60),  nullable=False, unique=True, index=True)
    label         = Column(String(120), nullable=False)
    description   = Column(Text,        nullable=True)
    is_system     = Column(Boolean,     default=False, nullable=False)
    is_active     = Column(Boolean,     default=True,  nullable=False)
    display_order = Column(Integer,     default=99)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())


class ReportFramework(Base):
    """
    A named reporting framework.
    is_system_template=True  → seeded by system, shown in template picker
    company_id=NULL          → global (all companies)
    template_key             → unique slug e.g. IFRS_BS (only for system templates)
    """
    __tablename__ = "report_frameworks"
    id                 = Column(Integer,    primary_key=True, autoincrement=True)
    name               = Column(String(200),nullable=False)
    framework_type     = Column(String(60), nullable=False)
    report_type        = Column(String(60), nullable=False)
    description        = Column(Text,       nullable=True)
    company_id         = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)
    is_system_template = Column(Boolean,    default=False, nullable=False)
    template_key       = Column(String(80), nullable=True, unique=True, index=True)
    is_active          = Column(Boolean,    default=True,  nullable=False)
    created_by         = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by         = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at         = Column(DateTime(timezone=True), server_default=func.now())
    updated_at         = Column(DateTime(timezone=True), onupdate=func.now())

    company    = relationship("Company", foreign_keys=[company_id])
    line_items = relationship("ReportLineItem", back_populates="framework",
                              cascade="all, delete-orphan", order_by="ReportLineItem.display_order")


class ReportLineItem(Base):
    __tablename__ = "report_line_items"
    id            = Column(Integer,      primary_key=True, autoincrement=True)
    framework_id  = Column(Integer,      ForeignKey("report_frameworks.id", ondelete="CASCADE"), nullable=False, index=True)
    code          = Column(String(80),   nullable=False)
    label         = Column(String(300),  nullable=False)
    section       = Column(String(100),  nullable=True)
    sub_section   = Column(String(100),  nullable=True)
    indent_level  = Column(SmallInteger, default=0,     nullable=False)
    is_total      = Column(Boolean,      default=False, nullable=False)
    total_of      = Column(Text,         nullable=True)
    display_order = Column(Integer,      default=0,     nullable=False)
    sign_factor   = Column(SmallInteger, default=1,     nullable=False)
    notes         = Column(Text,         nullable=True)

    framework   = relationship("ReportFramework", back_populates="line_items")
    gl_mappings = relationship("GLLineItemMapping", back_populates="line_item", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("framework_id", "code", name="uq_lineitem_fw_code"),)


class GLLineItemMapping(Base):
    __tablename__ = "gl_line_item_mappings"
    id           = Column(Integer, primary_key=True, autoincrement=True)
    framework_id = Column(Integer, ForeignKey("report_frameworks.id", ondelete="CASCADE"), nullable=False, index=True)
    line_item_id = Column(Integer, ForeignKey("report_line_items.id", ondelete="CASCADE"), nullable=False)
    gl_id        = Column(Integer, ForeignKey("gl_master.id",         ondelete="CASCADE"), nullable=False)
    company_id   = Column(Integer, ForeignKey("companies.id",         ondelete="CASCADE"), nullable=False, index=True)
    created_by   = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    line_item  = relationship("ReportLineItem", back_populates="gl_mappings")
    gl_account = relationship("GLMaster",       foreign_keys=[gl_id])
    company    = relationship("Company",        foreign_keys=[company_id])

    __table_args__ = (UniqueConstraint("framework_id", "gl_id", "company_id", name="uq_gl_fw_company"),)