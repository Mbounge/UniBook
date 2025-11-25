"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Check, Maximize2 } from 'lucide-react';

// Dynamic import for the Editor component to avoid SSR issues
const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    ) 
  }
);

interface ExcalidrawBlockProps {
  initialData: any;
  onUpdate: (newData: any, svgHtml: string) => void;
  isEditing?: boolean;
  setEditing: (editing: boolean) => void;
}

export const ExcalidrawBlock = ({ initialData, onUpdate, isEditing, setEditing }: ExcalidrawBlockProps) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [svgHtml, setSvgHtml] = useState<string>("");

  // Generate initial preview if needed
  useEffect(() => {
    const generatePreview = async () => {
      if (initialData && initialData.elements && initialData.elements.length > 0) {
        try {
          // Dynamically import exportToSvg only on the client side
          const { exportToSvg } = await import('@excalidraw/excalidraw');
          
          const svg = await exportToSvg({
            elements: initialData.elements,
            appState: { ...initialData.appState, exportBackground: true },
            files: initialData.files || null,
          });
          
          // Force SVG to fill the container
          svg.setAttribute('width', '100%');
          svg.setAttribute('height', '100%');
          
          setSvgHtml(svg.outerHTML);
        } catch (e) {
          console.error("Failed to generate SVG preview", e);
        }
      }
    };
    generatePreview();
  }, []); // Run once on mount

  const handleSave = async () => {
    if (!excalidrawAPI) return;
    
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    const files = excalidrawAPI.getFiles();

    // Dynamically import exportToSvg here as well
    const { exportToSvg } = await import('@excalidraw/excalidraw');

    // Generate SVG for the editor view
    const svg = await exportToSvg({
      elements,
      appState: { ...appState, exportBackground: true },
      files,
    });

    // Force SVG to fill the container
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    const svgString = svg.outerHTML;
    setSvgHtml(svgString);
    
    // Pass data back up to be saved in the DOM
    onUpdate({ elements, appState, files }, svgString);
    setEditing(false);
  };

  return (
    <>
      {/* VIEW MODE: The lightweight SVG representation in the document */}
      <div 
        className="w-full h-full relative group cursor-pointer min-h-[50px] flex items-center justify-center"
        onDoubleClick={() => setEditing(true)}
      >
        {svgHtml ? (
          <div 
            className="w-full h-full pointer-events-none" 
            dangerouslySetInnerHTML={{ __html: svgHtml }} 
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 rounded-lg p-4 w-full h-full bg-gray-50">
            <Maximize2 className="w-6 h-6 mb-1" />
            <p className="text-xs font-medium">Double-click to design</p>
          </div>
        )}
        
        {/* Hover Overlay Hint */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm text-xs font-medium text-gray-700">
            Double-click to edit
          </div>
        </div>
      </div>

      {/* EDIT MODE: Full Screen Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full h-[90vh] max-w-[95vw] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Maximize2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Design Editor</h3>
                  <p className="text-xs text-gray-500">Create diagrams, charts, and visual elements</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setEditing(false)} 
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 shadow-sm transition-all hover:shadow-md"
                >
                  <Check className="w-4 h-4" /> 
                  Save & Close
                </button>
              </div>
            </div>
            
            <div className="flex-1 w-full h-full bg-white relative">
              <Excalidraw
                initialData={{
                  elements: initialData?.elements || [],
                  appState: { 
                    ...initialData?.appState, 
                    viewBackgroundColor: "#ffffff",
                    currentItemFontFamily: 1, // Virgil (Hand-drawn)
                  },
                  scrollToContent: true
                }}
                excalidrawAPI={(api) => setExcalidrawAPI(api)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};