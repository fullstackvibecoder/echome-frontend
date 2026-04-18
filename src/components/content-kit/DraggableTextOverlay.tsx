'use client';

import { useState, useCallback, useRef } from 'react';

interface DraggableTextOverlayProps {
  text: string;
  position: { x: number; y: number }; // 0-1 normalized
  onPositionChange: (pos: { x: number; y: number }) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  style?: {
    color?: string;
    fontSize?: string;
    fontWeight?: string;
    textShadow?: string;
    maxWidth?: string;
    backgroundColor?: string;
    padding?: string;
    borderRadius?: string;
  };
}

export function DraggableTextOverlay({
  text,
  position,
  onPositionChange,
  containerRef,
  style,
}: DraggableTextOverlayProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    startPos: { x: number; y: number };
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
      dragStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        startPos: { x: position.x, y: position.y },
      };
    },
    [position.x, position.y]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragStartRef.current || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();

      const deltaX = e.clientX - dragStartRef.current.pointerX;
      const deltaY = e.clientY - dragStartRef.current.pointerY;

      const normalizedDeltaX = deltaX / rect.width;
      const normalizedDeltaY = deltaY / rect.height;

      const newX = Math.min(0.95, Math.max(0.05, dragStartRef.current.startPos.x + normalizedDeltaX));
      const newY = Math.min(0.95, Math.max(0.05, dragStartRef.current.startPos.y + normalizedDeltaY));

      onPositionChange({ x: newX, y: newY });
    },
    [containerRef, onPositionChange]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  if (!text || !text.trim()) {
    return null;
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'absolute',
        left: `${position.x * 100}%`,
        top: `${position.y * 100}%`,
        transform: 'translate(-50%, -50%)',
        cursor: isDragging ? 'grabbing' : 'grab',
        lineHeight: 1.35,
        wordBreak: 'break-word',
        textAlign: 'center',
        outline: isDragging ? '2px dashed rgba(0,212,255,0.6)' : 'none',
        outlineOffset: isDragging ? '4px' : undefined,
        userSelect: 'none',
        touchAction: 'none',
        ...style,
      }}
    >
      {text}
    </div>
  );
}
