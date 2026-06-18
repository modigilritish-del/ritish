//app/components/RightPanel.js
"use client";
import { useRef } from "react";
import { usePanelWidth } from "../context/PanelWidthContext";

export default function RightPanel({ children }) {
  const { rightWidth, setRightWidth, isRightPanelOpen } = usePanelWidth();
  const isDragging = useRef(false);

  // ===== DRAG START =====
  const startDrag = () => {
    isDragging.current = true;
    document.body.style.userSelect = "none";
  };

  // ===== DRAG MOVEMENT =====
  const onDrag = (e) => {
    if (!isDragging.current) return;

    let newWidth = window.innerWidth - e.clientX; // WIDTH FROM RIGHT

    if (newWidth < 50) newWidth = 50; // minimum
    if (newWidth > 600) newWidth = 600; // max

    setRightWidth(newWidth);
  };

  // ===== DRAG END =====
  const stopDrag = () => {
    isDragging.current = false;
    document.body.style.userSelect = "auto";
  };

  if (typeof window !== "undefined") {
    window.onmousemove = onDrag;
    window.onmouseup = stopDrag;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "43px",
        right: 0,
        bottom: "45px",
        width: rightWidth,
        background: "#f3f4f6",
        borderLeft: "1px solid #e5e7eb",
        zIndex: 900,
        overflow: "hidden",
        transition: isDragging.current ? "none" : "width 0.2s"
      }}
    >
      {/* DRAG HANDLE */}
      <div
        onMouseDown={startDrag}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "6px",
          height: "100%",
          cursor: "col-resize",
          background: "linear-gradient(to right, #d1d5db 0%, transparent 100%)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {/* DRAG BUTTON */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "#3b82f6",
            color: "white",
            padding: "8px 4px",
            borderRadius: "4px",
            fontSize: "10px",
            fontWeight: "600",
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            pointerEvents: "none",
            userSelect: "none"
          }}
        >
          DRAG
        </div>
      </div>

      {/* Content Area - Children will render here */}
<div style={{ 
  width: "100%", 
  height: "100%", 
  overflow: "auto",
  padding: "8px 10px 13px 2px"  // top right bottom left
}}>
  {children || (
    <div>
      <h3>Right Panel</h3>
      <p>Drag the left edge to resize.</p>
    </div>
  )}
</div>
    </div>
  );
}
