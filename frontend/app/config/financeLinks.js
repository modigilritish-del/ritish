// app/config/financeLinks.js
import { BarChart3, Building2, CreditCard, DollarSign, FileText, TrendingUp, Bookmark, BarChart2 } from "lucide-react";

// Import the components
import AddGLType from "../FinancePages/AddGLType";
import AddGLCategory from "../FinancePages/AddGLCategory";
import AddGLMaster from "../FinancePages/AddGLMaster";
import AddItemInfo from "../FinancePages/AddItemInfo";
import AddGLHead from "../FinancePages/AddGLHead";
import FinanceReports from "../FinancePages/FinanceReports";
import RenderItemMasterSalesAndFinance from "../ItemMasterPages/RenderItemMasterSalesAndFinance.js";

export const financeLinks = [
  { 
    name: "GL Type", 
    icon: FileText, 
    path: "gl-type",
    component: AddGLType,
    description: "Create and manage GL types (Asset, Liability, Income, Expense)"
  },
  { 
    name: "GL Category", 
    icon: CreditCard, 
    path: "gl-category",
    component: AddGLCategory,
    description: "Create and manage GL categories for classification"
  },
  { 
    name: "GL Head", 
    icon: Bookmark, 
    path: "gl-head",
    component: AddGLHead,
    description: "Create and manage GL heads with hierarchy mapping"
  },
  { 
    name: "GL Master", 
    icon: DollarSign, 
    path: "gl-master",
    component: AddGLMaster,
    description: "Create and manage GL accounts with company-plant mapping"
  },
  { 
    name: "Item Master Management", 
    icon: Building2, 
    path: "item-master",
    component: AddItemInfo,
    description: "Create and manage items linked to GL accounts"
  },
  { 
    name: "Finance Reports", 
    icon: BarChart3, 
    path: "finance-reports",
    component: FinanceReports,
    description: "View financial reports and analytics"
  },
  { 
    name: "Budget Planning", 
    icon: TrendingUp, 
    path: "budget-planning",
    component: null,
    description: "Create and manage budgets for departments and projects"
  },
  { 
    name: "Render Item Master Sales & Finance", 
    icon: BarChart2, 
    path: "render-item-master-sales-finance",
    component: RenderItemMasterSalesAndFinance,
    description: "Render item master sales and finance details with RBAC access control"
  },
];