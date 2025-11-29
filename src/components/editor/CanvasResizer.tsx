'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- STYLING & CONFIGURATION ---
const PRIMARY_COLOR = '#0ea5e9'; // Sky 500
const HANDLE_SIZE = 12;

// --- ICON HELPERS ---
const getFloatIcon = (type: string): string => {
  const icons = {
    left: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>',
    center: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>',
    right: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>',
    none: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>'
  };
  return icons[type as keyof typeof icons] || icons.none;
};

const getDeleteIcon = (): string => {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"></polyline><path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
};

// --- COMPONENT INTERFACE ---
interface CanvasResizerProps {
  pageContainerRef: React.RefObject<HTMLDivElement | null>;
  saveToHistory: (force?: boolean) => void;
  selectedElement?: HTMLElement | null;
  onElementSelect?: (element: HTMLElement | null) => void;
  reflowBackwardFromPage: (pageElement: HTMLElement) => void;
  fullDocumentReflow: () => void;
}

// --- MAIN COMPONENT ---
export const CanvasResizer: React.FC<CanvasResizerProps> = ({ 
  pageContainerRef,
  saveToHistory, 
  selectedElement,
  onElementSelect,
  reflowBackwardFromPage,
  fullDocumentReflow
}) => {
  const [selection, setSelection] = useState<HTMLElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const propsRef = useRef({ saveToHistory, onElementSelect, reflowBackwardFromPage, fullDocumentReflow });
  const resizeHandleRef = useRef<string | null>(null);
  const resizeStart = useRef({ width: 0, height: 0, x: 0, y: 0 });

  useEffect(() => {
    propsRef.current = { saveToHistory, onElementSelect, reflowBackwardFromPage, fullDocumentReflow };
  }, [saveToHistory, onElementSelect, reflowBackwardFromPage, fullDocumentReflow]);

  useEffect(() => {
    // Ensure we are selecting the wrapper, not the internal React div
    const newSelection = selectedElement ? selectedElement.closest('.canvas-wrapper') as HTMLElement : null;
    setSelection(newSelection);
  }, [selectedElement]);

  const createControls = useCallback((element: HTMLElement) => {
    if (element.querySelector('.canvas-resize-overlay')) return;

    // Add class to trigger internal CanvasBlock toolbars
    element.classList.add('canvas-selected');

    const overlay = document.createElement('div');
    overlay.className = 'canvas-resize-overlay';
    // Pointer events none ensures we can click THROUGH the overlay to draw on the canvas
    overlay.style.cssText = `position: absolute !important; top: -2px !important; left: -2px !important; right: -2px !important; bottom: -2px !important; border: 2px solid ${PRIMARY_COLOR} !important; border-radius: 10px !important; pointer-events: none !important; z-index: 10 !important;`;

    const handles = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'];
    handles.forEach(pos => {
      const handleEl = document.createElement('div');
      handleEl.dataset.resizeHandle = pos;
      let cursor = 'pointer';
      if (pos === 'n' || pos === 's') cursor = 'ns-resize';
      if (pos === 'e' || pos === 'w') cursor = 'ew-resize';
      if (pos === 'ne' || pos === 'sw') cursor = 'nesw-resize';
      if (pos === 'nw' || pos === 'se') cursor = 'nwse-resize';

      // Pointer events all ensures we can grab the handles
      handleEl.style.cssText = `
        position: absolute !important; width: ${HANDLE_SIZE}px !important; height: ${HANDLE_SIZE}px !important; 
        background: white !important; border: 2px solid ${PRIMARY_COLOR} !important; border-radius: 50% !important; 
        pointer-events: all !important; z-index: 11 !important; cursor: ${cursor} !important;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important; transition: transform 0.1s ease !important;
      `;
      
      if (pos.includes('n')) handleEl.style.top = `-${HANDLE_SIZE / 2}px`;
      if (pos.includes('s')) handleEl.style.bottom = `-${HANDLE_SIZE / 2}px`;
      if (pos.includes('w')) handleEl.style.left = `-${HANDLE_SIZE / 2}px`;
      if (pos.includes('e')) handleEl.style.right = `-${HANDLE_SIZE / 2}px`;
      if (!pos.includes('n') && !pos.includes('s')) { handleEl.style.top = '50%'; handleEl.style.transform = 'translateY(-50%)'; }
      if (!pos.includes('w') && !pos.includes('e')) { handleEl.style.left = '50%'; handleEl.style.transform = 'translateX(-50%)'; }
      
      overlay.appendChild(handleEl);
    });

    const toolbar = document.createElement('div');
    toolbar.className = 'canvas-toolbar';
    toolbar.style.cssText = `
      position: absolute !important; top: -50px !important; right: 0 !important; background: white !important; 
      border-radius: 12px !important; padding: 6px !important; display: flex !important; gap: 4px !important; 
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.05) !important; 
      pointer-events: all !important; z-index: 12 !important; border: 1px solid rgba(0,0,0,0.05) !important;
    `;

    ['left', 'center', 'right', 'none'].forEach(type => {
      const btn = document.createElement('button');
      btn.dataset.floatType = type;
      btn.innerHTML = getFloatIcon(type);
      btn.style.cssText = `width: 28px; height: 28px; border: none; background: transparent; cursor: pointer; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #6b7280; transition: all 0.2s;`;
      btn.onmouseenter = () => { btn.style.backgroundColor = '#f3f4f6'; btn.style.color = '#374151'; };
      btn.onmouseleave = () => { btn.style.backgroundColor = 'transparent'; btn.style.color = '#6b7280'; };
      toolbar.appendChild(btn);
    });

    const sep = document.createElement('div');
    sep.style.cssText = 'width: 1px; height: 20px; background: #e5e7eb; margin: 0 4px;';
    toolbar.appendChild(sep);

    const delBtn = document.createElement('button');
    delBtn.dataset.deleteButton = 'true';
    delBtn.innerHTML = getDeleteIcon();
    delBtn.style.cssText = `width: 28px; height: 28px; border: none; background: transparent; cursor: pointer; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #ef4444; transition: all 0.2s;`;
    delBtn.onmouseenter = () => { delBtn.style.backgroundColor = '#fef2f2'; };
    delBtn.onmouseleave = () => { delBtn.style.backgroundColor = 'transparent'; };
    toolbar.appendChild(delBtn);

    element.appendChild(overlay);
    element.appendChild(toolbar);
  }, []);

  const cleanupControls = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    element.querySelector('.canvas-resize-overlay')?.remove();
    element.querySelector('.canvas-toolbar')?.remove();
    element.classList.remove('canvas-selected');
  }, []);

  useEffect(() => {
    if (selection) {
      createControls(selection);
    }
    return () => {
      cleanupControls(selection);
    };
  }, [selection, createControls, cleanupControls]);

  useEffect(() => {
    if (!selection) {
      return;
    }

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const handle = target.closest('[data-resize-handle]');
      if (handle && selection.contains(target)) {
        e.preventDefault();
        setIsResizing(true);
        resizeHandleRef.current = handle.getAttribute('data-resize-handle');
        resizeStart.current = {
          width: selection.offsetWidth,
          height: selection.offsetHeight,
          x: e.clientX,
          y: e.clientY
        };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const { width, height, x, y } = resizeStart.current;
      const dx = e.clientX - x;
      const dy = e.clientY - y;
      const handle = resizeHandleRef.current || '';
      const MAX_EDITABLE_WIDTH = 624; // 6.5 inches (8.5 - 1 - 1)
      
      let newW = width;
      let newH = height;
      
      if (handle.includes('e')) newW = width + dx;
      if (handle.includes('w')) newW = width - dx;
      if (handle.includes('s')) newH = height + dy;
      if (handle.includes('n')) newH = height - dy;
      
      newW = Math.max(100, Math.min(newW, MAX_EDITABLE_WIDTH));
      newH = Math.max(50, newH);
      
      selection.style.width = `${newW}px`;
      selection.style.height = `${newH}px`;
      
      // Update dataset for React rehydration
      selection.dataset.width = String(newW);
      selection.dataset.height = String(newH);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        propsRef.current.saveToHistory(true);
        // Trigger reflow to move content around the resized canvas
        propsRef.current.fullDocumentReflow();
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!selection.contains(target)) return;

      if (target.closest('[data-delete-button]')) {
        const page = selection.closest('.page') as HTMLElement;
        selection.remove();
        propsRef.current.onElementSelect?.(null);
        propsRef.current.saveToHistory(true);
        if (page) propsRef.current.reflowBackwardFromPage(page);
      }

      const floatBtn = target.closest('[data-float-type]');
      if (floatBtn) {
        const type = floatBtn.getAttribute('data-float-type') || 'none';
        selection.dataset.float = type;
        
        // Reset margins
        selection.style.float = 'none';
        selection.style.marginLeft = '';
        selection.style.marginRight = '';
        selection.style.display = 'block';

        if (type === 'left') { 
            selection.style.float = 'left'; 
            selection.style.marginRight = '1rem'; 
            selection.style.marginBottom = '1rem'; 
        } 
        else if (type === 'right') { 
            selection.style.float = 'right'; 
            selection.style.marginLeft = '1rem'; 
            selection.style.marginBottom = '1rem'; 
        } 
        else if (type === 'center') { 
            selection.style.margin = '1rem auto'; 
        } 
        else { 
            selection.style.margin = '1rem 0'; 
        }
        
        propsRef.current.saveToHistory(true);
        // Trigger reflow to wrap text around the floated canvas
        propsRef.current.fullDocumentReflow();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleClick);
    };
  }, [selection, isResizing]);

  return null;
};