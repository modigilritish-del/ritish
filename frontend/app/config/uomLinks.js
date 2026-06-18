// app/config/uomLinks.js
import { Calculator, FolderOpen, LayoutDashboard, Link, Package, Ruler } from "lucide-react";
import UOMDashboard from '../UomPages/UOMDashboard';
import UOMCategoryPage from '../UomPages/UOMCategoryPage';
import UOMUnitsPage from '../UomPages/UOMUnitsPage';
import UOMDerivedUnitsPage from '../UomPages/UOMDerivedUnitsPage';
import UOMConverterPage from '../UomPages/UOMConverterPage';
import UOMMaster from '../UomPages/UOMMaster';

export const uomLinks = [
{
    name: "UOM Dashboard",
    path: "uom-dashboard",
    icon: LayoutDashboard,
    component: UOMDashboard,
    description: "Overview of UOM system with statistics and quick access"
  },
  {
    name: "UOM Master",
    path: "uom-master",
    icon: Package,
    component: UOMMaster,
    description: "Complete UOM management with Max Loose and conversion factors"
  },
  {
    name: "UOM Categories",
    path: "uom-categories",
    icon: FolderOpen,
    component: UOMCategoryPage,
    description: "Manage UOM categories (Weight, Length, Volume, etc.)"
  },
  {
    name: "Base Units",
    path: "uom-units",
    icon: Ruler,
    component: UOMUnitsPage,
    description: "Manage base units and all units with conversion factors"
  },
  {
    name: "Derived Units",
    path: "uom-derived-units",
    icon: Link,
    component: UOMDerivedUnitsPage,
    description: "Manage derived units with advanced conversion rules"
  },
  {
    name: "UOM Converter",
    path: "uom-converter",
    icon: Calculator,
    component: UOMConverterPage,
    description: "Convert quantities between different units in real-time"
  }
];
