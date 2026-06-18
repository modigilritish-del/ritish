// app/config/salesMasterLinks.js
import { ShoppingBag, DollarSign } from "lucide-react";

import SalesMasterPage from "../SalesMasterPages/SalesMasterPage.jsx";
import RenderItemMasterSalesAndFinance from "../ItemMasterPages/RenderItemMasterSalesAndFinance.js";

export const salesMasterLinks = [
  {
    name: "Sales Master",
    icon: ShoppingBag,
    path: "sales-master",
    component: SalesMasterPage,
    description: "Manage sales master data"
  },
  { 
    name: "Render Item Master Sales & Finance", 
    icon: DollarSign, 
    path: "render-item-master-sales-finance",
    component: RenderItemMasterSalesAndFinance,
    description: "Render item master sales and finance details with RBAC access control"
  },
];