'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

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
  const [containerWidth, setContainerWidth] = useState(0);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    startPos: { x: number; y: number };
  } | null>(null);

  // Measure container once to compute a fixed pixel width for the text box.
  // This prevents the text from reflowing as it's dragged around.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => setContainerWidth(container.getBoundingClientRect().width);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
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

      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartRef.current.pointerX;
      const deltaY = e.clientY - dragStartRef.current.pointerY;

      const newX = Math.min(0.95, Math.max(0.05, dragStartRef.current.startPos.x + deltaX / rect.width));
      const newY = Math.min(0.95, Math.max(0.05, dragStartRef.current.startPos.y + deltaY / rect.height));

      onPositionChange({ x: newX, y: newY });
    },
    [containerRef, onPositionChange]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  if (!text || !text.trim()) return null;

  // Fixed pixel width: 90% of container (wide default for ~2 line wrapping)
  const fixedWidth = containerWidth > 0 ? containerWidth * 0.9 : undefined;

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
        // Fixed pixel width — does NOT change as the element moves
        width: fixedWidth ? `${fixedWidth}px` : undefined,
        cursor: isDragging ? 'grabbing' : 'grab',
        lineHeight: 1.35,
        wordBreak: 'break-word',
        textAlign: 'center',
        userSelect: 'none',
        touchAction: 'none',
        zIndex: 10,
        // Visual feedback while dragging
        outline: isDragging ? '2px dashed rgba(0,212,255,0.6)' : '1px dashed rgba(255,255,255,0.25)',
        outlineOffset: '4px',
        // Apply text styling from template (color, font, background, etc.)
        // but NOT maxWidth — we use the fixed pixel width above
        color: style?.color,
        fontSize: style?.fontSize,
        fontWeight: style?.fontWeight,
        textShadow: style?.textShadow,
        backgroundColor: style?.backgroundColor,
        padding: style?.padding,
        borderRadius: style?.borderRadius,
      }}
    >
      {text}
    </div>
  );
}
