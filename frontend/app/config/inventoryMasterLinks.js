// app/config/inventoryMasterLinks.js
import { FileBox } from "lucide-react";

// Import the components
import RenderItemMasterInventory from "../ItemMasterPages/RenderItemMasterInventory.js";
import RenderItemMasterInvProperties from "../ItemMasterPages/RenderItemMasterInvProperties.js";

export const inventoryMasterLinks = [
  { 
    name: "Render Inventory Item Master", 
    icon: FileBox, 
    path: "render-item-master-inventory",
    component: RenderItemMasterInventory,
    description: "Render item master inventory with RBAC access control"
  },
  { 
    name: "Render Item Master Inv Properties", 
    icon: FileBox, 
    path: "render-item-master-inv-properties",
    component: RenderItemMasterInvProperties,
    description: "Render item master inventory properties with RBAC access control"
  },
];