import React, { useState, useEffect } from 'react';
import { FolderOpen, Ruler, Calculator, TrendingUp, Package, CheckCircle } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/uom';

const UOMDashboard = () => {
  const [stats, setStats] = useState({
    totalCategories: 0,
    activeCategories: 0,
    totalUnits: 0,
    activeUnits: 0,
    baseUnits: 0,
    derivedUnits: 0
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch categories
      const catRes = await fetch(`${API_BASE}/categories`);
      const catData = await catRes.json();
      const cats = catData.items || [];
      setCategories(cats);

      // Fetch all UOMs
      const uomRes = await fetch(`${API_BASE}/units?limit=500`);
      const uomData = await uomRes.json();
      const uoms = uomData.items || [];

      // Calculate stats
      setStats({
        totalCategories: cats.length,
        activeCategories: cats.filter(c => c.is_active).length,
        totalUnits: uoms.length,
        activeUnits: uoms.filter(u => u.is_active).length,
        baseUnits: uoms.filter(u => u.is_base).length,
        derivedUnits: uoms.filter(u => !u.is_base).length
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
    <div style={{ background: "white", borderRadius: "8px", padding: "16px", border: "1px solid #e0e0e0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ background: `linear-gradient(135deg, ${color}20, ${color}10)`, padding: "8px", borderRadius: "8px" }}>
          <Icon size={20} color={color} />
        </div>
        <div style={{ fontSize: "24px", fontWeight: "700", color: "#000" }}>{value}</div>
      </div>
      <div style={{ fontSize: "11px", fontWeight: "600", color: "#333", marginBottom: "4px" }}>{title}</div>
      <div style={{ fontSize: "9px", color: "#666" }}>{subtitle}</div>
    </div>
  );

  const CategoryCard = ({ category }) => (
    <div style={{ background: "white", borderRadius: "6px", padding: "12px", border: "1px solid #e0e0e0", transition: "all 0.2s" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <span style={{ padding: "2px 8px", background: "#dbeafe", color: "#1e40af", fontSize: "10px", fontWeight: "600", borderRadius: "4px" }}>
          {category.code}
        </span>
        {category.is_active ? (
          <span style={{ fontSize: "9px", color: "#10b981", display: "flex", alignItems: "center", gap: "2px" }}>
            <CheckCircle size={10} />
            Active
          </span>
        ) : (
          <span style={{ fontSize: "9px", color: "#ef4444" }}>Inactive</span>
        )}
      </div>
      <div style={{ fontSize: "12px", fontWeight: "600", color: "#000", marginBottom: "4px" }}>{category.name}</div>
      <div style={{ fontSize: "9px", color: "#666", lineHeight: "1.4" }}>{category.description || 'No description'}</div>
    </div>
  );

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ width: "95%", maxWidth: "1200px", height: "90%", maxHeight: "700px", background: "white", borderRadius: "8px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Header */}
        <div style={{ padding: "0px 12px", height: "32px", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to right, #4b5563, #60a5fa)", color: "white", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Ruler size={14} />
            <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>UOM System Dashboard</h2>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          {loading ? (
            <div style={{ padding: "40px 20px", textAlign: "center", fontSize: "11px", color: "#666" }}>
              <div style={{ fontWeight: "500", marginBottom: "4px" }}>Loading dashboard data...</div>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "10px" }}>
                <StatCard
                  icon={FolderOpen}
                  title="Total Categories"
                  value={stats.totalCategories}
                  subtitle={`${stats.activeCategories} active`}
                  color="#60a5fa"
                />
                <StatCard
                  icon={Ruler}
                  title="Total Units"
                  value={stats.totalUnits}
                  subtitle={`${stats.activeUnits} active`}
                  color="#10b981"
                />
                <StatCard
                  icon={Package}
                  title="Base Units"
                  value={stats.baseUnits}
                  subtitle="Foundation units"
                  color="#f59e0b"
                />
                <StatCard
                  icon={TrendingUp}
                  title="Derived Units"
                  value={stats.derivedUnits}
                  subtitle="Converted from base"
                  color="#8b5cf6"
                />
              </div>

              {/* Quick Actions */}
              <div style={{ background: "white", borderRadius: "8px", padding: "16px", border: "1px solid #e0e0e0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", marginBottom: "10px" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "11px", fontWeight: "600", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>Quick Actions</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px" }}>
                  <button
                    onClick={() => window.location.href = '/uom-categories'}
                    style={{ padding: "4px 14px", background: "linear-gradient(135deg, #4b5563, #60a5fa)", border: "none", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                  >
                    <FolderOpen size={12} />
                    Manage Categories
                  </button>
                  <button
                    onClick={() => window.location.href = '/uom-units'}
                    style={{ padding: "4px 14px", background: "linear-gradient(135deg, #10b981, #34d399)", border: "none", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                  >
                    <Ruler size={12} />
                    Manage Units
                  </button>
                  <button
                    onClick={() => window.location.href = '/uom-converter'}
                    style={{ padding: "4px 14px", background: "linear-gradient(135deg, #f59e0b, #fbbf24)", border: "none", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                  >
                    <Calculator size={12} />
                    Convert Units
                  </button>
                </div>
              </div>

              {/* Categories Overview */}
              <div style={{ background: "white", borderRadius: "8px", padding: "16px", border: "1px solid #e0e0e0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "11px", fontWeight: "600", color: "#333", borderBottom: "1px solid #e8e8e8", paddingBottom: "3px" }}>Categories Overview</h3>
                {categories.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center", fontSize: "11px", color: "#666" }}>
                    <div style={{ marginBottom: "10px", fontSize: "48px" }}>📁</div>
                    <div style={{ fontWeight: "500", marginBottom: "4px" }}>No categories found</div>
                    <div style={{ fontSize: "9px", color: "#999" }}>Create your first category to get started</div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "12px" }}>
                    {categories.slice(0, 8).map(category => (
                      <CategoryCard key={category.id} category={category} />
                    ))}
                  </div>
                )}
                {categories.length > 8 && (
                  <div style={{ marginTop: "12px", textAlign: "center" }}>
                    <button
                      onClick={() => window.location.href = '/uom-categories'}
                      style={{ padding: "4px 14px", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "4px", fontSize: "10px", fontWeight: "500", cursor: "pointer", color: "#333" }}
                    >
                      View All {categories.length} Categories
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "0px 12px", height: "16px", borderTop: "1px solid #e0e0e0", background: "linear-gradient(to right, #60a5fa, #4b5563)", flexShrink: 0 }}></div>
      </div>
    </div>
  );
};

export default UOMDashboard;