/**
 * UserDeptAccessPopup.js
 *
 * Modal wrapper that shows UserDeptAccessPage as-is inside a popup.
 * Triggered from WorkflowDashboard when the "User Dept Access" node is clicked.
 *
 * Props:
 *   onClose  — called when the popup is closed
 */

import UserDeptAccessPage from '../AdminIconPages/UserDeptAccessPage';

export default function UserDeptAccessPopup({ onClose }) {
  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Full-screen overlay */}
      <div
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9200,
          background: 'rgba(0,0,0,0.55)',
        }}
      >
        {/* Modal box — smaller, anchored 20% from right */}
        <div
          style={{
            position: 'absolute',
            right: '20%',
            top: '5vh',
            width: 780,
            height: '88vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 12,
            overflow: 'hidden',
            animation: 'fadeInUp 0.2s ease',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          }}
        >
          {/* Close button — floated over the modal */}
          <button
            onClick={onClose}
            title="Close"
            style={{
              position: 'absolute',
              top: 3,
              right: 10,
              zIndex: 10,
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: 16,
              lineHeight: 1,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ✕
          </button>

          {/* UserDeptAccessPage fills the entire modal — zero changes to its code */}
          <UserDeptAccessPage />
        </div>
      </div>
    </>
  );
}