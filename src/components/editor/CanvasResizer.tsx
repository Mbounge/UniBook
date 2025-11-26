'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

const getFloatIcon = (type: string) => {
  const icons = {
    left: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>',
    center: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>',
    right: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>',
    none: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>'
  };
  return icons[type as keyof typeof icons] || icons.none;
};

const getDeleteIcon = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"></polyline><path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

interface CanvasResizerProps {
  pageContainerRef: React.RefObject<HTMLDivElement | null>;
  saveToHistory: (force?: boolean) => void;
  selectedElement?: HTMLElement | null;
  onElementSelect?: (element: HTMLElement | null) => void;
  reflowBackwardFromPage: (pageElement: HTMLElement) => void;
  fullDocumentReflow: () => void;
}

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
  const selectionRef = useRef<HTMLElement | null>(null);
  const isResizingRef = useRef(false);
  const propsRef = useRef({ saveToHistory, onElementSelect, reflowBackwardFromPage, fullDocumentReflow });
  const resizeHandleRef = useRef<string | null>(null);
  const resizeStart = useRef({ width: 0, height: 0, x: 0, y: 0 });

  useEffect(() => {
    propsRef.current = { saveToHistory, onElementSelect, reflowBackwardFromPage, fullDocumentReflow };
  }, [saveToHistory, onElementSelect, reflowBackwardFromPage, fullDocumentReflow]);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    isResizingRef.current = isResizing;
  }, [isResizing]);

  useEffect(() => {
    const newSelection = selectedElement ? selectedElement.closest('.canvas-wrapper') as HTMLElement : null;
    setSelection(newSelection);
  }, [selectedElement]);

  const createControls = useCallback((element: HTMLElement) => {
    if (element.querySelector('.canvas-resize-overlay')) return;

    const config = { borderColor: '#6366f1' }; // Indigo
    element.style.position = 'relative';
    element.classList.add('canvas-selected');

    const overlay = document.createElement('div');
    overlay.className = 'canvas-resize-overlay';
    overlay.style.cssText = `position: absolute !important; top: -2px !important; left: -2px !important; right: -2px !important; bottom: -2px !important; border: 2px solid ${config.borderColor} !important; border-radius: 8px !important; pointer-events: none !important; z-index: 10 !important;`;

    // Resize handles (Corners and Sides)
    const handles = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'];
    handles.forEach(pos => {
      const handleEl = document.createElement('div');
      handleEl.dataset.resizeHandle = pos;
      let cursor = 'pointer';
      if (pos === 'n' || pos === 's') cursor = 'ns-resize';
      if (pos === 'e' || pos === 'w') cursor = 'ew-resize';
      if (pos === 'ne' || pos === 'sw') cursor = 'nesw-resize';
      if (pos === 'nw' || pos === 'se') cursor = 'nwse-resize';

      handleEl.style.cssText = `position: absolute !important; width: 10px !important; height: 10px !important; background: white !important; border: 2px solid ${config.borderColor} !important; border-radius: 50% !important; pointer-events: all !important; z-index: 11 !important; cursor: ${cursor} !important;`;
      
      // Positioning logic
      if (pos.includes('n')) handleEl.style.top = '-6px';
      if (pos.includes('s')) handleEl.style.bottom = '-6px';
      if (pos.includes('w')) handleEl.style.left = '-6px';
      if (pos.includes('e')) handleEl.style.right = '-6px';
      if (!pos.includes('n') && !pos.includes('s')) handleEl.style.top = '50%';
      if (!pos.includes('w') && !pos.includes('e')) handleEl.style.left = '50%';
      
      overlay.appendChild(handleEl);
    });

    const toolbar = document.createElement('div');
    toolbar.className = 'canvas-toolbar';
    toolbar.style.cssText = `position: absolute !important; top: -45px !important; right: 0 !important; background: white !important; border-radius: 8px !important; padding: 6px !important; display: flex !important; gap: 4px !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important; pointer-events: all !important; z-index: 12 !important;`;

    // Float Buttons
    ['left', 'center', 'right', 'none'].forEach(type => {
      const btn = document.createElement('button');
      btn.dataset.floatType = type;
      btn.innerHTML = getFloatIcon(type);
      btn.style.cssText = `width: 28px; height: 28px; border: none; background: transparent; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #6b7280;`;
      toolbar.appendChild(btn);
    });

    const sep = document.createElement('div');
    sep.style.cssText = 'width: 1px; height: 20px; background: #e5e7eb; margin: 0 4px;';
    toolbar.appendChild(sep);

    const delBtn = document.createElement('button');
    delBtn.dataset.deleteButton = 'true';
    delBtn.innerHTML = getDeleteIcon();
    delBtn.style.cssText = `width: 28px; height: 28px; border: none; background: transparent; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #ef4444;`;
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
    if (selection && selection !== selectionRef.current) {
      cleanupControls(selectionRef.current);
      createControls(selection);
    } else if (!selection && selectionRef.current) {
      cleanupControls(selectionRef.current);
    }
  }, [selection, createControls, cleanupControls]);

  // Handle Interactions
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const handle = target.closest('[data-resize-handle]');
      if (handle && selectionRef.current) {
        e.preventDefault();
        setIsResizing(true);
        resizeHandleRef.current = handle.getAttribute('data-resize-handle');
        resizeStart.current = {
          width: selectionRef.current.offsetWidth,
          height: selectionRef.current.offsetHeight,
          x: e.clientX,
          y: e.clientY
        };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !selectionRef.current) return;
      const { width, height, x, y } = resizeStart.current;
      const dx = e.clientX - x;
      const dy = e.clientY - y;
      const handle = resizeHandleRef.current || '';

      let newW = width;
      let newH = height;

      if (handle.includes('e')) newW = width + dx;
      if (handle.includes('w')) newW = width - dx;
      if (handle.includes('s')) newH = height + dy;
      if (handle.includes('n')) newH = height - dy;

      newW = Math.max(100, newW);
      newH = Math.max(50, newH);

      selectionRef.current.style.width = `${newW}px`;
      selectionRef.current.style.height = `${newH}px`;
      
      // Update dataset so React component re-renders canvas size on next hydration
      selectionRef.current.dataset.width = String(newW);
      selectionRef.current.dataset.height = String(newH);
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        setIsResizing(false);
        propsRef.current.saveToHistory(true);
        propsRef.current.fullDocumentReflow();
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!selectionRef.current) return;

      if (target.closest('[data-delete-button]')) {
        const page = selectionRef.current.closest('.page') as HTMLElement;
        selectionRef.current.remove();
        setSelection(null);
        propsRef.current.onElementSelect?.(null);
        propsRef.current.saveToHistory(true);
        if (page) {
          propsRef.current.reflowBackwardFromPage(page);
        }
      }

      const floatBtn = target.closest('[data-float-type]');
      if (floatBtn) {
        const type = floatBtn.getAttribute('data-float-type') || 'none';
        const el = selectionRef.current;
        el.dataset.float = type;
        el.style.float = type === 'none' || type === 'center' ? 'none' : type;
        el.style.margin = type === 'center' ? '1rem auto' : type === 'none' ? '1rem 0' : '1rem';
        if (type === 'left') el.style.marginRight = '1rem';
        if (type === 'right') el.style.marginLeft = '1rem';
        propsRef.current.saveToHistory(true);
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
  }, []);

  return null;
};