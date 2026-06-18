// app/layout.tsx
'use client';

import type { ReactNode } from "react";
import "./globals.css";
import { PanelWidthProvider, usePanelWidth } from "./context/PanelWidthContext";
import AuthMiddleware from "./components/AuthMiddleware";
import FixHeader from "./components/FixHeader";
import LeftPanel from "./components/LeftPanel";
import RightPanel from "./components/RightPanel";
import FixBottom from "./components/FixBottom";
import FixMainDashRender from "./components/FixMainDashRender";
import OCRRightPanel from "./OCRComponents/OCRRightPanel";
import ItemMasterRightPanel from './itemMasterPages/ItemMasterRightPanel';
import RoleAccessForCompaniesPlantRightPanel from './AdminIconPages/RoleAccessForCompaniesPlantRightPanel';
import UserPlantCompanyAccessRightPanel from './AdminIconPages/UserPlantCompanyAccessRightPanel';
import ExcelImporterRightPanel from './pages/ExcelImporterRightPanel';

interface RootLayoutProps {
  children: ReactNode;
}

interface Tab {
  id: string;
  path: string;
  title: string;
}

// Dashboard wrapper to access context
function DashboardContent({ children }: { children: ReactNode }) {
  const { tabs, activeTab, rightPanelOverride } = usePanelWidth();
  
  // Check if current tab is OCR Dashboard, Create Item Master, Role Access, or User Access
  const tabsArray = tabs as unknown as Tab[];
  const currentTab = tabsArray.find((tab) => tab.id === activeTab);
  const isOCRDashboard = currentTab?.path === "ocr-dashboard";
  const isCreateItemMaster = currentTab?.path === "create-item-master";
  
  // 🔥 Multiple path checks for Role Access - handles different possible paths
  const isRoleAccessForCompaniesPlant = 
    currentTab?.path === "role-access-companies-plant" ||
    currentTab?.path === "/admin-master/role-access-companies-plant" ||
    currentTab?.path?.includes("role-access-companies-plant");

  // 🔥 NEW: Multiple path checks for User Plant Company Access
  const isUserPlantCompanyAccess = 
    currentTab?.path === "user-plant-company-access" ||
    currentTab?.path === "/admin-master/user-plant-company-access" ||
    currentTab?.path?.includes("user-plant-company-access") ||
    rightPanelOverride === "user-plant-company-access";

  // 🔥 NEW: Excel Importer path check
  const isExcelImporter =
    currentTab?.path === "excel-importer" ||
    currentTab?.path?.includes("excel-importer") ||
    currentTab?.path?.includes("excel-csv-detector");



  return (
    <>
      <FixHeader />
      <LeftPanel />
      <RightPanel>
        {isOCRDashboard && <OCRRightPanel />}
        {isCreateItemMaster && <ItemMasterRightPanel />}
        {isRoleAccessForCompaniesPlant && <RoleAccessForCompaniesPlantRightPanel />}
        {isUserPlantCompanyAccess && <UserPlantCompanyAccessRightPanel />}
        {isExcelImporter && <ExcelImporterRightPanel />}
      </RightPanel>
      <FixBottom />
      
      <FixMainDashRender>
        {children}
      </FixMainDashRender>
    </>
  );
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <PanelWidthProvider>
          <AuthMiddleware>
            <DashboardContent>
              {children}
            </DashboardContent>
          </AuthMiddleware>
        </PanelWidthProvider>
      </body>
    </html>
  );
}