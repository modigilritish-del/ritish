// app/layout.js 
'use client';

import './globals.css';
import { PanelWidthProvider } from './context/PanelWidthContext';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import FixHeader from './components/FixHeader';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import FixBottom from './components/FixBottom';
import FixMainDashRender from './components/FixMainDashRender';
import OCRRightPanel from './OCRComponents/OCRRightPanel';
import ItemMasterRightPanel from './components/ItemMasterRightPanel';
import CreateItemMaster from './ItemMasterPages/CreateItemMaster';
import RoleAccessForCompaniesPlantRightPanel from './AdminIconPages/RoleAccessForCompaniesPlantRightPanel';
import UserPlantCompanyAccessRightPanel from './AdminIconPages/UserPlantCompanyAccessRightPanel';
import ExcelImporterRightPanel from './pages/ExcelImporterRightPanel';
import { usePanelWidth } from './context/PanelWidthContext';
import { warmUpServer, getAccessiblePages, clearRbacCache } from './utils/rbacCache';

// Fire server warm-up immediately at module load time (before any component renders)
// This gives the Render free-tier server maximum time to wake up
warmUpServer();

// Wrapper component to access context
function DashboardContent({ userData, onLogout, currentUserId, children }) {
  const { tabs, activeTab, rightPanelOverride } = usePanelWidth();
  
  // Get current active tab
  const currentTab = tabs.find(tab => tab.id === activeTab);
  
  // 🔥 CHECK WHICH RIGHT PANEL TO SHOW based on current tab path
  const isOCRDashboard = currentTab?.path === "ocr-dashboard";
  const isCreateItemMaster = currentTab?.path === "create-item-master";
  
  // 🔥 FIXED: Correct path for RoleAccessForCompaniesPlant (from adminMasterLinks.js line 89)
  const isRoleAccessForCompaniesPlant = 
    currentTab?.path === "role-access-companies-plant" ||
    currentTab?.path === "/admin-master/role-access-companies-plant" ||
    currentTab?.path?.includes("role-access-companies-plant");

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
      <FixHeader 
        userData={userData} 
        onLogout={onLogout}
        currentUserId={currentUserId}
      />
      <LeftPanel currentUserId={currentUserId} />
      
      {/* 🔥 RIGHT PANEL - Conditionally render based on active tab path */}
      <RightPanel currentUserId={currentUserId}>
        {isOCRDashboard && <OCRRightPanel />}
        {isCreateItemMaster && <CreateItemMaster />}
        {isRoleAccessForCompaniesPlant && <RoleAccessForCompaniesPlantRightPanel />}
        {isUserPlantCompanyAccess && <UserPlantCompanyAccessRightPanel />}
        {isExcelImporter && <ExcelImporterRightPanel />}
      </RightPanel>
      
      <FixBottom currentUserId={currentUserId} />
      
      <FixMainDashRender currentUserId={currentUserId}>
        {children}
      </FixMainDashRender>
    </>
  );
}

export default function RootLayout({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = () => {
    try {
      const loggedIn = sessionStorage.getItem('isLoggedIn');
      const storedData = sessionStorage.getItem('userData');
      const userId = sessionStorage.getItem('currentUserId');
      
      if (loggedIn === 'true' && storedData && userId) {
        // ✅ Valid session found
        const parsed = JSON.parse(storedData);
        setUserData(parsed);
        setCurrentUserId(parseInt(userId));
        setIsLoggedIn(true);
        console.log('✅ Session found for User ID:', userId);
        // Pre-fetch RBAC so LeftPanel finds data already cached when it mounts
        getAccessiblePages().catch(console.error);
      } else {
        // ❌ No session - show login
        console.log('❌ No session - showing login page');
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Session check error:', error);
      sessionStorage.clear();
      setIsLoggedIn(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleLoginSuccess = (data) => {
    console.log('🔐 Login successful for:', data.user?.email);
    
    // ✅ Store session properly
    sessionStorage.clear();
    sessionStorage.setItem('userData', JSON.stringify(data));
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('currentUserId', data.user?.id?.toString() || '');
    
    // ✅ Update state
    setUserData(data);
    setCurrentUserId(data.user?.id);
    setIsLoggedIn(true);
    // Pre-fetch RBAC immediately after login so LeftPanel finds it cached
    getAccessiblePages().catch(console.error);
  };

  const handleLogout = () => {
    console.log('🔒 Logging out...');
    // Clear RBAC cache on logout
    clearRbacCache();
    
    // ✅ Clear everything
    sessionStorage.clear();
    setUserData(null);
    setCurrentUserId(null);
    setIsLoggedIn(false);
  };

  // Loading state
  if (isChecking) {
    return (
      <html lang="en">
        <body>
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white text-lg font-medium">Loading...</p>
            </div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body>
        <PanelWidthProvider>
          {!isLoggedIn ? (
            // 🔥 NOT LOGGED IN: Only show login page, nothing else
            <div style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              zIndex: 9999,
              overflow: 'auto'
            }}>
              <Login onLoginSuccess={handleLoginSuccess} />
            </div>
          ) : (
            // 🔥 LOGGED IN: Show full dashboard
            <DashboardContent
              userData={userData}
              onLogout={handleLogout}
              currentUserId={currentUserId}
            >
              {children}
            </DashboardContent>
          )}
        </PanelWidthProvider>
      </body>
    </html>
  );
}