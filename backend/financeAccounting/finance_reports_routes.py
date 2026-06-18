"""
financeAccounting/finance_reports_routes.py
Finance Reports API — Framework Types, Report Types, Templates & GL Mapping
All types and templates are stored in DB. Auto-seeds on first call.
"""
from fastapi import APIRouter, HTTPException, Depends, Form, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import json

from database import get_db
import db_models as models
from financeAccounting import finance_models as fin_models
from financeAccounting.finance_report_models import (
    ReportFwType, ReportRptType, ReportFramework, ReportLineItem, GLLineItemMapping
)
from user import user_models

router = APIRouter()

SYSTEM_FW_TYPES = [
    {"code": "IFRS",         "label": "IFRS",        "description": "International Financial Reporting Standards", "display_order": 1},
    {"code": "IND_AS",       "label": "Ind AS",       "description": "Indian Accounting Standards (Companies Act 2013)", "display_order": 2},
    {"code": "SCHEDULE_III", "label": "Schedule III", "description": "Companies Act 2013 — Schedule III", "display_order": 3},
    {"code": "CUSTOM",       "label": "Custom",       "description": "Custom / Management reporting framework", "display_order": 4},
]

SYSTEM_RPT_TYPES = [
    {"code": "BALANCE_SHEET", "label": "Balance Sheet", "description": "Statement of Financial Position", "display_order": 1},
    {"code": "PNL",           "label": "Profit & Loss", "description": "Statement of Profit or Loss",     "display_order": 2},
    {"code": "CASH_FLOW",     "label": "Cash Flow",     "description": "Statement of Cash Flows",         "display_order": 3},
    {"code": "CUSTOM",        "label": "Custom",        "description": "Custom report type",               "display_order": 4},
]

FRAMEWORK_TEMPLATES = {
    "IFRS_BS": {
        "name": "IFRS Balance Sheet",
        "framework_type": "IFRS",
        "report_type": "BALANCE_SHEET",
        "description": "IAS 1 – Statement of Financial Position",
        "line_items": [
            # ── ASSETS ──────────────────────────────────────────
            {"code": "A",         "label": "ASSETS",                      "section": "ASSETS",       "sub_section": None,               "indent_level": 0, "is_total": False, "display_order": 1,  "sign_factor": 1},
            {"code": "A-NCA",     "label": "Non-Current Assets",          "section": "ASSETS",       "sub_section": "Non-Current",      "indent_level": 1, "is_total": False, "display_order": 2,  "sign_factor": 1},
            {"code": "A-NCA-PPE", "label": "Property, Plant & Equipment", "section": "ASSETS",       "sub_section": "Non-Current",      "indent_level": 2, "is_total": False, "display_order": 3,  "sign_factor": 1},
            {"code": "A-NCA-IA",  "label": "Intangible Assets",           "section": "ASSETS",       "sub_section": "Non-Current",      "indent_level": 2, "is_total": False, "display_order": 4,  "sign_factor": 1},
            {"code": "A-NCA-INV", "label": "Long-term Investments",       "section": "ASSETS",       "sub_section": "Non-Current",      "indent_level": 2, "is_total": False, "display_order": 5,  "sign_factor": 1},
            {"code": "A-NCA-OTH", "label": "Other Non-Current Assets",    "section": "ASSETS",       "sub_section": "Non-Current",      "indent_level": 2, "is_total": False, "display_order": 6,  "sign_factor": 1},
            {"code": "A-NCA-TOT", "label": "Total Non-Current Assets",    "section": "ASSETS",       "sub_section": "Non-Current",      "indent_level": 1, "is_total": True,  "display_order": 7,  "sign_factor": 1, "total_of": ["A-NCA-PPE","A-NCA-IA","A-NCA-INV","A-NCA-OTH"]},
            {"code": "A-CA",      "label": "Current Assets",              "section": "ASSETS",       "sub_section": "Current",          "indent_level": 1, "is_total": False, "display_order": 8,  "sign_factor": 1},
            {"code": "A-CA-INV",  "label": "Inventories",                 "section": "ASSETS",       "sub_section": "Current",          "indent_level": 2, "is_total": False, "display_order": 9,  "sign_factor": 1},
            {"code": "A-CA-REC",  "label": "Trade & Other Receivables",   "section": "ASSETS",       "sub_section": "Current",          "indent_level": 2, "is_total": False, "display_order": 10, "sign_factor": 1},
            {"code": "A-CA-CASH", "label": "Cash & Cash Equivalents",     "section": "ASSETS",       "sub_section": "Current",          "indent_level": 2, "is_total": False, "display_order": 11, "sign_factor": 1},
            {"code": "A-CA-OTH",  "label": "Other Current Assets",        "section": "ASSETS",       "sub_section": "Current",          "indent_level": 2, "is_total": False, "display_order": 12, "sign_factor": 1},
            {"code": "A-CA-TOT",  "label": "Total Current Assets",        "section": "ASSETS",       "sub_section": "Current",          "indent_level": 1, "is_total": True,  "display_order": 13, "sign_factor": 1, "total_of": ["A-CA-INV","A-CA-REC","A-CA-CASH","A-CA-OTH"]},
            {"code": "A-TOT",     "label": "TOTAL ASSETS",                "section": "ASSETS",       "sub_section": None,               "indent_level": 0, "is_total": True,  "display_order": 14, "sign_factor": 1, "total_of": ["A-NCA-TOT","A-CA-TOT"]},
            # ── EQUITY ──────────────────────────────────────────
            {"code": "E",         "label": "EQUITY",                      "section": "EQUITY",       "sub_section": None,               "indent_level": 0, "is_total": False, "display_order": 15, "sign_factor": 1},
            {"code": "E-SC",      "label": "Share Capital",               "section": "EQUITY",       "sub_section": "Equity",           "indent_level": 2, "is_total": False, "display_order": 16, "sign_factor": 1},
            {"code": "E-RES",     "label": "Retained Earnings",           "section": "EQUITY",       "sub_section": "Equity",           "indent_level": 2, "is_total": False, "display_order": 17, "sign_factor": 1},
            {"code": "E-OTH",     "label": "Other Equity",                "section": "EQUITY",       "sub_section": "Equity",           "indent_level": 2, "is_total": False, "display_order": 18, "sign_factor": 1},
            {"code": "E-TOT",     "label": "Total Equity",                "section": "EQUITY",       "sub_section": None,               "indent_level": 0, "is_total": True,  "display_order": 19, "sign_factor": 1, "total_of": ["E-SC","E-RES","E-OTH"]},
            # ── LIABILITIES ──────────────────────────────────────
            {"code": "L",         "label": "LIABILITIES",                 "section": "LIABILITIES",  "sub_section": None,               "indent_level": 0, "is_total": False, "display_order": 20, "sign_factor": -1},
            {"code": "L-NCL",     "label": "Non-Current Liabilities",     "section": "LIABILITIES",  "sub_section": "Non-Current",      "indent_level": 1, "is_total": False, "display_order": 21, "sign_factor": -1},
            {"code": "L-NCL-LTB", "label": "Long-term Borrowings",        "section": "LIABILITIES",  "sub_section": "Non-Current",      "indent_level": 2, "is_total": False, "display_order": 22, "sign_factor": -1},
            {"code": "L-NCL-DT",  "label": "Deferred Tax Liabilities",    "section": "LIABILITIES",  "sub_section": "Non-Current",      "indent_level": 2, "is_total": False, "display_order": 23, "sign_factor": -1},
            {"code": "L-NCL-OTH", "label": "Other Non-Current Liabilities","section": "LIABILITIES", "sub_section": "Non-Current",      "indent_level": 2, "is_total": False, "display_order": 24, "sign_factor": -1},
            {"code": "L-NCL-TOT", "label": "Total Non-Current Liabilities","section": "LIABILITIES", "sub_section": "Non-Current",      "indent_level": 1, "is_total": True,  "display_order": 25, "sign_factor": -1, "total_of": ["L-NCL-LTB","L-NCL-DT","L-NCL-OTH"]},
            {"code": "L-CL",      "label": "Current Liabilities",         "section": "LIABILITIES",  "sub_section": "Current",          "indent_level": 1, "is_total": False, "display_order": 26, "sign_factor": -1},
            {"code": "L-CL-TRAD", "label": "Trade & Other Payables",      "section": "LIABILITIES",  "sub_section": "Current",          "indent_level": 2, "is_total": False, "display_order": 27, "sign_factor": -1},
            {"code": "L-CL-STB",  "label": "Short-term Borrowings",       "section": "LIABILITIES",  "sub_section": "Current",          "indent_level": 2, "is_total": False, "display_order": 28, "sign_factor": -1},
            {"code": "L-CL-TAX",  "label": "Current Tax Liabilities",     "section": "LIABILITIES",  "sub_section": "Current",          "indent_level": 2, "is_total": False, "display_order": 29, "sign_factor": -1},
            {"code": "L-CL-OTH",  "label": "Other Current Liabilities",   "section": "LIABILITIES",  "sub_section": "Current",          "indent_level": 2, "is_total": False, "display_order": 30, "sign_factor": -1},
            {"code": "L-CL-TOT",  "label": "Total Current Liabilities",   "section": "LIABILITIES",  "sub_section": "Current",          "indent_level": 1, "is_total": True,  "display_order": 31, "sign_factor": -1, "total_of": ["L-CL-TRAD","L-CL-STB","L-CL-TAX","L-CL-OTH"]},
            {"code": "L-TOT",     "label": "TOTAL LIABILITIES",           "section": "LIABILITIES",  "sub_section": None,               "indent_level": 0, "is_total": True,  "display_order": 32, "sign_factor": -1, "total_of": ["L-NCL-TOT","L-CL-TOT"]},
            {"code": "EL-TOT",    "label": "TOTAL EQUITY & LIABILITIES",  "section": "CHECK",        "sub_section": None,               "indent_level": 0, "is_total": True,  "display_order": 33, "sign_factor": 1,  "total_of": ["E-TOT","L-TOT"]},
        ]
    },
    "IFRS_PNL": {
        "name": "IFRS Profit & Loss",
        "framework_type": "IFRS",
        "report_type": "PNL",
        "description": "IAS 1 – Statement of Profit or Loss",
        "line_items": [
            {"code": "INC",        "label": "INCOME",                    "section": "INCOME",     "sub_section": None,           "indent_level": 0, "is_total": False, "display_order": 1,  "sign_factor": 1},
            {"code": "INC-REV",    "label": "Revenue from Operations",   "section": "INCOME",     "sub_section": "Revenue",      "indent_level": 2, "is_total": False, "display_order": 2,  "sign_factor": 1},
            {"code": "INC-OTH",    "label": "Other Income",              "section": "INCOME",     "sub_section": "Revenue",      "indent_level": 2, "is_total": False, "display_order": 3,  "sign_factor": 1},
            {"code": "INC-TOT",    "label": "Total Income",              "section": "INCOME",     "sub_section": None,           "indent_level": 1, "is_total": True,  "display_order": 4,  "sign_factor": 1, "total_of": ["INC-REV","INC-OTH"]},
            {"code": "EXP",        "label": "EXPENSES",                  "section": "EXPENSES",   "sub_section": None,           "indent_level": 0, "is_total": False, "display_order": 5,  "sign_factor": -1},
            {"code": "EXP-COGS",   "label": "Cost of Goods Sold",        "section": "EXPENSES",   "sub_section": "Direct",       "indent_level": 2, "is_total": False, "display_order": 6,  "sign_factor": -1},
            {"code": "EXP-EMP",    "label": "Employee Benefit Expenses", "section": "EXPENSES",   "sub_section": "Operating",    "indent_level": 2, "is_total": False, "display_order": 7,  "sign_factor": -1},
            {"code": "EXP-DEP",    "label": "Depreciation & Amortization","section": "EXPENSES",  "sub_section": "Operating",    "indent_level": 2, "is_total": False, "display_order": 8,  "sign_factor": -1},
            {"code": "EXP-FIN",    "label": "Finance Costs",             "section": "EXPENSES",   "sub_section": "Financial",    "indent_level": 2, "is_total": False, "display_order": 9,  "sign_factor": -1},
            {"code": "EXP-OTH",    "label": "Other Expenses",            "section": "EXPENSES",   "sub_section": "Other",        "indent_level": 2, "is_total": False, "display_order": 10, "sign_factor": -1},
            {"code": "EXP-TOT",    "label": "Total Expenses",            "section": "EXPENSES",   "sub_section": None,           "indent_level": 1, "is_total": True,  "display_order": 11, "sign_factor": -1, "total_of": ["EXP-COGS","EXP-EMP","EXP-DEP","EXP-FIN","EXP-OTH"]},
            {"code": "PBT",        "label": "Profit Before Tax",         "section": "RESULT",     "sub_section": None,           "indent_level": 1, "is_total": True,  "display_order": 12, "sign_factor": 1,  "total_of": ["INC-TOT","EXP-TOT"]},
            {"code": "TAX",        "label": "Income Tax Expense",        "section": "RESULT",     "sub_section": None,           "indent_level": 2, "is_total": False, "display_order": 13, "sign_factor": -1},
            {"code": "PAT",        "label": "Profit After Tax",          "section": "RESULT",     "sub_section": None,           "indent_level": 0, "is_total": True,  "display_order": 14, "sign_factor": 1,  "total_of": ["PBT","TAX"]},
        ]
    },
    "INDAS_SCH3_BS": {
        "name": "Ind AS Schedule III – Balance Sheet",
        "framework_type": "IND_AS",
        "report_type": "BALANCE_SHEET",
        "description": "Companies Act 2013 – Schedule III Part I (Ind AS)",
        "line_items": [
            {"code": "EQ",           "label": "I. EQUITY AND LIABILITIES",   "section": "EQUITY",      "sub_section": None,           "indent_level": 0, "is_total": False, "display_order": 1,  "sign_factor": 1},
            {"code": "EQ-SH",        "label": "1. Shareholders' Funds",      "section": "EQUITY",      "sub_section": "SH_FUNDS",     "indent_level": 1, "is_total": False, "display_order": 2,  "sign_factor": 1},
            {"code": "EQ-SH-SC",     "label": "a) Share Capital",            "section": "EQUITY",      "sub_section": "SH_FUNDS",     "indent_level": 2, "is_total": False, "display_order": 3,  "sign_factor": 1},
            {"code": "EQ-SH-RES",    "label": "b) Reserves & Surplus",       "section": "EQUITY",      "sub_section": "SH_FUNDS",     "indent_level": 2, "is_total": False, "display_order": 4,  "sign_factor": 1},
            {"code": "EQ-SH-MI",     "label": "c) Money Received Agst Warrants","section": "EQUITY",   "sub_section": "SH_FUNDS",     "indent_level": 2, "is_total": False, "display_order": 5,  "sign_factor": 1},
            {"code": "EQ-SH-TOT",    "label": "Total Shareholders' Funds",   "section": "EQUITY",      "sub_section": "SH_FUNDS",     "indent_level": 1, "is_total": True,  "display_order": 6,  "sign_factor": 1, "total_of": ["EQ-SH-SC","EQ-SH-RES","EQ-SH-MI"]},
            {"code": "EQ-NCL",       "label": "2. Non-Current Liabilities",  "section": "EQUITY",      "sub_section": "NCL",          "indent_level": 1, "is_total": False, "display_order": 7,  "sign_factor": -1},
            {"code": "EQ-NCL-LTB",   "label": "a) Long-Term Borrowings",     "section": "EQUITY",      "sub_section": "NCL",          "indent_level": 2, "is_total": False, "display_order": 8,  "sign_factor": -1},
            {"code": "EQ-NCL-DFTX",  "label": "b) Deferred Tax Liabilities", "section": "EQUITY",      "sub_section": "NCL",          "indent_level": 2, "is_total": False, "display_order": 9,  "sign_factor": -1},
            {"code": "EQ-NCL-LTP",   "label": "c) Long-Term Provisions",     "section": "EQUITY",      "sub_section": "NCL",          "indent_level": 2, "is_total": False, "display_order": 10, "sign_factor": -1},
            {"code": "EQ-NCL-TOT",   "label": "Total Non-Current Liabilities","section": "EQUITY",     "sub_section": "NCL",          "indent_level": 1, "is_total": True,  "display_order": 11, "sign_factor": -1, "total_of": ["EQ-NCL-LTB","EQ-NCL-DFTX","EQ-NCL-LTP"]},
            {"code": "EQ-CL",        "label": "3. Current Liabilities",      "section": "EQUITY",      "sub_section": "CL",           "indent_level": 1, "is_total": False, "display_order": 12, "sign_factor": -1},
            {"code": "EQ-CL-STB",    "label": "a) Short-Term Borrowings",    "section": "EQUITY",      "sub_section": "CL",           "indent_level": 2, "is_total": False, "display_order": 13, "sign_factor": -1},
            {"code": "EQ-CL-TP",     "label": "b) Trade Payables",           "section": "EQUITY",      "sub_section": "CL",           "indent_level": 2, "is_total": False, "display_order": 14, "sign_factor": -1},
            {"code": "EQ-CL-OL",     "label": "c) Other Current Liabilities","section": "EQUITY",      "sub_section": "CL",           "indent_level": 2, "is_total": False, "display_order": 15, "sign_factor": -1},
            {"code": "EQ-CL-STP",    "label": "d) Short-Term Provisions",    "section": "EQUITY",      "sub_section": "CL",           "indent_level": 2, "is_total": False, "display_order": 16, "sign_factor": -1},
            {"code": "EQ-CL-TOT",    "label": "Total Current Liabilities",   "section": "EQUITY",      "sub_section": "CL",           "indent_level": 1, "is_total": True,  "display_order": 17, "sign_factor": -1, "total_of": ["EQ-CL-STB","EQ-CL-TP","EQ-CL-OL","EQ-CL-STP"]},
            {"code": "EQ-TOT",       "label": "TOTAL EQUITY & LIABILITIES",  "section": "EQUITY",      "sub_section": None,           "indent_level": 0, "is_total": True,  "display_order": 18, "sign_factor": 1,  "total_of": ["EQ-SH-TOT","EQ-NCL-TOT","EQ-CL-TOT"]},
            {"code": "ASS",          "label": "II. ASSETS",                  "section": "ASSETS",      "sub_section": None,           "indent_level": 0, "is_total": False, "display_order": 19, "sign_factor": 1},
            {"code": "ASS-NCA",      "label": "1. Non-Current Assets",       "section": "ASSETS",      "sub_section": "NCA",          "indent_level": 1, "is_total": False, "display_order": 20, "sign_factor": 1},
            {"code": "ASS-NCA-FA",   "label": "a) Fixed Assets",             "section": "ASSETS",      "sub_section": "NCA",          "indent_level": 2, "is_total": False, "display_order": 21, "sign_factor": 1},
            {"code": "ASS-NCA-NCINV","label": "b) Non-Current Investments",  "section": "ASSETS",      "sub_section": "NCA",          "indent_level": 2, "is_total": False, "display_order": 22, "sign_factor": 1},
            {"code": "ASS-NCA-DTA",  "label": "c) Deferred Tax Assets (Net)","section": "ASSETS",      "sub_section": "NCA",          "indent_level": 2, "is_total": False, "display_order": 23, "sign_factor": 1},
            {"code": "ASS-NCA-LTA",  "label": "d) Long-Term Loans & Advances","section": "ASSETS",     "sub_section": "NCA",          "indent_level": 2, "is_total": False, "display_order": 24, "sign_factor": 1},
            {"code": "ASS-NCA-TOT",  "label": "Total Non-Current Assets",    "section": "ASSETS",      "sub_section": "NCA",          "indent_level": 1, "is_total": True,  "display_order": 25, "sign_factor": 1,  "total_of": ["ASS-NCA-FA","ASS-NCA-NCINV","ASS-NCA-DTA","ASS-NCA-LTA"]},
            {"code": "ASS-CA",       "label": "2. Current Assets",           "section": "ASSETS",      "sub_section": "CA",           "indent_level": 1, "is_total": False, "display_order": 26, "sign_factor": 1},
            {"code": "ASS-CA-INV",   "label": "a) Inventories",              "section": "ASSETS",      "sub_section": "CA",           "indent_level": 2, "is_total": False, "display_order": 27, "sign_factor": 1},
            {"code": "ASS-CA-CINV",  "label": "b) Current Investments",      "section": "ASSETS",      "sub_section": "CA",           "indent_level": 2, "is_total": False, "display_order": 28, "sign_factor": 1},
            {"code": "ASS-CA-TR",    "label": "c) Trade Receivables",        "section": "ASSETS",      "sub_section": "CA",           "indent_level": 2, "is_total": False, "display_order": 29, "sign_factor": 1},
            {"code": "ASS-CA-CASH",  "label": "d) Cash & Cash Equivalents",  "section": "ASSETS",      "sub_section": "CA",           "indent_level": 2, "is_total": False, "display_order": 30, "sign_factor": 1},
            {"code": "ASS-CA-SLA",   "label": "e) Short-Term Loans & Advances","section": "ASSETS",    "sub_section": "CA",           "indent_level": 2, "is_total": False, "display_order": 31, "sign_factor": 1},
            {"code": "ASS-CA-OCA",   "label": "f) Other Current Assets",     "section": "ASSETS",      "sub_section": "CA",           "indent_level": 2, "is_total": False, "display_order": 32, "sign_factor": 1},
            {"code": "ASS-CA-TOT",   "label": "Total Current Assets",        "section": "ASSETS",      "sub_section": "CA",           "indent_level": 1, "is_total": True,  "display_order": 33, "sign_factor": 1,  "total_of": ["ASS-CA-INV","ASS-CA-CINV","ASS-CA-TR","ASS-CA-CASH","ASS-CA-SLA","ASS-CA-OCA"]},
            {"code": "ASS-TOT",      "label": "TOTAL ASSETS",                "section": "ASSETS",      "sub_section": None,           "indent_level": 0, "is_total": True,  "display_order": 34, "sign_factor": 1,  "total_of": ["ASS-NCA-TOT","ASS-CA-TOT"]},
        ]
    },
    "INDAS_SCH3_PNL": {
        "name": "Ind AS Schedule III – P&L",
        "framework_type": "IND_AS",
        "report_type": "PNL",
        "description": "Companies Act 2013 – Schedule III Part II Statement of Profit & Loss",
        "line_items": [
            {"code": "P-INC",       "label": "I. REVENUE",                       "section": "REVENUE",   "sub_section": None,       "indent_level": 0, "is_total": False, "display_order": 1,  "sign_factor": 1},
            {"code": "P-INC-RFO",   "label": "Revenue from Operations",          "section": "REVENUE",   "sub_section": None,       "indent_level": 2, "is_total": False, "display_order": 2,  "sign_factor": 1},
            {"code": "P-INC-OI",    "label": "Other Income",                     "section": "REVENUE",   "sub_section": None,       "indent_level": 2, "is_total": False, "display_order": 3,  "sign_factor": 1},
            {"code": "P-INC-TOT",   "label": "I. Total Revenue",                 "section": "REVENUE",   "sub_section": None,       "indent_level": 1, "is_total": True,  "display_order": 4,  "sign_factor": 1, "total_of": ["P-INC-RFO","P-INC-OI"]},
            {"code": "P-EXP",       "label": "II. EXPENSES",                     "section": "EXPENSES",  "sub_section": None,       "indent_level": 0, "is_total": False, "display_order": 5,  "sign_factor": -1},
            {"code": "P-EXP-COM",   "label": "Cost of Materials Consumed",       "section": "EXPENSES",  "sub_section": None,       "indent_level": 2, "is_total": False, "display_order": 6,  "sign_factor": -1},
            {"code": "P-EXP-PUR",   "label": "Purchases of Stock-in-Trade",      "section": "EXPENSES",  "sub_section": None,       "indent_level": 2, "is_total": False, "display_order": 7,  "sign_factor": -1},
            {"code": "P-EXP-CIS",   "label": "Changes in Inventories",           "section": "EXPENSES",  "sub_section": None,       "indent_level": 2, "is_total": False, "display_order": 8,  "sign_factor": -1},
            {"code": "P-EXP-EMP",   "label": "Employee Benefit Expenses",        "section": "EXPENSES",  "sub_section": None,       "indent_level": 2, "is_total": False, "display_order": 9,  "sign_factor": -1},
            {"code": "P-EXP-FC",    "label": "Finance Costs",                    "section": "EXPENSES",  "sub_section": None,       "indent_level": 2, "is_total": False, "display_order": 10, "sign_factor": -1},
            {"code": "P-EXP-DA",    "label": "Depreciation & Amortisation",      "section": "EXPENSES",  "sub_section": None,       "indent_level": 2, "is_total": False, "display_order": 11, "sign_factor": -1},
            {"code": "P-EXP-OTH",   "label": "Other Expenses",                   "section": "EXPENSES",  "sub_section": None,       "indent_level": 2, "is_total": False, "display_order": 12, "sign_factor": -1},
            {"code": "P-EXP-TOT",   "label": "II. Total Expenses",               "section": "EXPENSES",  "sub_section": None,       "indent_level": 1, "is_total": True,  "display_order": 13, "sign_factor": -1, "total_of": ["P-EXP-COM","P-EXP-PUR","P-EXP-CIS","P-EXP-EMP","P-EXP-FC","P-EXP-DA","P-EXP-OTH"]},
            {"code": "P-PBT",       "label": "III. Profit Before Tax (I - II)",  "section": "RESULT",    "sub_section": None,       "indent_level": 1, "is_total": True,  "display_order": 14, "sign_factor": 1, "total_of": ["P-INC-TOT","P-EXP-TOT"]},
            {"code": "P-TAX-CUR",   "label": "IV. Current Tax",                  "section": "RESULT",    "sub_section": "Tax",      "indent_level": 2, "is_total": False, "display_order": 15, "sign_factor": -1},
            {"code": "P-TAX-DEF",   "label": "    Deferred Tax",                 "section": "RESULT",    "sub_section": "Tax",      "indent_level": 2, "is_total": False, "display_order": 16, "sign_factor": -1},
            {"code": "P-PAT",       "label": "V. Profit for the Period",         "section": "RESULT",    "sub_section": None,       "indent_level": 0, "is_total": True,  "display_order": 17, "sign_factor": 1, "total_of": ["P-PBT","P-TAX-CUR","P-TAX-DEF"]},
        ]
    },

    # ── IFRS Cash Flow (IAS 7 — Indirect Method) ────────────────────────────
    "IFRS_CF": {
        "name": "IFRS Cash Flow Statement",
        "framework_type": "IFRS",
        "report_type": "CASH_FLOW",
        "description": "IAS 7 — Statement of Cash Flows (Indirect Method)",
        "line_items": [
            {"code":"CF-OA",      "label":"A. OPERATING ACTIVITIES",              "section":"OPERATING", "sub_section":None,         "indent_level":0,"is_total":False,"display_order":1, "sign_factor":1},
            {"code":"CF-OA-PBT",  "label":"Profit Before Tax",                   "section":"OPERATING", "sub_section":"Adjustments","indent_level":2,"is_total":False,"display_order":2, "sign_factor":1},
            {"code":"CF-OA-DEP",  "label":"Add: Depreciation & Amortisation",    "section":"OPERATING", "sub_section":"Adjustments","indent_level":2,"is_total":False,"display_order":3, "sign_factor":1},
            {"code":"CF-OA-INT",  "label":"Add: Finance Costs",                  "section":"OPERATING", "sub_section":"Adjustments","indent_level":2,"is_total":False,"display_order":4, "sign_factor":1},
            {"code":"CF-OA-REC",  "label":"(Increase)/Decrease in Receivables",  "section":"OPERATING", "sub_section":"WorkingCap", "indent_level":2,"is_total":False,"display_order":5, "sign_factor":-1},
            {"code":"CF-OA-INV",  "label":"(Increase)/Decrease in Inventories",  "section":"OPERATING", "sub_section":"WorkingCap", "indent_level":2,"is_total":False,"display_order":6, "sign_factor":-1},
            {"code":"CF-OA-PAY",  "label":"Increase/(Decrease) in Payables",     "section":"OPERATING", "sub_section":"WorkingCap", "indent_level":2,"is_total":False,"display_order":7, "sign_factor":1},
            {"code":"CF-OA-TAX",  "label":"Income Tax Paid",                     "section":"OPERATING", "sub_section":None,         "indent_level":2,"is_total":False,"display_order":8, "sign_factor":-1},
            {"code":"CF-OA-TOT",  "label":"Net Cash from Operating Activities",  "section":"OPERATING", "sub_section":None,         "indent_level":0,"is_total":True, "display_order":9, "sign_factor":1,  "total_of":["CF-OA-PBT","CF-OA-DEP","CF-OA-INT","CF-OA-REC","CF-OA-INV","CF-OA-PAY","CF-OA-TAX"]},
            {"code":"CF-IA",      "label":"B. INVESTING ACTIVITIES",             "section":"INVESTING", "sub_section":None,         "indent_level":0,"is_total":False,"display_order":10,"sign_factor":-1},
            {"code":"CF-IA-PPE",  "label":"Purchase of PP&E",                    "section":"INVESTING", "sub_section":None,         "indent_level":2,"is_total":False,"display_order":11,"sign_factor":-1},
            {"code":"CF-IA-DISP", "label":"Proceeds from Asset Disposals",       "section":"INVESTING", "sub_section":None,         "indent_level":2,"is_total":False,"display_order":12,"sign_factor":1},
            {"code":"CF-IA-INVT", "label":"Purchase / Sale of Investments",      "section":"INVESTING", "sub_section":None,         "indent_level":2,"is_total":False,"display_order":13,"sign_factor":-1},
            {"code":"CF-IA-INT",  "label":"Interest & Dividends Received",       "section":"INVESTING", "sub_section":None,         "indent_level":2,"is_total":False,"display_order":14,"sign_factor":1},
            {"code":"CF-IA-TOT",  "label":"Net Cash from Investing Activities",  "section":"INVESTING", "sub_section":None,         "indent_level":0,"is_total":True, "display_order":15,"sign_factor":-1,"total_of":["CF-IA-PPE","CF-IA-DISP","CF-IA-INVT","CF-IA-INT"]},
            {"code":"CF-FA",      "label":"C. FINANCING ACTIVITIES",             "section":"FINANCING", "sub_section":None,         "indent_level":0,"is_total":False,"display_order":16,"sign_factor":1},
            {"code":"CF-FA-PROC", "label":"Proceeds from Borrowings",            "section":"FINANCING", "sub_section":None,         "indent_level":2,"is_total":False,"display_order":17,"sign_factor":1},
            {"code":"CF-FA-RPAY", "label":"Repayment of Borrowings",             "section":"FINANCING", "sub_section":None,         "indent_level":2,"is_total":False,"display_order":18,"sign_factor":-1},
            {"code":"CF-FA-INT",  "label":"Interest Paid",                       "section":"FINANCING", "sub_section":None,         "indent_level":2,"is_total":False,"display_order":19,"sign_factor":-1},
            {"code":"CF-FA-DIV",  "label":"Dividends Paid",                      "section":"FINANCING", "sub_section":None,         "indent_level":2,"is_total":False,"display_order":20,"sign_factor":-1},
            {"code":"CF-FA-TOT",  "label":"Net Cash from Financing Activities",  "section":"FINANCING", "sub_section":None,         "indent_level":0,"is_total":True, "display_order":21,"sign_factor":1,  "total_of":["CF-FA-PROC","CF-FA-RPAY","CF-FA-INT","CF-FA-DIV"]},
            {"code":"CF-NET",     "label":"Net Increase/(Decrease) in Cash",     "section":"NET",       "sub_section":None,         "indent_level":0,"is_total":True, "display_order":22,"sign_factor":1,  "total_of":["CF-OA-TOT","CF-IA-TOT","CF-FA-TOT"]},
            {"code":"CF-OP",      "label":"Cash & Equivalents — Opening Balance","section":"NET",       "sub_section":None,         "indent_level":2,"is_total":False,"display_order":23,"sign_factor":1},
            {"code":"CF-CL",      "label":"Cash & Equivalents — Closing Balance","section":"NET",       "sub_section":None,         "indent_level":0,"is_total":True, "display_order":24,"sign_factor":1,  "total_of":["CF-NET","CF-OP"]},
        ]
    },

    # ── Indian MIS Monthly P&L ───────────────────────────────────────────────
    "MIS_PNL": {
        "name": "Indian MIS — Monthly P&L",
        "framework_type": "CUSTOM",
        "report_type": "PNL",
        "description": "Management MIS — Monthly Profitability with EBITDA (India)",
        "line_items": [
            {"code":"MIS-REV",     "label":"REVENUE",                            "section":"REVENUE",     "sub_section":None,       "indent_level":0,"is_total":False,"display_order":1, "sign_factor":1},
            {"code":"MIS-REV-DOM", "label":"Domestic Sales",                     "section":"REVENUE",     "sub_section":"Sales",    "indent_level":2,"is_total":False,"display_order":2, "sign_factor":1},
            {"code":"MIS-REV-EXP", "label":"Export Sales",                       "section":"REVENUE",     "sub_section":"Sales",    "indent_level":2,"is_total":False,"display_order":3, "sign_factor":1},
            {"code":"MIS-REV-SVC", "label":"Service Revenue",                    "section":"REVENUE",     "sub_section":"Sales",    "indent_level":2,"is_total":False,"display_order":4, "sign_factor":1},
            {"code":"MIS-REV-OTH", "label":"Other Operating Income",             "section":"REVENUE",     "sub_section":"Sales",    "indent_level":2,"is_total":False,"display_order":5, "sign_factor":1},
            {"code":"MIS-GREV",    "label":"Gross Revenue",                      "section":"REVENUE",     "sub_section":None,       "indent_level":1,"is_total":True, "display_order":6, "sign_factor":1,  "total_of":["MIS-REV-DOM","MIS-REV-EXP","MIS-REV-SVC","MIS-REV-OTH"]},
            {"code":"MIS-COGS",    "label":"COST OF GOODS SOLD",                 "section":"DIRECT",      "sub_section":None,       "indent_level":0,"is_total":False,"display_order":7, "sign_factor":-1},
            {"code":"MIS-MAT",     "label":"Raw Material Consumed",              "section":"DIRECT",      "sub_section":None,       "indent_level":2,"is_total":False,"display_order":8, "sign_factor":-1},
            {"code":"MIS-DL",      "label":"Direct Labour",                      "section":"DIRECT",      "sub_section":None,       "indent_level":2,"is_total":False,"display_order":9, "sign_factor":-1},
            {"code":"MIS-MFG",     "label":"Manufacturing Overhead",             "section":"DIRECT",      "sub_section":None,       "indent_level":2,"is_total":False,"display_order":10,"sign_factor":-1},
            {"code":"MIS-TCOGS",   "label":"Total Cost of Goods Sold",           "section":"DIRECT",      "sub_section":None,       "indent_level":1,"is_total":True, "display_order":11,"sign_factor":-1,"total_of":["MIS-MAT","MIS-DL","MIS-MFG"]},
            {"code":"MIS-GP",      "label":"GROSS PROFIT",                       "section":"MARGINS",     "sub_section":None,       "indent_level":0,"is_total":True, "display_order":12,"sign_factor":1,  "total_of":["MIS-GREV","MIS-TCOGS"]},
            {"code":"MIS-OPEX",    "label":"OPERATING EXPENSES",                 "section":"OPEX",        "sub_section":None,       "indent_level":0,"is_total":False,"display_order":13,"sign_factor":-1},
            {"code":"MIS-SAL",     "label":"Salaries & Wages",                   "section":"OPEX",        "sub_section":None,       "indent_level":2,"is_total":False,"display_order":14,"sign_factor":-1},
            {"code":"MIS-MKT",     "label":"Marketing & Selling Expenses",       "section":"OPEX",        "sub_section":None,       "indent_level":2,"is_total":False,"display_order":15,"sign_factor":-1},
            {"code":"MIS-RNT",     "label":"Rent & Utilities",                   "section":"OPEX",        "sub_section":None,       "indent_level":2,"is_total":False,"display_order":16,"sign_factor":-1},
            {"code":"MIS-DEP",     "label":"Depreciation",                       "section":"OPEX",        "sub_section":None,       "indent_level":2,"is_total":False,"display_order":17,"sign_factor":-1},
            {"code":"MIS-OTH",     "label":"Other Admin Expenses",               "section":"OPEX",        "sub_section":None,       "indent_level":2,"is_total":False,"display_order":18,"sign_factor":-1},
            {"code":"MIS-TOPEX",   "label":"Total Operating Expenses",           "section":"OPEX",        "sub_section":None,       "indent_level":1,"is_total":True, "display_order":19,"sign_factor":-1,"total_of":["MIS-SAL","MIS-MKT","MIS-RNT","MIS-DEP","MIS-OTH"]},
            {"code":"MIS-EBITDA",  "label":"EBITDA",                             "section":"MARGINS",     "sub_section":None,       "indent_level":1,"is_total":True, "display_order":20,"sign_factor":1,  "total_of":["MIS-GP","MIS-TOPEX"]},
            {"code":"MIS-FC",      "label":"Finance Costs (Interest)",           "section":"FINANCE",     "sub_section":None,       "indent_level":2,"is_total":False,"display_order":21,"sign_factor":-1},
            {"code":"MIS-PBT",     "label":"PROFIT BEFORE TAX",                  "section":"RESULT",      "sub_section":None,       "indent_level":0,"is_total":True, "display_order":22,"sign_factor":1,  "total_of":["MIS-EBITDA","MIS-FC"]},
            {"code":"MIS-TAX",     "label":"Income Tax / TDS",                   "section":"RESULT",      "sub_section":None,       "indent_level":2,"is_total":False,"display_order":23,"sign_factor":-1},
            {"code":"MIS-PAT",     "label":"NET PROFIT AFTER TAX",               "section":"RESULT",      "sub_section":None,       "indent_level":0,"is_total":True, "display_order":24,"sign_factor":1,  "total_of":["MIS-PBT","MIS-TAX"]},
        ]
    },

    # ── US GAAP Balance Sheet (ASC 210) ──────────────────────────────────────
    "USGAAP_BS": {
        "name": "US GAAP Balance Sheet",
        "framework_type": "CUSTOM",
        "report_type": "BALANCE_SHEET",
        "description": "ASC 210 — Classified Statement of Financial Position",
        "line_items": [
            {"code":"UG-CA",      "label":"CURRENT ASSETS",                      "section":"ASSETS",     "sub_section":"Current",    "indent_level":0,"is_total":False,"display_order":1, "sign_factor":1},
            {"code":"UG-CA-CASH", "label":"Cash and Cash Equivalents",           "section":"ASSETS",     "sub_section":"Current",    "indent_level":2,"is_total":False,"display_order":2, "sign_factor":1},
            {"code":"UG-CA-STI",  "label":"Short-term Investments",              "section":"ASSETS",     "sub_section":"Current",    "indent_level":2,"is_total":False,"display_order":3, "sign_factor":1},
            {"code":"UG-CA-AR",   "label":"Accounts Receivable, net",            "section":"ASSETS",     "sub_section":"Current",    "indent_level":2,"is_total":False,"display_order":4, "sign_factor":1},
            {"code":"UG-CA-INV",  "label":"Inventories",                         "section":"ASSETS",     "sub_section":"Current",    "indent_level":2,"is_total":False,"display_order":5, "sign_factor":1},
            {"code":"UG-CA-PRE",  "label":"Prepaid Expenses & Other",            "section":"ASSETS",     "sub_section":"Current",    "indent_level":2,"is_total":False,"display_order":6, "sign_factor":1},
            {"code":"UG-CA-TOT",  "label":"Total Current Assets",                "section":"ASSETS",     "sub_section":"Current",    "indent_level":1,"is_total":True, "display_order":7, "sign_factor":1,  "total_of":["UG-CA-CASH","UG-CA-STI","UG-CA-AR","UG-CA-INV","UG-CA-PRE"]},
            {"code":"UG-NCA",     "label":"NON-CURRENT ASSETS",                 "section":"ASSETS",     "sub_section":"NonCurrent", "indent_level":0,"is_total":False,"display_order":8, "sign_factor":1},
            {"code":"UG-PPE",     "label":"PP&E, net",                           "section":"ASSETS",     "sub_section":"NonCurrent", "indent_level":2,"is_total":False,"display_order":9, "sign_factor":1},
            {"code":"UG-GW",      "label":"Goodwill",                            "section":"ASSETS",     "sub_section":"NonCurrent", "indent_level":2,"is_total":False,"display_order":10,"sign_factor":1},
            {"code":"UG-IA",      "label":"Intangible Assets, net",              "section":"ASSETS",     "sub_section":"NonCurrent", "indent_level":2,"is_total":False,"display_order":11,"sign_factor":1},
            {"code":"UG-OLTH",    "label":"Other Long-term Assets",              "section":"ASSETS",     "sub_section":"NonCurrent", "indent_level":2,"is_total":False,"display_order":12,"sign_factor":1},
            {"code":"UG-NCA-TOT", "label":"Total Non-Current Assets",            "section":"ASSETS",     "sub_section":"NonCurrent", "indent_level":1,"is_total":True, "display_order":13,"sign_factor":1,  "total_of":["UG-PPE","UG-GW","UG-IA","UG-OLTH"]},
            {"code":"UG-A-TOT",   "label":"TOTAL ASSETS",                        "section":"ASSETS",     "sub_section":None,         "indent_level":0,"is_total":True, "display_order":14,"sign_factor":1,  "total_of":["UG-CA-TOT","UG-NCA-TOT"]},
            {"code":"UG-CL",      "label":"CURRENT LIABILITIES",                "section":"LIABILITIES","sub_section":"Current",    "indent_level":0,"is_total":False,"display_order":15,"sign_factor":-1},
            {"code":"UG-AP",      "label":"Accounts Payable",                    "section":"LIABILITIES","sub_section":"Current",    "indent_level":2,"is_total":False,"display_order":16,"sign_factor":-1},
            {"code":"UG-ACCR",    "label":"Accrued Liabilities",                 "section":"LIABILITIES","sub_section":"Current",    "indent_level":2,"is_total":False,"display_order":17,"sign_factor":-1},
            {"code":"UG-STD",     "label":"Short-term Debt & Current LTD",       "section":"LIABILITIES","sub_section":"Current",    "indent_level":2,"is_total":False,"display_order":18,"sign_factor":-1},
            {"code":"UG-CL-TOT",  "label":"Total Current Liabilities",           "section":"LIABILITIES","sub_section":"Current",    "indent_level":1,"is_total":True, "display_order":19,"sign_factor":-1,"total_of":["UG-AP","UG-ACCR","UG-STD"]},
            {"code":"UG-NCL",     "label":"LONG-TERM LIABILITIES",              "section":"LIABILITIES","sub_section":"NonCurrent", "indent_level":0,"is_total":False,"display_order":20,"sign_factor":-1},
            {"code":"UG-LTD",     "label":"Long-term Debt",                      "section":"LIABILITIES","sub_section":"NonCurrent", "indent_level":2,"is_total":False,"display_order":21,"sign_factor":-1},
            {"code":"UG-DTL",     "label":"Deferred Tax Liability",              "section":"LIABILITIES","sub_section":"NonCurrent", "indent_level":2,"is_total":False,"display_order":22,"sign_factor":-1},
            {"code":"UG-NCL-TOT", "label":"Total Long-term Liabilities",         "section":"LIABILITIES","sub_section":"NonCurrent", "indent_level":1,"is_total":True, "display_order":23,"sign_factor":-1,"total_of":["UG-LTD","UG-DTL"]},
            {"code":"UG-L-TOT",   "label":"TOTAL LIABILITIES",                  "section":"LIABILITIES","sub_section":None,         "indent_level":0,"is_total":True, "display_order":24,"sign_factor":-1,"total_of":["UG-CL-TOT","UG-NCL-TOT"]},
            {"code":"UG-EQ",      "label":"STOCKHOLDERS EQUITY",                "section":"EQUITY",     "sub_section":None,         "indent_level":0,"is_total":False,"display_order":25,"sign_factor":1},
            {"code":"UG-CS",      "label":"Common Stock & APIC",                 "section":"EQUITY",     "sub_section":None,         "indent_level":2,"is_total":False,"display_order":26,"sign_factor":1},
            {"code":"UG-RE",      "label":"Retained Earnings",                   "section":"EQUITY",     "sub_section":None,         "indent_level":2,"is_total":False,"display_order":27,"sign_factor":1},
            {"code":"UG-TS",      "label":"Less: Treasury Stock",                "section":"EQUITY",     "sub_section":None,         "indent_level":2,"is_total":False,"display_order":28,"sign_factor":-1},
            {"code":"UG-EQ-TOT",  "label":"Total Stockholders Equity",           "section":"EQUITY",     "sub_section":None,         "indent_level":1,"is_total":True, "display_order":29,"sign_factor":1,  "total_of":["UG-CS","UG-RE","UG-TS"]},
            {"code":"UG-LE-TOT",  "label":"TOTAL LIABILITIES & EQUITY",         "section":"CHECK",      "sub_section":None,         "indent_level":0,"is_total":True, "display_order":30,"sign_factor":1,  "total_of":["UG-L-TOT","UG-EQ-TOT"]},
        ]
    },

    # ── Consolidated Group P&L ───────────────────────────────────────────────
    "CONSOL_PNL": {
        "name": "Consolidated Group P&L",
        "framework_type": "CUSTOM",
        "report_type": "PNL",
        "description": "Multi-entity Consolidated P&L with segment breakdown & inter-company eliminations",
        "line_items": [
            {"code":"GRP-SEG1",    "label":"Revenue — Segment A (Manufacturing)","section":"REVENUE",   "sub_section":"Segments",   "indent_level":2,"is_total":False,"display_order":1, "sign_factor":1},
            {"code":"GRP-SEG2",    "label":"Revenue — Segment B (Trading)",      "section":"REVENUE",   "sub_section":"Segments",   "indent_level":2,"is_total":False,"display_order":2, "sign_factor":1},
            {"code":"GRP-SEG3",    "label":"Revenue — Segment C (Services)",     "section":"REVENUE",   "sub_section":"Segments",   "indent_level":2,"is_total":False,"display_order":3, "sign_factor":1},
            {"code":"GRP-ELIM",    "label":"Less: Inter-segment Eliminations",   "section":"REVENUE",   "sub_section":"Segments",   "indent_level":2,"is_total":False,"display_order":4, "sign_factor":-1},
            {"code":"GRP-OI",      "label":"Other Income",                       "section":"REVENUE",   "sub_section":None,         "indent_level":2,"is_total":False,"display_order":5, "sign_factor":1},
            {"code":"GRP-TINC",    "label":"Total Consolidated Income",          "section":"REVENUE",   "sub_section":None,         "indent_level":0,"is_total":True, "display_order":6, "sign_factor":1,  "total_of":["GRP-SEG1","GRP-SEG2","GRP-SEG3","GRP-ELIM","GRP-OI"]},
            {"code":"GRP-MAT",     "label":"Materials & Purchases",              "section":"EXPENSES",  "sub_section":"Direct",     "indent_level":2,"is_total":False,"display_order":7, "sign_factor":-1},
            {"code":"GRP-EMP",     "label":"Employee Costs (Group)",             "section":"EXPENSES",  "sub_section":"Direct",     "indent_level":2,"is_total":False,"display_order":8, "sign_factor":-1},
            {"code":"GRP-DEP",     "label":"Depreciation & Amortisation",        "section":"EXPENSES",  "sub_section":"Direct",     "indent_level":2,"is_total":False,"display_order":9, "sign_factor":-1},
            {"code":"GRP-FIN",     "label":"Finance Costs",                      "section":"EXPENSES",  "sub_section":"Direct",     "indent_level":2,"is_total":False,"display_order":10,"sign_factor":-1},
            {"code":"GRP-OEXP",    "label":"Other Expenses",                     "section":"EXPENSES",  "sub_section":"Direct",     "indent_level":2,"is_total":False,"display_order":11,"sign_factor":-1},
            {"code":"GRP-XELIM",   "label":"Less: Inter-company Expense Elim",  "section":"EXPENSES",  "sub_section":"Direct",     "indent_level":2,"is_total":False,"display_order":12,"sign_factor":1},
            {"code":"GRP-TEXP",    "label":"Total Consolidated Expenses",        "section":"EXPENSES",  "sub_section":None,         "indent_level":0,"is_total":True, "display_order":13,"sign_factor":-1,"total_of":["GRP-MAT","GRP-EMP","GRP-DEP","GRP-FIN","GRP-OEXP","GRP-XELIM"]},
            {"code":"GRP-PBT",     "label":"PROFIT BEFORE TAX",                  "section":"RESULT",    "sub_section":None,         "indent_level":0,"is_total":True, "display_order":14,"sign_factor":1,  "total_of":["GRP-TINC","GRP-TEXP"]},
            {"code":"GRP-TCUR",    "label":"Current Tax (Group)",                "section":"RESULT",    "sub_section":"Tax",        "indent_level":2,"is_total":False,"display_order":15,"sign_factor":-1},
            {"code":"GRP-TDEF",    "label":"Deferred Tax (Group)",               "section":"RESULT",    "sub_section":"Tax",        "indent_level":2,"is_total":False,"display_order":16,"sign_factor":-1},
            {"code":"GRP-PAT",     "label":"PROFIT AFTER TAX",                   "section":"RESULT",    "sub_section":None,         "indent_level":0,"is_total":True, "display_order":17,"sign_factor":1,  "total_of":["GRP-PBT","GRP-TCUR","GRP-TDEF"]},
            {"code":"GRP-NCI",     "label":"Less: Non-Controlling Interest",     "section":"RESULT",    "sub_section":None,         "indent_level":2,"is_total":False,"display_order":18,"sign_factor":-1},
            {"code":"GRP-OWNER",   "label":"PAT Attributable to Owners",         "section":"RESULT",    "sub_section":None,         "indent_level":0,"is_total":True, "display_order":19,"sign_factor":1,  "total_of":["GRP-PAT","GRP-NCI"]},
        ]
    },
}


# ═══════════════════════════════════════════════════════════════════════════
# AUTO-SEED — runs once per process on first API call
# ═══════════════════════════════════════════════════════════════════════════
_seeded = False

def seed_master_data(db: Session):
    global _seeded
    if _seeded:
        return
    try:
        # Ensure tables exist before seeding (fixes cold-start on new deploys)
        from database import engine as _engine
        from financeAccounting.finance_report_models import (
            ReportFwType as _FwT, ReportRptType as _RptT,
            ReportFramework as _FwM, ReportLineItem as _LiM, GLLineItemMapping as _GlM
        )
        for _tbl in [_FwT, _RptT, _FwM, _LiM, _GlM]:
            _tbl.__table__.create(bind=_engine, checkfirst=True)

        for ft in SYSTEM_FW_TYPES:
            if not db.query(ReportFwType).filter(ReportFwType.code == ft["code"]).first():
                db.add(ReportFwType(**ft, is_system=True))
        for rt in SYSTEM_RPT_TYPES:
            if not db.query(ReportRptType).filter(ReportRptType.code == rt["code"]).first():
                db.add(ReportRptType(**rt, is_system=True))
        db.flush()
        for key, tmpl in FRAMEWORK_TEMPLATES.items():
            if not db.query(ReportFramework).filter(ReportFramework.template_key == key).first():
                fw = ReportFramework(
                    name=tmpl["name"], framework_type=tmpl["framework_type"],
                    report_type=tmpl["report_type"], description=tmpl.get("description",""),
                    company_id=None, is_system_template=True, template_key=key, is_active=True,
                )
                db.add(fw); db.flush()
                for li in tmpl["line_items"]:
                    db.add(ReportLineItem(
                        framework_id=fw.id, code=li["code"], label=li["label"],
                        section=li.get("section"), sub_section=li.get("sub_section"),
                        indent_level=li.get("indent_level",0), is_total=li.get("is_total",False),
                        total_of=json.dumps(li["total_of"]) if li.get("total_of") else None,
                        display_order=li.get("display_order",0), sign_factor=li.get("sign_factor",1),
                    ))
        db.commit(); _seeded = True
    except Exception as e:
        db.rollback()
        print(f"[finance_reports] Seed error: {e}")
        raise HTTPException(status_code=500, detail=f"DB seed error: {str(e)}")


def safe_int(v):
    try: return int(v) if v not in (None, "", "null") else None
    except: return None


def get_user_accessible_companies(db: Session, user_id: int) -> List[int]:
    return [cid for (cid,) in db.query(user_models.UserCompanyAccess.company_id).filter(
        user_models.UserCompanyAccess.user_id == user_id).distinct().all() if cid]


def check_company_access(db: Session, user_id: int, company_id: int) -> bool:
    return db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id,
        user_models.UserCompanyAccess.company_id == company_id
    ).first() is not None


# ═══════════════════════════════════════════════════════════════════════════
# ROUTES — Framework Types (DB-backed dropdown)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/finance-reports/fw-types")
async def get_fw_types(db: Session = Depends(get_db)):
    seed_master_data(db)
    rows = db.query(ReportFwType).filter(ReportFwType.is_active==True).order_by(ReportFwType.display_order).all()
    return [{"id": r.id, "code": r.code, "label": r.label, "is_system": r.is_system} for r in rows]


@router.post("/finance-reports/fw-types")
async def add_fw_type(label: str = Form(...), description: Optional[str] = Form(None), db: Session = Depends(get_db)):
    seed_master_data(db)
    code = "".join(c for c in label.strip().upper().replace(" ","_") if c.isalnum() or c=="_")
    if not code: raise HTTPException(400, "Invalid label")
    if db.query(ReportFwType).filter(ReportFwType.code==code).first():
        raise HTTPException(409, f"'{code}' already exists")
    r = ReportFwType(code=code, label=label.strip(), description=description, is_system=False, display_order=99)
    db.add(r); db.commit(); db.refresh(r)
    return {"id": r.id, "code": r.code, "label": r.label, "is_system": False}


# ═══════════════════════════════════════════════════════════════════════════
# ROUTES — Report Types (DB-backed dropdown)
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/finance-reports/rpt-types")
async def get_rpt_types(db: Session = Depends(get_db)):
    seed_master_data(db)
    rows = db.query(ReportRptType).filter(ReportRptType.is_active==True).order_by(ReportRptType.display_order).all()
    return [{"id": r.id, "code": r.code, "label": r.label, "is_system": r.is_system} for r in rows]


@router.post("/finance-reports/rpt-types")
async def add_rpt_type(label: str = Form(...), description: Optional[str] = Form(None), db: Session = Depends(get_db)):
    seed_master_data(db)
    code = "".join(c for c in label.strip().upper().replace(" ","_") if c.isalnum() or c=="_")
    if not code: raise HTTPException(400, "Invalid label")
    if db.query(ReportRptType).filter(ReportRptType.code==code).first():
        raise HTTPException(409, f"'{code}' already exists")
    r = ReportRptType(code=code, label=label.strip(), description=description, is_system=False, display_order=99)
    db.add(r); db.commit(); db.refresh(r)
    return {"id": r.id, "code": r.code, "label": r.label, "is_system": False}


# ═══════════════════════════════════════════════════════════════════════════
# ROUTES — Templates from DB
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/finance-reports/templates")
async def get_templates(db: Session = Depends(get_db)):
    seed_master_data(db)
    fws = db.query(ReportFramework).filter(
        ReportFramework.is_system_template==True, ReportFramework.is_active==True,
    ).options(joinedload(ReportFramework.line_items)).order_by(ReportFramework.framework_type, ReportFramework.name).all()
    return {"templates": [
        {"id": fw.id, "key": fw.template_key, "name": fw.name,
         "framework_type": fw.framework_type, "report_type": fw.report_type,
         "description": fw.description, "line_item_count": len(fw.line_items)}
        for fw in fws
    ]}

# ── User companies ──────────────────────────────────────────────────────────
@router.get("/finance-reports/user/{user_id}/companies")
async def get_user_companies_for_reports(user_id: int, db: Session = Depends(get_db)):
    """All companies accessible to this user (for report scoping)"""
    accesses = db.query(user_models.UserCompanyAccess).filter(
        user_models.UserCompanyAccess.user_id == user_id
    ).options(
        joinedload(user_models.UserCompanyAccess.company)
    ).all()
    companies_dict = {}
    for a in accesses:
        cid = a.company_id
        if cid not in companies_dict and a.company:
            companies_dict[cid] = {
                "company_id":   cid,
                "company_name": a.company.company_name,
                "company_code": a.company.company_code,
            }
    return {"companies": list(companies_dict.values())}


# ── GL hierarchy for a company ──────────────────────────────────────────────
@router.get("/finance-reports/gl-hierarchy/{company_id}")
async def get_gl_hierarchy_for_company(
    company_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """
    Returns all GL accounts for a company, grouped by:
      gl_type → gl_sub_type → gl_category → gl_sub_category → gl_head → gl_accounts
    Used for mapping drag-and-drop.
    """
    if not check_company_access(db, user_id, company_id):
        raise HTTPException(status_code=403, detail="No access to this company")

    gls = db.query(fin_models.GLMaster).filter(
        fin_models.GLMaster.company_id == company_id,
        fin_models.GLMaster.is_active == True
    ).options(
        joinedload(fin_models.GLMaster.gl_type),
        joinedload(fin_models.GLMaster.gl_sub_type),
        joinedload(fin_models.GLMaster.gl_category),
        joinedload(fin_models.GLMaster.gl_sub_category),
        joinedload(fin_models.GLMaster.gl_head),
        joinedload(fin_models.GLMaster.plant),
    ).order_by(fin_models.GLMaster.gl_code).all()

    # Build flat list with hierarchy path info
    result = []
    for gl in gls:
        result.append({
            "id":              gl.id,
            "gl_code":         gl.gl_code,
            "gl_name":         gl.gl_name,
            "is_postable":     gl.is_postable,
            "currency_code":   gl.currency_code,
            "plant":           {"id": gl.plant.id, "name": gl.plant.plant_name} if gl.plant else None,
            "gl_type":         {"id": gl.gl_type.id,         "code": gl.gl_type.type_code,               "name": gl.gl_type.type_name}         if gl.gl_type         else None,
            "gl_sub_type":     {"id": gl.gl_sub_type.id,     "code": gl.gl_sub_type.sub_type_code,       "name": gl.gl_sub_type.sub_type_name}  if gl.gl_sub_type     else None,
            "gl_category":     {"id": gl.gl_category.id,     "code": gl.gl_category.category_code,       "name": gl.gl_category.category_name}  if gl.gl_category     else None,
            "gl_sub_category": {"id": gl.gl_sub_category.id, "code": gl.gl_sub_category.sub_category_code,"name": gl.gl_sub_category.sub_category_name} if gl.gl_sub_category else None,
            "gl_head":         {"id": gl.gl_head.id,         "code": gl.gl_head.gl_head_code,            "name": gl.gl_head.gl_head_name}       if gl.gl_head         else None,
        })

    return {"company_id": company_id, "gl_accounts": result, "total": len(result)}


# ── Framework templates ─────────────────────────────────────────────────────
# (templates endpoint is above — served from DB)


# ── Frameworks CRUD ─────────────────────────────────────────────────────────
@router.get("/finance-reports/frameworks")
async def get_frameworks(
    user_id: int = Query(...),
    company_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """List all frameworks accessible to user"""
    seed_master_data(db)
    accessible = get_user_accessible_companies(db, user_id)
    query = db.query(ReportFramework).filter(ReportFramework.is_active == True)
    if company_id:
        query = query.filter(
            (ReportFramework.company_id == company_id) | (ReportFramework.company_id == None)
        )
    else:
        query = query.filter(
            (ReportFramework.company_id.in_(accessible)) | (ReportFramework.company_id == None)
        )
    frameworks = query.order_by(ReportFramework.framework_type, ReportFramework.name).all()
    result = []
    for fw in frameworks:
        result.append({
            "id":             fw.id,
            "name":           fw.name,
            "framework_type": fw.framework_type,
            "report_type":    fw.report_type,
            "description":    fw.description,
            "company_id":     fw.company_id,
            "company_name":   fw.company.company_name if fw.company else "Global",
            "line_item_count": len(fw.line_items),
            "created_at":     fw.created_at,
        })
    return {"frameworks": result}


@router.post("/finance-reports/frameworks")
async def create_framework(
    name:           str           = Form(...),
    framework_type: str           = Form(...),   # IFRS | IND_AS | SCHEDULE_III | CUSTOM
    report_type:    str           = Form(...),   # BALANCE_SHEET | PNL | CASH_FLOW | CUSTOM
    company_id:     Optional[int] = Form(None),
    description:    Optional[str] = Form(None),
    template_key:   Optional[str] = Form(None),  # if set, seed from FRAMEWORK_TEMPLATES
    user_id:        int           = Form(...),
    db: Session = Depends(get_db)
):
    """Create framework — optionally seeded from a built-in template"""
    seed_master_data(db)
    if company_id and not check_company_access(db, user_id, company_id):
        raise HTTPException(status_code=403, detail="No access to this company")

    fw = ReportFramework(
        name=name.strip(), framework_type=framework_type, report_type=report_type,
        company_id=company_id, description=description, created_by=user_id
    )
    db.add(fw); db.flush()

    # Seed line items from template if requested
    if template_key and template_key in FRAMEWORK_TEMPLATES:
        tmpl = FRAMEWORK_TEMPLATES[template_key]
        for li_data in tmpl["line_items"]:
            li = ReportLineItem(
                framework_id  = fw.id,
                code          = li_data["code"],
                label         = li_data["label"],
                section       = li_data.get("section"),
                sub_section   = li_data.get("sub_section"),
                indent_level  = li_data.get("indent_level", 0),
                is_total      = li_data.get("is_total", False),
                total_of      = json.dumps(li_data["total_of"]) if li_data.get("total_of") else None,
                display_order = li_data.get("display_order", 0),
                sign_factor   = li_data.get("sign_factor", 1),
            )
            db.add(li)

    db.commit(); db.refresh(fw)
    return {"id": fw.id, "name": fw.name, "framework_type": fw.framework_type, "report_type": fw.report_type,
            "company_id": fw.company_id, "line_item_count": len(fw.line_items)}


@router.get("/finance-reports/frameworks/{fw_id}")
async def get_framework(fw_id: int, db: Session = Depends(get_db)):
    fw = db.query(ReportFramework).options(
        joinedload(ReportFramework.line_items).joinedload(ReportLineItem.gl_mappings).joinedload(GLLineItemMapping.gl_account)
    ).filter(ReportFramework.id == fw_id).first()
    if not fw:
        raise HTTPException(status_code=404, detail="Framework not found")

    line_items = []
    for li in fw.line_items:
        mappings = [{"gl_id": m.gl_id, "gl_code": m.gl_account.gl_code, "gl_name": m.gl_account.gl_name, "company_id": m.company_id, "mapping_id": m.id} for m in li.gl_mappings]
        line_items.append({
            "id": li.id, "code": li.code, "label": li.label,
            "section": li.section, "sub_section": li.sub_section,
            "indent_level": li.indent_level, "is_total": li.is_total,
            "total_of": json.loads(li.total_of) if li.total_of else [],
            "display_order": li.display_order, "sign_factor": li.sign_factor,
            "notes": li.notes, "mappings": mappings,
        })
    return {
        "id": fw.id, "name": fw.name, "framework_type": fw.framework_type,
        "report_type": fw.report_type, "description": fw.description,
        "company_id": fw.company_id, "line_items": line_items,
    }


@router.put("/finance-reports/frameworks/{fw_id}")
async def update_framework(
    fw_id: int,
    name:        Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    is_active:   Optional[bool]= Form(None),
    user_id:     int           = Form(...),
    db: Session = Depends(get_db)
):
    fw = db.query(ReportFramework).filter(ReportFramework.id == fw_id).first()
    if not fw: raise HTTPException(status_code=404, detail="Framework not found")
    if name:        fw.name        = name.strip()
    if description is not None: fw.description = description
    if is_active is not None:   fw.is_active   = is_active
    fw.updated_by = user_id
    db.commit(); db.refresh(fw)
    return {"id": fw.id, "name": fw.name, "updated": True}


@router.delete("/finance-reports/frameworks/{fw_id}")
async def delete_framework(fw_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    fw = db.query(ReportFramework).filter(ReportFramework.id == fw_id).first()
    if not fw: raise HTTPException(status_code=404, detail="Framework not found")
    fw.is_active = False; fw.updated_by = user_id
    db.commit()
    return {"deleted": True, "id": fw_id}


# ── Line items ──────────────────────────────────────────────────────────────
@router.post("/finance-reports/frameworks/{fw_id}/line-items")
async def add_line_item(
    fw_id:        int,
    code:         str           = Form(...),
    label:        str           = Form(...),
    section:      Optional[str] = Form(None),
    sub_section:  Optional[str] = Form(None),
    indent_level: int           = Form(0),
    is_total:     bool          = Form(False),
    total_of:     Optional[str] = Form(None),  # JSON array string
    display_order:int           = Form(0),
    sign_factor:  int           = Form(1),
    notes:        Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    fw = db.query(ReportFramework).filter(ReportFramework.id == fw_id).first()
    if not fw: raise HTTPException(status_code=404, detail="Framework not found")
    li = ReportLineItem(
        framework_id=fw_id, code=code, label=label, section=section,
        sub_section=sub_section, indent_level=indent_level, is_total=is_total,
        total_of=total_of, display_order=display_order, sign_factor=sign_factor, notes=notes
    )
    db.add(li); db.commit(); db.refresh(li)
    return {"id": li.id, "code": li.code, "label": li.label}


# ── GL → Line Item Mappings ─────────────────────────────────────────────────
@router.post("/finance-reports/frameworks/{fw_id}/mappings")
async def save_mappings(
    fw_id:      int,
    company_id: int = Form(...),
    mappings:   str = Form(...),   # JSON: [{"line_item_id": X, "gl_id": Y}, ...]
    user_id:    int = Form(...),
    db: Session = Depends(get_db)
):
    """
    Save (upsert) GL→line-item mappings for a specific company.
    Replaces all existing mappings for this framework+company.
    """
    if not check_company_access(db, user_id, company_id):
        raise HTTPException(status_code=403, detail="No access to this company")

    try:
        mapping_list = json.loads(mappings)
    except Exception:
        raise HTTPException(status_code=400, detail="mappings must be valid JSON array")

    # Delete old mappings for this framework+company
    db.query(GLLineItemMapping).filter(
        GLLineItemMapping.framework_id == fw_id,
        GLLineItemMapping.company_id   == company_id
    ).delete(synchronize_session=False)

    # Insert new
    created = 0
    for m in mapping_list:
        li_id = safe_int(m.get("line_item_id"))
        gl_id = safe_int(m.get("gl_id"))
        if not li_id or not gl_id: continue
        mapping = GLLineItemMapping(
            framework_id = fw_id,
            line_item_id = li_id,
            gl_id        = gl_id,
            company_id   = company_id,
            created_by   = user_id,
        )
        db.add(mapping)
        created += 1

    db.commit()
    return {"saved": created, "framework_id": fw_id, "company_id": company_id}


@router.delete("/finance-reports/mappings/{mapping_id}")
async def delete_single_mapping(mapping_id: int, db: Session = Depends(get_db)):
    m = db.query(GLLineItemMapping).filter(GLLineItemMapping.id == mapping_id).first()
    if not m: raise HTTPException(status_code=404, detail="Mapping not found")
    db.delete(m); db.commit()
    return {"deleted": True, "id": mapping_id}


# ── Generate report ─────────────────────────────────────────────────────────
@router.get("/finance-reports/generate/{fw_id}/{company_id}")
async def generate_report(
    fw_id:      int,
    company_id: int,
    user_id:    int = Query(...),
    db: Session = Depends(get_db)
):
    """
    Generates the report by:
    1. Loading the framework line items
    2. Loading the GL→line-item mappings for this company
    3. For each non-total line item: summing mapped GL balances (placeholder: uses 0 until transactions exist)
    4. Computing totals by summing children
    Returns a renderable structure the frontend can display directly.
    """
    if not check_company_access(db, user_id, company_id):
        raise HTTPException(status_code=403, detail="No access to this company")

    fw = db.query(ReportFramework).options(
        joinedload(ReportFramework.line_items).joinedload(ReportLineItem.gl_mappings).joinedload(GLLineItemMapping.gl_account)
    ).filter(ReportFramework.id == fw_id).first()
    if not fw: raise HTTPException(status_code=404, detail="Framework not found")

    company = db.query(models.Company).filter(models.Company.id == company_id).first()

    # Build balance map: line_item.code → amount
    # NOTE: actual debit/credit balances come from transaction tables (not yet in scope).
    # For now we return mapped GL list + 0.00 balance — ready for future integration.
    balances: dict = {}

    line_items_out = []
    for li in fw.line_items:
        # Only get mappings for THIS company
        comp_mappings = [m for m in li.gl_mappings if m.company_id == company_id]
        mapped_gls = [{
            "gl_id":   m.gl_id,
            "gl_code": m.gl_account.gl_code,
            "gl_name": m.gl_account.gl_name,
            "balance": 0.00,   # ← replace with real balance when transactions table exists
        } for m in comp_mappings]

        raw_amount = sum(g["balance"] for g in mapped_gls) * li.sign_factor
        balances[li.code] = raw_amount

        line_items_out.append({
            "id":           li.id,
            "code":         li.code,
            "label":        li.label,
            "section":      li.section,
            "sub_section":  li.sub_section,
            "indent_level": li.indent_level,
            "is_total":     li.is_total,
            "total_of":     json.loads(li.total_of) if li.total_of else [],
            "display_order":li.display_order,
            "sign_factor":  li.sign_factor,
            "amount":       raw_amount,
            "mapped_gls":   mapped_gls,
            "mapped_count": len(mapped_gls),
        })

    # Compute totals (recursive)
    def compute_totals(items, balances):
        code_map = {i["code"]: i for i in items}
        for item in items:
            if item["is_total"] and item["total_of"]:
                s = 0
                for child_code in item["total_of"]:
                    child = code_map.get(child_code)
                    if child:
                        s += child.get("amount", 0)
                item["amount"] = s
                balances[item["code"]] = s
        return items

    line_items_out = compute_totals(line_items_out, balances)

    return {
        "framework_id":   fw.id,
        "framework_name": fw.name,
        "framework_type": fw.framework_type,
        "report_type":    fw.report_type,
        "company_id":     company_id,
        "company_name":   company.company_name if company else "",
        "company_code":   company.company_code if company else "",
        "line_items":     sorted(line_items_out, key=lambda x: x["display_order"]),
        "generated_note": "Balances show 0.00 — connect transaction tables to populate real figures.",
    }