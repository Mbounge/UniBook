// src/components/editor/TemplateGallery.tsx
'use client';

import React, { useRef } from 'react';
import { 
  X, Square, Circle, Triangle, Type, Minus, Shapes, 
  MoveRight, Pencil, Image as ImageIcon 
} from 'lucide-react';

const shapes = [
  { id: 'rect', name: 'Rectangle', icon: Square },
  { id: 'circle', name: 'Circle', icon: Circle },
  { id: 'triangle', name: 'Triangle', icon: Triangle },
  { id: 'arrow', name: 'Arrow', icon: MoveRight },
  { id: 'line', name: 'Line', icon: Minus },
  { id: 'draw', name: 'Draw', icon: Pencil },
  { id: 'text', name: 'Text', icon: Type },
  { id: 'image', name: 'Image', icon: ImageIcon },
];

interface TemplateGalleryProps {
  onClose: () => void;
  onInsert: (html: string) => void;
  onImageUpload: (imageUrl: string) => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ 
  onClose,
  onImageUpload 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (e: React.DragEvent, shapeId: string) => {
    if (shapeId === 'image') {
      e.preventDefault();
      return;
    }

    e.dataTransfer.setData('application/canvas-shape', shapeId);
    e.dataTransfer.effectAllowed = 'copy';
    
    const dragIcon = document.createElement('div');
    dragIcon.style.width = '40px';
    dragIcon.style.height = '40px';
    dragIcon.style.backgroundColor = '#e0e7ff';
    dragIcon.style.border = '2px solid #4338ca';
    dragIcon.style.borderRadius = '4px';
    dragIcon.style.position = 'absolute';
    dragIcon.style.top = '-1000px';
    document.body.appendChild(dragIcon);
    e.dataTransfer.setDragImage(dragIcon, 20, 20);
    setTimeout(() => document.body.removeChild(dragIcon), 0);
  };

  const handleShapeClick = (shapeId: string) => {
    if (shapeId === 'image') {
      fileInputRef.current?.click();
    } else {
      // Dispatch event for ALL other shapes (rect, circle, draw, etc.)
      window.dispatchEvent(new CustomEvent('canvas-tool-select', { detail: shapeId }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onImageUpload(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] w-72 z-20 relative">
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600 flex-shrink-0">
            <Shapes className="w-5 h-5" />
          </div>
          <span className="font-semibold text-gray-900">Elements</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Close gallery">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="mb-4 px-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Basic Shapes</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {shapes.map((shape) => (
            <div
              key={shape.id}
              draggable={shape.id !== 'image'}
              onDragStart={(e) => handleDragStart(e, shape.id)}
              onClick={() => handleShapeClick(shape.id)}
              className="group flex flex-col items-center justify-center bg-white border border-gray-200 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 aspect-[4/3] p-4"
              title={shape.id === 'image' ? "Click to upload image" : `Click to draw, or drag to add ${shape.name}`}
            >
              <div className="text-gray-500 group-hover:text-blue-600 transition-colors duration-200">
                <shape.icon className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <span className="text-xs font-medium text-gray-600 mt-3 group-hover:text-gray-900">
                {shape.name}
              </span>
            </div>
          ))}
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
      </div>
    </div>
  );
};