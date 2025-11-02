'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

const getDeleteIcon = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"></polyline><path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
const getEditIcon = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;

interface MathResizerProps {
  pageContainerRef: React.RefObject<HTMLDivElement | null>;
  saveToHistory: (force?: boolean) => void;
  selectedMathElement?: HTMLElement | null;
  onMathSelect?: (element: HTMLElement | null) => void;
  // --- NEW PROPS ---
  reflowBackwardFromPage: (pageElement: HTMLElement) => void;
  fullDocumentReflow: () => void;
}

export const MathResizer: React.FC<MathResizerProps> = ({ 
  pageContainerRef,
  saveToHistory, 
  selectedMathElement,
  onMathSelect,
  reflowBackwardFromPage,
  fullDocumentReflow
}) => {
  const [selection, setSelection] = useState<HTMLElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  
  const selectionRef = useRef<HTMLElement | null>(null);
  const isResizingRef = useRef(false);
  const propsRef = useRef({ saveToHistory, onMathSelect, reflowBackwardFromPage, fullDocumentReflow });

  const resizeHandleRef = useRef<string | null>(null);
  const resizeStart = useRef({ fontSize: 16, x: 0 });
  const previousSelection = useRef<HTMLElement | null>(null);

  useEffect(() => {
    propsRef.current = { saveToHistory, onMathSelect, reflowBackwardFromPage, fullDocumentReflow };
  }, [saveToHistory, onMathSelect, reflowBackwardFromPage, fullDocumentReflow]);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    isResizingRef.current = isResizing;
  }, [isResizing]);

  useEffect(() => {
    const newSelection = selectedMathElement ? selectedMathElement.closest('.math-wrapper') as HTMLElement : null;
    setSelection(newSelection);
  }, [selectedMathElement]);

  const cleanupControls = useCallback((element: HTMLElement | null) => {
    if (!element || !document.body.contains(element)) return;
    const overlay = element.querySelector('.math-resize-overlay');
    const toolbar = element.querySelector('.math-toolbar');
    if (overlay) overlay.remove();
    if (toolbar) toolbar.remove();
    element.classList.remove('math-selected');
    element.style.position = '';
  }, []);

  const createControls = useCallback((element: HTMLElement) => {
    if (element.querySelector('.math-resize-overlay')) return;

    const config = { borderColor: '#10b981' };
    
    element.style.position = 'relative';
    element.classList.add('math-selected');

    const overlay = document.createElement('div');
    overlay.className = 'math-resize-overlay';
    overlay.style.cssText = `position: absolute !important; top: -2px !important; left: -2px !important; right: -2px !important; bottom: -2px !important; border: 2px solid ${config.borderColor} !important; border-radius: 8px !important; pointer-events: none !important; z-index: 10 !important;`;

    const handles = [{ pos: 'e', cursor: 'ew-resize' }, { pos: 'w', cursor: 'ew-resize' }];
    handles.forEach(handle => {
      const handleEl = document.createElement('div');
      handleEl.dataset.resizeHandle = handle.pos;
      handleEl.style.cssText = `position: absolute !important; width: 12px !important; height: 12px !important; background: ${config.borderColor} !important; border: 2px solid white !important; border-radius: 50% !important; pointer-events: all !important; z-index: 11 !important; cursor: ${handle.cursor} !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important; top: 50% !important; left: ${handle.pos === 'w' ? '-6px' : 'auto'} !important; right: ${handle.pos === 'e' ? '-6px' : 'auto'} !important; transform: translateY(-50%) !important;`;
      overlay.appendChild(handleEl);
    });

    const toolbar = document.createElement('div');
    toolbar.className = 'math-toolbar';
    toolbar.style.cssText = `position: absolute !important; top: -42px !important; right: 0 !important; background: white !important; border-radius: 8px !important; padding: 4px !important; display: flex !important; gap: 4px !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05) !important; pointer-events: all !important; z-index: 12 !important;`;
    
    const editButton = document.createElement('button');
    editButton.title = 'Edit Formula';
    editButton.innerHTML = getEditIcon();
    editButton.dataset.editButton = 'true';
    editButton.style.cssText = `width: 28px !important; height: 28px !important; border: none !important; background: transparent !important; color: #475569 !important; border-radius: 6px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: all 0.2s ease !important;`;
    toolbar.appendChild(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.title = 'Delete';
    deleteButton.innerHTML = getDeleteIcon();
    deleteButton.dataset.deleteButton = 'true';
    deleteButton.style.cssText = `width: 28px !important; height: 28px !important; border: none !important; background: transparent !important; color: #ef4444 !important; border-radius: 6px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: all 0.2s ease !important;`;
    toolbar.appendChild(deleteButton);

    element.appendChild(overlay);
    element.appendChild(toolbar);
  }, []);

  useEffect(() => {
    const previous = previousSelection.current;
    const current = selection;
    if (previous && previous !== current) {
      cleanupControls(previous);
    }
    if (current && current !== previous) {
      createControls(current);
    }
    previousSelection.current = current;
  }, [selection, cleanupControls, createControls]);

  useEffect(() => {
    const handleMouseUp = () => {
      if (isResizingRef.current) {
        propsRef.current.saveToHistory(true);
        // --- MODIFICATION: Use fullDocumentReflow for final, perfect pagination ---
        propsRef.current.fullDocumentReflow();
      }
      setIsResizing(false);
      resizeHandleRef.current = null;
    };

    const handleActionClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const currentSelection = selectionRef.current;
      if (!currentSelection) return;

      const deleteButton = target.closest('button[data-delete-button]');
      if (deleteButton) {
        e.preventDefault();
        e.stopPropagation();
        currentSelection.remove();
        setSelection(null);
        propsRef.current.onMathSelect?.(null);
        propsRef.current.saveToHistory(true);
        return;
      }

      const editButton = target.closest('button[data-edit-button]');
      if (editButton) {
        e.preventDefault();
        e.stopPropagation();
        const mathBlock = currentSelection.querySelector('.math-rendered, .math-editor');
        if (mathBlock) {
          mathBlock.dispatchEvent(new CustomEvent('editMath'));
        }
      }
    };

    const handleResizeStart = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const resizeHandle = target.closest('[data-resize-handle]');
      const currentSelection = selectionRef.current;
      if (resizeHandle && currentSelection) {
        e.preventDefault();
        setIsResizing(true);
        resizeHandleRef.current = resizeHandle.getAttribute('data-resize-handle');
        const currentFontSize = parseFloat(currentSelection.dataset.fontSize || '16');
        resizeStart.current = { fontSize: currentFontSize, x: e.clientX };
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !selectionRef.current) return;
      const { fontSize, x } = resizeStart.current;
      const handle = resizeHandleRef.current;
      const dx = e.clientX - x;
      
      let newFontSize = fontSize;
      if (handle === 'e') {
        newFontSize = fontSize + (dx / 10);
      } else if (handle === 'w') {
        newFontSize = fontSize - (dx / 10);
      }

      newFontSize = Math.max(8, Math.min(newFontSize, 72));
      
      selectionRef.current.dataset.fontSize = String(newFontSize);
      
      const mathBlock = selectionRef.current.querySelector('.math-rendered, .math-editor');
      if (mathBlock) {
        mathBlock.dispatchEvent(new CustomEvent('updateMath', { detail: { fontSize: newFontSize } }));
      }

      // --- MODIFICATION: Use faster, local reflow during drag for responsiveness ---
      const page = selectionRef.current.closest('.page') as HTMLElement;
      if (page) {
        propsRef.current.reflowBackwardFromPage(page);
      }
    };
    
    document.addEventListener('mousedown', handleResizeStart);
    document.addEventListener('click', handleActionClick, true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousedown', handleResizeStart);
      document.removeEventListener('click', handleActionClick, true);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [pageContainerRef, createControls, cleanupControls]);

  return null;
};