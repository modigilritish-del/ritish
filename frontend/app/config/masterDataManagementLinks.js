// app/config/masterDataManagementLinks.js
import { ClipboardCheck } from "lucide-react";

// Import the components
import MdmMyReq from "../MasterDataPages/MdmMyReq.jsx";

export const masterDataManagementLinks = [
  {
    name: "MDM My Requests",
    icon: ClipboardCheck,
    path: "mdm-my-req",
    component: MdmMyReq,
    description: "View and manage my MDM requests"
  },
];