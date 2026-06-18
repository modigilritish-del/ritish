import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Package } from 'lucide-react';

export default function ItemManagementDashboard() {
  // Sample data for different charts
  const stockData = [
    { month: 'Jan', inStock: 450, outOfStock: 45, lowStock: 78 },
    { month: 'Feb', inStock: 520, outOfStock: 32, lowStock: 65 },
    { month: 'Mar', inStock: 480, outOfStock: 38, lowStock: 72 },
    { month: 'Apr', inStock: 590, outOfStock: 28, lowStock: 55 },
    { month: 'May', inStock: 615, outOfStock: 25, lowStock: 48 },
    { month: 'Jun', inStock: 580, outOfStock: 30, lowStock: 52 },
  ];

  const categoryData = [
    { name: 'Electronics', value: 340 },
    { name: 'Furniture', value: 220 },
    { name: 'Stationery', value: 180 },
    { name: 'Tools', value: 150 },
    { name: 'Others', value: 110 },
  ];

  const movementData = [
    { week: 'Week 1', received: 145, dispatched: 132 },
    { week: 'Week 2', received: 168, dispatched: 155 },
    { week: 'Week 3', received: 152, dispatched: 148 },
    { week: 'Week 4', received: 178, dispatched: 165 },
  ];

  const valueData = [
    { month: 'Jan', value: 45000 },
    { month: 'Feb', value: 52000 },
    { month: 'Mar', value: 48000 },
    { month: 'Apr', value: 59000 },
    { month: 'May', value: 61500 },
    { month: 'Jun', value: 58000 },
  ];

  const supplierData = [
    { name: 'Supplier A', items: 185 },
    { name: 'Supplier B', items: 145 },
    { name: 'Supplier C', items: 125 },
    { name: 'Supplier D', items: 98 },
    { name: 'Supplier E', items: 87 },
  ];

  const warehouseData = [
    { warehouse: 'WH-1', capacity: 85, utilization: 72 },
    { warehouse: 'WH-2', capacity: 72, utilization: 68 },
    { warehouse: 'WH-3', capacity: 91, utilization: 85 },
    { warehouse: 'WH-4', capacity: 68, utilization: 55 },
  ];

  const turnoverData = [
    { quarter: 'Q1', turnover: 4.2 },
    { quarter: 'Q2', turnover: 4.8 },
    { quarter: 'Q3', turnover: 5.1 },
    { quarter: 'Q4', turnover: 4.6 },
  ];

  const demandData = [
    { day: 'Mon', demand: 42 },
    { day: 'Tue', demand: 38 },
    { day: 'Wed', demand: 55 },
    { day: 'Thu', demand: 48 },
    { day: 'Fri', demand: 62 },
    { day: 'Sat', demand: 35 },
    { day: 'Sun', demand: 28 },
  ];

  const ageingData = [
    { range: '0-30', count: 420 },
    { range: '31-60', count: 185 },
    { range: '61-90', count: 95 },
    { range: '90+', count: 48 },
  ];

  const returnData = [
    { month: 'Jan', returns: 12 },
    { month: 'Feb', returns: 15 },
    { month: 'Mar', returns: 9 },
    { month: 'Apr', returns: 18 },
    { month: 'May', returns: 11 },
    { month: 'Jun', returns: 14 },
  ];

  const qualityData = [
    { category: 'Quality', score: 92 },
    { category: 'Delivery', score: 88 },
    { category: 'Price', score: 85 },
    { category: 'Support', score: 90 },
    { category: 'Flexibility', score: 87 },
  ];

  const COLORS = ['#3a7ca5', '#6a9aba', '#81b29a', '#f4a261', '#e76f51'];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header - Fixed */}
      <div
        style={{
          padding: "0px 10px",
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #3a3a3a 30%, #6a9aba 85%)",
          color: "white",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Package size={20} />
          <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "600" }}>
            Item Management Dashboard
          </h2>
        </div>
      </div>

      {/* Fixed Dashboard Content - No Scroll - 10 Charts */}
      <div 
        style={{ 
          flex: 1, 
          padding: "10px",
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gridTemplateRows: "repeat(2, 1fr)",
          gap: "8px",
          overflow: "hidden",
        }}
      >
        {/* Chart 1: Stock Status Bar Chart */}
        <div style={{ 
          background: "#fff", 
          borderRadius: "6px", 
          border: "1px solid #e8e8e8",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
        }}>
          <h3 style={{ 
            fontSize: "11px", 
            fontWeight: "600", 
            marginBottom: "6px", 
            color: "#333",
            borderBottom: "1px solid #e8e8e8",
            paddingBottom: "4px",
          }}>
            Stock Status
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 9 }} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Bar dataKey="inStock" fill="#81b29a" name="In Stock" />
                <Bar dataKey="lowStock" fill="#f4a261" name="Low Stock" />
                <Bar dataKey="outOfStock" fill="#e76f51" name="Out of Stock" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Category Distribution Pie Chart */}
        <div style={{ 
          background: "#fff", 
          borderRadius: "6px", 
          border: "1px solid #e8e8e8",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
        }}>
          <h3 style={{ 
            fontSize: "11px", 
            fontWeight: "600", 
            marginBottom: "6px", 
            color: "#333",
            borderBottom: "1px solid #e8e8e8",
            paddingBottom: "4px",
          }}>
            Items by Category
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius="60%"
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 9 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Item Movement Line Chart */}
        <div style={{ 
          background: "#fff", 
          borderRadius: "6px", 
          border: "1px solid #e8e8e8",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
        }}>
          <h3 style={{ 
            fontSize: "11px", 
            fontWeight: "600", 
            marginBottom: "6px", 
            color: "#333",
            borderBottom: "1px solid #e8e8e8",
            paddingBottom: "4px",
          }}>
            Weekly Movement
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={movementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 9 }} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Line 
                  type="monotone" 
                  dataKey="received" 
                  stroke="#3a7ca5" 
                  strokeWidth={2}
                  name="Received"
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="dispatched" 
                  stroke="#e76f51" 
                  strokeWidth={2}
                  name="Dispatched"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Inventory Value Area Chart */}
        <div style={{ 
          background: "#fff", 
          borderRadius: "6px", 
          border: "1px solid #e8e8e8",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
        }}>
          <h3 style={{ 
            fontSize: "11px", 
            fontWeight: "600", 
            marginBottom: "6px", 
            color: "#333",
            borderBottom: "1px solid #e8e8e8",
            paddingBottom: "4px",
          }}>
            Inventory Value
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={valueData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6a9aba" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#6a9aba" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip 
                  contentStyle={{ fontSize: 9 }} 
                  formatter={(value) => `₹${value.toLocaleString()}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3a7ca5" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorValue)"
                  name="Value (₹)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Supplier Performance Bar Chart */}
        <div style={{ 
          background: "#fff", 
          borderRadius: "6px", 
          border: "1px solid #e8e8e8",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
        }}>
          <h3 style={{ 
            fontSize: "11px", 
            fontWeight: "600", 
            marginBottom: "6px", 
            color: "#333",
            borderBottom: "1px solid #e8e8e8",
            paddingBottom: "4px",
          }}>
            Supplier Items
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 9 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={70} />
                <Tooltip contentStyle={{ fontSize: 9 }} />
                <Bar dataKey="items" fill="#3a7ca5" name="Items" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 6: Warehouse Capacity Line Chart */}
        <div style={{ 
          background: "#fff", 
          borderRadius: "6px", 
          border: "1px solid #e8e8e8",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
        }}>
          <h3 style={{ 
            fontSize: "11px", 
            fontWeight: "600", 
            marginBottom: "6px", 
            color: "#333",
            borderBottom: "1px solid #e8e8e8",
            paddingBottom: "4px",
          }}>
            Warehouse Usage
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={warehouseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="warehouse" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 9 }} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Area type="monotone" dataKey="capacity" stroke="#81b29a" fill="#81b29a" fillOpacity={0.6} name="Capacity %" />
                <Area type="monotone" dataKey="utilization" stroke="#f4a261" fill="#f4a261" fillOpacity={0.6} name="Used %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 7: Turnover Rate Line Chart */}
        <div style={{ 
          background: "#fff", 
          borderRadius: "6px", 
          border: "1px solid #e8e8e8",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
        }}>
          <h3 style={{ 
            fontSize: "11px", 
            fontWeight: "600", 
            marginBottom: "6px", 
            color: "#333",
            borderBottom: "1px solid #e8e8e8",
            paddingBottom: "4px",
          }}>
            Turnover Rate
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={turnoverData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="quarter" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 9 }} />
                <Line 
                  type="monotone" 
                  dataKey="turnover" 
                  stroke="#6a9aba" 
                  strokeWidth={3}
                  name="Turnover"
                  dot={{ r: 4, fill: "#3a7ca5" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 8: Daily Demand Bar Chart */}
        <div style={{ 
          background: "#fff", 
          borderRadius: "6px", 
          border: "1px solid #e8e8e8",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
        }}>
          <h3 style={{ 
            fontSize: "11px", 
            fontWeight: "600", 
            marginBottom: "6px", 
            color: "#333",
            borderBottom: "1px solid #e8e8e8",
            paddingBottom: "4px",
          }}>
            Daily Demand
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demandData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 9 }} />
                <Bar dataKey="demand" fill="#e76f51" name="Demand" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 9: Stock Ageing Pie Chart */}
        <div style={{ 
          background: "#fff", 
          borderRadius: "6px", 
          border: "1px solid #e8e8e8",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
        }}>
          <h3 style={{ 
            fontSize: "11px", 
            fontWeight: "600", 
            marginBottom: "6px", 
            color: "#333",
            borderBottom: "1px solid #e8e8e8",
            paddingBottom: "4px",
          }}>
            Stock Ageing
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ageingData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ range, percent }) => `${range}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius="60%"
                  fill="#8884d8"
                  dataKey="count"
                >
                  {ageingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 9 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 10: Returns Trend Area Chart */}
        <div style={{ 
          background: "#fff", 
          borderRadius: "6px", 
          border: "1px solid #e8e8e8",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
        }}>
          <h3 style={{ 
            fontSize: "11px", 
            fontWeight: "600", 
            marginBottom: "6px", 
            color: "#333",
            borderBottom: "1px solid #e8e8e8",
            paddingBottom: "4px",
          }}>
            Returns Trend
          </h3>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={returnData}>
                <defs>
                  <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e76f51" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#e76f51" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 9 }} />
                <Area 
                  type="monotone" 
                  dataKey="returns" 
                  stroke="#e76f51" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorReturns)"
                  name="Returns"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Fixed Footer - Same as Add Company */}
      <div style={{ 
        display: "flex", 
        justifyContent: "flex-end", 
        gap: "10px", 
        padding: "0px 10px", 
        borderTop: "1px solid #e0e0e0",
        background: "linear-gradient(135deg, #3a3a3a 30%, #6a9aba 85%)",
        flexShrink: 0,
      }}>
        {/* No buttons as requested */}
      </div>
    </div>
  );
}
