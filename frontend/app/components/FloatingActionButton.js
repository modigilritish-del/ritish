"use client";
import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";

export default function FloatingActionButton({ onClick }) {
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);

  useEffect(() => {
    // Load saved position from localStorage
    const saved = localStorage.getItem("fabPosition");
    if (saved) {
      setPosition(JSON.parse(saved));
    }
  }, []);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      // Boundaries
      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - 60;

      const boundedX = Math.max(0, Math.min(newX, maxX));
      const boundedY = Math.max(60, Math.min(newY, maxY - 55)); // Header + Bottom bar

      setPosition({ x: boundedX, y: boundedY });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        localStorage.setItem("fabPosition", JSON.stringify(position));
      }
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart, position]);

  const handleClick = (e) => {
    if (!isDragging) {
      onClick();
    }
  };

  return (
    <button
      ref={buttonRef}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: "56px",
        height: "56px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #0066cc 0%, #0052a3 100%)",
        border: "none",
        boxShadow: "0 4px 12px rgba(0, 102, 204, 0.4)",
        cursor: isDragging ? "grabbing" : "grab",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        transition: isDragging ? "none" : "all 0.2s ease",
        color: "white",
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 102, 204, 0.5)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 102, 204, 0.4)";
        }
      }}
    >
      <Plus size={24} strokeWidth={3} />
    </button>
  );
}
