"""main.py """

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base

# Import routers
from company import router as company_router
from role_dep_desg import router as role_dep_desg_router
from ocr_routers import router as ocr_router
from plant import router as plant_router
from user.user_routes import router as user_router
from user.auth_routes import router as auth_router  
from user.biometric_routes import router as biometric_router
from user.protected_routes import router as protected_router
from user.user_access_analytics import router as analytics_router
from role.role_rbac_routes import router as rbac_router
from role.role_sync import router as sync_router
from role.hierarchy_routes import router as hierarchy_router
from role import hierarchy_routes as hierarchy_routes_module

# ✅ Import UOM System
from uomSystem.uom_routes import router as uom_router
from uomSystem import uom_models

# ✅ Import Category System
from category.category_routes import router as category_router
from category import category_models

# ✅ Import Product Classification System  
from productClassification.product_routers import router as product_router
from productClassification import product_models

# ✅ Import Finance & Accounting System  
from financeAccounting.finance_routes import router as finance_router
from financeAccounting import finance_models

# ✅ Import Finance Reports (GL Mapping & Framework Builder)
from financeAccounting.finance_reports_routes import router as finance_reports_router
from financeAccounting import finance_report_models

# ✅ Import Sonata Custom Fields System
from sonataCustomFields.sonata_custom_router import router as sonata_custom_router
from sonataCustomFields import sonata_custom_models

# 🚀 Import Page Creation System
from autoCreation.page_creation_routes import router as page_creation_router
from autoCreation.page_links_routes import router as page_links_router
from autoCreation.config_file_routes import router as config_file_router
from autoCreation.icon_creator_backend import router as icon_creator_router

# ✅ Excel Importer
from services.excel_importer import router as excel_router

# ✅ Import Item Master – Item Code Creation Request
from itemmaster.item_creation_req_routes import router as item_creation_req_router
from itemmaster import item_creation_req_models

# ✅ Import Item Master – Item Type Master
from itemmaster.item_type_master_routes import router as item_type_master_router
from itemmaster import item_type_master_models

# ✅ Import Item Master – Dynamic Approval Workflow Engine
from itemmaster.workflow_routes import router as workflow_router
from itemmaster import workflow_models

# ✅ Import Item Master – Workflow Builder (Flow Persistence + Audit Logs)
from itemmaster.workflow_builder_routes import router as workflow_builder_router
from itemmaster import workflow_builder_models

# ✅ Import Item Master – Workflow Entity Card Routing (per-card forward routing + audit)
from itemmaster.workflow_entity_routing_routes import router as workflow_entity_routing_router
from itemmaster import workflow_entity_routing_models

# ✅ Import Item Master – Item Master Info (UOM, Max Loose, Stock/Service, Batch, Serial, Gift Voucher, Extended Warranty)
from itemmaster.item_master_info_routes import router as item_master_info_router
from itemmaster import item_master_info_models

# ✅ Import User Department Data Access Control
from userDeptAccess.user_dept_access_routes import router as user_dept_access_router
from userDeptAccess import user_dept_access_models

# ✅ Import Page–Company Access Control System
from pageAccess.page_access_routes import router as page_access_router
from pageAccess import page_access_models

# ✅ Import MDM — Master Data Management
from MDM.mdm_access_routes import router as mdm_router
from MDM.item_info_forward_routes import router as item_info_forward_router
from MDM import mdm_models

# ✅ Import Common — Yes/No Master
from common.yes_no_master_routes import router as yes_no_master_router
from common import yes_no_master_models

# ✅ Import Item Master – Mandatory Field Configuration
from itemmaster.mandatory_field_routes import router as mandatory_field_router
from itemmaster import mandatory_field_models

# ✅ Import Item Master – Analysis Fields (Category / SubCategory / Product / Classification)
from itemmaster.item_master_analysis_fields_routes import router as analysis_fields_router
from itemmaster import item_master_analysis_fields_model

# ✅ Import Item Master – Inventory Fields (12 separate tables)
from itemmaster.item_master_inventory_routes import router as item_master_inventory_router
from itemmaster import item_master_inventory_models

# ✅ Import Item Master – Sales Fields (3 separate tables)
# ✅ Import Item Master – Finance Fields (6 separate tables)
from itemmaster.item_master_sales_finance_routes import router as item_master_sales_finance_router
from itemmaster import item_master_sales_finance_models

# ✅ Import Item Master – Warehouse Fields (7 separate tables)
from itemmaster.item_master_warehouse_routes import router as item_master_warehouse_router
from itemmaster import item_master_warehouse_models

# ✅ Import Item Master – Purchase Fields (6 separate tables)
from itemmaster.item_master_purchase_routes import router as item_master_purchase_router
from itemmaster import item_master_purchase_models

# ✅ Import Item Master – Inventory Properties Fields (27 separate tables)
from itemmaster.item_master_inv_properties_routes import router as item_master_inv_properties_router
from itemmaster import item_master_inv_properties_models

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="🏢 RBAC + Biometric + Category + Product + Finance + Sonata Custom Fields + Page Creation + Icon Creator System",
    description="Complete System with Authentication, Authorization, UOM, Category, Product Classification, Finance, Sonata Custom Fields, Automated Page Creation & Icon Management",
    version="14.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(company_router, prefix="/api", tags=["Company Management"])
app.include_router(role_dep_desg_router, prefix="/api", tags=["Role-Department-Designation"])
app.include_router(rbac_router, prefix="/api/rbac", tags=["RBAC - Access Control"])  
app.include_router(sync_router, prefix="/api", tags=["RBAC - Auto Sync"])
app.include_router(hierarchy_router, prefix="/api/rbac", tags=["RBAC - Page Hierarchy"])
app.include_router(ocr_router, prefix="/api/ocr", tags=["OCR"])
app.include_router(plant_router, prefix="/api", tags=["Plant Management"])
app.include_router(user_router, prefix="/api", tags=["User Management (Admin)"])
app.include_router(auth_router, prefix="/api", tags=["🔐 Authentication"])  
app.include_router(protected_router, prefix="/api", tags=["🔒 Protected User Routes"])
app.include_router(biometric_router, prefix="/api", tags=["👆 Biometric Authentication"])
app.include_router(analytics_router, prefix="/api", tags=["📊 User Access Analytics"])
app.include_router(uom_router, prefix="/api", tags=["📏 UOM System"])
app.include_router(category_router, prefix="/api", tags=["📂 Category Management"])
app.include_router(product_router, prefix="/api", tags=["📦 Product Classification"])
app.include_router(finance_router, prefix="/api", tags=["💰 Finance & Accounting"])
app.include_router(finance_reports_router, prefix="/api", tags=["📊 Finance Reports & GL Mapping"])
app.include_router(sonata_custom_router, prefix="/api", tags=["🗂️ Sonata Custom Fields"])
app.include_router(page_creation_router, prefix="/api/pages", tags=["🚀 Page Creation System"])
app.include_router(page_links_router, prefix="/api/links", tags=["🔗 Page Links Management"])
app.include_router(config_file_router, prefix="/api/configs", tags=["⚙️ Config File Management"])
app.include_router(icon_creator_router, tags=["🎨 Icon Creator System"])
app.include_router(excel_router, tags=["📊 Excel / CSV Importer"])
app.include_router(item_creation_req_router, prefix="/api", tags=["📋 Item Master – Item Code Creation Request"])
app.include_router(item_type_master_router, prefix="/api", tags=["🏷️ Item Master – Item Type Master"])
app.include_router(workflow_router, prefix="/api", tags=["🔄 Item Master – Approval Workflow Engine"])
app.include_router(workflow_builder_router, prefix="/api", tags=["🏗️ Item Master – Workflow Builder (Flow Persistence)"])
app.include_router(workflow_entity_routing_router, prefix="/api", tags=["🗺️ Item Master – Workflow Entity Card Routing"])
app.include_router(item_master_info_router, prefix="/api", tags=["📦 Item Master – Item Info (UOM / Flags)"])
app.include_router(user_dept_access_router, prefix="/api", tags=["👥 User Department Data Access"])
app.include_router(page_access_router,     prefix="/api", tags=["🔐 Page–Company Access Control"])
app.include_router(mdm_router,             prefix="/api", tags=["🗂️ MDM — Master Data Management"])
app.include_router(item_info_forward_router, prefix="/api", tags=["📤 MDM — Item Info Forward"])
app.include_router(yes_no_master_router,   prefix="/api", tags=["✅ Common — Yes/No Master"])
app.include_router(mandatory_field_router, prefix="/api", tags=["📌 Item Master – Mandatory Field Config"])
app.include_router(analysis_fields_router, prefix="/api", tags=["🔍 Item Master – Analysis Fields (Category / SubCategory / Product / Classification)"])
app.include_router(item_master_inventory_router, prefix="/api", tags=["🏭 Item Master – Inventory Fields (12 Tables)"])
app.include_router(item_master_sales_finance_router, prefix="/api", tags=["💼 Item Master – Sales & Finance Fields (9 Tables)"])
app.include_router(item_master_warehouse_router, prefix="/api", tags=["🏭 Item Master – Warehouse Fields (7 Tables)"])
app.include_router(item_master_purchase_router, prefix="/api", tags=["🛒 Item Master – Purchase Fields (6 Tables)"])
app.include_router(item_master_inv_properties_router, prefix="/api", tags=["📋 Item Master – Inventory Properties Fields (27 Tables)"])

#  MASTER ADMIN (2 lines )
from master_admin import install_master_admin
install_master_admin(app)


@app.get("/")
def read_root():
    return {
        "message": "🏢 Complete RBAC + Biometric + UOM + Category + Product + Finance + Sonata Custom Fields + Page Creation + Icon Creator System",
        "version": "14.0.0",
        "features": [
            "✅ User Authentication with Token Management",
            "✅ User-Specific Data Access",
            "✅ Role-Based Access Control (RBAC)",
            "✅ Biometric Authentication (Fingerprint + Face)",
            "✅ Protected Routes with Authorization",
            "✅ Dynamic Menu Based on User Access",
            "✅ Unit of Measurement (UOM) System",
            "✅ Advanced Category Management",
            "✅ Product Classification System",
            "✅ Finance & Accounting Module",
            "✅ Sonata Custom Fields Module",
            "✅ Automated Page Creation & Management",
            "✅ Icon Page Creator with Auto-Registration",
            "✅ Item Master – Item Code Creation Request",
            "✅ Item Master – Item Info (UOM, Max Loose, Stock/Service, Batch, Serial, Gift Voucher, Extended Warranty)",
            "✅ User Department Data Access Control",
            "✅ Item Master – Mandatory Field Configuration",
            "✅ Item Master – Analysis Fields (Category / SubCategory / Product / Classification)",
            "✅ Item Master – Inventory Fields (Parent Item, Packed Item, Superceded, Max Stock, Reorder Qty, Harmonised Code, Lead Time, Dimension, Min Stock, Reorder Level, Safety Stock Factor, UPC)",
            "✅ Item Master – Sales Fields (Item Class, VED Class, Price Control Code)",
            "✅ Item Master – Finance Fields (Tax Group, Method of Costing, Batch Costing, Standard Price, Costing Method No., Serial No. Costing)",
            "✅ Item Master – Warehouse Fields (Storage Temperature, Temperature Tolerance, Potency Item, Dependency Item, Forced Putaway, Multi-Batch Pallet, Item Consider)",
            "✅ Item Master – Purchase Fields (Vendor Analysis, Analysis Property Class, Positive Tolerance %, Negative Tolerance %, Physical Stock Variance %, Receipt Variance %)",
            "✅ Item Master – Inventory Properties Fields (Stock Check Level, Reservation, Auto Release, Hold, Grade, Batch Category, Barcode, Serial No Category, Temp/Weight/Volume/Dimension Checks, SO Tolerance)",
            "✅ Item Master – Workflow Entity Card Routing (per-card forward routing, source-dept mapping, full audit logs, restore)"
        ],
        "docs": "https://item-management-master-1.onrender.com/docs"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "version": "14.0.0",
        "modules": {
            "authentication": True,
            "authorization": True,
            "rbac": True,
            "biometric": True,
            "uom_system": True,
            "category_management": True,
            "product_classification": True,
            "finance_accounting": True,
            "sonata_custom_fields": True,
            "page_creation": True,
            "icon_creator": True,
            "item_code_creation_request": True,
            "item_master_info": True,
            "user_dept_data_access": True,
            "mandatory_field_config": True,
            "analysis_fields": True,
            "item_master_inventory_fields": True,
            "item_master_sales_fields": True,
            "item_master_finance_fields": True,
            "item_master_warehouse_fields": True,
            "item_master_purchase_fields": True,
            "item_master_inv_properties_fields": True,
            "item_master_workflow_builder": True,
            "item_master_workflow_entity_routing": True
        }
    }

import uvicorn
if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)