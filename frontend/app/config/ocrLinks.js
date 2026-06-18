// ==================== FILE 1: app/config/ocrLinks.js ====================
import { FileText, Upload, History, BarChart3, Settings, Zap, Table } from "lucide-react";

// Import OCR components
import OCRDashboard from "../pages/OCRDashboard";
import OCRUpload from "../pages/OCRUpload";
import OCRHistory from "../pages/OCRHistory";
import OCRStats from "../pages/OCRStats";
import OCRSettings from "../pages/OCRSettings";
import OCRComparison from "../pages/OCRComparison";
import ExcelImporter from "../pages/ExcelImporter";

export const ocrLinks = [
  { 
    name: "OCR Dashboard", 
    icon: FileText, 
    path: "ocr-dashboard",
    component: OCRDashboard,
    description: "Complete OCR system with all features"
  },
  { 
    name: "Upload Documents", 
    icon: Upload, 
    path: "ocr-upload",
    component: OCRUpload,
    description: "Upload and process documents"
  },
  { 
    name: "OCR History", 
    icon: History, 
    path: "ocr-history",
    component: OCRHistory,
    description: "View past OCR results"
  },
  { 
    name: "Comparison", 
    icon: Zap, 
    path: "ocr-comparison",
    component: OCRComparison,
    description: "Compare OCR engines"
  },
  { 
    name: "Statistics", 
    icon: BarChart3, 
    path: "ocr-stats",
    component: OCRStats,
    description: "OCR processing statistics"
  },
  { 
    name: "Settings", 
    icon: Settings, 
    path: "ocr-settings",
    component: OCRSettings,
    description: "Configure OCR preferences"
  },
  { 
    name: "Excel Importer", 
    icon: Table, 
    path: "excel-importer",
    component: ExcelImporter,
    description: "Import and view Excel / CSV files"
  },
];

export const ocrModes = {
  auto: {
    name: "Auto (Smart)",
    description: "Automatically selects best engine",
    icon: "⚡",
    color: "#3b82f6",
    speed: "medium",
    accuracy: "high"
  },
  fast: {
    name: "Fast Mode",
    description: "Uses Tesseract only",
    icon: "🚀",
    color: "#10b981",
    speed: "very fast",
    accuracy: "good"
  },
  accurate: {
    name: "Accurate Mode",
    description: "Uses all 3 engines",
    icon: "🎯",
    color: "#f59e0b",
    speed: "slow",
    accuracy: "excellent"
  },
  handwritten: {
    name: "Handwritten",
    description: "Optimized for handwriting",
    icon: "✍️",
    color: "#8b5cf6",
    speed: "medium",
    accuracy: "high"
  },
  hybrid: {
    name: "Hybrid Mode",
    description: "Maximum accuracy with voting",
    icon: "🔄",
    color: "#ec4899",
    speed: "slow",
    accuracy: "maximum"
  }
};
