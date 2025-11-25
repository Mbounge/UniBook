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

const getEditIcon = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const getDeleteIcon = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"></polyline><path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

interface ExcalidrawResizerProps {
  pageContainerRef: React.RefObject<HTMLDivElement | null>;
  saveToHistory: (force?: boolean) => void;
  selectedElement?: HTMLElement | null;
  onElementSelect?: (element: HTMLElement | null) => void;
  reflowBackwardFromPage: (pageElement: HTMLElement) => void;
  fullDocumentReflow: () => void;
}

type FloatType = 'none' | 'left' | 'right' | 'center';

export const ExcalidrawResizer: React.FC<ExcalidrawResizerProps> = ({ 
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
  const resizeStart = useRef({ width: 0, height: 0, x: 0, y: 0, aspectRatio: 1 });
  const previousSelection = useRef<HTMLElement | null>(null);

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
    const newSelection = selectedElement ? selectedElement.closest('.excalidraw-wrapper') as HTMLElement : null;
    setSelection(newSelection);
  }, [selectedElement]);

  const applyButtonStates = useCallback((element: HTMLElement) => {
    const toolbar = element.querySelector('.excalidraw-toolbar');
    if (!toolbar) return;
    const borderColor = '#8b5cf6'; // Purple for Excalidraw
    const currentFloat = (element.dataset.float || 'none') as FloatType;
    
    toolbar.querySelectorAll('button[data-float-type]').forEach(btn => {
      const button = btn as HTMLElement;
      const buttonType = button.dataset.floatType as FloatType;
      const isActive = currentFloat === buttonType;
      button.style.setProperty('background', isActive ? borderColor : 'transparent', 'important');
      button.style.setProperty('color', isActive ? 'white' : '#6b7280', 'important');
    });
  }, []);

  const cleanupControls = useCallback((element: HTMLElement | null) => {
    if (!element || !document.body.contains(element)) return;
    const overlay = element.querySelector('.excalidraw-resize-overlay');
    const toolbar = element.querySelector('.excalidraw-toolbar');
    if (overlay) overlay.remove();
    if (toolbar) toolbar.remove();
    element.classList.remove('excalidraw-selected');
    element.style.opacity = '';
  }, []);

  const createControls = useCallback((element: HTMLElement) => {
    if (element.querySelector('.excalidraw-resize-overlay')) return;

    element.draggable = true;
    element.ondragstart = (e) => {
      if ((e.target as HTMLElement).closest('[data-resize-handle]')) {
        e.preventDefault();
        return;
      }
      if (e.dataTransfer) {
        const id = `drag-excalidraw-${Date.now()}`;
        element.id = id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/custom-excalidraw-id', id);
        e.dataTransfer.setData('text/plain', id);
        setTimeout(() => { element.style.display = 'none'; }, 0);
      }
    };
    element.ondragend = () => {
      element.style.display = 'block';
      if (element.id.startsWith('drag-excalidraw-')) {
        element.removeAttribute('id');
      }
    };

    const config = { borderColor: '#8b5cf6' }; // Purple
    element.style.position = 'relative';
    element.style.opacity = '1';
    element.classList.add('excalidraw-selected');

    const overlay = document.createElement('div');
    overlay.className = 'excalidraw-resize-overlay';
    overlay.style.cssText = `position: absolute !important; top: -2px !important; left: -2px !important; right: -2px !important; bottom: -2px !important; border: 2px solid ${config.borderColor} !important; border-radius: 8px !important; pointer-events: none !important; z-index: 10 !important; box-shadow: 0 0 0 1px ${config.borderColor}1A, 0 4px 12px ${config.borderColor}26 !important;`;

    const handles = [{ pos: 'n', cursor: 'ns-resize' }, { pos: 'ne', cursor: 'nesw-resize' }, { pos: 'e', cursor: 'ew-resize' }, { pos: 'se', cursor: 'nwse-resize' }, { pos: 's', cursor: 'ns-resize' }, { pos: 'sw', cursor: 'nesw-resize' }, { pos: 'w', cursor: 'ew-resize' }, { pos: 'nw', cursor: 'nwse-resize' }];
    handles.forEach(handle => {
      const handleEl = document.createElement('div');
      handleEl.dataset.resizeHandle = handle.pos;
      handleEl.style.cssText = `position: absolute !important; width: 12px !important; height: 12px !important; background: ${config.borderColor} !important; border: 2px solid white !important; border-radius: 50% !important; pointer-events: all !important; z-index: 11 !important; cursor: ${handle.cursor} !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important; top: ${handle.pos.includes('n') ? '-6px' : handle.pos.includes('s') ? 'auto' : '50%'} !important; bottom: ${handle.pos.includes('s') ? '-6px' : 'auto'} !important; left: ${handle.pos.includes('w') ? '-6px' : handle.pos.includes('e') ? 'auto' : '50%'} !important; right: ${handle.pos.includes('e') ? '-6px' : 'auto'} !important; transform: translate(${handle.pos.includes('w') || handle.pos.includes('e') ? '0' : '-50%'}, ${handle.pos.includes('n') || handle.pos.includes('s') ? '0' : '-50%'}) !important;`;
      overlay.appendChild(handleEl);
    });

    const toolbar = document.createElement('div');
    toolbar.className = 'excalidraw-toolbar';
    toolbar.style.cssText = `position: absolute !important; top: -50px !important; left: auto !important; right: 0 !important; transform: none !important; background: white !important; border-radius: 12px !important; padding: 8px !important; display: flex !important; gap: 4px !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05) !important; pointer-events: all !important; z-index: 12 !important; backdrop-filter: blur(8px) !important; border: 1px solid rgba(255, 255, 255, 0.2) !important;`;

    const dragHandle = document.createElement('div');
    dragHandle.className = 'excalidraw-drag-handle';
    dragHandle.contentEditable = 'false';
    dragHandle.style.cssText = `position: absolute !important; top: -6px !important; left: 50% !important; transform: translateX(-50%) !important; width: 24px !important; height: 12px !important; background: ${config.borderColor} !important; border: 2px solid white !important; border-radius: 6px !important; pointer-events: all !important; z-index: 11 !important; cursor: move !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important; display: flex !important; align-items: center !important; justify-content: center !important;`;
    dragHandle.innerHTML = `<svg width="12" height="8" viewBox="0 0 12 8" fill="white"><circle cx="2" cy="2" r="1"/><circle cx="6" cy="2" r="1"/><circle cx="10" cy="2" r="1"/><circle cx="2" cy="6" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="10" cy="6" r="1"/></svg>`;
    overlay.appendChild(dragHandle);

    // Edit Button
    const editButton = document.createElement('button');
    editButton.dataset.editButton = 'true';
    editButton.title = 'Edit Design';
    editButton.innerHTML = getEditIcon();
    editButton.style.cssText = `width: 32px !important; height: 32px !important; border: none !important; background: transparent !important; color: #6b7280 !important; border-radius: 8px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: all 0.2s ease !important;`;
    toolbar.appendChild(editButton);

    const separator1 = document.createElement('div');
    separator1.style.cssText = 'width: 1px; height: 20px; background: #e5e7eb; margin: 6px 4px;';
    toolbar.appendChild(separator1);

    // Alignment Buttons
    const alignmentButtons = [{ type: 'left', title: 'Align Left' }, { type: 'center', title: 'Center' }, { type: 'right', title: 'Align Right' }, { type: 'none', title: 'Default' }];
    alignmentButtons.forEach(btn => {
      const button = document.createElement('button');
      button.dataset.floatType = btn.type;
      button.title = btn.title;
      button.innerHTML = getFloatIcon(btn.type);
      button.style.cssText = `width: 32px !important; height: 32px !important; border: none !important; background: transparent !important; color: #6b7280 !important; border-radius: 8px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: all 0.2s ease !important;`;
      toolbar.appendChild(button);
    });

    const separator2 = document.createElement('div');
    separator2.style.cssText = 'width: 1px; height: 20px; background: #e5e7eb; margin: 6px 4px;';
    toolbar.appendChild(separator2);

    // Delete Button
    const deleteButton = document.createElement('button');
    deleteButton.title = 'Delete';
    deleteButton.innerHTML = getDeleteIcon();
    deleteButton.dataset.deleteButton = 'true';
    deleteButton.style.cssText = `width: 32px !important; height: 32px !important; border: none !important; background: transparent !important; color: #ef4444 !important; border-radius: 8px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: all 0.2s ease !important;`;
    toolbar.appendChild(deleteButton);

    element.appendChild(overlay);
    element.appendChild(toolbar);

    setTimeout(() => applyButtonStates(element), 0);
  }, [applyButtonStates]);

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
    const setFloat = (element: HTMLElement, float: FloatType) => {
      propsRef.current.saveToHistory(true);
      element.dataset.float = float;
      
      element.style.float = 'none';
      element.style.clear = 'none';
      element.style.margin = '';

      switch (float) {
        case 'left':
          element.style.float = 'left';
          element.style.margin = '8px 24px 8px 0';
          break;
        case 'right':
          element.style.float = 'right';
          element.style.margin = '8px 0 8px 24px';
          break;
        case 'center':
          element.style.margin = '12px auto';
          element.style.clear = 'both';
          break;
        default: // 'none'
          element.style.margin = '12px 0';
          element.style.clear = 'both';
          break;
      }

      setTimeout(() => applyButtonStates(element), 50);
      setTimeout(() => propsRef.current.fullDocumentReflow(), 100);
    };

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

      const editButton = target.closest('button[data-edit-button]');
      if (editButton) {
        e.preventDefault();
        e.stopPropagation();
        // Trigger the React component to open the modal
        const reactComponent = currentSelection.querySelector('[data-excalidraw-component]');
        if (reactComponent) {
           // We dispatch a custom event that the hydration logic listens to
           currentSelection.dispatchEvent(new CustomEvent('openExcalidrawEditor'));
        }
        return;
      }

      const deleteButton = target.closest('button[data-delete-button]');
      if (deleteButton) {
        e.preventDefault();
        e.stopPropagation();
        const page = currentSelection.closest('.page') as HTMLElement;
        currentSelection.remove();
        setSelection(null);
        propsRef.current.onElementSelect?.(null);
        propsRef.current.saveToHistory(true);
        if (page) {
          propsRef.current.reflowBackwardFromPage(page);
        }
        return;
      }

      const actionButton = target.closest('button[data-float-type]');
      if (actionButton) {
        e.preventDefault();
        e.stopPropagation();
        const floatType = actionButton.getAttribute('data-float-type') as FloatType;
        setFloat(currentSelection, floatType);
        return;
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
        resizeStart.current = { 
          width: currentSelection.offsetWidth, 
          height: currentSelection.offsetHeight, 
          x: e.clientX, 
          y: e.clientY, 
          aspectRatio: currentSelection.offsetWidth / currentSelection.offsetHeight 
        };
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !selectionRef.current) return;
      const { width, height, x, y, aspectRatio } = resizeStart.current;
      const handle = resizeHandleRef.current;
      const dx = e.clientX - x;
      const dy = e.clientY - y;
      
      const pageContent = selectionRef.current.closest('.page-content') as HTMLElement;
      const maxWidth = pageContent ? pageContent.clientWidth : 800;

      let newWidth = width;
      let newHeight = height;

      if (handle?.includes('e')) {
        newWidth = width + dx;
        newHeight = newWidth / aspectRatio;
      } else if (handle?.includes('w')) {
        newWidth = width - dx;
        newHeight = newWidth / aspectRatio;
      } else if (handle?.includes('s')) {
        newHeight = height + dy;
        newWidth = newHeight * aspectRatio;
      } else if (handle?.includes('n')) {
        newHeight = height - dy;
        newWidth = newHeight * aspectRatio;
      } else {
        newWidth = width + dx;
        newHeight = newWidth / aspectRatio;
      }

      newWidth = Math.max(100, Math.min(newWidth, maxWidth));
      newHeight = newWidth / aspectRatio;
      
      // FIX: Set BOTH width and height explicitly to maintain aspect ratio
      selectionRef.current.style.width = `${newWidth}px`;
      selectionRef.current.style.height = `${newHeight}px`;
      
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
  }, [pageContainerRef, createControls, cleanupControls, applyButtonStates]);

  return null;
};