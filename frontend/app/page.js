//app/page.js(maindashboard"homepage")
'use client';
import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Maximize2, X } from 'lucide-react';

export default function Home() {
  const [expandedChart, setExpandedChart] = useState(null);

  const generateMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = [];
    for (let year = 2020; year <= 2024; year++) {
      for (let month = 0; month < 12; month++) {
        data.push({
          period: `${months[month]} ${year}`,
          inStock: Math.floor(450 + Math.random() * 200),
          outOfStock: Math.floor(20 + Math.random() * 30),
          lowStock: Math.floor(40 + Math.random() * 50),
          value: Math.floor(45000 + Math.random() * 25000),
          returns: Math.floor(8 + Math.random() * 15),
        });
      }
    }
    return data;
  };

  const generateWeeklyData = () => {
    const data = [];
    for (let week = 1; week <= 800; week++) {
      data.push({
        week: `W${week}`,
        received: Math.floor(130 + Math.random() * 60),
        dispatched: Math.floor(120 + Math.random() * 60),
      });
    }
    return data;
  };

  const generateQuarterlyData = () => {
    const data = [];
    for (let year = 2020; year <= 2024; year++) {
      for (let q = 1; q <= 4; q++) {
        data.push({
          period: `Q${q} ${year}`,
          turnover: (3.5 + Math.random() * 2).toFixed(1),
        });
      }
    }
    return data;
  };

  const generateDailyData = () => {
    const data = [];
    for (let i = 0; i < 365; i++) {
      data.push({
        day: `Day ${i + 1}`,
        demand: Math.floor(25 + Math.random() * 50),
      });
    }
    return data;
  };

  const monthlyData = generateMonthlyData();
  const weeklyData = generateWeeklyData();
  const quarterlyData = generateQuarterlyData();
  const dailyData = generateDailyData();

  const categoryData = [
    { name: 'Electronics', value: 340 },
    { name: 'Furniture', value: 220 },
    { name: 'Stationery', value: 180 },
    { name: 'Tools', value: 150 },
    { name: 'Others', value: 110 },
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

  const ageingData = [
    { range: '0-30 days', count: 420 },
    { range: '31-60 days', count: 185 },
    { range: '61-90 days', count: 95 },
    { range: '90+ days', count: 48 },
  ];

  const orderFulfillmentData = [
    { month: 'Jan', fulfilled: 450, pending: 80, cancelled: 20 },
    { month: 'Feb', fulfilled: 480, pending: 75, cancelled: 15 },
    { month: 'Mar', fulfilled: 520, pending: 90, cancelled: 25 },
    { month: 'Apr', fulfilled: 490, pending: 85, cancelled: 18 },
    { month: 'May', fulfilled: 550, pending: 70, cancelled: 22 },
    { month: 'Jun', fulfilled: 580, pending: 65, cancelled: 20 },
  ];

  const reorderLevelData = [
    { item: 'Item A', current: 120, reorder: 150, max: 200 },
    { item: 'Item B', current: 85, reorder: 100, max: 180 },
    { item: 'Item C', current: 200, reorder: 120, max: 250 },
    { item: 'Item D', current: 95, reorder: 130, max: 190 },
    { item: 'Item E', current: 160, reorder: 110, max: 220 },
  ];

  const COLORS = ['#3a7ca5', '#6a9aba', '#81b29a', '#f4a261', '#e76f51'];

  const ChartWrapper = ({ children, title, chartId }) => (
    <div className="bg-white rounded-md border border-gray-200 p-2 flex flex-col">
      <div className="flex justify-between items-center mb-1 border-b border-gray-200 pb-1">
        <h3 className="text-xs font-semibold text-gray-800 m-0">{title}</h3>
        <button onClick={() => setExpandedChart(chartId)} className="bg-transparent border-none cursor-pointer p-0.5 flex items-center text-gray-600 hover:text-blue-600">
          <Maximize2 size={14} />
        </button>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );

  const ExpandedModal = ({ title, children, onClose }) => (
    <div 
      className="fixed flex items-center justify-end"
      style={{
        top: '43px',
        left: 0,
        right: 0,
        bottom: '45px',
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        backdropFilter: 'blur(0px)',
        paddingRight: '30%',
      }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl flex flex-col"
        style={{ 
          width: '42.5%',
          height: '42.5%',
          maxWidth: '700px',
          maxHeight: '450px',
          animation: 'modalSlideUp 0.3s ease-out',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="flex justify-between items-center border-b-2 border-gray-200 text-white rounded-t-2xl flex-shrink-0"
          style={{
            padding: '6px 9px',
            background: 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
          }}
        >
          <h2 className="m-0 text-sm font-bold tracking-wide">{title}</h2>
          <button 
            onClick={onClose} 
            className="bg-red-500 hover:bg-red-600 border-none cursor-pointer flex items-center rounded-lg transition-all shadow-lg"
            style={{ padding: '4px 8px', fontSize: '11px', fontWeight: '600' }}
          >
            <X size={14} color="white" strokeWidth={3} />
            <span className="ml-1">Close</span>
          </button>
        </div>
        <div 
          className="flex-1 overflow-hidden" 
          style={{ padding: '15px', background: '#ffffff' }}
        >
          <div style={{ 
            width: '100%', 
            height: '100%', 
            background: 'white', 
            borderRadius: '8px', 
            padding: '10px',
          }}>
            {children}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      <div className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-gray-700 to-blue-400 text-white">
        <h2 className="m-0 text-xs font-semibold">Dashboard</h2>
      </div>

      <div className="flex-1 p-2.5 grid grid-cols-4 grid-rows-3 gap-2 overflow-hidden">
        <ChartWrapper title="Monthly Stock Status" chartId="chart1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 8 }} angle={-45} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 8 }} />
              <Tooltip contentStyle={{ fontSize: 9 }} />
              <Legend wrapperStyle={{ fontSize: 8 }} />
              <Bar dataKey="inStock" fill="#81b29a" name="In Stock" />
              <Bar dataKey="lowStock" fill="#f4a261" name="Low Stock" />
              <Bar dataKey="outOfStock" fill="#e76f51" name="Out of Stock" />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Items by Category" chartId="chart2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius="60%" dataKey="value">
                {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 9 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Weekly Movement (800 Weeks)" chartId="chart3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 8 }} />
              <YAxis tick={{ fontSize: 8 }} />
              <Tooltip contentStyle={{ fontSize: 9 }} />
              <Legend wrapperStyle={{ fontSize: 8 }} />
              <Line type="monotone" dataKey="received" stroke="#3a7ca5" strokeWidth={2} name="Received" dot={false} />
              <Line type="monotone" dataKey="dispatched" stroke="#e76f51" strokeWidth={2} name="Dispatched" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Monthly Inventory Value" chartId="chart4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6a9aba" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6a9aba" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 8 }} angle={-45} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 8 }} />
              <Tooltip contentStyle={{ fontSize: 9 }} formatter={(value) => `₹${value.toLocaleString()}`} />
              <Area type="monotone" dataKey="value" stroke="#3a7ca5" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" name="Value (₹)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Supplier Items" chartId="chart5">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={supplierData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 8 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 8 }} width={70} />
              <Tooltip contentStyle={{ fontSize: 9 }} />
              <Bar dataKey="items" fill="#3a7ca5" name="Items" />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Warehouse Usage" chartId="chart6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={warehouseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="warehouse" tick={{ fontSize: 8 }} />
              <YAxis tick={{ fontSize: 8 }} />
              <Tooltip contentStyle={{ fontSize: 9 }} />
              <Legend wrapperStyle={{ fontSize: 8 }} />
              <Area type="monotone" dataKey="capacity" stroke="#81b29a" fill="#81b29a" fillOpacity={0.6} name="Capacity %" />
              <Area type="monotone" dataKey="utilization" stroke="#f4a261" fill="#f4a261" fillOpacity={0.6} name="Used %" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Quarterly Turnover Rate" chartId="chart7">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={quarterlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 8 }} angle={-45} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 8 }} />
              <Tooltip contentStyle={{ fontSize: 9 }} />
              <Line type="monotone" dataKey="turnover" stroke="#6a9aba" strokeWidth={3} name="Turnover" dot={{ r: 4, fill: "#3a7ca5" }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Daily Demand (365 Days)" chartId="chart8">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 8 }} />
              <YAxis tick={{ fontSize: 8 }} />
              <Tooltip contentStyle={{ fontSize: 9 }} />
              <Bar dataKey="demand" fill="#e76f51" name="Demand" />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Stock Ageing" chartId="chart9">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={ageingData} cx="50%" cy="50%" labelLine={false} label={({ range, percent }) => `${range}: ${(percent * 100).toFixed(0)}%`} outerRadius="60%" dataKey="count">
                {ageingData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 9 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Returns Trend" chartId="chart10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorReturns" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e76f51" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#e76f51" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 8 }} angle={-45} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 8 }} />
              <Tooltip contentStyle={{ fontSize: 9 }} />
              <Area type="monotone" dataKey="returns" stroke="#e76f51" strokeWidth={2} fillOpacity={1} fill="url(#colorReturns)" name="Returns" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Order Fulfillment Status" chartId="chart11">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={orderFulfillmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 8 }} />
              <YAxis tick={{ fontSize: 8 }} />
              <Tooltip contentStyle={{ fontSize: 9 }} />
              <Legend wrapperStyle={{ fontSize: 8 }} />
              <Bar dataKey="fulfilled" fill="#81b29a" name="Fulfilled" />
              <Bar dataKey="pending" fill="#f4a261" name="Pending" />
              <Bar dataKey="cancelled" fill="#e76f51" name="Cancelled" />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>

        <ChartWrapper title="Inventory Reorder Levels" chartId="chart12">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reorderLevelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 8 }} />
              <YAxis dataKey="item" type="category" tick={{ fontSize: 8 }} width={60} />
              <Tooltip contentStyle={{ fontSize: 9 }} />
              <Legend wrapperStyle={{ fontSize: 8 }} />
              <Bar dataKey="current" fill="#3a7ca5" name="Current" />
              <Bar dataKey="reorder" fill="#f4a261" name="Reorder Level" />
              <Bar dataKey="max" fill="#81b29a" name="Max Capacity" />
            </BarChart>
          </ResponsiveContainer>
        </ChartWrapper>
      </div>

      <div className="flex justify-end gap-2.5 px-2.5 py-0 border-t border-gray-300 bg-gradient-to-r from-gray-700 to-blue-400" />

      {expandedChart && (
        <ExpandedModal
          title={
            expandedChart === 'chart1' ? 'Monthly Stock Status (5 Years)' :
            expandedChart === 'chart2' ? 'Items by Category' :
            expandedChart === 'chart3' ? 'Weekly Item Movement (800 Weeks)' :
            expandedChart === 'chart4' ? 'Monthly Inventory Value (5 Years)' :
            expandedChart === 'chart5' ? 'Supplier Performance' :
            expandedChart === 'chart6' ? 'Warehouse Capacity Usage' :
            expandedChart === 'chart7' ? 'Quarterly Turnover Rate (5 Years)' :
            expandedChart === 'chart8' ? 'Daily Demand Pattern (365 Days)' :
            expandedChart === 'chart9' ? 'Stock Ageing Distribution' :
            expandedChart === 'chart10' ? 'Monthly Returns Trend (5 Years)' :
            expandedChart === 'chart11' ? 'Order Fulfillment Status' :
            'Inventory Reorder Levels'
          }
          onClose={() => setExpandedChart(null)}
        >
          <ResponsiveContainer width="100%" height="100%">
            {expandedChart === 'chart1' && <BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" angle={-45} textAnchor="end" height={100} /><YAxis /><Tooltip /><Legend /><Bar dataKey="inStock" fill="#81b29a" name="In Stock" /><Bar dataKey="lowStock" fill="#f4a261" name="Low Stock" /><Bar dataKey="outOfStock" fill="#e76f51" name="Out of Stock" /></BarChart>}
            {expandedChart === 'chart2' && <PieChart><Pie data={categoryData} cx="50%" cy="50%" labelLine={true} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`} outerRadius="40%" dataKey="value">{categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart>}
            {expandedChart === 'chart3' && <LineChart data={weeklyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="week" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="received" stroke="#3a7ca5" strokeWidth={2} name="Received" dot={false} /><Line type="monotone" dataKey="dispatched" stroke="#e76f51" strokeWidth={2} name="Dispatched" dot={false} /></LineChart>}
            {expandedChart === 'chart4' && <AreaChart data={monthlyData}><defs><linearGradient id="colorValueExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6a9aba" stopOpacity={0.8}/><stop offset="95%" stopColor="#6a9aba" stopOpacity={0.1}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" angle={-45} textAnchor="end" height={100} /><YAxis /><Tooltip formatter={(value) => `₹${value.toLocaleString()}`} /><Area type="monotone" dataKey="value" stroke="#3a7ca5" strokeWidth={2} fillOpacity={1} fill="url(#colorValueExp)" name="Value (₹)" /></AreaChart>}
            {expandedChart === 'chart5' && <BarChart data={supplierData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={120} /><Tooltip /><Bar dataKey="items" fill="#3a7ca5" name="Items" /></BarChart>}
            {expandedChart === 'chart6' && <AreaChart data={warehouseData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="warehouse" /><YAxis /><Tooltip /><Legend /><Area type="monotone" dataKey="capacity" stroke="#81b29a" fill="#81b29a" fillOpacity={0.6} name="Capacity %" /><Area type="monotone" dataKey="utilization" stroke="#f4a261" fill="#f4a261" fillOpacity={0.6} name="Used %" /></AreaChart>}
            {expandedChart === 'chart7' && <LineChart data={quarterlyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" angle={-45} textAnchor="end" height={100} /><YAxis /><Tooltip /><Line type="monotone" dataKey="turnover" stroke="#6a9aba" strokeWidth={3} name="Turnover" dot={{ r: 6, fill: "#3a7ca5" }} /></LineChart>}
            {expandedChart === 'chart8' && <BarChart data={dailyData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Bar dataKey="demand" fill="#e76f51" name="Demand" /></BarChart>}
            {expandedChart === 'chart9' && <PieChart><Pie data={ageingData} cx="50%" cy="50%" labelLine={true} label={({ range, percent }) => `${range}: ${(percent * 100).toFixed(1)}%`} outerRadius="40%" dataKey="count">{ageingData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart>}
            {expandedChart === 'chart10' && <AreaChart data={monthlyData}><defs><linearGradient id="colorReturnsExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#e76f51" stopOpacity={0.8}/><stop offset="95%" stopColor="#e76f51" stopOpacity={0.1}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="period" angle={-45} textAnchor="end" height={100} /><YAxis /><Tooltip /><Area type="monotone" dataKey="returns" stroke="#e76f51" strokeWidth={2} fillOpacity={1} fill="url(#colorReturnsExp)" name="Returns" /></AreaChart>}
            {expandedChart === 'chart11' && <BarChart data={orderFulfillmentData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Bar dataKey="fulfilled" fill="#81b29a" name="Fulfilled" /><Bar dataKey="pending" fill="#f4a261" name="Pending" /><Bar dataKey="cancelled" fill="#e76f51" name="Cancelled" /></BarChart>}
            {expandedChart === 'chart12' && <BarChart data={reorderLevelData} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="item" type="category" width={120} /><Tooltip /><Legend /><Bar dataKey="current" fill="#3a7ca5" name="Current" /><Bar dataKey="reorder" fill="#f4a261" name="Reorder Level" /><Bar dataKey="max" fill="#81b29a" name="Max Capacity" /></BarChart>}
          </ResponsiveContainer>
        </ExpandedModal>
      )}
    </div>
  );
}
