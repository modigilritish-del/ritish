//app/context/PanelWidthContext.js
"use client";
import { createContext, useContext, useState, useEffect } from "react";

const PanelWidthContext = createContext();

export function PanelWidthProvider({ children }) {
  const [leftWidth, setLeftWidth] = useState(270);
  const [rightWidth, setRightWidth] = useState(20);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [rightPanelOverride, setRightPanelOverride] = useState(null); // e.g. "user-plant-company-access"
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false); // Default locked
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [menuRefreshTrigger, setMenuRefreshTrigger] = useState(0);
  
  // NEW: Store form data for each Add Company tab
  const [tabFormData, setTabFormData] = useState({});

  // Get current user ID from sessionStorage
  useEffect(() => {
    const checkUser = () => {
      const userData = sessionStorage.getItem('userData');
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          const userId = parsed.user?.id || parsed.user?.user_id || parsed.user?.email;
          if (userId && userId !== currentUserId) {
            setCurrentUserId(userId);
            loadUserData(userId);
          }
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }
    };

    checkUser();
    // Check periodically in case login happens
    const interval = setInterval(checkUser, 500);
    return () => clearInterval(interval);
  }, [currentUserId]);

  // Load user-specific data
  const loadUserData = (userId) => {
    if (!userId) return;

    // Load tabs for this user
    const userTabsKey = `appTabs_${userId}`;
    const savedTabs = localStorage.getItem(userTabsKey);
    
    if (savedTabs) {
      setTabs(JSON.parse(savedTabs));
    } else {
      setTabs([]);
    }

    // Load active tab for this user
    const userActiveTabKey = `activeTab_${userId}`;
    const savedActiveTab = localStorage.getItem(userActiveTabKey);
    if (savedActiveTab) {
      setActiveTab(savedActiveTab);
    } else {
      setActiveTab(null);
    }

    // Load form data for this user
    const userFormDataKey = `tabFormData_${userId}`;
    const savedFormData = localStorage.getItem(userFormDataKey);
    if (savedFormData) {
      setTabFormData(JSON.parse(savedFormData));
    } else {
      setTabFormData({});
    }

    // Load panel state (same for all users - can be changed if needed)
    const savedLeftPanelState = localStorage.getItem("isLeftPanelOpen");
    const savedLeftWidth = localStorage.getItem("leftPanelWidth");
    
    if (savedLeftPanelState !== null) {
      const panelOpen = JSON.parse(savedLeftPanelState);
      setIsLeftPanelOpen(panelOpen);
      if (panelOpen && savedLeftWidth) {
        setLeftWidth(parseInt(savedLeftWidth));
      } else if (!panelOpen) {
        setLeftWidth(60);
      }
    } else {
      setLeftWidth(60);
      setIsLeftPanelOpen(false);
      localStorage.setItem("isLeftPanelOpen", JSON.stringify(false));
    }
  };

  // Save user-specific data when it changes
  useEffect(() => {
    if (!currentUserId) return;

    if (tabs.length > 0) {
      const userTabsKey = `appTabs_${currentUserId}`;
      localStorage.setItem(userTabsKey, JSON.stringify(tabs));
    } else {
      const userTabsKey = `appTabs_${currentUserId}`;
      localStorage.removeItem(userTabsKey);
    }
  }, [tabs, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    if (activeTab) {
      const userActiveTabKey = `activeTab_${currentUserId}`;
      localStorage.setItem(userActiveTabKey, activeTab);
    }
  }, [activeTab, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    if (Object.keys(tabFormData).length > 0) {
      const userFormDataKey = `tabFormData_${currentUserId}`;
      localStorage.setItem(userFormDataKey, JSON.stringify(tabFormData));
    }
  }, [tabFormData, currentUserId]);

  useEffect(() => {
    // Only update based on manual drag, not on initial load
    if (leftWidth !== 60 && leftWidth !== 270) {
      localStorage.setItem('leftPanelWidth', leftWidth.toString());
    }
  }, [leftWidth]);

  const addTab = (path, title) => {
    const timestamp = Date.now();
    const tabId = `${path}-${timestamp}`;
    
    const newTab = { id: tabId, path, title };
    setTabs((prev) => [...prev, newTab]);
    setActiveTab(tabId);
    
    // Initialize empty form data for new Add Company tabs
    if (path === "add-company") {
      setTabFormData(prev => ({
        ...prev,
        [tabId]: {}
      }));
    }
  };

  const removeTab = (tabId) => {
    const updatedTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabs(updatedTabs);

    // Remove form data for this tab
    if (tabId.startsWith("add-company")) {
      setShowAddCompany(false);
      setTabFormData(prev => {
        const newData = { ...prev };
        delete newData[tabId];
        return newData;
      });
    }

    if (activeTab === tabId) {
      if (updatedTabs.length > 0) {
        setActiveTab(updatedTabs[updatedTabs.length - 1].id);
      } else {
        setActiveTab(null);
        if (currentUserId) {
          const userActiveTabKey = `activeTab_${currentUserId}`;
          localStorage.removeItem(userActiveTabKey);
        }
      }
    }
  };

  // NEW: Update form data for a specific tab
  const updateTabFormData = (tabId, data) => {
    setTabFormData(prev => ({
      ...prev,
      [tabId]: data
    }));
  };

  // NEW: Get form data for a specific tab
  const getTabFormData = (tabId) => {
    return tabFormData[tabId] || {};
  };

  const toggleRightPanel = () => {
    if (isRightPanelOpen) {
      setRightWidth(20);
      setIsRightPanelOpen(false);
    } else {
      setRightWidth(300);
      setIsRightPanelOpen(true);
    }
  };

  const toggleLeftPanel = () => {
    const newState = !isLeftPanelOpen;
    if (newState) {
      setLeftWidth(270);
      setIsLeftPanelOpen(true);
    } else {
      setLeftWidth(60);
      setIsLeftPanelOpen(false);
    }
    // Save state to localStorage
    localStorage.setItem("isLeftPanelOpen", JSON.stringify(newState));
  };

  const refreshMenu = () => {
    setMenuRefreshTrigger(prev => prev + 1);
  };

  return (
    <PanelWidthContext.Provider
      value={{
        leftWidth,
        setLeftWidth,
        rightWidth,
        setRightWidth,
        isDraggingLeft,
        setIsDraggingLeft,
        tabs,
        addTab,
        removeTab,
        activeTab,
        setActiveTab,
        toggleRightPanel,
        isRightPanelOpen,
        rightPanelOverride,
        setRightPanelOverride,
        toggleLeftPanel,
        isLeftPanelOpen,
        showAddCompany,
        setShowAddCompany,
        updateTabFormData,
        getTabFormData,
        refreshMenu,
        menuRefreshTrigger,
      }}
    >
      {children}
    </PanelWidthContext.Provider>
  );
}

export function usePanelWidth() {
  return useContext(PanelWidthContext);
}