// app/config/userManagementLinks.js
import { UserPlus, Shield, Settings, Users } from "lucide-react";

// Import components for each link (same as adminMasterLinks)
import AddUser from "../UserManagementPages/AddUser";
import UserRoles from "../UserManagementPages/UserRoles";
import UserSettings from "../UserManagementPages/UserSettings";

export const userManagementLinks = [
  { 
    name: "Add User", 
    icon: UserPlus, 
    path: "add-user",
    component: AddUser,
  },
  { 
    name: "User Roles", 
    icon: Shield, 
    path: "user-roles",
    component: UserRoles,
  },
  { 
    name: "User Settings", 
    icon: Settings, 
    path: "user-settings",
    component: UserSettings,
  },
];
