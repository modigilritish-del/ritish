// app/config/analysisLinks.js
import { Award, Box, FolderPlus, Layers, Package } from "lucide-react";

// Import the components
import AddCategories from "../AnalysisPages/AddCategories";
import AddSubCategories from "../AnalysisPages/AddSubCategories";
import AddProduct from "../AnalysisPages/AddProduct";
import AddProductClassification from "../AnalysisPages/AddProductClassification";

export const analysisLinks = [
{ 
    name: "Add Categories", 
    icon: FolderPlus, 
    path: "add-categories",
    component: AddCategories,
    description: "Create and manage categories for company-plant structure"
  },
  { 
    name: "Add Sub-Categories", 
    icon: Layers, 
    path: "add-sub-categories",
    component: AddSubCategories,
    description: "Create and manage sub-categories within categories"
  },
  { 
    name: "Add Products", 
    icon: Box, 
    path: "add-products",
    component: AddProduct,
    description: "Create and manage products under product types"
  },
  { 
    name: "Add Product Classifications", 
    icon: Award, 
    path: "add-product-classifications",
    component: AddProductClassification,
    description: "Create and manage product classifications with grade, quality, certification"
  }
];
