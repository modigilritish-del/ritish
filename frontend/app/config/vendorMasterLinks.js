// app/config/vendorMasterLinks.js
import { Building2 } from "lucide-react";

import VendorMasterPage from "../VendorMasterPages/VendorMasterPage.jsx";

export const vendorMasterLinks = [
  {
    name: "Vendor Master",
    icon: Building2,
    path: "vendor-master",
    component: VendorMasterPage,
    description: "Manage vendor master data"
  },
];