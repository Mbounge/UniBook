'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- ICONS ---
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
const getEditIcon = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;

// --- CONFIGURATION ---
const PRIMARY_COLOR = '#3b82f6'; // Blue 500
const HANDLE_SIZE = 12;
const MAX_EDITABLE_WIDTH = 624; // ~6.5 inches

interface MathResizerProps {
  pageContainerRef: React.RefObject<HTMLDivElement | null>;
  saveToHistory: (force?: boolean) => void;
  selectedMathElement?: HTMLElement | null;
  onMathSelect?: (element: HTMLElement | null) => void;
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
  const previousSelection = useRef<HTMLElement | null>(null);
  const propsRef = useRef({ saveToHistory, onMathSelect, reflowBackwardFromPage, fullDocumentReflow });

  const resizeHandleRef = useRef<string | null>(null);
  
  const resizeStart = useRef({ 
    fontSize: 0,
    width: 0, 
    height: 0, 
    x: 0, 
    y: 0,
    aspectRatio: 1
  });

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

  // Helper to update toolbar button states
  const updateToolbarState = useCallback((toolbar: HTMLElement, activeType: string) => {
    const buttons = toolbar.querySelectorAll('[data-float-type]');
    buttons.forEach((btn) => {
      const button = btn as HTMLElement;
      const type = button.dataset.floatType;
      const isActive = type === activeType;

      // Apply styles
      button.style.backgroundColor = isActive ? PRIMARY_COLOR : 'transparent';
      button.style.color = isActive ? 'white' : '#6b7280';

      // Update hover handlers to respect active state
      button.onmouseenter = () => {
        if (!isActive) {
          button.style.backgroundColor = '#f3f4f6';
          button.style.color = '#374151';
        }
      };
      button.onmouseleave = () => {
        if (!isActive) {
          button.style.backgroundColor = 'transparent';
          button.style.color = '#6b7280';
        } else {
          button.style.backgroundColor = PRIMARY_COLOR;
          button.style.color = 'white';
        }
      };
    });
  }, []);

  const cleanupControls = useCallback((element: HTMLElement | null) => {
    if (!element || !document.body.contains(element)) return;
    const overlay = element.querySelector('.math-resize-overlay');
    const toolbar = element.querySelector('.math-toolbar');
    if (overlay) overlay.remove();
    if (toolbar) toolbar.remove();
    element.classList.remove('math-selected');
    element.style.position = '';
    element.style.overflow = ''; 
  }, []);

  const createControls = useCallback((element: HTMLElement) => {
    if (element.querySelector('.math-resize-overlay')) return;

    const mode = element.dataset.renderMode || 'math';
    const isTikZ = mode === 'tikz';

    element.style.position = 'relative';
    element.classList.add('math-selected');
    element.style.overflow = 'visible';

    const overlay = document.createElement('div');
    overlay.className = 'math-resize-overlay';
    overlay.style.cssText = `position: absolute !important; top: -2px !important; left: -2px !important; right: -2px !important; bottom: -2px !important; border: 2px solid ${PRIMARY_COLOR} !important; border-radius: 8px !important; pointer-events: none !important; z-index: 10 !important;`;

    const handles = [
        { pos: 'nw', cursor: 'nwse-resize' },
        { pos: 'ne', cursor: 'nesw-resize' },
        { pos: 'sw', cursor: 'nesw-resize' },
        { pos: 'se', cursor: 'nwse-resize' },
        { pos: 'n', cursor: 'ns-resize' },
        { pos: 's', cursor: 'ns-resize' },
        { pos: 'e', cursor: 'ew-resize' },
        { pos: 'w', cursor: 'ew-resize' }
    ];

    handles.forEach(handle => {
      const handleEl = document.createElement('div');
      handleEl.dataset.resizeHandle = handle.pos;
      handleEl.style.cssText = `
        position: absolute !important; width: ${HANDLE_SIZE}px !important; height: ${HANDLE_SIZE}px !important; 
        background: white !important; border: 2px solid ${PRIMARY_COLOR} !important; border-radius: 50% !important; 
        pointer-events: all !important; z-index: 11 !important; cursor: ${handle.cursor} !important; 
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
      `;

      if (handle.pos.includes('n')) handleEl.style.top = `-${HANDLE_SIZE / 2}px`;
      if (handle.pos.includes('s')) handleEl.style.bottom = `-${HANDLE_SIZE / 2}px`;
      if (handle.pos.includes('w')) handleEl.style.left = `-${HANDLE_SIZE / 2}px`;
      if (handle.pos.includes('e')) handleEl.style.right = `-${HANDLE_SIZE / 2}px`;
      
      if (!handle.pos.includes('n') && !handle.pos.includes('s')) {
          handleEl.style.top = '50%';
          handleEl.style.transform = 'translateY(-50%)';
      }
      if (!handle.pos.includes('w') && !handle.pos.includes('e')) {
          handleEl.style.left = '50%';
          handleEl.style.transform = 'translateX(-50%)';
      }

      overlay.appendChild(handleEl);
    });

    const toolbar = document.createElement('div');
    toolbar.className = 'math-toolbar';
    toolbar.style.cssText = `
        position: absolute !important; top: -50px !important; right: 0 !important; 
        background: white !important; border-radius: 12px !important; padding: 6px !important; 
        display: flex !important; gap: 4px !important; 
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05) !important; 
        pointer-events: all !important; z-index: 12 !important; border: 1px solid rgba(0,0,0,0.05) !important;
    `;
    
    ['left', 'center', 'right', 'none'].forEach(type => {
        const btn = document.createElement('button');
        btn.dataset.floatType = type;
        btn.innerHTML = getFloatIcon(type);
        btn.style.cssText = `width: 28px; height: 28px; border: none; background: transparent; cursor: pointer; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #6b7280; transition: all 0.2s;`;
        toolbar.appendChild(btn);
    });
    
    const sep = document.createElement('div');
    sep.style.cssText = 'width: 1px; height: 20px; background: #e5e7eb; margin: 0 4px;';
    toolbar.appendChild(sep);

    const editButton = document.createElement('button');
    editButton.title = 'Edit';
    editButton.innerHTML = getEditIcon();
    editButton.dataset.editButton = 'true';
    editButton.style.cssText = `width: 28px; height: 28px; border: none; background: transparent; cursor: pointer; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #475569 !important; transition: all 0.2s ease !important;`;
    editButton.onmouseenter = () => { editButton.style.backgroundColor = '#f3f4f6'; };
    editButton.onmouseleave = () => { editButton.style.backgroundColor = 'transparent'; };
    toolbar.appendChild(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.title = 'Delete';
    deleteButton.innerHTML = getDeleteIcon();
    deleteButton.dataset.deleteButton = 'true';
    deleteButton.style.cssText = `width: 28px; height: 28px; border: none; background: transparent; color: #ef4444 !important; border-radius: 6px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: all 0.2s ease !important;`;
    deleteButton.onmouseenter = () => { deleteButton.style.backgroundColor = '#fef2f2'; };
    deleteButton.onmouseleave = () => { deleteButton.style.backgroundColor = 'transparent'; };
    toolbar.appendChild(deleteButton);

    element.appendChild(overlay);
    element.appendChild(toolbar);

    // --- DEFAULT TO CENTER ALIGNMENT ---
    const currentFloat = element.dataset.float || 'center';
    element.dataset.float = currentFloat;
    
    // Explicitly apply styles based on state to ensure visual sync
    if (currentFloat === 'center') {
        element.style.float = 'none';
        element.style.margin = '1rem auto';
        element.style.display = 'block';
    } else if (currentFloat === 'left') {
        element.style.float = 'left';
        element.style.margin = '1rem 1rem 1rem 0';
        element.style.display = 'block';
    } else if (currentFloat === 'right') {
        element.style.float = 'right';
        element.style.margin = '1rem 0 1rem 1rem';
        element.style.display = 'block';
    }

    updateToolbarState(toolbar, currentFloat);

  }, [updateToolbarState]);

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
        propsRef.current.fullDocumentReflow();
      }
      setIsResizing(false);
      resizeHandleRef.current = null;
    };

    const handleActionClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const currentSelection = selectionRef.current;
      if (!currentSelection) return;

      // Delete
      const deleteButton = target.closest('button[data-delete-button]');
      if (deleteButton) {
        e.preventDefault();
        e.stopPropagation();
        
        const innerContainer = currentSelection.querySelector('.math-block-container');
        if (innerContainer) {
            innerContainer.dispatchEvent(new CustomEvent('deleteMath'));
        } else {
            const page = currentSelection.closest('.page') as HTMLElement;
            currentSelection.remove();
            propsRef.current.saveToHistory(true);
            if (page) propsRef.current.reflowBackwardFromPage(page);
        }
        
        setSelection(null);
        propsRef.current.onMathSelect?.(null);
        return;
      }

      // Edit
      const editButton = target.closest('button[data-edit-button]');
      if (editButton) {
        e.preventDefault();
        e.stopPropagation();
        const innerContainer = currentSelection.querySelector('.math-block-container');
        if (innerContainer) innerContainer.dispatchEvent(new CustomEvent('editMath'));
      }

      // Float / Align
      const floatBtn = target.closest('button[data-float-type]');
      if (floatBtn) {
        e.preventDefault();
        e.stopPropagation();
        const type = floatBtn.getAttribute('data-float-type') || 'none';
        
        // --- FIX: PRESERVE WIDTH ON ALIGNMENT CHANGE ---
        // If width is not explicitly set (i.e., it's auto/full-width), lock it to the current computed width
        // before applying float. This prevents the block from collapsing to fit-content width.
        if (!currentSelection.style.width || currentSelection.style.width === 'auto') {
            const rect = currentSelection.getBoundingClientRect();
            currentSelection.style.width = `${rect.width}px`;
        }

        currentSelection.dataset.float = type;
        
        currentSelection.style.float = 'none';
        currentSelection.style.marginLeft = '';
        currentSelection.style.marginRight = '';
        currentSelection.style.display = 'block';

        if (type === 'left') { 
            currentSelection.style.float = 'left'; 
            currentSelection.style.marginRight = '1rem'; 
            currentSelection.style.marginBottom = '1rem'; 
        } 
        else if (type === 'right') { 
            currentSelection.style.float = 'right'; 
            currentSelection.style.marginLeft = '1rem'; 
            currentSelection.style.marginBottom = '1rem'; 
        } 
        else if (type === 'center') { 
            currentSelection.style.margin = '1rem auto'; 
        } 
        else { 
            currentSelection.style.margin = '1rem 0'; 
        }
        
        const toolbar = currentSelection.querySelector('.math-toolbar') as HTMLElement;
        if (toolbar) {
            updateToolbarState(toolbar, type);
        }

        propsRef.current.saveToHistory(true);
        propsRef.current.fullDocumentReflow();
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
        
        const rect = currentSelection.getBoundingClientRect();
        
        let fontSize = 24; 
        const innerContainer = currentSelection.querySelector('.math-block-container') as HTMLElement;
        
        if (innerContainer && innerContainer.dataset.fontSize) {
            fontSize = parseFloat(innerContainer.dataset.fontSize);
        } else if (currentSelection.dataset.fontSize) {
            fontSize = parseFloat(currentSelection.dataset.fontSize);
        }
        
        resizeStart.current = { 
            fontSize, 
            width: rect.width,
            height: rect.height,
            x: e.clientX,
            y: e.clientY,
            aspectRatio: rect.width / rect.height
        };
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !selectionRef.current) return;
      
      const handle = resizeHandleRef.current || '';
      const { x, y, width, height, fontSize, aspectRatio } = resizeStart.current;
      const dx = e.clientX - x;
      const dy = e.clientY - y;
      const mode = selectionRef.current.dataset.renderMode || 'math';

      let newW = width;
      let newH = height;
      
      if (handle.includes('e')) newW = width + dx;
      if (handle.includes('w')) newW = width - dx;
      if (handle.includes('s')) newH = height + dy;
      if (handle.includes('n')) newH = height - dy;

      // --- MATH MODE: Maintain Aspect Ratio on Side Drag ---
      if (mode === 'math') {
          if (handle === 'e' || handle === 'w') {
              newH = newW / aspectRatio;
          }
          if (handle === 'n' || handle === 's') {
              newW = newH * aspectRatio;
          }
      }
      
      newW = Math.max(50, Math.min(newW, MAX_EDITABLE_WIDTH));
      newH = Math.max(20, newH);
      
      selectionRef.current.style.width = `${newW}px`;
      selectionRef.current.style.height = `${newH}px`;
      
      // --- MATH MODE: Scale Font Size ---
      if (mode === 'math') {
         const scale = newH / height;
         const newFS = Math.max(8, Math.min(120, fontSize * scale));
         
         selectionRef.current.dataset.fontSize = String(newFS);
         
         const innerContainer = selectionRef.current.querySelector('.math-block-container');
         if (innerContainer) {
             innerContainer.dispatchEvent(new CustomEvent('updateMath', { detail: { fontSize: newFS } }));
         }
      }

      // --- TIKZ MODE: Force SVG Fill ---
      if (mode === 'tikz') {
          const svg = selectionRef.current.querySelector('svg');
          if (svg) {
              svg.style.width = '100%';
              svg.style.height = '100%';
              if (!svg.hasAttribute('preserveAspectRatio')) {
                 svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
              }
              let parent = svg.parentElement;
              while (parent && parent !== selectionRef.current && selectionRef.current.contains(parent)) {
                  parent.style.width = '100%';
                  parent.style.height = '100%';
                  parent.style.maxWidth = 'none';
                  parent.style.maxHeight = 'none';
                  parent.style.display = 'flex';
                  parent.style.justifyContent = 'center';
                  parent.style.alignItems = 'center';
                  parent = parent.parentElement;
              }
          }
      }

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
  }, [pageContainerRef, createControls, cleanupControls, updateToolbarState]);

  return null;
}; 