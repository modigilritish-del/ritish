// 1.  app/ocr-results/page.js
export default function OCRResults() {
  return <div>Your OCR Results Component</div>;
}

// 2. Update: app/config/ocrLinks.js
import OCRResults from "../ocr-results/page";

export const ocrLinks = [
  {
    name: "OCR Processing",
    icon: ScanText,
    path: "ocr-processing",
    component: OCRDocuments,
  },
  {
    name: "OCR Results",
    icon: FileSearch,
    path: "ocr-results",
    component: OCRResults, // Add this
  },
];
