import React from 'react';
import { FileText } from 'lucide-react';

const Inventorymanagement = () => {
  return (
    <div className="w-full h-full bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-2.5 py-0 border-b border-gray-300 flex items-center justify-between bg-gradient-to-r from-gray-700 to-blue-400 text-white" style={{ height: '24px', paddingRight: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={14} />
          <h2 className="m-0 text-xs font-semibold">InventoryManagement</h2>
        </div>
      </div>

      {/* Main Content Area - Empty */}
      <div className="flex-1 p-2.5 overflow-auto">
        {/* Empty content - ready for your components */}
      </div>

      {/* Footer */}
      <div className="px-2.5 border-t border-gray-300 bg-gradient-to-r from-blue-400 to-gray-700" style={{ height: '8px' }} />
    </div>
  );
};

export default Inventorymanagement;
