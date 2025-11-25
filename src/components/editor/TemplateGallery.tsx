'use client';

import React, { useState, useCallback } from 'react';
import { 
  X, Maximize, Minimize, Search, 
  Square, Circle, Triangle, 
  ArrowRight, Type, 
  LayoutGrid, Activity, GitCommit
} from 'lucide-react';

// --- EXCALIDRAW DATA GENERATORS ---
const generateBaseElement = (type: string, x: number, y: number, w: number, h: number) => ({
  type,
  version: 1,
  versionNonce: Math.floor(Math.random() * 1000000),
  isDeleted: false,
  id: Math.random().toString(36).substr(2, 9),
  fillStyle: "hachure",
  strokeWidth: 1,
  strokeStyle: "solid",
  roughness: 1,
  opacity: 100,
  angle: 0,
  x,
  y,
  width: w,
  height: h,
  strokeColor: "#000000",
  backgroundColor: "transparent",
  roundness: { type: 3 },
  seed: Math.floor(Math.random() * 1000000),
  groupIds: [],
  frameId: null,
  boundElements: null,
  updated: Date.now(),
  link: null,
  locked: false,
});

const shapes = {
  basic: [
    {
      id: 'rect',
      name: 'Rectangle',
      icon: <div className="w-8 h-6 border-2 border-gray-600 rounded-sm bg-white"></div>,
      create: () => generateBaseElement('rectangle', 0, 0, 100, 100)
    },
    {
      id: 'ellipse',
      name: 'Circle',
      icon: <div className="w-8 h-8 border-2 border-gray-600 rounded-full bg-white"></div>,
      create: () => generateBaseElement('ellipse', 0, 0, 100, 100)
    },
    {
      id: 'diamond',
      name: 'Diamond',
      icon: <div className="w-6 h-6 border-2 border-gray-600 bg-white transform rotate-45"></div>,
      create: () => generateBaseElement('diamond', 0, 0, 100, 100)
    },
    {
      id: 'round-rect',
      name: 'Rounded',
      icon: <div className="w-8 h-6 border-2 border-gray-600 rounded-lg bg-white"></div>,
      create: () => {
        const el = generateBaseElement('rectangle', 0, 0, 100, 100);
        // @ts-ignore
        el.roundness = { type: 3 }; 
        return el;
      }
    }
  ],
  flowchart: [
    {
      id: 'process',
      name: 'Process',
      icon: <div className="w-10 h-6 border-2 border-gray-600 bg-white flex items-center justify-center text-[8px] text-gray-400">PROC</div>,
      create: () => {
        const el = generateBaseElement('rectangle', 0, 0, 120, 60);
        el.backgroundColor = "#f0f9ff";
        el.strokeColor = "#0369a1";
        el.fillStyle = "solid";
        return el;
      }
    },
    {
      id: 'decision',
      name: 'Decision',
      icon: <div className="w-6 h-6 border-2 border-gray-600 bg-white transform rotate-45 flex items-center justify-center"><span className="transform -rotate-45 text-[8px] text-gray-400">?</span></div>,
      create: () => {
        const el = generateBaseElement('diamond', 0, 0, 100, 100);
        el.backgroundColor = "#fff7ed";
        el.strokeColor = "#c2410c";
        el.fillStyle = "solid";
        return el;
      }
    },
    {
      id: 'terminator',
      name: 'Start/End',
      icon: <div className="w-10 h-6 border-2 border-gray-600 rounded-full bg-white flex items-center justify-center text-[8px] text-gray-400">END</div>,
      create: () => {
        const el = generateBaseElement('ellipse', 0, 0, 100, 50);
        el.backgroundColor = "#f0fdf4";
        el.strokeColor = "#15803d";
        el.fillStyle = "solid";
        return el;
      }
    }
  ],
  connectors: [
    {
      id: 'arrow-right',
      name: 'Arrow',
      icon: <ArrowRight className="w-6 h-6 text-gray-600" />,
      create: () => ({
        ...generateBaseElement('arrow', 0, 0, 100, 100),
        points: [[0, 0], [100, 0]],
        endArrowhead: "arrow"
      })
    },
    {
      id: 'line',
      name: 'Line',
      icon: <div className="w-8 h-0.5 bg-gray-600 transform -rotate-45"></div>,
      create: () => ({
        ...generateBaseElement('line', 0, 0, 100, 100),
        points: [[0, 0], [100, 100]]
      })
    }
  ],
  text: [
    {
      id: 'text-label',
      name: 'Label',
      icon: <Type className="w-6 h-6 text-gray-600" />,
      create: () => ({
        ...generateBaseElement('text', 0, 0, 100, 20),
        text: "Text Label",
        fontSize: 20,
        fontFamily: 1,
        textAlign: "left",
        verticalAlign: "top"
      })
    },
    {
      id: 'text-block',
      name: 'Note',
      icon: <div className="w-8 h-8 border border-gray-300 bg-yellow-50 flex items-center justify-center text-gray-400 text-xs">Abc</div>,
      create: () => ({
        ...generateBaseElement('text', 0, 0, 200, 100),
        text: "Double-click to edit\nthis text block.",
        fontSize: 16,
        fontFamily: 1,
        textAlign: "left",
        verticalAlign: "top",
        containerId: null
      })
    }
  ]
};

const categories = [
  { id: 'basic', name: 'Shapes', icon: Square },
  { id: 'flowchart', name: 'Flowchart', icon: GitCommit },
  { id: 'connectors', name: 'Connectors', icon: Activity },
  { id: 'text', name: 'Text', icon: Type },
];

interface TemplateGalleryProps {
  onClose: () => void;
  onInsert: (html: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onClose, onInsert, isExpanded, onToggleExpand }) => {
  const [activeCategory, setActiveCategory] = useState('basic');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, shape: any) => {
    setDraggedItem(shape.id);
    
    const element = shape.create();
    const sceneData = {
      elements: [element],
      appState: { viewBackgroundColor: "#ffffff" }
    };

    e.dataTransfer.setData('application/gallery-template-item', 'true');
    // FIX: Use a specific MIME type for Excalidraw JSON to avoid it being treated as HTML text
    e.dataTransfer.setData('application/excalidraw-json', JSON.stringify(sceneData));
    e.dataTransfer.effectAllowed = 'copy';
    
    const dragImage = document.createElement('div');
    dragImage.className = 'bg-white p-2 rounded-lg shadow-xl border border-purple-200 flex items-center justify-center';
    dragImage.style.width = '60px';
    dragImage.style.height = '60px';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    
    const iconContainer = document.createElement('div');
    iconContainer.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
    dragImage.appendChild(iconContainer);
    
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 30, 30);
    
    setTimeout(() => document.body.removeChild(dragImage), 0);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
  }, []);

  // @ts-ignore
  const currentShapes = shapes[activeCategory] || [];

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0 shadow-lg animate-in slide-in-from-left duration-300 transition-all`}>
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-purple-50 rounded-lg">
              <LayoutGrid className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-bold text-gray-900">Design Elements</h3>
          </div>
          <div className="flex items-center space-x-1">
            <button onClick={onToggleExpand} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" title={isExpanded ? "Collapse" : "Expand"}>
              {isExpanded ? <Minimize className="w-4 h-4 text-gray-500" /> : <Maximize className="w-4 h-4 text-gray-500" />}
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-16 flex flex-col items-center border-r border-gray-100 py-4 gap-4 bg-gray-50/50">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`p-3 rounded-xl transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-purple-100 text-purple-700 shadow-sm' 
                    : 'text-gray-500 hover:bg-white hover:shadow-sm hover:text-gray-700'
                }`}
                title={cat.name}
              >
                <Icon className="w-5 h-5" />
                <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className={`flex-1 overflow-y-auto p-4 transition-all duration-300 ${isExpanded ? 'w-80' : 'w-64'}`}>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            {categories.find(c => c.id === activeCategory)?.name}
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            {currentShapes.map((shape: any) => (
              <div
                key={shape.id}
                draggable
                onDragStart={(e) => handleDragStart(e, shape)}
                onDragEnd={handleDragEnd}
                className={`
                  group flex flex-col items-center justify-center p-4 
                  bg-white border border-gray-200 rounded-xl 
                  cursor-grab active:cursor-grabbing
                  hover:border-purple-300 hover:shadow-md hover:-translate-y-0.5
                  transition-all duration-200
                  ${draggedItem === shape.id ? 'opacity-50 ring-2 ring-purple-200' : ''}
                `}
              >
                <div className="mb-3 text-gray-600 group-hover:text-purple-600 transition-colors transform group-hover:scale-110 duration-200">
                  {shape.icon}
                </div>
                <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900">
                  {shape.name}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-700 text-center leading-relaxed">
              Drag elements onto the page to create a new diagram, or drag them into an existing diagram to add to it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};