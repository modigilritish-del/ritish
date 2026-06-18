// app/config/adminworkflowlinks.js
import { ClipboardList } from "lucide-react";

import ItemCodeCreationReq from "../ItemMasterPages/ItemCodeCreationReq.js";

export const adminworkflowlinks = [
  {
    name: "Item Code Creation Request",
    icon: ClipboardList,
    path: "item-code-creation-req",
    component: ItemCodeCreationReq,
    description: "Raise and manage item code creation requests with company, plant, and document attachments"
  },
];