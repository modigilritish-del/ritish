"""
services/excel_importer.py

Place this file inside your  backend/services/  folder.
Make sure  backend/services/__init__.py  exists (can be empty).

In main.py import as:
    from services.excel_importer import router as excel_router
    app.include_router(excel_router, tags=["📊 Excel / CSV Importer"])

No database needed — everything processed in-memory, nothing stored on disk.

Endpoints:
  POST /api/excel/parse   — Upload file → sheet list + first page of data
  POST /api/excel/sheet   — Re-send file → specific sheet / page / search / sort / date filter

✅ NEW — Date filter params for /api/excel/sheet:
  date_col    — column name to filter on (auto-detected date column)
  date_exact  — ISO date string (YYYY-MM-DD) → match only that date
  date_from   — ISO date string (YYYY-MM-DD) → start of range (inclusive)
  date_to     — ISO date string (YYYY-MM-DD) → end of range (inclusive)
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
import pandas as pd
import io
import math
import re
from datetime import datetime, date
from typing import Optional

router = APIRouter(prefix="/api/excel", tags=["📊 Excel / CSV Importer"])


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _clean_value(val):
    """Convert numpy/pandas scalars → plain Python types (JSON-safe)."""
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return ""
    if hasattr(val, "item"):       # numpy int64 / float64 → python int/float
        return val.item()
    if hasattr(val, "isoformat"):  # datetime / Timestamp → ISO string
        return val.isoformat()
    return val


def _read_file(content: bytes, filename: str) -> dict:
    """
    Parse raw bytes → { sheet_name: pd.DataFrame }
    Supported: .xlsx  .xls  .csv  .tsv
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext in ("xlsx", "xls"):
        engine = "openpyxl" if ext == "xlsx" else "xlrd"
        try:
            xf = pd.ExcelFile(io.BytesIO(content), engine=engine)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Cannot open Excel file: {e}")
        return {
            sheet: xf.parse(sheet, dtype=str).fillna("")
            for sheet in xf.sheet_names
        }

    if ext == "csv":
        try:
            df = pd.read_csv(io.BytesIO(content), dtype=str).fillna("")
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Cannot parse CSV: {e}")
        return {"Sheet1": df}

    if ext == "tsv":
        try:
            df = pd.read_csv(io.BytesIO(content), sep="\t", dtype=str).fillna("")
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Cannot parse TSV: {e}")
        return {"Sheet1": df}

    raise HTTPException(
        status_code=400,
        detail=f"Unsupported file type '.{ext}'. Use .xlsx, .xls, .csv, or .tsv"
    )


def _paginate(df: pd.DataFrame, page: int, page_size: int):
    """Slice DataFrame → rows list + pagination metadata."""
    headers     = list(df.columns)
    total_rows  = len(df)
    total_pages = max(1, math.ceil(total_rows / page_size))
    safe_page   = min(max(1, page), total_pages)
    start       = (safe_page - 1) * page_size
    end         = start + page_size

    rows = [
        {col: _clean_value(row[col]) for col in headers}
        for _, row in df.iloc[start:end].iterrows()
    ]
    return headers, rows, total_rows, total_pages, safe_page


# ─────────────────────────────────────────────────────────────────────────────
# Date parsing helpers
# ─────────────────────────────────────────────────────────────────────────────

# Patterns the backend tries to parse
_DATE_FORMATS = [
    "%Y-%m-%d",        # 2024-03-15
    "%d/%m/%Y",        # 15/03/2024
    "%m/%d/%Y",        # 03/15/2024
    "%d-%m-%Y",        # 15-03-2024
    "%d.%m.%Y",        # 15.03.2024
    "%Y/%m/%d",        # 2024/03/15
    "%d-%b-%Y",        # 15-Mar-2024
    "%d %b %Y",        # 15 Mar 2024
    "%d %B %Y",        # 15 March 2024
    "%b %Y",           # Mar 2024
    "%B %Y",           # March 2024
    "%b-%y",           # Mar-24
    "%m/%Y",           # 03/2024
    "%m-%Y",           # 03-2024
    "%Y",              # 2024
    "%Y-%m-%dT%H:%M:%S",  # ISO datetime
    "%Y-%m-%dT%H:%M",
]

def _parse_date_value(val: str) -> Optional[date]:
    """Try to parse a string value into a date object."""
    if not val or not str(val).strip():
        return None
    s = str(val).strip()

    # Already looks like ISO date
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass

    # Try pandas as last resort
    try:
        return pd.to_datetime(s, dayfirst=True).date()
    except Exception:
        return None


def _parse_iso_date(s: str) -> Optional[date]:
    """Parse YYYY-MM-DD string (from query param) → date."""
    if not s:
        return None
    try:
        return datetime.strptime(s.strip(), "%Y-%m-%d").date()
    except ValueError:
        return None


def _apply_date_filter(
    df: pd.DataFrame,
    date_col: str,
    date_exact: Optional[str],
    date_from: Optional[str],
    date_to:   Optional[str],
) -> pd.DataFrame:
    """
    Filter df rows by the date column.
    Handles exact date match OR date range (date_from → date_to).
    All date params are ISO strings (YYYY-MM-DD).
    """
    if date_col not in df.columns:
        return df

    # Parse query param dates
    exact_d = _parse_iso_date(date_exact)
    from_d  = _parse_iso_date(date_from)
    to_d    = _parse_iso_date(date_to)

    if not exact_d and not from_d and not to_d:
        return df  # nothing to filter

    def row_passes(val) -> bool:
        cell_d = _parse_date_value(str(val))
        if cell_d is None:
            return False
        if exact_d:
            return cell_d == exact_d
        if from_d and cell_d < from_d:
            return False
        if to_d and cell_d > to_d:
            return False
        return True

    mask = df[date_col].apply(row_passes)
    return df[mask]


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/excel/parse
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/parse")
async def parse_file(
    file:      UploadFile = File(...),
    page:      int        = Query(1,   ge=1),
    page_size: int        = Query(50,  ge=1, le=1000),
    sheet:     str        = Query(None),
):
    """
    Upload .xlsx / .xls / .csv / .tsv → get back:
    - sheet_names, sheets_meta (row/col count + column names per sheet)
    - active_sheet, headers, rows (paginated), total_rows, total_pages
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    sheets_data  = _read_file(content, file.filename or "upload")
    sheet_names  = list(sheets_data.keys())
    active_sheet = sheet if (sheet and sheet in sheets_data) else sheet_names[0]
    df           = sheets_data[active_sheet]

    headers, rows, total_rows, total_pages, safe_page = _paginate(df, page, page_size)

    sheets_meta = {
        name: {
            "row_count":    len(sdf),
            "column_count": len(sdf.columns),
            "columns":      list(sdf.columns),
        }
        for name, sdf in sheets_data.items()
    }

    return JSONResponse({
        "file_name":    file.filename,
        "sheet_names":  sheet_names,
        "active_sheet": active_sheet,
        "sheets_meta":  sheets_meta,
        "headers":      headers,
        "total_rows":   total_rows,
        "total_pages":  total_pages,
        "page":         safe_page,
        "page_size":    page_size,
        "rows":         rows,
    })


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/excel/sheet
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/sheet")
async def get_sheet(
    file:       UploadFile = File(...),
    sheet:      str        = Query(...),
    page:       int        = Query(1,   ge=1),
    page_size:  int        = Query(50,  ge=1, le=1000),
    search:     str        = Query("",  alias="q"),
    sort_key:   str        = Query(None),
    sort_dir:   str        = Query("asc"),
    # ── Date filter params ──────────────────────────────────────────────────
    date_col:   str        = Query(None, description="Column name to apply date filter on"),
    date_exact: str        = Query(None, description="Exact date to match (YYYY-MM-DD)"),
    date_from:  str        = Query(None, description="Start of date range (YYYY-MM-DD), inclusive"),
    date_to:    str        = Query(None, description="End of date range (YYYY-MM-DD), inclusive"),
    # ── Zero / Null filter params ───────────────────────────────────────────
    exclude_zero_cols: str = Query(None, description="Comma-separated column names — exclude rows where these cols are zero/null/empty"),
):
    """
    Get paginated + filtered + sorted rows for a specific sheet.
    Client re-sends the file each time — nothing stored on the server.

    Date filtering:
      - Pass date_col + date_exact  → only rows where that column matches the date
      - Pass date_col + date_from/date_to → only rows in the date range
      - Supports all common date formats (dd/mm/yyyy, yyyy-mm-dd, "Mar 2024", etc.)
    """
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    sheets_data = _read_file(content, file.filename or "upload")

    if sheet not in sheets_data:
        raise HTTPException(status_code=404, detail=f"Sheet '{sheet}' not found in this file.")

    df = sheets_data[sheet]

    # ── Full-text search across ALL columns ──
    if search.strip():
        mask = df.apply(
            lambda col: col.astype(str).str.contains(search.strip(), case=False, na=False)
        ).any(axis=1)
        df = df[mask]

    # ── Date filter ──────────────────────────────────────────────────────────
    if date_col and (date_exact or date_from or date_to):
        df = _apply_date_filter(df, date_col, date_exact, date_from, date_to)

    # ── Zero / Null filter ───────────────────────────────────────────────────
    # Logic: each selected column independently filters.
    # Col A ON → remove rows where A=0 (regardless of B,C)
    # Col B ON → from remaining, remove rows where B=0 (regardless of A,C)
    # Result: only rows where ALL selected columns have a value survive.
    if exclude_zero_cols:
        import re as _re
        _zero_re = _re.compile(r'^-?0+(\.0+)?$')
        def _is_zero(v):
            s = str(v).strip().lower()
            return s in ("", "null", "na", "n/a", "-", "none") or bool(_zero_re.match(s))
        cols_list = [c.strip() for c in exclude_zero_cols.split(",") if c.strip() in df.columns]
        for col in cols_list:
            df = df[~df[col].apply(_is_zero)]

    # ── Sort (numeric-aware; date-aware for date columns) ────────────────────
    if sort_key and sort_key in df.columns:
        ascending = sort_dir.lower() != "desc"

        # Try date-aware sort if this looks like a date column
        if sort_key == date_col or date_col is None:
            # Attempt to convert column to proper datetimes for sorting
            try:
                date_series = df[sort_key].apply(
                    lambda v: pd.Timestamp(_parse_date_value(str(v))) if _parse_date_value(str(v)) else pd.NaT
                )
                if date_series.notna().sum() > len(df) * 0.5:
                    df = df.copy()
                    df["__sort_date__"] = date_series
                    df = df.sort_values(by="__sort_date__", ascending=ascending, na_position="last")
                    df = df.drop(columns=["__sort_date__"])
                else:
                    raise ValueError("not enough dates")
            except Exception:
                # Fallback: numeric-aware string sort
                try:
                    df = df.sort_values(
                        by=sort_key,
                        ascending=ascending,
                        key=lambda c: pd.to_numeric(c, errors="coerce").fillna(c),
                    )
                except Exception:
                    df = df.sort_values(by=sort_key, ascending=ascending)
        else:
            try:
                df = df.sort_values(
                    by=sort_key,
                    ascending=ascending,
                    key=lambda c: pd.to_numeric(c, errors="coerce").fillna(c),
                )
            except Exception:
                df = df.sort_values(by=sort_key, ascending=ascending)

    headers, rows, total_rows, total_pages, safe_page = _paginate(df, page, page_size)

    return JSONResponse({
        "sheet":       sheet,
        "headers":     headers,
        "total_rows":  total_rows,
        "total_pages": total_pages,
        "page":        safe_page,
        "page_size":   page_size,
        "rows":        rows,
    })