// src/components/editor/CanvasBlock.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCw } from 'lucide-react';

// --- 1. CENTRALIZED STYLING ---
const SHAPE_STYLES = {
  fill: '#e0e7ff',       // Light indigo fill
  stroke: '#4f46e5',      // Strong indigo stroke/border
  strokeWidth: 2,
  text: '#1e293b',        // Dark slate for text
  fontFamily: 'Inter, sans-serif',
  fontSize: 20,
};

// --- TYPES ---
interface Shape {
  id: string;
  type: 'rect' | 'circle' | 'triangle' | 'text' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  text?: string;
}

type Action = 'idle' | 'drawing' | 'moving' | 'resizing' | 'rotating';
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

interface CanvasBlockProps {
  initialData: { shapes: Shape[] };
  width: number;
  height: number;
  onUpdate: (data: { shapes: Shape[] }) => void;
  isEditing: boolean;
}

// --- RENDER HELPERS ---
const ShapeComponent = ({ shape, onTextChange }: { shape: Shape, onTextChange: (text: string) => void }) => {
  const baseStyle: React.CSSProperties = {
    transform: `translate(${shape.x}px, ${shape.y}px) rotate(${shape.rotation}deg)`,
    position: 'absolute',
    width: shape.width,
    height: shape.height,
    overflow: 'visible', 
  };

  switch (shape.type) {
    case 'rect':
      return <div style={{ ...baseStyle, backgroundColor: SHAPE_STYLES.fill, border: `${SHAPE_STYLES.strokeWidth}px solid ${SHAPE_STYLES.stroke}` }} />;
    case 'circle':
      return <div style={{ ...baseStyle, backgroundColor: SHAPE_STYLES.fill, border: `${SHAPE_STYLES.strokeWidth}px solid ${SHAPE_STYLES.stroke}`, borderRadius: '50%' }} />;
    
    case 'triangle':
      return (
        <svg style={baseStyle} viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon
            points="50,0 100,100 0,100"
            fill={SHAPE_STYLES.fill}
            stroke={SHAPE_STYLES.stroke}
            // --- THIS IS THE FIX: Removed the "* 2" ---
            strokeWidth={SHAPE_STYLES.strokeWidth} 
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      );

    case 'line':
      // ... (rest of the component is unchanged)
      return (
        <div
          style={{
            ...baseStyle,
            height: 4,
            backgroundColor: SHAPE_STYLES.stroke,
            transformOrigin: 'center left',
            transform: `translate(${shape.x}px, ${shape.y}px) rotate(${shape.rotation}deg)`,
          }}
        />
      );
    case 'text':
      return (
        <textarea
          value={shape.text || 'Text'}
          onChange={(e) => onTextChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            ...baseStyle,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontFamily: SHAPE_STYLES.fontFamily,
            fontSize: SHAPE_STYLES.fontSize,
            color: SHAPE_STYLES.text,
            padding: 0,
            overflowWrap: 'break-word',
          }}
        />
      );
    default:
      return null;
  }
};

const SelectionBox = ({ shape, onResize, onRotate }: { shape: Shape, onResize: (handle: ResizeHandle, e: React.PointerEvent) => void, onRotate: (e: React.PointerEvent) => void }) => {
  const boxStyle: React.CSSProperties = {
    position: 'absolute',
    left: shape.x,
    top: shape.y,
    width: shape.width,
    height: shape.height,
    transform: `rotate(${shape.rotation}deg)`,
    transformOrigin: 'center center',
    pointerEvents: 'none',
  };

  const handles: ResizeHandle[] = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];

  return (
    <div style={boxStyle}>
      <div style={{ position: 'absolute', inset: -2, border: `2px solid ${SHAPE_STYLES.stroke}` }} />
      
      <div
        onPointerDown={onRotate}
        style={{
          position: 'absolute',
          top: -30,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 20,
          height: 20,
          cursor: 'grab',
          pointerEvents: 'all',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          border: `2px solid ${SHAPE_STYLES.stroke}`,
          borderRadius: '50%',
        }}
      >
        <RotateCw size={12} color={SHAPE_STYLES.stroke} />
      </div>

      {handles.map(handle => (
        <div
          key={handle}
          onPointerDown={(e) => onResize(handle, e)}
          style={{
            position: 'absolute',
            width: 10,
            height: 10,
            border: '2px solid white',
            backgroundColor: SHAPE_STYLES.stroke,
            borderRadius: '50%',
            pointerEvents: 'all',
            top: handle.includes('n') ? -5 : handle.includes('s') ? 'auto' : '50%',
            bottom: handle.includes('s') ? -5 : 'auto',
            left: handle.includes('w') ? -5 : handle.includes('e') ? 'auto' : '50%',
            right: handle.includes('e') ? -5 : 'auto',
            transform: `translate(${handle.includes('w') || handle.includes('e') ? '0' : '-50%'}, ${handle.includes('n') || handle.includes('s') ? '0' : '-50%'})`,
            cursor: `${handle}-resize`,
          }}
        />
      ))}
    </div>
  );
};


// --- MAIN COMPONENT ---
export const CanvasBlock: React.FC<CanvasBlockProps> = ({ initialData, width, height, onUpdate, isEditing }) => {
  const [shapes, setShapes] = useState<Shape[]>(initialData.shapes || []);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [action, setAction] = useState<Action>('idle');
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const actionStateRef = useRef({ action, selectedShapeId, resizeHandle, shapes });

  useEffect(() => {
    actionStateRef.current = { action, selectedShapeId, resizeHandle, shapes };
  }, [action, selectedShapeId, resizeHandle, shapes]);

  const addShape = useCallback((shapeType: string, clientX?: number, clientY?: number) => {
    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    if (!canvasBounds) return;

    const newShape: Shape = {
      id: `shape_${Date.now()}`,
      type: shapeType as Shape['type'],
      x: (clientX ?? canvasBounds.left) - canvasBounds.left,
      y: (clientY ?? canvasBounds.top) - canvasBounds.top,
      width: 100,
      height: 100,
      rotation: 0,
      text: shapeType === 'text' ? 'Your Text Here' : undefined,
    };

    setShapes(prev => [...prev, newShape]);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = canvas?.parentElement;
    if (!wrapper) return;

    const handleAddShapeEvent = (e: Event) => {
      const { detail } = e as CustomEvent;
      addShape(detail.shapeType, detail.clientX, detail.clientY);
    };

    wrapper.addEventListener('canvas-add-shape', handleAddShapeEvent);
    return () => wrapper.removeEventListener('canvas-add-shape', handleAddShapeEvent);
  }, [addShape]);

  useEffect(() => {
    onUpdate({ shapes });
  }, [shapes, onUpdate]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (selectedShapeId) {
        e.preventDefault();
        e.stopPropagation();
        setShapes(prev => prev.filter(shape => shape.id !== selectedShapeId));
        setSelectedShapeId(null);
      }
    }
  };

  const handleTextChange = (shapeId: string, newText: string) => {
    setShapes(prevShapes =>
      prevShapes.map(shape =>
        shape.id === shapeId ? { ...shape, text: newText } : shape
      )
    );
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    const shapeElement = target.closest('[data-shape-id]');
    
    if (shapeElement) {
      const shapeId = shapeElement.getAttribute('data-shape-id');
      if (shapeId) {
        setSelectedShapeId(shapeId);
        setAction('moving');
        canvasRef.current?.focus();
      }
    } else {
      setSelectedShapeId(null);
      setAction('idle');
    }
  };

  // --- 2. RESIZE LOGIC ---
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const { action, selectedShapeId, resizeHandle, shapes } = actionStateRef.current;
    if (action === 'idle') return;

    const selectedShape = shapes.find(s => s.id === selectedShapeId);
    if (!selectedShape) return;

    switch (action) {
      case 'moving': {
        setShapes(prev => prev.map(s => s.id === selectedShapeId ? { ...s, x: s.x + e.movementX, y: s.y + e.movementY } : s));
        break;
      }
      case 'rotating': {
        const centerX = selectedShape.x + selectedShape.width / 2;
        const centerY = selectedShape.y + selectedShape.height / 2;
        
        const canvasBounds = canvasRef.current!.getBoundingClientRect();
        const mouseX = e.clientX - canvasBounds.left;
        const mouseY = e.clientY - canvasBounds.top;

        const angleRad = Math.atan2(mouseY - centerY, mouseX - centerX);
        let angleDeg = (angleRad * 180) / Math.PI + 90;

        const snapAngle = 15;
        angleDeg = Math.round(angleDeg / snapAngle) * snapAngle;

        setShapes(prev => prev.map(s => s.id === selectedShapeId ? { ...s, rotation: angleDeg } : s));
        break;
      }
      case 'resizing': {
        if (!resizeHandle) return;

        let { x, y, width, height, rotation } = selectedShape;
        const MIN_SIZE = 20;

        // Compensate for rotation: convert screen-space mouse movement to shape-space
        const angleRad = rotation * (Math.PI / 180);
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const dx = e.movementX * cos + e.movementY * sin;
        const dy = e.movementY * cos - e.movementX * sin;

        // Update dimensions based on which handle is being dragged
        if (resizeHandle.includes('e')) width += dx;
        if (resizeHandle.includes('w')) {
          width -= dx;
          x += dx * cos;
          y += dx * sin;
        }
        if (resizeHandle.includes('s')) height += dy;
        if (resizeHandle.includes('n')) {
          height -= dy;
          x -= dy * -sin;
          y -= dy * cos;
        }

        // Apply minimum size constraints
        width = Math.max(MIN_SIZE, width);
        height = Math.max(MIN_SIZE, height);

        setShapes(prev => prev.map(s => s.id === selectedShapeId ? { ...s, x, y, width, height } : s));
        break;
      }
    }
  };

  const handlePointerUp = () => {
    setAction('idle');
    setResizeHandle(null);
  };

  const handleResizePointerDown = (handle: ResizeHandle, e: React.PointerEvent) => {
    e.stopPropagation();
    setAction('resizing');
    setResizeHandle(handle);
  };

  const handleRotatePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setAction('rotating');
  };

  const selectedShape = shapes.find(s => s.id === selectedShapeId);

  return (
    <div
      ref={canvasRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        width,
        height,
        position: 'relative',
        backgroundColor: '#f9fafb',
        border: isEditing ? '1px dashed #d1d5db' : 'none',
        overflow: 'hidden',
        outline: 'none',
      }}
    >
      {shapes.map(shape => (
        <div key={shape.id} data-shape-id={shape.id}>
          <ShapeComponent 
            shape={shape} 
            onTextChange={(newText) => handleTextChange(shape.id, newText)} 
          />
        </div>
      ))}

      {isEditing && selectedShape && (
        <SelectionBox 
          shape={selectedShape} 
          onResize={handleResizePointerDown}
          onRotate={handleRotatePointerDown}
        />
      )}
    </div>
  );
};