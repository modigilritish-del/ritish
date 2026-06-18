// app/config/reportsLinks.js
import { BarChart, PieChart, TrendingUp } from "lucide-react";

// Import components for each link
import SalesReport from "../ReportsPages/SalesReport";
import Analytics from "../ReportsPages/Analytics";
import Trends from "../ReportsPages/Trends";

export const reportsLinks = [
  { 
    name: "Sales Report", 
    icon: BarChart, 
    path: "sales-report",
    component: SalesReport,
  },
  { 
    name: "Analytics", 
    icon: PieChart, 
    path: "analytics",
    component: Analytics,
  },
  { 
    name: "Trends", 
    icon: TrendingUp, 
    path: "trends",
    component: Trends,
  },
];
