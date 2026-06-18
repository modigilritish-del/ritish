"""
role/hierarchy_routes.py
========================
Company + Role based Page Hierarchy — save / load / restore / logs
All hierarchy data stored in DB. localStorage stays as cache only.

New Tables:
  - page_hierarchies       : one named hierarchy per company+role
  - page_hierarchy_nodes   : actual parent-child mapping
  - page_hierarchy_logs    : full audit / snapshot log (used for restore)

Add to main.py:
    from role import hierarchy_routes
    app.include_router(hierarchy_routes.router, prefix="/api/rbac", tags=["Hierarchy"])

Add to your alembic / create_all call — or just let SQLAlchemy create them on startup.
"""

from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey,
    Text, UniqueConstraint, func
)
from sqlalchemy.orm import Session, relationship
from sqlalchemy.sql import func as sqlfunc
from typing import Optional, List
import json
from datetime import datetime

from database import Base, get_db
import db_models as models          # Company / Role live here
from role import role_models        # Page lives here

router = APIRouter()


# ═══════════════════════════════════════════════════════════
# DATABASE MODELS
# ═══════════════════════════════════════════════════════════

class PageHierarchy(Base):
    """
    One named hierarchy per company + role combination.
    e.g.  company=1, role=2, name="Admin Flow"
    """
    __tablename__ = "page_hierarchies"

    id            = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company_id    = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    role_id       = Column(Integer, ForeignKey("roles.id",     ondelete="CASCADE"), nullable=False)
    name          = Column(String(255), nullable=False)          # hierarchy name (tab label)
    icon_label    = Column(String(100), nullable=True)           # optional icon/label (meta)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=sqlfunc.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=sqlfunc.now())

    __table_args__ = (
        UniqueConstraint("company_id", "role_id", "name", name="uq_hier_company_role_name"),
    )

    company = relationship("Company")
    role    = relationship("Role")
    nodes   = relationship("PageHierarchyNode", back_populates="hierarchy",
                           cascade="all, delete-orphan")
    logs    = relationship("PageHierarchyLog",  back_populates="hierarchy",
                           cascade="all, delete-orphan")


class PageHierarchyNode(Base):
    """
    One row per page that is part of a hierarchy.
    parent_page_id NULL  → root node
    """
    __tablename__ = "page_hierarchy_nodes"

    id              = Column(Integer, primary_key=True, index=True, autoincrement=True)
    hierarchy_id    = Column(Integer, ForeignKey("page_hierarchies.id", ondelete="CASCADE"),
                             nullable=False)
    page_id         = Column(Integer, ForeignKey("pages.id", ondelete="CASCADE"),
                             nullable=False)
    parent_page_id  = Column(Integer, ForeignKey("pages.id", ondelete="SET NULL"),
                             nullable=True)
    display_order   = Column(Integer, default=0)
    created_at      = Column(DateTime(timezone=True), server_default=sqlfunc.now())

    __table_args__ = (
        UniqueConstraint("hierarchy_id", "page_id", name="uq_hier_node"),
    )

    hierarchy = relationship("PageHierarchy", back_populates="nodes")
    page      = relationship("Page", foreign_keys=[page_id])
    parent    = relationship("Page", foreign_keys=[parent_page_id])


class PageHierarchyLog(Base):
    """
    Full snapshot log for every save.  Used for restore.
    snapshot_json stores the complete { pageId: {parentId, children[]} } blob.
    """
    __tablename__ = "page_hierarchy_logs"

    id             = Column(Integer, primary_key=True, index=True, autoincrement=True)
    hierarchy_id   = Column(Integer, ForeignKey("page_hierarchies.id", ondelete="CASCADE"),
                            nullable=False)
    action         = Column(String(50), nullable=False)          # SAVE | CREATE | DELETE | RESTORE
    snapshot_json  = Column(Text, nullable=False)                # full hierarchy blob
    note           = Column(String(500), nullable=True)          # optional description
    created_at     = Column(DateTime(timezone=True), server_default=sqlfunc.now())

    hierarchy = relationship("PageHierarchy", back_populates="logs")


# ═══════════════════════════════════════════════════════════
# HELPER
# ═══════════════════════════════════════════════════════════

def _nodes_to_blob(nodes: list) -> dict:
    """
    Convert DB nodes → frontend blob format
    { pageId: { parentId: int|null, children: [int,...] } }
    """
    blob: dict = {}
    for node in nodes:
        pid  = node.page_id
        par  = node.parent_page_id
        if pid not in blob:
            blob[pid] = {"parentId": par, "children": []}
        else:
            blob[pid]["parentId"] = par
        if par:
            if par not in blob:
                blob[par] = {"parentId": None, "children": []}
            if pid not in blob[par]["children"]:
                blob[par]["children"].append(pid)
    return blob


def _blob_to_nodes(blob: dict, hierarchy_id: int) -> list:
    """
    Convert frontend blob → list of PageHierarchyNode objects (unsaved).
    """
    nodes = []
    for page_id_str, data in blob.items():
        page_id   = int(page_id_str)
        parent_id = data.get("parentId")
        node = PageHierarchyNode(
            hierarchy_id   = hierarchy_id,
            page_id        = page_id,
            parent_page_id = int(parent_id) if parent_id else None,
            display_order  = 0,
        )
        nodes.append(node)
    return nodes



# ── Helper: auto-grant child pages based on hierarchy blob ──────────────────
def _auto_grant_hierarchy_pages(
    blob: dict,
    company_id: int,
    role_id: int,
    db: Session,
):
    """
    Jab bhi hierarchy save/create hoti hai:
    1. Saare users dhundho jo is company+role ke hain
    2. Un users ke departments/designations ke liye
       hierarchy mein present pages ka access grant karo
       (sirf agar parent page ka access pehle se hai)
    """
    from user.user_models import UserCompanyAccess

    if not blob:
        return 0

    # Saare page IDs collect karo hierarchy se
    all_page_ids = [int(pid) for pid in blob.keys()]
    if not all_page_ids:
        return 0

    # Root page IDs (parentId == null)
    root_page_ids = [
        int(pid) for pid, data in blob.items()
        if data.get("parentId") is None
    ]

    # Is company+role ke saare user access records
    user_accesses = db.query(UserCompanyAccess).filter(
        UserCompanyAccess.company_id == company_id,
        UserCompanyAccess.role_id    == role_id,
    ).all()

    if not user_accesses:
        return 0

    granted_count = 0

    for ua in user_accesses:
        dept_id  = ua.department_id
        desg_id  = ua.designation_id

        # Root pages ke liye check karo ki kya access hai
        for root_pid in root_page_ids:
            existing_root_access = db.query(
                role_models.CompanyRolePageAccess
            ).filter(
                role_models.CompanyRolePageAccess.company_id     == company_id,
                role_models.CompanyRolePageAccess.role_id        == role_id,
                role_models.CompanyRolePageAccess.department_id  == dept_id,
                role_models.CompanyRolePageAccess.designation_id == desg_id,
                role_models.CompanyRolePageAccess.page_id        == root_pid,
                role_models.CompanyRolePageAccess.is_granted     == True,
            ).first()

            if not existing_root_access:
                continue  # Root page ka access nahi → children ko bhi nahi denge

            # Root page ke permissions dhundho
            root_permissions = db.query(role_models.PagePermission).filter(
                role_models.PagePermission.page_id  == root_pid,
                role_models.PagePermission.is_enabled == True,
            ).all()

            # Collect all descendants of this root
            def get_descendants(pid):
                kids = [int(c) for c in (blob.get(str(pid), {}).get("children") or [])]
                result = list(kids)
                for k in kids:
                    result.extend(get_descendants(k))
                return result

            child_ids = get_descendants(root_pid)

            for child_pid in child_ids:
                # Child page ke permissions dhundho
                child_permissions = db.query(role_models.PagePermission).filter(
                    role_models.PagePermission.page_id    == child_pid,
                    role_models.PagePermission.is_enabled == True,
                ).all()

                for perm in child_permissions:
                    exists = db.query(role_models.CompanyRolePageAccess).filter(
                        role_models.CompanyRolePageAccess.company_id     == company_id,
                        role_models.CompanyRolePageAccess.role_id        == role_id,
                        role_models.CompanyRolePageAccess.department_id  == dept_id,
                        role_models.CompanyRolePageAccess.designation_id == desg_id,
                        role_models.CompanyRolePageAccess.page_id        == child_pid,
                        role_models.CompanyRolePageAccess.permission_id  == perm.id,
                    ).first()

                    if not exists:
                        db.add(role_models.CompanyRolePageAccess(
                            company_id     = company_id,
                            role_id        = role_id,
                            department_id  = dept_id,
                            designation_id = desg_id,
                            page_id        = child_pid,
                            permission_id  = perm.id,
                            is_granted     = True,
                        ))
                        granted_count += 1
                    else:
                        exists.is_granted = True

    db.commit()
    return granted_count

# ═══════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════

# ── List hierarchies for a company+role ─────────────────────────────────────
@router.get("/hierarchy/list")
async def list_hierarchies(
    company_id: int,
    role_id:    int,
    db: Session = Depends(get_db),
):
    """
    Get all hierarchy tabs for a company + role combination.
    Frontend calls this when user selects company & role in the hierarchy tab.
    """
    rows = db.query(PageHierarchy).filter(
        PageHierarchy.company_id == company_id,
        PageHierarchy.role_id    == role_id,
        PageHierarchy.is_active  == True,
    ).order_by(PageHierarchy.created_at).all()

    result = []
    for h in rows:
        blob = _nodes_to_blob(h.nodes)
        result.append({
            "id":         h.id,
            "name":       h.name,
            "icon_label": h.icon_label,
            "company_id": h.company_id,
            "role_id":    h.role_id,
            "blob":       blob,          # { pageId: {parentId, children} }
            "created_at": h.created_at,
            "updated_at": h.updated_at,
        })
    return result


# ── Create a new named hierarchy ────────────────────────────────────────────
@router.post("/hierarchy/create")
async def create_hierarchy(
    company_id:  int           = Form(...),
    role_id:     int           = Form(...),
    name:        str           = Form(...),
    icon_label:  Optional[str] = Form(None),
    blob_json:   str           = Form("{}"),   # initial blob (may be empty)
    db: Session = Depends(get_db),
):
    """
    Create a new named hierarchy for company + role.
    blob_json = JSON string of { pageId: {parentId, children} }
    Auto-grants child pages to all users who already have root page access.
    """
    # Validate
    if not db.query(models.Company).filter(models.Company.id == company_id).first():
        raise HTTPException(400, "Invalid company_id")
    if not db.query(models.Role).filter(models.Role.id == role_id).first():
        raise HTTPException(400, "Invalid role_id")

    name = name.strip()
    existing = db.query(PageHierarchy).filter(
        PageHierarchy.company_id == company_id,
        PageHierarchy.role_id    == role_id,
        PageHierarchy.name       == name,
    ).first()
    if existing:
        raise HTTPException(400, f'Hierarchy "{name}" already exists for this company+role')

    hier = PageHierarchy(
        company_id  = company_id,
        role_id     = role_id,
        name        = name,
        icon_label  = icon_label or name,
        is_active   = True,
    )
    db.add(hier)
    db.flush()   # get hier.id

    try:
        blob = json.loads(blob_json)
    except Exception:
        blob = {}

    for node in _blob_to_nodes(blob, hier.id):
        db.add(node)

    # Log: CREATE
    log = PageHierarchyLog(
        hierarchy_id  = hier.id,
        action        = "CREATE",
        snapshot_json = json.dumps(blob),
        note          = f'Hierarchy "{name}" created',
    )
    db.add(log)
    db.commit()
    db.refresh(hier)

    # ── Auto-grant child pages to all users with root page access ────────────
    auto_granted = _auto_grant_hierarchy_pages(blob, company_id, role_id, db)

    return {
        "id":           hier.id,
        "name":         hier.name,
        "icon_label":   hier.icon_label,
        "company_id":   hier.company_id,
        "role_id":      hier.role_id,
        "blob":         blob,
        "created_at":   hier.created_at,
        "auto_granted": auto_granted,
    }


# ── Alias: POST /hierarchy  (called by frontend saveHierarchyToDB) ───────────
@router.post("/hierarchy")
async def create_hierarchy_root(
    company_id:  int           = Form(...),
    role_id:     int           = Form(...),
    name:        str           = Form(...),
    icon_label:  Optional[str] = Form(None),
    blob_json:   str           = Form("{}"),
    db: Session = Depends(get_db),
):
    """Alias for /hierarchy/create — called by frontend saveHierarchyToDB."""
    return await create_hierarchy(company_id, role_id, name, icon_label, blob_json, db)


# ── Save (overwrite) hierarchy nodes ────────────────────────────────────────
@router.put("/hierarchy/{hierarchy_id}/save")
async def save_hierarchy(
    hierarchy_id: int,
    blob_json:    str           = Form(...),
    note:         Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Overwrite all nodes of a hierarchy with the new blob.
    Also writes a snapshot log (used for restore later).
    blob_json = JSON of { pageId: {parentId, children} }
    """
    hier = db.query(PageHierarchy).filter(PageHierarchy.id == hierarchy_id).first()
    if not hier:
        raise HTTPException(404, "Hierarchy not found")

    try:
        blob = json.loads(blob_json)
    except Exception:
        raise HTTPException(400, "Invalid blob_json")

    # Delete old nodes
    db.query(PageHierarchyNode).filter(
        PageHierarchyNode.hierarchy_id == hierarchy_id
    ).delete()

    # Insert new nodes
    for node in _blob_to_nodes(blob, hierarchy_id):
        db.add(node)

    # Log snapshot
    log = PageHierarchyLog(
        hierarchy_id  = hierarchy_id,
        action        = "SAVE",
        snapshot_json = json.dumps(blob),
        note          = note or "Manual save",
    )
    db.add(log)
    db.commit()

    # ── Auto-grant child pages to all users with root page access ────────────
    auto_granted = _auto_grant_hierarchy_pages(blob, hier.company_id, hier.role_id, db)

    return {
        "message":      "Hierarchy saved to database",
        "hierarchy_id": hierarchy_id,
        "blob":         blob,
        "saved_at":     datetime.utcnow().isoformat(),
        "auto_granted": auto_granted,
    }


# ── Delete a hierarchy ───────────────────────────────────────────────────────
@router.delete("/hierarchy/{hierarchy_id}")
async def delete_hierarchy(
    hierarchy_id: int,
    db: Session = Depends(get_db),
):
    hier = db.query(PageHierarchy).filter(PageHierarchy.id == hierarchy_id).first()
    if not hier:
        raise HTTPException(404, "Hierarchy not found")

    # Log before delete
    blob = _nodes_to_blob(hier.nodes)
    log = PageHierarchyLog(
        hierarchy_id  = hierarchy_id,
        action        = "DELETE",
        snapshot_json = json.dumps(blob),
        note          = f'Hierarchy "{hier.name}" deleted',
    )
    db.add(log)
    db.flush()

    db.delete(hier)
    db.commit()
    return {"message": f'Hierarchy "{hier.name}" deleted', "hierarchy_id": hierarchy_id}


# ── Get log history for a hierarchy ─────────────────────────────────────────
@router.get("/hierarchy/{hierarchy_id}/logs")
async def get_hierarchy_logs(
    hierarchy_id: int,
    limit:        int = 20,
    db: Session = Depends(get_db),
):
    """
    Returns all snapshot logs for this hierarchy (newest first).
    Frontend shows these in a restore dialog.
    """
    logs = db.query(PageHierarchyLog).filter(
        PageHierarchyLog.hierarchy_id == hierarchy_id
    ).order_by(PageHierarchyLog.created_at.desc()).limit(limit).all()

    return [
        {
            "log_id":     l.id,
            "action":     l.action,
            "note":       l.note,
            "snapshot":   json.loads(l.snapshot_json),
            "created_at": l.created_at,
        }
        for l in logs
    ]


# ── Restore hierarchy from a specific log snapshot ───────────────────────────
@router.post("/hierarchy/{hierarchy_id}/restore/{log_id}")
async def restore_hierarchy(
    hierarchy_id: int,
    log_id:       int,
    db: Session = Depends(get_db),
):
    """
    Restore hierarchy nodes from a previous log snapshot.
    Writes a new RESTORE log after applying.
    """
    hier = db.query(PageHierarchy).filter(PageHierarchy.id == hierarchy_id).first()
    if not hier:
        raise HTTPException(404, "Hierarchy not found")

    log_entry = db.query(PageHierarchyLog).filter(
        PageHierarchyLog.id           == log_id,
        PageHierarchyLog.hierarchy_id == hierarchy_id,
    ).first()
    if not log_entry:
        raise HTTPException(404, "Log entry not found for this hierarchy")

    blob = json.loads(log_entry.snapshot_json)

    # Overwrite nodes
    db.query(PageHierarchyNode).filter(
        PageHierarchyNode.hierarchy_id == hierarchy_id
    ).delete()
    for node in _blob_to_nodes(blob, hierarchy_id):
        db.add(node)

    # Write restore log
    restore_log = PageHierarchyLog(
        hierarchy_id  = hierarchy_id,
        action        = "RESTORE",
        snapshot_json = json.dumps(blob),
        note          = f"Restored from log #{log_id} ({log_entry.action} @ {log_entry.created_at})",
    )
    db.add(restore_log)
    db.commit()

    return {
        "message":      f"Hierarchy restored from log #{log_id}",
        "hierarchy_id": hierarchy_id,
        "blob":         blob,
        "restored_at":  datetime.utcnow().isoformat(),
    }


# ── Get all logs across ALL hierarchies for a company+role ──────────────────
@router.get("/hierarchy/logs/all")
async def get_all_logs(
    company_id: int,
    role_id:    int,
    limit:      int = 50,
    db: Session = Depends(get_db),
):
    """
    Global log view: all hierarchy actions for company + role.
    Useful for admin audit trail.
    """
    hiers = db.query(PageHierarchy).filter(
        PageHierarchy.company_id == company_id,
        PageHierarchy.role_id    == role_id,
    ).all()
    hier_ids = [h.id for h in hiers]
    if not hier_ids:
        return []

    logs = db.query(PageHierarchyLog).filter(
        PageHierarchyLog.hierarchy_id.in_(hier_ids)
    ).order_by(PageHierarchyLog.created_at.desc()).limit(limit).all()

    hier_map = {h.id: h.name for h in hiers}
    return [
        {
            "log_id":         l.id,
            "hierarchy_id":   l.hierarchy_id,
            "hierarchy_name": hier_map.get(l.hierarchy_id, "?"),
            "action":         l.action,
            "note":           l.note,
            "created_at":     l.created_at,
        }
        for l in logs
    ]