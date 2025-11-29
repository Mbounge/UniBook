// src/components/editor/CanvasBlock.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  RotateCw, Trash2, Copy, Clipboard, 
  ArrowUp, ArrowDown, Minus, MoreHorizontal, 
  Square, Circle, Ban, Grid3x3, LayoutGrid, Maximize, Pipette, X
} from 'lucide-react';

// --- CONFIGURATION ---
const STROKE_COLORS = ['#1e1e1e', '#e0e7ff', '#4f46e5', '#e03131', '#2f9e44', '#1971c2', '#f08c00', '#862e9c', '#fcc419', '#ffffff', 'transparent'];
const BG_COLORS = ['transparent', '#ffffff', '#f8f9fa', '#e9ecef', '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99', '#343a40'];

// --- TYPES ---
interface Shape {
  id: string; 
  type: 'rect' | 'circle' | 'triangle' | 'text' | 'line' | 'arrow' | 'image' | 'draw';
  x: number; y: number; width: number; height: number; rotation: number;
  text?: string; 
  imageUrl?: string;
  points?: { x: number, y: number }[]; 
  
  // Style Properties
  fill: string; 
  stroke: string; 
  strokeWidth: number;
  strokeStyle: 'solid' | 'dashed' | 'dotted';
  opacity: number;
  roughness: 'sharp' | 'round'; 
}

type GridType = 'none' | 'dots' | 'lines';

interface CanvasData {
  shapes: Shape[];
  background?: string;
  grid?: GridType;
}

type Action = 'idle' | 'drawing' | 'moving' | 'resizing' | 'rotating' | 'selecting' | 'freehand' | 'creating';
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

interface CanvasBlockProps {
  initialData: CanvasData;
  width: number;
  height: number;
  onUpdate: (data: CanvasData) => void;
  isEditing: boolean;
}

// --- COLOR UTILS ---
const hexToRgba = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
    a: result[4] ? parseInt(result[4], 16) / 255 : 1
  } : { r: 0, g: 0, b: 0, a: 1 };
};

const rgbToHsv = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) h = 0;
  else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
};

const hsvToRgb = (h: number, s: number, v: number) => {
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

const rgbaToHex = (r: number, g: number, b: number, a: number) => {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  const alpha = Math.round(a * 255);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${alpha === 255 ? '' : toHex(alpha)}`;
};

// --- HELPER: PORTAL FOR TOOLBAR ---
const ShapeToolbarPortal = ({ 
  canvasRef, boundingBox, children, toolbarRef, isCanvasSettings = false
}: { 
  canvasRef: React.RefObject<HTMLDivElement | null>; 
  boundingBox: { x: number; y: number; width: number; height: number } | null; 
  children: React.ReactNode; 
  toolbarRef: React.RefObject<HTMLDivElement | null>;
  isCanvasSettings?: boolean;
}) => {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); return () => setMounted(false); }, []);

  const updatePosition = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    let left, top;

    if (isCanvasSettings) {
      left = canvasRect.left - 40;
      top = canvasRect.top - 100;
    } else if (boundingBox) {
      left = canvasRect.left - 40; 
      top = canvasRect.top - 100;
    } else {
      return;
    }
    
    containerRef.current.style.transform = `translate3d(${left}px, ${top}px, 0) translateX(-100%)`;

  }, [canvasRef, boundingBox, isCanvasSettings]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [updatePosition]);

  useEffect(() => { updatePosition(); });

  if (!mounted) return null;

  return createPortal(
    <div 
      ref={containerRef}
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        zIndex: 99999, 
        pointerEvents: 'auto', 
        width: 'fit-content',
        height: 'fit-content'
      }}
    >
      <div ref={toolbarRef}>
        {children}
      </div>
    </div>,
    document.body
  );
};

// --- ADVANCED COLOR PICKER COMPONENT ---
const AdvancedColorPicker = ({ 
  color, 
  onChange, 
  onClose
}: { 
  color: string; 
  onChange: (color: string) => void; 
  onClose: () => void;
}) => {
  const [hsv, setHsv] = useState({ h: 0, s: 0, v: 100 });
  const [alpha, setAlpha] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rgba = hexToRgba(color === 'transparent' ? '#ffffff00' : color);
    const newHsv = rgbToHsv(rgba.r, rgba.g, rgba.b);
    setHsv(newHsv);
    setAlpha(rgba.a);
  }, [color]); 

  const updateColor = (newHsv: { h: number, s: number, v: number }, newAlpha: number) => {
    const rgb = hsvToRgb(newHsv.h / 360, newHsv.s / 100, newHsv.v / 100);
    const hex = rgbaToHex(rgb.r, rgb.g, rgb.b, newAlpha);
    
    requestAnimationFrame(() => {
        onChange(hex);
    });
  };

  const handleAreaMove = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!areaRef.current) return;
    const rect = areaRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    const newS = x * 100;
    const newV = 100 - (y * 100);
    
    setHsv(prev => {
      const next = { ...prev, s: newS, v: newV };
      updateColor(next, alpha);
      return next;
    });
  }, [alpha]);

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newH = parseInt(e.target.value);
    setHsv(prev => {
      const next = { ...prev, h: newH };
      updateColor(next, alpha);
      return next;
    });
  };

  const handleAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newA = parseFloat(e.target.value);
    setAlpha(newA);
    updateColor(hsv, newA);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    document.removeEventListener('mousemove', handleAreaMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleAreaMove(e);
    document.addEventListener('mousemove', handleAreaMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const rgb = hsvToRgb(hsv.h / 360, hsv.s / 100, hsv.v / 100);
  const hueColor = hsvToRgb(hsv.h / 360, 1, 1);
  const hueHex = rgbaToHex(hueColor.r, hueColor.g, hueColor.b, 1);
  const currentHex = rgbaToHex(rgb.r, rgb.g, rgb.b, 1);

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center" onMouseDown={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" onClick={onClose} />
      <div 
        className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-72 p-4 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-700">Pick Color</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        <div 
          ref={areaRef}
          className="w-full h-48 rounded-lg relative cursor-crosshair overflow-hidden shadow-inner border border-gray-100"
          style={{ backgroundColor: hueHex }}
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
          <div 
            className="absolute w-4 h-4 border-2 border-white rounded-full shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ 
              left: `${hsv.s}%`, 
              top: `${100 - hsv.v}%`,
              backgroundColor: currentHex
            }} 
          />
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full border border-gray-200 shadow-sm flex-shrink-0 relative overflow-hidden">
             <div className="absolute inset-0" style={{
                backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                backgroundSize: '6px 6px',
                backgroundColor: '#fff'
             }} />
             <div className="absolute inset-0" style={{ backgroundColor: color }} />
          </div>

          <div className="flex-1 flex flex-col gap-3 pt-1">
            <div className="h-3 rounded-full relative overflow-hidden shadow-inner">
              <input 
                type="range" min="0" max="360" value={hsv.h} onChange={handleHueChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-full h-full" style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }} />
              <div className="absolute top-0 bottom-0 w-1.5 bg-white border border-gray-300 shadow-sm pointer-events-none rounded-full" style={{ left: `${(hsv.h / 360) * 100}%`, transform: 'translateX(-50%)' }} />
            </div>

            <div className="flex items-center gap-2">
               <span className="text-[10px] font-bold text-gray-400 w-8">OPACITY</span>
               <input 
                type="range" min="0" max="1" step="0.01" value={alpha} onChange={handleAlphaChange}
                className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-[10px] font-mono text-gray-500 w-8 text-right">{Math.round(alpha * 100)}%</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 flex flex-col items-center">
            <input className="w-full border border-gray-200 rounded px-1 py-1.5 text-center text-xs font-mono bg-gray-50" value={rgb.r} readOnly />
            <span className="text-[10px] text-gray-400 mt-1 font-medium">R</span>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <input className="w-full border border-gray-200 rounded px-1 py-1.5 text-center text-xs font-mono bg-gray-50" value={rgb.g} readOnly />
            <span className="text-[10px] text-gray-400 mt-1 font-medium">G</span>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <input className="w-full border border-gray-200 rounded px-1 py-1.5 text-center text-xs font-mono bg-gray-50" value={rgb.b} readOnly />
            <span className="text-[10px] text-gray-400 mt-1 font-medium">B</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const CustomColorPicker = ({ 
  currentColor, 
  onChange, 
  presetColors 
}: { 
  currentColor: string; 
  onChange: (color: string) => void; 
  presetColors: string[];
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const isCustom = !presetColors.includes(currentColor) && currentColor !== 'transparent';

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <button 
        className={`
          w-full group relative flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all duration-200 text-left
          ${isCustom ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
        `}
        onClick={() => setShowPicker(true)}
      >
        <div className="w-8 h-8 rounded-md border border-gray-200 shadow-sm flex-shrink-0 relative overflow-hidden">
           <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
              backgroundSize: '6px 6px',
              backgroundColor: '#fff'
           }} />
           <div className="absolute inset-0" style={{ background: isCustom ? currentColor : 'conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #00FF00 120deg, #0000FF 240deg, #FF0000 360deg)' }} />
           {!isCustom && <div className="absolute inset-0 bg-white/20" />}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <span className="text-xs font-semibold text-gray-700 truncate">{isCustom ? 'Selected Color' : 'Custom Color'}</span>
          <span className="text-[10px] text-gray-500 font-mono truncate uppercase">{isCustom ? currentColor : 'Pick a color'}</span>
        </div>
        <div className={`w-6 h-6 flex items-center justify-center rounded-full ${isCustom ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600'} transition-colors`}>
          <Pipette size={12} />
        </div>
      </button>
      {showPicker && <AdvancedColorPicker color={currentColor} onChange={onChange} onClose={() => setShowPicker(false)} />}
    </div>
  );
};

const CanvasSettingsToolbar = ({ background, grid, onUpdate }: { background: string; grid: GridType; onUpdate: (updates: { background?: string; grid?: GridType }) => void; }) => {
  return (
    <div className="flex flex-col gap-4 p-4 bg-white rounded-xl shadow-2xl border border-gray-200 w-64 animate-in fade-in slide-in-from-right-4 duration-200" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
        <Maximize size={14} className="text-blue-600" />
        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Canvas Settings</span>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2 block">Canvas Background</label>
        <div className="grid grid-cols-5 gap-2 mb-1">
          {BG_COLORS.map(c => (
            <button key={c} onClick={() => onUpdate({ background: c })} className={`w-full aspect-square rounded-md border transition-all hover:scale-105 flex items-center justify-center ${background === c ? 'ring-2 ring-offset-1 ring-blue-500 border-transparent' : 'border-gray-200'}`} style={{ backgroundColor: c === 'transparent' ? 'transparent' : c, backgroundImage: c === 'transparent' ? 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)' : 'none', backgroundSize: '6px 6px' }} title={c === 'transparent' ? 'Transparent' : c}>
              {c === 'transparent' && <Ban size={12} className="text-red-400" />}
            </button>
          ))}
        </div>
        <CustomColorPicker currentColor={background} onChange={(c) => onUpdate({ background: c })} presetColors={BG_COLORS} />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-2 block">Grid Style</label>
        <div className="flex bg-gray-50 rounded-lg p-1 gap-1 border border-gray-100">
          <button onClick={() => onUpdate({ grid: 'none' })} className={`flex-1 h-8 flex items-center justify-center rounded-md transition-all gap-2 text-xs font-medium ${grid === 'none' ? 'bg-white shadow-sm ring-1 ring-gray-200 text-gray-900' : 'hover:bg-gray-200 text-gray-500'}`} title="No Grid"><Ban size={14} /> None</button>
          <button onClick={() => onUpdate({ grid: 'dots' })} className={`flex-1 h-8 flex items-center justify-center rounded-md transition-all gap-2 text-xs font-medium ${grid === 'dots' ? 'bg-white shadow-sm ring-1 ring-gray-200 text-gray-900' : 'hover:bg-gray-200 text-gray-500'}`} title="Dots"><Grid3x3 size={14} /> Dots</button>
          <button onClick={() => onUpdate({ grid: 'lines' })} className={`flex-1 h-8 flex items-center justify-center rounded-md transition-all gap-2 text-xs font-medium ${grid === 'lines' ? 'bg-white shadow-sm ring-1 ring-gray-200 text-gray-900' : 'hover:bg-gray-200 text-gray-500'}`} title="Lines"><LayoutGrid size={14} /> Lines</button>
        </div>
      </div>
    </div>
  );
};

const ExcalidrawToolbar = ({ selectedShapes, onUpdate, onDelete, onCopy, onPaste, canPaste, onLayerChange }: { selectedShapes: Shape[]; onUpdate: (updates: Partial<Shape>) => void; onDelete: () => void; onCopy: () => void; onPaste: () => void; canPaste: boolean; onLayerChange: (direction: 'back' | 'front') => void; }) => {
  const shape = selectedShapes[0];
  if (!shape) return null;
  const isLineType = ['line', 'arrow', 'draw'].includes(shape.type);
  const isImage = shape.type === 'image';

  return (
    <div className="flex flex-col gap-3 p-3 bg-white rounded-xl shadow-2xl border border-gray-200 w-64 animate-in fade-in slide-in-from-right-4 duration-200" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      {!isImage && (
        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5 block">Stroke</label>
          <div className="grid grid-cols-5 gap-1.5">
            {STROKE_COLORS.map(c => (
              <button key={c} onClick={() => onUpdate({ stroke: c })} className={`w-full aspect-square rounded-md border transition-all hover:scale-105 flex items-center justify-center ${shape.stroke === c ? 'ring-2 ring-offset-1 ring-blue-500 border-transparent' : 'border-gray-200'}`} style={{ backgroundColor: c === 'transparent' ? 'transparent' : c, backgroundImage: c === 'transparent' ? 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)' : 'none', backgroundSize: '6px 6px' }} title={c}>
                {c === 'transparent' && <Ban size={12} className="text-red-400" />}
              </button>
            ))}
          </div>
          <CustomColorPicker currentColor={shape.stroke} onChange={(c) => onUpdate({ stroke: c })} presetColors={STROKE_COLORS} />
        </div>
      )}
      {!isLineType && !isImage && (
        <div>
          <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5 block">Background</label>
          <div className="grid grid-cols-5 gap-1.5">
            {BG_COLORS.map(c => (
              <button key={c} onClick={() => onUpdate({ fill: c })} className={`w-full aspect-square rounded-md border transition-all hover:scale-105 flex items-center justify-center ${shape.fill === c ? 'ring-2 ring-offset-1 ring-blue-500 border-transparent' : 'border-gray-200'}`} style={{ backgroundColor: c === 'transparent' ? 'transparent' : c, backgroundImage: c === 'transparent' ? 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)' : 'none', backgroundSize: '6px 6px' }} title={c === 'transparent' ? 'Transparent' : c}>
                {c === 'transparent' && <Ban size={12} className="text-red-400" />}
              </button>
            ))}
          </div>
          <CustomColorPicker currentColor={shape.fill} onChange={(c) => onUpdate({ fill: c })} presetColors={BG_COLORS} />
        </div>
      )}
      {!isImage && <div className="h-px bg-gray-100" />}
      {!isImage && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5 block">Width</label>
            <div className="flex bg-gray-50 rounded-lg p-0.5 gap-0.5 border border-gray-100">
              {[2, 4, 6].map((w, i) => (
                <button key={w} onClick={() => onUpdate({ strokeWidth: w })} className={`flex-1 h-7 flex items-center justify-center rounded-md transition-all ${shape.strokeWidth === w ? 'bg-white shadow-sm ring-1 ring-gray-200' : 'hover:bg-gray-200 text-gray-400'}`}>
                  <div style={{ width: '40%', height: i * 1.5 + 2, backgroundColor: 'currentColor', borderRadius: 2 }} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5 block">Style</label>
            <div className="flex bg-gray-50 rounded-lg p-0.5 gap-0.5 border border-gray-100">
              <button onClick={() => onUpdate({ strokeStyle: 'solid' })} className={`flex-1 h-7 flex items-center justify-center rounded-md transition-all ${shape.strokeStyle === 'solid' ? 'bg-white shadow-sm ring-1 ring-gray-200 text-gray-800' : 'hover:bg-gray-200 text-gray-400'}`}><Minus size={14} /></button>
              <button onClick={() => onUpdate({ strokeStyle: 'dashed' })} className={`flex-1 h-7 flex items-center justify-center rounded-md transition-all ${shape.strokeStyle === 'dashed' ? 'bg-white shadow-sm ring-1 ring-gray-200 text-gray-800' : 'hover:bg-gray-200 text-gray-400'}`}><MoreHorizontal size={14} /></button>
              <button onClick={() => onUpdate({ strokeStyle: 'dotted' })} className={`flex-1 h-7 flex items-center justify-center rounded-md transition-all ${shape.strokeStyle === 'dotted' ? 'bg-white shadow-sm ring-1 ring-gray-200 text-gray-800' : 'hover:bg-gray-200 text-gray-400'}`}><div className="flex gap-0.5"><div className="w-0.5 h-0.5 rounded-full bg-current"/><div className="w-0.5 h-0.5 rounded-full bg-current"/><div className="w-0.5 h-0.5 rounded-full bg-current"/></div></button>
            </div>
          </div>
        </div>
      )}
      {!isLineType && !isImage && (
        <>
          <div className="h-px bg-gray-100" />
          <div className="grid grid-cols-2 gap-3">
             <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5 block">Edges</label>
                <div className="flex bg-gray-50 rounded-lg p-0.5 gap-0.5 border border-gray-100">
                  <button onClick={() => onUpdate({ roughness: 'sharp' })} className={`flex-1 h-7 flex items-center justify-center rounded-md transition-all ${shape.roughness === 'sharp' ? 'bg-white shadow-sm ring-1 ring-gray-200 text-gray-800' : 'hover:bg-gray-200 text-gray-400'}`}><Square size={12} /></button>
                  <button onClick={() => onUpdate({ roughness: 'round' })} className={`flex-1 h-7 flex items-center justify-center rounded-md transition-all ${shape.roughness === 'round' ? 'bg-white shadow-sm ring-1 ring-gray-200 text-gray-800' : 'hover:bg-gray-200 text-gray-400'}`}><Circle size={12} /></button>
                </div>
             </div>
             <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5 flex justify-between">Opacity <span className="text-gray-600">{Math.round(shape.opacity * 100)}%</span></label>
                <input type="range" min="0" max="1" step="0.1" value={shape.opacity} onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer mt-2 accent-blue-600" />
             </div>
          </div>
        </>
      )}
      <div className="h-px bg-gray-100" />
      <div className="flex justify-between items-center gap-2">
        <div className="flex gap-1 bg-gray-50 p-0.5 rounded-lg border border-gray-100">
          <button onClick={() => onLayerChange('back')} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 hover:text-gray-800 transition-all" title="Send Backward"><ArrowDown size={14} /></button>
          <button onClick={() => onLayerChange('front')} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-500 hover:text-gray-800 transition-all" title="Bring Forward"><ArrowUp size={14} /></button>
        </div>
        <div className="flex gap-1">
          <button onClick={onCopy} className="p-1.5 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-md transition-colors" title="Copy"><Copy size={14} /></button>
          {canPaste && <button onClick={onPaste} className="p-1.5 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-md transition-colors" title="Paste"><Clipboard size={14} /></button>}
          <button onClick={onDelete} className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-md transition-colors" title="Delete"><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
};

const ShapeComponent = ({ shape, onTextChange, isEditingText }: { shape: Shape, onTextChange: (text: string) => void, isEditingText: boolean }) => {
  const baseStyle: React.CSSProperties = {
    transform: `translate(${shape.x}px, ${shape.y}px) rotate(${shape.rotation}deg)`,
    position: 'absolute', width: shape.width, height: shape.height, overflow: 'visible',
    transformOrigin: 'center center', opacity: shape.opacity,
  };
  const strokeDasharray = shape.strokeStyle === 'dashed' ? '8,6' : shape.strokeStyle === 'dotted' ? '2,4' : 'none';
  const borderRadius = shape.roughness === 'round' ? (Math.min(shape.width, shape.height) * 0.15) : 0;

  const renderTextOverlay = () => {
    if (isEditingText) {
      return (
        <textarea
          value={shape.text || ''}
          onChange={(e) => onTextChange(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()} 
          onInput={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          autoFocus
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', backgroundColor: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'Inter, sans-serif', fontSize: 20, color: shape.stroke, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10, overflow: 'hidden' }}
        />
      );
    }
    if (shape.text) {
      return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: 'Inter, sans-serif', fontSize: 20, color: shape.stroke, pointerEvents: 'none', padding: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {shape.text}
        </div>
      );
    }
    return null;
  };

  switch (shape.type) {
    case 'rect': 
      return <div style={{ ...baseStyle, backgroundColor: shape.fill, border: `${shape.strokeWidth}px ${shape.strokeStyle} ${shape.stroke}`, borderRadius: borderRadius }}>{renderTextOverlay()}</div>;
    case 'circle': 
      return <div style={{ ...baseStyle, backgroundColor: shape.fill, border: `${shape.strokeWidth}px ${shape.strokeStyle} ${shape.stroke}`, borderRadius: '50%' }}>{renderTextOverlay()}</div>;
    case 'triangle': 
      const pathData = shape.roughness === 'round' ? "M 45 10 Q 50 0 55 10 L 95 90 Q 100 100 90 100 L 10 100 Q 0 100 5 90 Z" : "M 50 0 L 100 100 L 0 100 Z";
      return <div style={baseStyle}><svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, overflow: 'visible' }}><path d={pathData} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} strokeDasharray={strokeDasharray} strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>{renderTextOverlay()}</div>;
    case 'arrow':
      return <div style={baseStyle}><svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, overflow: 'visible' }}><path d="M 0 50 L 100 50 M 85 35 L 100 50 L 85 65" fill="none" stroke={shape.stroke} strokeWidth={Math.max(2, shape.strokeWidth)} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={strokeDasharray} vectorEffect="non-scaling-stroke" /></svg>{renderTextOverlay()}</div>;
    case 'draw':
      if (!shape.points || shape.points.length < 2) return null;
      const pathDataDraw = `M ${shape.points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
      return <div style={baseStyle}><svg viewBox={`0 0 ${shape.width} ${shape.height}`} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, overflow: 'visible' }}><path d={pathDataDraw} fill="none" stroke={shape.stroke} strokeWidth={shape.strokeWidth} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={strokeDasharray} /></svg></div>;
    case 'image':
      return <div style={baseStyle}><img src={shape.imageUrl} alt="Canvas Element" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', borderRadius: borderRadius }} draggable={false} /></div>;
    case 'line': 
      return <div style={baseStyle}><div style={{ width: '100%', height: Math.max(2, shape.strokeWidth), backgroundColor: shape.stroke, position: 'absolute', top: '50%', transform: 'translateY(-50%)', borderTop: shape.strokeStyle !== 'solid' ? `${shape.strokeWidth}px ${shape.strokeStyle} ${shape.stroke}` : 'none', background: shape.strokeStyle !== 'solid' ? 'transparent' : shape.stroke }} /></div>;
    case 'text': 
      return <div style={baseStyle}>{isEditingText ? <textarea value={shape.text ?? ''} onChange={(e) => onTextChange(e.target.value)} onPointerDown={(e) => e.stopPropagation()} onInput={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} onKeyUp={(e) => e.stopPropagation()} autoFocus placeholder="Type text..." style={{ width: '100%', height: '100%', backgroundColor: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'Inter, sans-serif', fontSize: 20, color: shape.stroke, padding: 0, overflowWrap: 'break-word' }} /> : <div style={{ width: '100%', height: '100%', fontFamily: 'Inter, sans-serif', fontSize: 20, color: shape.stroke, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{shape.text || <span className="text-gray-400 italic">Type text...</span>}</div>}</div>;
    default: return null;
  }
};

const SelectionBox = ({ shape, onResize, onRotate }: { shape: Shape, onResize: (handle: ResizeHandle, e: React.PointerEvent) => void, onRotate: (e: React.PointerEvent) => void }) => {
  const PRIMARY_COLOR = '#0ea5e9'; 
  const boxStyle: React.CSSProperties = { position: 'absolute', left: shape.x, top: shape.y, width: shape.width, height: shape.height, transform: `rotate(${shape.rotation}deg)`, transformOrigin: 'center center', pointerEvents: 'none', zIndex: 50 };
  const handles: ResizeHandle[] = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];
  return (
    <div style={boxStyle}>
      <div style={{ position: 'absolute', inset: -2, border: `1.5px solid ${PRIMARY_COLOR}`, pointerEvents: 'none' }} />
      <div onPointerDown={onRotate} className="group" style={{ position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)', width: 24, height: 24, cursor: 'grab', pointerEvents: 'all', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', border: `1px solid #e2e8f0`, borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}><RotateCw size={14} className="text-gray-500 group-hover:text-sky-500 transition-colors" /></div>
      <div style={{ position: 'absolute', top: -18, left: '50%', width: 1, height: 16, backgroundColor: PRIMARY_COLOR, transform: 'translateX(-0.5px)' }} />
      {handles.map(handle => (
        <div key={handle} onPointerDown={(e) => onResize(handle, e)} className="transition-transform hover:scale-125" style={{ position: 'absolute', width: 10, height: 10, border: `1.5px solid ${PRIMARY_COLOR}`, backgroundColor: 'white', borderRadius: '50%', pointerEvents: 'all', top: handle.includes('n') ? -6 : handle.includes('s') ? 'auto' : '50%', bottom: handle.includes('s') ? -6 : 'auto', left: handle.includes('w') ? -6 : handle.includes('e') ? 'auto' : '50%', right: handle.includes('e') ? -6 : 'auto', transform: `translate(${handle.includes('w') || handle.includes('e') ? '0' : '-50%'}, ${handle.includes('n') || handle.includes('s') ? '0' : '-50%'})`, cursor: `${handle}-resize`, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }} />
      ))}
    </div>
  );
};

const GroupSelectionBox = ({ boundingBox }: { boundingBox: { x: number, y: number, width: number, height: number } }) => {
  const PRIMARY_COLOR = '#0ea5e9';
  return <div style={{ position: 'absolute', left: boundingBox.x, top: boundingBox.y, width: boundingBox.width, height: boundingBox.height, pointerEvents: 'none', zIndex: 50 }}><div style={{ position: 'absolute', inset: -4, border: `1.5px dashed ${PRIMARY_COLOR}`, borderRadius: 4, backgroundColor: 'rgba(14, 165, 233, 0.05)' }} /></div>;
};

// --- MAIN COMPONENT ---
export const CanvasBlock: React.FC<CanvasBlockProps> = ({ initialData, width, height, onUpdate, isEditing }) => {
  const [shapes, setShapes] = useState<Shape[]>(initialData.shapes || []);
  const [canvasBackground, setCanvasBackground] = useState<string>(initialData.background || 'transparent');
  const [gridType, setGridType] = useState<GridType>(initialData.grid || 'dots');
  const [isCanvasSelected, setIsCanvasSelected] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null); 
  
  // --- STATE ---
  const [action, setAction] = useState<Action>('idle');
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]); 
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [clipboard, setClipboard] = useState<Shape[]>([]);
  const [dragSelection, setDragSelection] = useState<{ startX: number, startY: number, currentX: number, currentY: number, initialSelectedIds: string[] } | null>(null);
  const [editingShapeId, setEditingShapeId] = useState<string | null>(null);
  
  // NEW: Active Tool State for "Click to Draw"
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [creationStart, setCreationStart] = useState<{ x: number, y: number } | null>(null);
  
  const [currentDrawPoints, setCurrentDrawPoints] = useState<{x: number, y: number}[]>([]);

  const actionStateRef = useRef({ action, selectedShapeIds, resizeHandle, shapes, clipboard, dragSelection, currentDrawPoints, activeTool, creationStart });

  useEffect(() => { 
    actionStateRef.current = { action, selectedShapeIds, resizeHandle, shapes, clipboard, dragSelection, currentDrawPoints, activeTool, creationStart }; 
  }, [action, selectedShapeIds, resizeHandle, shapes, clipboard, dragSelection, currentDrawPoints, activeTool, creationStart]);

  // --- OBSERVE SELECTION STATE ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // The wrapper is the parent of the canvas block
    const wrapper = canvas.parentElement;
    if (!wrapper) return;

    const checkSelection = () => {
      const isSelected = wrapper.classList.contains('canvas-selected');
      setIsCanvasSelected(isSelected);
    };

    // Initial check
    checkSelection();

    const observer = new MutationObserver(checkSelection);
    observer.observe(wrapper, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  // --- HELPERS ---
  const getBoundingBox = (ids: string[]) => {
    if (ids.length === 0) return null;
    const selected = shapes.filter(s => ids.includes(s.id));
    if (selected.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selected.forEach(s => {
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x + s.width);
      maxY = Math.max(maxY, s.y + s.height);
    });

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  };

  const addShape = useCallback((shapeType: string, clientX?: number, clientY?: number, imageUrl?: string) => {
    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    if (!canvasBounds) return;
    
    let x = (clientX ?? canvasBounds.left) - canvasBounds.left;
    let y = (clientY ?? canvasBounds.top) - canvasBounds.top;
    const defaultSize = 100;

    const canvasWidth = canvasRef.current?.clientWidth || 0;
    const canvasHeight = canvasRef.current?.clientHeight || 0;
    
    x = Math.max(0, Math.min(x, canvasWidth - defaultSize));
    y = Math.max(0, Math.min(y, canvasHeight - defaultSize));

    if (shapeType === 'draw') {
        setActiveTool('draw');
        setSelectedShapeIds([]);
        return; 
    }

    const newShape: Shape = {
      id: `shape_${Date.now()}`, 
      type: shapeType as Shape['type'],
      x, y,
      width: defaultSize, 
      height: shapeType === 'line' ? 20 : defaultSize, 
      rotation: 0, 
      text: shapeType === 'text' ? '' : undefined,
      fill: shapeType === 'text' || shapeType === 'line' || shapeType === 'image' || shapeType === 'arrow' ? 'transparent' : '#e0e7ff',
      stroke: '#4f46e5', 
      strokeWidth: (shapeType === 'text' || shapeType === 'image') ? 0 : 2,
      strokeStyle: 'solid',
      opacity: 1,
      roughness: 'sharp',
      imageUrl 
    };
    setShapes(prev => [...prev, newShape]);
    setSelectedShapeIds([newShape.id]);
  }, []);

  const updateShape = (id: string, updates: Partial<Shape>) => {
    setShapes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const updateSelectedShapes = (updates: Partial<Shape>) => {
    setShapes(prev => prev.map(s => selectedShapeIds.includes(s.id) ? { ...s, ...updates } : s));
  };

  const handleLayerChange = (direction: 'back' | 'front') => {
    if (selectedShapeIds.length === 0) return;
    
    setShapes(prev => {
        const selected = prev.filter(s => selectedShapeIds.includes(s.id));
        const unselected = prev.filter(s => !selectedShapeIds.includes(s.id));
        
        if (direction === 'back') {
            return [...selected, ...unselected]; 
        } else {
            return [...unselected, ...selected]; 
        }
    });
  };

  const handleCopy = useCallback(() => {
    const { selectedShapeIds, shapes } = actionStateRef.current;
    if (selectedShapeIds.length === 0) return;
    const toCopy = shapes.filter(s => selectedShapeIds.includes(s.id));
    setClipboard(toCopy);
  }, []);

  const handlePaste = useCallback(() => {
    const { clipboard, shapes } = actionStateRef.current;
    if (clipboard.length === 0) return;

    const newShapes = clipboard.map((s, index) => ({
      ...s,
      id: `shape_${Date.now()}_${index}`, 
      x: s.x + 20, 
      y: s.y + 20
    }));

    setShapes([...shapes, ...newShapes]);
    setSelectedShapeIds(newShapes.map(s => s.id)); 
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = canvas?.parentElement;
    if (!wrapper) return;
    const handleAddShapeEvent = (e: Event) => {
      const { detail } = e as CustomEvent;
      addShape(detail.shapeType, detail.clientX, detail.clientY, detail.imageUrl);
    };
    wrapper.addEventListener('canvas-add-shape', handleAddShapeEvent);
    return () => wrapper.removeEventListener('canvas-add-shape', handleAddShapeEvent);
  }, [addShape]);

  // --- LISTEN FOR TOOL SELECT ---
  useEffect(() => {
    const handleToolSelect = (e: Event) => {
      const { detail: toolId } = e as CustomEvent;
      if (toolId === 'draw') {
        setActiveTool('draw');
        setSelectedShapeIds([]);
      } else {
        setActiveTool(toolId);
        setSelectedShapeIds([]);
      }
    };
    window.addEventListener('canvas-tool-select', handleToolSelect);
    return () => window.removeEventListener('canvas-tool-select', handleToolSelect);
  }, []);

  useEffect(() => { 
    onUpdate({ 
      shapes,
      background: canvasBackground,
      grid: gridType
    }); 
  }, [shapes, canvasBackground, gridType, onUpdate]);

  const cleanupEmptyText = (shapesList: Shape[], idsToCheck: string[]) => {
    if (idsToCheck.length === 0) return shapesList;
    let newShapes = [...shapesList];
    let changed = false;
    
    idsToCheck.forEach(id => {
      const shape = newShapes.find(s => s.id === id);
      if (shape && shape.type === 'text' && (!shape.text || shape.text.trim() === '')) {
        newShapes = newShapes.filter(s => s.id !== id);
        changed = true;
      }
    });
    return changed ? newShapes : shapesList;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        canvasRef.current && 
        !canvasRef.current.parentElement?.contains(event.target as Node) &&
        !toolbarRef.current?.contains(event.target as Node)
      ) {
        const { shapes: currentShapes, selectedShapeIds: currentIds } = actionStateRef.current;
        if (currentIds.length > 0) {
          const cleanedShapes = cleanupEmptyText(currentShapes, currentIds);
          if (cleanedShapes.length !== currentShapes.length) {
            setShapes(cleanedShapes);
          }
        }
        setSelectedShapeIds([]);
        setEditingShapeId(null); 
        setActiveTool(null); // Clear active tool on outside click
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const { selectedShapeIds } = actionStateRef.current;
    
    if (e.key === 'Escape') {
      if (activeTool) {
        setActiveTool(null);
        return;
      }
    }

    if (editingShapeId) return;

    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      e.preventDefault();
      handleCopy();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
      e.preventDefault();
      handlePaste();
      return;
    }

    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (selectedShapeIds.length > 0) {
        e.preventDefault(); e.stopPropagation();
        setShapes(prev => prev.filter(shape => !selectedShapeIds.includes(shape.id)));
        setSelectedShapeIds([]);
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const shapeElement = target.closest('[data-shape-id]');
    
    const { shapes: currentShapes, selectedShapeIds: currentIds, action: currentAction, activeTool: currentTool } = actionStateRef.current;
    
    // --- HANDLE TOOL CREATION START ---
    if (currentTool) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;
      const x = e.clientX - canvasRect.left;
      const y = e.clientY - canvasRect.top;

      if (currentTool === 'draw') {
        setCurrentDrawPoints([{ x, y }]);
        setAction('drawing');
      } else {
        setCreationStart({ x, y });
        setAction('creating');
        
        const isLineOrArrow = currentTool === 'line' || currentTool === 'arrow';
        
        const newShape: Shape = {
          id: `shape_${Date.now()}`,
          type: currentTool as Shape['type'],
          x, y, width: 0, 
          height: isLineOrArrow ? 20 : 0, // Give lines/arrows a hit area height immediately
          rotation: 0,
          text: currentTool === 'text' ? '' : undefined,
          fill: currentTool === 'text' || currentTool === 'line' || currentTool === 'arrow' ? 'transparent' : '#e0e7ff',
          stroke: '#4f46e5', 
          strokeWidth: (currentTool === 'text') ? 0 : 2,
          strokeStyle: 'solid',
          opacity: 1,
          roughness: 'sharp'
        };
        setShapes(prev => [...prev, newShape]);
        setSelectedShapeIds([newShape.id]);
        
        // If text, immediately enter edit mode
        if (currentTool === 'text') {
            setEditingShapeId(newShape.id);
            setActiveTool(null); // Text is one-off usually
            setAction('idle'); // Don't drag-create text
        }
      }
      canvasRef.current?.setPointerCapture(e.pointerId);
      return;
    }

    if (currentIds.length > 0) {
       const clickedId = shapeElement?.getAttribute('data-shape-id');
       if (!clickedId || (!currentIds.includes(clickedId) && !e.shiftKey)) {
         const cleanedShapes = cleanupEmptyText(currentShapes, currentIds);
         if (cleanedShapes.length !== currentShapes.length) {
           setShapes(cleanedShapes);
         }
       }
    }

    if (editingShapeId) {
        const clickedId = shapeElement?.getAttribute('data-shape-id');
        if (clickedId !== editingShapeId) {
            setEditingShapeId(null);
        }
    }

    if (currentAction === 'freehand') {
        // Legacy fallback, though activeTool='draw' should handle this now
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;
        const x = e.clientX - canvasRect.left;
        const y = e.clientY - canvasRect.top;
        
        setCurrentDrawPoints([{ x, y }]);
        setAction('drawing');
        canvasRef.current?.setPointerCapture(e.pointerId);
        return;
    }

    if (shapeElement) {
      e.stopPropagation(); 
      const shapeId = shapeElement.getAttribute('data-shape-id');
      if (shapeId) {
        if (e.shiftKey) {
          if (currentIds.includes(shapeId)) {
            setSelectedShapeIds(prev => prev.filter(id => id !== shapeId));
          } else {
            setSelectedShapeIds(prev => [...prev, shapeId]);
          }
        } else {
          if (!currentIds.includes(shapeId)) {
            setSelectedShapeIds([shapeId]);
          }
        }
        setAction('moving');
        canvasRef.current?.focus();
      }
    } else {
      if (!e.shiftKey) setSelectedShapeIds([]);
      setEditingShapeId(null); 
      
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        const x = e.clientX - canvasRect.left;
        const y = e.clientY - canvasRect.top;
        setDragSelection({ 
          startX: x, 
          startY: y, 
          currentX: x, 
          currentY: y, 
          initialSelectedIds: e.shiftKey ? currentIds : [] 
        });
        setAction('selecting');
        canvasRef.current?.setPointerCapture(e.pointerId);
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const shapeElement = target.closest('[data-shape-id]');
    if (shapeElement) {
        const shapeId = shapeElement.getAttribute('data-shape-id');
        if (shapeId) {
            const shape = shapes.find(s => s.id === shapeId);
            if (shape && ['text', 'rect', 'circle', 'triangle', 'arrow'].includes(shape.type)) {
                setEditingShapeId(shapeId);
            }
        }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const { action, selectedShapeIds, resizeHandle, shapes, dragSelection, creationStart } = actionStateRef.current;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;

    if (action === 'drawing') {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCurrentDrawPoints(prev => [...prev, { x, y }]);
        return;
    }

    // Handle Shape Creation Drag
    if (action === 'creating' && creationStart && selectedShapeIds.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        const startX = creationStart.x;
        const startY = creationStart.y;
        
        const shapeId = selectedShapeIds[0];
        const shape = shapes.find(s => s.id === shapeId);
        
        if (shape && (shape.type === 'line' || shape.type === 'arrow')) {
            const dx = currentX - startX;
            const dy = currentY - startY;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angleRad = Math.atan2(dy, dx);
            const angleDeg = angleRad * (180 / Math.PI);
            
            const h = shape.height;
            // Calculate top-left position so that the left-center (visual start) aligns with startX, startY
            const newX = startX + (h / 2) * Math.sin(angleRad);
            const newY = startY - (h / 2) * Math.cos(angleRad);
            
            setShapes(prev => prev.map(s => s.id === shapeId ? { 
                ...s, 
                x: newX, 
                y: newY, 
                width: Math.max(1, length), // Prevent 0 width
                rotation: angleDeg 
            } : s));
        } else {
            // Standard Box Logic for Rect, Circle, etc.
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);
            const x = Math.min(startX, currentX);
            const y = Math.min(startY, currentY);
            
            setShapes(prev => prev.map(s => s.id === selectedShapeIds[0] ? { ...s, x, y, width, height } : s));
        }
        return;
    }

    if (action === 'selecting' && dragSelection) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setDragSelection(prev => prev ? { ...prev, currentX: x, currentY: y } : null);

      const minX = Math.min(dragSelection.startX, x);
      const minY = Math.min(dragSelection.startY, y);
      const width = Math.abs(x - dragSelection.startX);
      const height = Math.abs(y - dragSelection.startY);

      const newSelectedIds = shapes.filter(shape => {
        return (
          shape.x < minX + width &&
          shape.x + shape.width > minX &&
          shape.y < minY + height &&
          shape.y + shape.height > minY
        );
      }).map(s => s.id);

      const finalIds = Array.from(new Set([...dragSelection.initialSelectedIds, ...newSelectedIds]));
      setSelectedShapeIds(finalIds);
      return;
    }

    if (action === 'idle') return;
    if (selectedShapeIds.length === 0) return;

    switch (action) {
      case 'moving': {
        setShapes(prev => prev.map(s => {
          if (!selectedShapeIds.includes(s.id)) return s;
          
          let newX = s.x + e.movementX;
          let newY = s.y + e.movementY;

          newX = Math.max(0, Math.min(newX, canvasWidth - s.width));
          newY = Math.max(0, Math.min(newY, canvasHeight - s.height));

          return { ...s, x: newX, y: newY };
        }));
        break;
      }
      case 'rotating': {
        if (selectedShapeIds.length !== 1) return;
        const selectedShape = shapes.find(s => s.id === selectedShapeIds[0]);
        if (!selectedShape) return;
        
        const centerX = selectedShape.x + selectedShape.width / 2;
        const centerY = selectedShape.y + selectedShape.height / 2;
        const canvasBounds = canvasRef.current!.getBoundingClientRect();
        
        const mouseX = e.clientX - canvasBounds.left;
        const mouseY = e.clientY - canvasBounds.top;
        
        const radians = Math.atan2(mouseY - centerY, mouseX - centerX);
        let degrees = (radians * 180) / Math.PI + 90;
        
        // Normalize to 0-360 range for cleaner values
        degrees = (degrees + 360) % 360;

        if (e.shiftKey) {
          // Snap to 15 degree increments if Shift is held
          degrees = Math.round(degrees / 15) * 15;
        }
        
        setShapes(prev => prev.map(s => s.id === selectedShapeIds[0] ? { ...s, rotation: degrees } : s));
        break;
      }
      case 'resizing': {
        if (selectedShapeIds.length !== 1 || !resizeHandle) return;
        const selectedShape = shapes.find(s => s.id === selectedShapeIds[0]);
        if (!selectedShape) return;
        let { x, y, width, height, rotation } = selectedShape;
        const angleRad = rotation * (Math.PI / 180);
        const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
        const dx = e.movementX * cos + e.movementY * sin;
        const dy = e.movementY * cos - e.movementX * sin;
        if (resizeHandle.includes('e')) width += dx;
        if (resizeHandle.includes('w')) { width -= dx; x += dx * cos; y += dx * sin; }
        if (resizeHandle.includes('s')) height += dy;
        if (resizeHandle.includes('n')) { height -= dy; x -= dy * -sin; y -= dy * cos; }
        width = Math.max(20, width);
        height = Math.max(20, height);
        if (x >= -1 && y >= -1 && (x + width) <= canvasWidth + 1 && (y + height) <= canvasHeight + 1) {
             setShapes(prev => prev.map(s => s.id === selectedShapeIds[0] ? { ...s, x, y, width, height } : s));
        }
        break;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => { 
    const { action, currentDrawPoints, activeTool, selectedShapeIds, shapes } = actionStateRef.current;

    if (action === 'drawing') {
        if (currentDrawPoints.length > 1) {
            const xs = currentDrawPoints.map(p => p.x);
            const ys = currentDrawPoints.map(p => p.y);
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);
            const width = Math.max(20, maxX - minX);
            const height = Math.max(20, maxY - minY);
            
            const normalizedPoints = currentDrawPoints.map(p => ({
                x: p.x - minX,
                y: p.y - minY
            }));
            
            const newShape: Shape = {
                id: `shape_${Date.now()}`,
                type: 'draw',
                x: minX, y: minY, width, height, rotation: 0,
                points: normalizedPoints,
                fill: 'transparent',
                stroke: '#4f46e5',
                strokeWidth: 2,
                strokeStyle: 'solid',
                opacity: 1,
                roughness: 'round'
            };
            setShapes(prev => [...prev, newShape]);
            setSelectedShapeIds([newShape.id]);
        }
        setCurrentDrawPoints([]);
        
        // IMPORTANT: If we are in 'draw' mode, do NOT clear activeTool.
        // This allows continuous drawing.
        if (activeTool !== 'draw') {
            setActiveTool(null); 
        }
    }

    if (action === 'creating') {
        const shape = shapes.find(s => s.id === selectedShapeIds[0]);
        if (shape) {
            // Check if essentially a click (very small dimensions)
            const isSmall = shape.width < 5 && (shape.height < 5 || ['line', 'arrow'].includes(shape.type));
            
            if (isSmall) {
                 setShapes(prev => prev.map(s => {
                     if (s.id !== shape.id) return s;
                     if (s.type === 'line' || s.type === 'arrow') {
                         return { ...s, width: 100, height: 20 };
                     }
                     return { ...s, width: 100, height: 100 };
                 }));
            }
        }
        setActiveTool(null);
        setCreationStart(null);
    }

    setAction('idle'); 
    setResizeHandle(null); 
    setDragSelection(null);
    if (canvasRef.current) canvasRef.current.releasePointerCapture(e.pointerId);
  };
  
  const handleResizePointerDown = (handle: ResizeHandle, e: React.PointerEvent) => { e.stopPropagation(); setAction('resizing'); setResizeHandle(handle); };
  const handleRotatePointerDown = (e: React.PointerEvent) => { e.stopPropagation(); setAction('rotating'); };
  
  const boundingBox = getBoundingBox(selectedShapeIds);
  const selectedShapesList = shapes.filter(s => selectedShapeIds.includes(s.id));

  // Determine grid background style
  const getGridStyle = () => {
    if (gridType === 'dots') {
      return 'radial-gradient(#cbd5e1 1px, transparent 1px)';
    }
    if (gridType === 'lines') {
      return 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)';
    }
    return 'none';
  };

  return (
    <div
      ref={canvasRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      style={{
        width: '100%', height: '100%', position: 'relative',
        backgroundColor: canvasBackground === 'transparent' ? 'white' : canvasBackground,
        backgroundImage: getGridStyle(),
        backgroundSize: '20px 20px',
        borderRadius: 8, overflow: 'visible', outline: 'none',
        cursor: activeTool ? 'crosshair' : 'default'
      }}
    >
      {shapes.map(shape => (
        <div key={shape.id} data-shape-id={shape.id} style={{ zIndex: shapes.indexOf(shape) }}>
          <ShapeComponent 
            shape={shape} 
            onTextChange={(newText) => updateShape(shape.id, { text: newText })} 
            isEditingText={editingShapeId === shape.id}
          />
        </div>
      ))}
      
      {currentDrawPoints.length > 1 && (
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
            <path
                d={`M ${currentDrawPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                fill="none"
                stroke="#4f46e5"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
      )}

      {dragSelection && (
        <div style={{
          position: 'absolute',
          left: Math.min(dragSelection.startX, dragSelection.currentX),
          top: Math.min(dragSelection.startY, dragSelection.currentY),
          width: Math.abs(dragSelection.currentX - dragSelection.startX),
          height: Math.abs(dragSelection.currentY - dragSelection.startY),
          backgroundColor: 'rgba(14, 165, 233, 0.1)',
          border: '1px solid #0ea5e9',
          pointerEvents: 'none',
          zIndex: 999
        }} />
      )}

      {/* Only show toolbars if the canvas wrapper is actually selected */}
      {isCanvasSelected && (
        <>
          {selectedShapeIds.length > 0 && boundingBox ? (
            <>
              {selectedShapeIds.length === 1 ? (
                 <SelectionBox 
                   shape={shapes.find(s => s.id === selectedShapeIds[0])!} 
                   onResize={handleResizePointerDown} 
                   onRotate={handleRotatePointerDown} 
                 />
              ) : (
                 <GroupSelectionBox boundingBox={boundingBox} />
              )}
              
              {!editingShapeId && (
                <ShapeToolbarPortal 
                    canvasRef={canvasRef} 
                    boundingBox={boundingBox}
                    toolbarRef={toolbarRef}
                >
                    <ExcalidrawToolbar 
                      selectedShapes={selectedShapesList}
                      onUpdate={updateSelectedShapes} 
                      onDelete={() => { 
                          setShapes(prev => prev.filter(s => !selectedShapeIds.includes(s.id))); 
                          setSelectedShapeIds([]); 
                      }}
                      onCopy={handleCopy}
                      onPaste={handlePaste}
                      canPaste={clipboard.length > 0}
                      onLayerChange={handleLayerChange}
                    />
                </ShapeToolbarPortal>
              )}
            </>
          ) : (
            /* Show Canvas Settings when editing but no shape selected */
            <ShapeToolbarPortal 
                canvasRef={canvasRef} 
                boundingBox={null}
                toolbarRef={toolbarRef}
                isCanvasSettings={true}
            >
                <CanvasSettingsToolbar 
                  background={canvasBackground}
                  grid={gridType}
                  onUpdate={(updates) => {
                    if (updates.background !== undefined) setCanvasBackground(updates.background);
                    if (updates.grid !== undefined) setGridType(updates.grid);
                  }}
                />
            </ShapeToolbarPortal>
          )}
        </>
      )}
    </div>
  );
};