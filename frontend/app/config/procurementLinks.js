// app/config/procurementLinks.js
import { ShoppingCart, Building2, ClipboardList, TrendingUp, Package, FileText, BarChart2, Truck, RefreshCw, DollarSign } from "lucide-react";

// Import the components
import RenderItemMasterWarehouseAndPurchase from "../ItemMasterPages/RenderItemMasterWarehouseAndPurchase.js";

export const procurementLinks = [
  {
    name: "Render Item Master Warehouse & Purchase",
    icon: BarChart2,
    path: "render-item-master-warehouse-purchase",
    component: RenderItemMasterWarehouseAndPurchase,
    description: "Render item master warehouse and purchase details with RBAC access control"
  },
];