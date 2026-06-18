//app/AdminIconPages/PlantCompanyDetailsLayout.js
"use client";

export default function PlantCompanyDetailsLayout({ children, embeddedMode = false }) {
  return (
    <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="w-[98%] max-w-[1800px] h-[95%] bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modern Header — hidden in embeddedMode */}
        {!embeddedMode && <div className="h-24 px-6 flex items-center justify-between bg-gradient-to-r from-slate-800 via-blue-600 to-indigo-600 text-white flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-lg">
                <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
                <path d="M9 22v-4h6v4"/>
                <path d="M8 6h.01"/>
                <path d="M16 6h.01"/>
                <path d="M12 6h.01"/>
                <path d="M12 10h.01"/>
                <path d="M12 14h.01"/>
                <path d="M16 10h.01"/>
                <path d="M16 14h.01"/>
                <path d="M8 10h.01"/>
                <path d="M8 14h.01"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Complete Business Hierarchy</h2>
              <p className="text-xs text-blue-100 font-medium">Detailed Company & Plant Analytics</p>
            </div>
          </div>
          
          {/* Stats will be passed as children or props */}
          <div className="flex items-center gap-3">
            {/* Stats components will go here */}
          </div>
        </div>}

        {/* Enhanced Toolbar Placeholder — hidden in embeddedMode */}
        {!embeddedMode && (
          <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-blue-50 flex gap-3 flex-shrink-0">
            {/* Toolbar content will be passed as children */}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-5 bg-gradient-to-br from-slate-50 to-blue-50">
          {children}
        </div>

        {/* Modern Footer — hidden in embeddedMode */}
        {!embeddedMode && <div className="h-6 bg-gradient-to-r from-indigo-600 via-blue-600 to-slate-800 flex-shrink-0"></div>}
      </div>

      <style jsx global>{`
        /* Company Card Styles */
        .company-card {
          @apply border-2 border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xl hover:shadow-2xl transition-all;
        }

        .company-header {
          @apply bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 cursor-pointer hover:from-blue-700 hover:to-purple-700 transition-all;
        }

        .company-icon-box {
          @apply bg-white/20 p-3 rounded-xl backdrop-blur-sm;
        }

        .company-title {
          @apply text-xl font-bold text-white drop-shadow-lg;
        }

        .company-code-badge {
          @apply text-sm bg-white/30 text-white px-4 py-1 rounded-full font-mono font-bold backdrop-blur-sm;
        }

        .company-short-name {
          @apply text-xs bg-white/20 text-white px-3 py-1 rounded-full backdrop-blur-sm;
        }

        .stat-badge {
          @apply flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm;
        }

        .shared-contact-badge {
          @apply flex items-center gap-2 bg-yellow-500/30 px-3 py-1 rounded-lg text-yellow-100 backdrop-blur-sm animate-pulse;
        }

        /* Company Details Section */
        .company-details-section {
          @apply p-6 bg-gradient-to-r from-blue-50 via-white to-indigo-50 border-b-2 border-blue-100;
        }

        .details-grid {
          @apply grid grid-cols-5 gap-5 text-sm;
        }

        .detail-column {
          @apply space-y-4;
        }

        .column-header {
          @apply font-bold text-slate-800 mb-3 flex items-center gap-2 border-b-2 pb-2 border-blue-400 text-base;
        }

        .detail-card {
          @apply bg-white rounded-lg p-4 shadow-md border-2 border-blue-200;
        }

        .detail-card-small {
          @apply bg-white rounded-lg p-3 shadow-sm border border-blue-100;
        }

        .detail-label {
          @apply text-slate-600 text-xs mb-2 font-bold uppercase tracking-wide;
        }

        .detail-label-small {
          @apply text-slate-500 text-[10px] mb-2 font-semibold uppercase;
        }

        .detail-value {
          @apply text-slate-900 font-bold text-lg bg-blue-100 px-3 py-2 rounded-lg border border-blue-300;
        }

        .detail-value-small {
          @apply text-slate-900 font-bold text-base;
        }

        /* Contact Sharing Alert Styles */
        .contact-alert-box {
          @apply mt-2 p-2 bg-orange-50 border-l-4 border-orange-400 rounded-r;
        }

        .contact-alert-header {
          @apply flex items-center gap-1 text-orange-700 font-bold mb-1 text-[10px];
        }

        .contact-alert-text {
          @apply text-[9px] text-orange-800 mb-1;
        }

        /* Plant Section Styles */
        .plants-section {
          @apply bg-gradient-to-b from-slate-50 to-white;
        }

        .plants-header {
          @apply flex items-center justify-between mb-4 bg-gradient-to-r from-purple-100 to-indigo-100 p-4 rounded-xl border-2 border-purple-300 shadow-md;
        }

        .plants-title {
          @apply text-base font-bold text-purple-900 flex items-center gap-3;
        }

        .plants-icon-box {
          @apply bg-purple-600 p-2 rounded-lg;
        }

        .plants-stats {
          @apply flex items-center gap-3 text-xs;
        }

        .plants-stat-badge {
          @apply bg-white px-3 py-1.5 rounded-lg font-semibold text-purple-700 border border-purple-200;
        }

        /* Individual Plant Card Styles */
        .plant-card {
          @apply border-2 border-purple-200 rounded-xl overflow-hidden bg-white hover:shadow-lg transition-all;
        }

        .plant-header {
          @apply bg-gradient-to-r from-purple-100 via-indigo-100 to-purple-100 p-4 cursor-pointer hover:from-purple-200 hover:to-indigo-200 transition-all border-b-2 border-purple-200;
        }

        .plant-icon-box {
          @apply bg-purple-600 p-2 rounded-lg shadow-md;
        }

        .plant-name {
          @apply text-base font-bold text-slate-900;
        }

        .plant-code-badge {
          @apply text-[11px] bg-purple-600 text-white px-3 py-1 rounded-full font-mono font-bold shadow-sm;
        }

        .plant-id-badge {
          @apply text-[10px] bg-white px-2 py-1 rounded-full font-mono text-purple-700 border border-purple-300;
        }

        .plant-type-info {
          @apply text-xs text-slate-700 space-y-1;
        }

        .plant-contact-badge {
          @apply flex items-center gap-1 px-2 py-1 rounded border text-[11px];
        }

        .plant-email-badge {
          @apply bg-blue-50 text-blue-700 border-blue-200;
        }

        .plant-phone-badge {
          @apply bg-green-50 text-green-700 border-green-200;
        }

        .plant-location-badge {
          @apply bg-orange-50 text-orange-700 border-orange-200;
        }

        /* Plant Details Styles */
        .plant-details-section {
          @apply p-4 bg-gradient-to-br from-white to-purple-50;
        }

        .plant-details-grid {
          @apply grid grid-cols-3 gap-4 text-xs;
        }

        .plant-email-card {
          @apply bg-white rounded-lg p-3 border-l-4 border-blue-400 shadow-sm;
        }

        .plant-phone-card {
          @apply bg-white rounded-lg p-3 border-l-4 border-green-400 shadow-sm;
        }

        .primary-badge {
          @apply text-[9px] bg-green-500 text-white px-2 py-0.5 rounded-full font-bold;
        }

        .location-detail-card {
          @apply bg-white rounded-lg p-3 shadow-sm border border-purple-100 space-y-2;
        }

        .location-detail-label {
          @apply text-[9px] text-slate-500 font-semibold uppercase block mb-1;
        }

        .location-detail-value {
          @apply text-slate-900 font-bold text-sm;
        }

        .postal-code-badge {
          @apply text-[10px] bg-purple-600 text-white px-3 py-1.5 rounded-lg font-mono font-bold inline-block shadow-sm;
        }

        .address-box {
          @apply mt-3 bg-slate-50 rounded-lg p-3 border border-slate-200;
        }

        .metadata-card {
          @apply bg-white rounded-lg p-3 shadow-sm border border-purple-100;
        }

        .quick-stats-card {
          @apply bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200;
        }

        .quick-stat-item {
          @apply bg-white rounded p-2;
        }

        /* Plant Type Card Styles */
        .plant-type-card {
          @apply border-2 border-green-200 rounded-xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all;
        }

        .plant-type-header {
          @apply bg-gradient-to-r from-green-600 to-emerald-600 p-5;
        }

        .plant-type-icon-box {
          @apply bg-white/20 p-3 rounded-xl backdrop-blur-sm;
        }

        .plant-type-title {
          @apply font-bold text-white text-base mb-2;
        }

        .plant-type-code-badge {
          @apply text-xs bg-white/30 text-white px-3 py-1 rounded-full font-mono backdrop-blur-sm;
        }

        .plant-type-description {
          @apply p-4 bg-green-50 border-t border-green-200;
        }

        .plant-type-plants-list {
          @apply p-4 border-t border-green-100;
        }

        .plant-type-plant-item {
          @apply text-[10px] text-slate-600 flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200;
        }

        /* Utility Styles */
        .loading-container {
          @apply text-center py-20;
        }

        .loading-emoji {
          @apply text-6xl mb-4 animate-bounce;
        }

        .loading-text {
          @apply text-base text-slate-600 font-medium;
        }

        .empty-state {
          @apply text-center py-20;
        }

        .empty-emoji {
          @apply text-7xl mb-4;
        }

        .empty-title {
          @apply text-base font-semibold text-slate-700;
        }

        .empty-subtitle {
          @apply text-sm text-slate-500 mt-2;
        }

        .error-box {
          @apply mx-4 mt-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-sm text-red-700 flex items-center gap-3 shadow-sm;
        }

        /* Search and Toolbar Styles */
        .search-input {
          @apply w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm;
        }

        .view-button {
          @apply px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md;
        }

        .view-button-active {
          @apply bg-gradient-to-r from-blue-600 to-indigo-600 text-white scale-105;
        }

        .view-button-inactive {
          @apply bg-white border-2 border-slate-300 text-slate-700 hover:border-blue-400 hover:shadow-lg;
        }

        .view-button-plant-types-active {
          @apply bg-gradient-to-r from-green-600 to-emerald-600 text-white scale-105;
        }

        .view-button-plant-types-inactive {
          @apply bg-white border-2 border-slate-300 text-slate-700 hover:border-green-400 hover:shadow-lg;
        }

        /* Delete Button Styles */
        .delete-button {
          @apply p-3 hover:bg-red-500 rounded-xl transition-colors bg-white/10 backdrop-blur-sm;
        }

        .delete-button-small {
          @apply p-2 hover:bg-red-100 rounded-lg transition-colors border border-red-200;
        }

        /* Header Stats Styles */
        .header-stat-card {
          @apply bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20;
        }

        .header-stat-label {
          @apply text-xs text-blue-100 font-medium;
        }

        .header-stat-value {
          @apply text-2xl font-bold;
        }

        /* Scrollbar Styling */
        .flex-1.overflow-auto::-webkit-scrollbar {
          width: 8px;
        }

        .flex-1.overflow-auto::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }

        .flex-1.overflow-auto::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #6366f1);
          border-radius: 10px;
        }

        .flex-1.overflow-auto::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #4f46e5);
        }
      `}</style>
    </div>
  );
}