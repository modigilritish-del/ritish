// app/config/warehouseManagementLinks.js
import { Warehouse, Building2 } from "lucide-react";

import WarehouseManagementPage from "../WarehouseManagementPages/WarehouseManagementPage.jsx";
import RenderItemMasterWarehouseAndPurchase from "../ItemMasterPages/RenderItemMasterWarehouseAndPurchase.js";

export const warehouseManagementLinks = [
  {
    name: "Warehouse Management",
    icon: Warehouse,
    path: "warehouse-management",
    component: WarehouseManagementPage,
    description: "Manage warehouse and inventory operations"
  },
  { 
    name: "Render Item Master Warehouse & Purchase", 
    icon: Building2, 
    path: "render-item-master-warehouse-purchase",
    component: RenderItemMasterWarehouseAndPurchase,
    description: "Render item master warehouse and purchase details with RBAC access control"
  },
];