//src/components/editor/GraphResizer.tsx

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GraphData } from './GraphBlock';

// --- HELPER FUNCTIONS ---
const getFloatIcon = (type: string) => {
  const icons = {
    left: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>',
    center: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>',
    right: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>',
    none: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>'
  };
  return icons[type as keyof typeof icons] || icons.none;
};

const getCaptionIcon = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.5"/><path d="M16 2v4"/><path d="M21 14H8"/><path d="M21 18H8"/><path d="M10 10h.01"/><path d="M10 6h.01"/></svg>`;

// --- GraphResizer Component ---
interface GraphResizerProps {
  pageContainerRef: React.RefObject<HTMLDivElement | null>;
  saveToHistory: (force?: boolean) => void;
  selectedGraphElement?: HTMLElement | null;
  onGraphSelect?: (element: HTMLElement | null) => void;
}

type GraphFloat = 'none' | 'left' | 'right' | 'center';

export const GraphResizer: React.FC<GraphResizerProps> = ({ 
  pageContainerRef,
  saveToHistory, 
  selectedGraphElement,
  onGraphSelect 
}) => {
  const [selection, setSelection] = useState<HTMLElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  
  const selectionRef = useRef<HTMLElement | null>(null);
  const isResizingRef = useRef(false);
  const propsRef = useRef({ saveToHistory, onGraphSelect });

  const resizeHandleRef = useRef<string | null>(null);
  const resizeStart = useRef({ width: 0, height: 0, x: 0, y: 0, aspectRatio: 1 });
  const previousSelection = useRef<HTMLElement | null>(null);
  const captionBlurHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    propsRef.current = { saveToHistory, onGraphSelect };
  }, [saveToHistory, onGraphSelect]);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    isResizingRef.current = isResizing;
  }, [isResizing]);

  useEffect(() => {
    //console.log("[GraphResizer] selectedGraphElement prop changed:", selectedGraphElement);
    const newSelection = selectedGraphElement ? selectedGraphElement.closest('.graph-wrapper') as HTMLElement : null;
    setSelection(newSelection);
  }, [selectedGraphElement]);

  const setupCaptionListener = useCallback((captionElement: HTMLElement) => {
    const handleBlur = () => {
      if (captionElement.textContent?.trim() === '') {
        captionElement.innerHTML = '';
      }
    };

    captionElement.addEventListener('blur', handleBlur);
    captionBlurHandlerRef.current = handleBlur;
  }, []);

  const disconnectCaptionListener = useCallback(() => {
    const captionElement = selectionRef.current?.querySelector('figcaption');
    if (captionElement && captionBlurHandlerRef.current) {
      captionElement.removeEventListener('blur', captionBlurHandlerRef.current);
      captionBlurHandlerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      const currentSelection = selectionRef.current;
      if (!currentSelection) return;
      const overlay = currentSelection.querySelector('.graph-resize-overlay');
      const toolbar = currentSelection.querySelector('.graph-toolbar');
      if (!overlay || !toolbar) return;
      const activeSelection = window.getSelection();
      if (!activeSelection || activeSelection.rangeCount === 0) return;
      const anchorNode = activeSelection.anchorNode;
      if (!anchorNode) return;
      const parentNode = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentNode : anchorNode;
      const isEditingCaption = parentNode && parentNode.nodeName === 'FIGCAPTION' && currentSelection.contains(parentNode);
      if (isEditingCaption) {
        (overlay as HTMLElement).style.visibility = 'hidden';
        (toolbar as HTMLElement).style.visibility = 'hidden';
      } else {
        (overlay as HTMLElement).style.visibility = 'visible';
        (toolbar as HTMLElement).style.visibility = 'visible';
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const cleanupControls = useCallback((element: HTMLElement | null) => {
    if (!element || !document.body.contains(element)) return;
    //console.log("[GraphResizer] Cleaning up controls for:", element);
    disconnectCaptionListener();
    const overlay = element.querySelector('.graph-resize-overlay');
    const toolbar = element.querySelector('.graph-toolbar');
    if (overlay) overlay.remove();
    if (toolbar) toolbar.remove();
    element.classList.remove('graph-selected');
    element.style.opacity = '';
  }, [disconnectCaptionListener]);

  const updateToolbarButtonStates = useCallback((element: HTMLElement, float: GraphFloat, hasCaption: boolean) => {
    const toolbar = element.querySelector('.graph-toolbar');
    if (!toolbar) return;
    toolbar.querySelectorAll('button[data-float-type]').forEach(btn => {
      const button = btn as HTMLElement;
      const buttonType = button.dataset.floatType;
      const isActive = float === buttonType;
      button.style.background = isActive ? '#8b5cf6' : 'transparent';
      button.style.color = isActive ? 'white' : '#6b7280';
    });
    const captionButton = toolbar.querySelector('button[data-caption-button]') as HTMLButtonElement;
    if (captionButton) {
      captionButton.title = hasCaption ? 'Remove Caption' : 'Add Caption';
      captionButton.style.background = hasCaption ? '#8b5cf6' : 'transparent';
      captionButton.style.color = hasCaption ? 'white' : '#6b7280';
    }
  }, []);

  const createControls = useCallback((element: HTMLElement) => {
    if (element.querySelector('.graph-resize-overlay')) return;
    //console.log("[GraphResizer] Creating controls for:", element);
    element.draggable = true;
    element.ondragstart = (e) => {
      if ((e.target as HTMLElement).closest('[data-resize-handle]')) {
        e.preventDefault();
        return;
      }
      if (e.dataTransfer) {
        const id = `drag-graph-${Date.now()}`;
        element.id = id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/custom-graph-id', id);
        e.dataTransfer.setData('text/plain', id); 
        setTimeout(() => { element.style.display = 'none'; }, 0);
      }
    };
    element.ondragend = () => {
      element.style.display = 'block';
      if (element.id.startsWith('drag-graph-')) {
        element.removeAttribute('id');
      }
    };
    const config = { borderColor: '#8b5cf6' };
    element.style.position = 'relative';
    element.style.opacity = '1';
    element.classList.add('graph-selected');
    const overlay = document.createElement('div');
    overlay.className = 'graph-resize-overlay';
    overlay.style.cssText = `position: absolute !important; top: -2px !important; left: -2px !important; right: -2px !important; bottom: -2px !important; border: 2px solid ${config.borderColor} !important; border-radius: 8px !important; pointer-events: none !important; z-index: 10 !important; box-shadow: 0 0 0 1px ${config.borderColor}1A, 0 4px 12px ${config.borderColor}26 !important;`;
    const handles = [{ pos: 'n', cursor: 'ns-resize' }, { pos: 'ne', cursor: 'nesw-resize' }, { pos: 'e', cursor: 'ew-resize' }, { pos: 'se', cursor: 'nwse-resize' }, { pos: 's', cursor: 'ns-resize' }, { pos: 'sw', cursor: 'nesw-resize' }, { pos: 'w', cursor: 'ew-resize' }, { pos: 'nw', cursor: 'nwse-resize' }];
    handles.forEach(handle => {
      const handleEl = document.createElement('div');
      handleEl.dataset.resizeHandle = handle.pos;
      handleEl.style.cssText = `position: absolute !important; width: 12px !important; height: 12px !important; background: ${config.borderColor} !important; border: 2px solid white !important; border-radius: 50% !important; pointer-events: all !important; z-index: 11 !important; cursor: ${handle.cursor} !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important; top: ${handle.pos.includes('n') ? '-6px' : handle.pos.includes('s') ? 'auto' : '50%'} !important; bottom: ${handle.pos.includes('s') ? '-6px' : 'auto'} !important; left: ${handle.pos.includes('w') ? '-6px' : handle.pos.includes('e') ? 'auto' : '50%'} !important; right: ${handle.pos.includes('e') ? '-6px' : 'auto'} !important; transform: translate(${handle.pos.includes('w') || handle.pos.includes('e') ? '0' : '-50%'}, ${handle.pos.includes('n') || handle.pos.includes('s') ? '0' : '-50%'}) !important;`;
      overlay.appendChild(handleEl);
    });
    const toolbar = document.createElement('div');
    toolbar.className = 'graph-toolbar';
    toolbar.style.cssText = `position: absolute !important; top: -50px !important; left: auto !important; right: 0 !important; transform: none !important; background: white !important; border-radius: 12px !important; padding: 8px !important; display: flex !important; gap: 4px !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05) !important; pointer-events: all !important; z-index: 12 !important; backdrop-filter: blur(8px) !important; border: 1px solid rgba(255, 255, 255, 0.2) !important;`;
    const dragHandle = document.createElement('div');
    dragHandle.className = 'graph-drag-handle';
    dragHandle.contentEditable = 'false';
    dragHandle.style.cssText = `position: absolute !important; top: -6px !important; left: 50% !important; transform: translateX(-50%) !important; width: 24px !important; height: 12px !important; background: ${config.borderColor} !important; border: 2px solid white !important; border-radius: 6px !important; pointer-events: all !important; z-index: 11 !important; cursor: move !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important; display: flex !important; align-items: center !important; justify-content: center !important;`;
    dragHandle.innerHTML = `<svg width="12" height="8" viewBox="0 0 12 8" fill="white"><circle cx="2" cy="2" r="1"/><circle cx="6" cy="2" r="1"/><circle cx="10" cy="2" r="1"/><circle cx="2" cy="6" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="10" cy="6" r="1"/></svg>`;
    overlay.appendChild(dragHandle);
    const alignmentButtons = [{ type: 'left', title: 'Align Left' }, { type: 'center', title: 'Center' }, { type: 'right', title: 'Align Right' }, { type: 'none', title: 'Default' }];
    alignmentButtons.forEach(btn => {
      const button = document.createElement('button');
      const isActive = element.dataset.float === btn.type;
      button.dataset.floatType = btn.type;
      button.title = btn.title;
      button.innerHTML = getFloatIcon(btn.type);
      button.style.cssText = `width: 32px !important; height: 32px !important; border: none !important; background: ${isActive ? config.borderColor : 'transparent'} !important; color: ${isActive ? 'white' : '#6b7280'} !important; border-radius: 8px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important;`;
      toolbar.appendChild(button);
    });
    const captionButton = document.createElement('button');
    captionButton.dataset.captionButton = 'true';
    const hasCaption = !!element.querySelector('figcaption');
    captionButton.title = hasCaption ? 'Remove Caption' : 'Add Caption';
    captionButton.innerHTML = getCaptionIcon();
    captionButton.style.cssText = `width: 32px !important; height: 32px !important; border: none !important; background: ${hasCaption ? config.borderColor : 'transparent'} !important; color: ${hasCaption ? 'white' : '#6b7280'} !important; border-radius: 8px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important;`;
    toolbar.insertBefore(captionButton, toolbar.firstChild);
    element.appendChild(overlay);
    element.appendChild(toolbar);

    const existingCaption = element.querySelector('figcaption');
    if (existingCaption) {
      setupCaptionListener(existingCaption as HTMLElement);
    }
  }, [setupCaptionListener]);

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
    const setFloat = (element: HTMLElement, float: GraphFloat) => {
      propsRef.current.saveToHistory(true);
      element.dataset.float = float;
      
      element.style.float = 'none';
      element.style.margin = '';

      switch (float) {
        case 'left':
          element.style.float = 'left';
          element.style.margin = '8px 16px 8px 0';
          break;
        case 'right':
          element.style.float = 'right';
          element.style.margin = '8px 0 8px 16px';
          break;
        case 'center':
          element.style.margin = '12px auto';
          break;
        default: // 'none'
          element.style.margin = '12px 0';
          break;
      }

      const hasCaption = !!element.querySelector('figcaption');
      updateToolbarButtonStates(element, float, hasCaption);
      setTimeout(() => propsRef.current.saveToHistory(true), 100);
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        propsRef.current.saveToHistory(true);
      }
      setIsResizing(false);
      resizeHandleRef.current = null;
    };

    const handleActionClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const currentSelection = selectionRef.current;
      if (!currentSelection) return;
      const captionButton = target.closest('button[data-caption-button]');
      if (captionButton) {
        e.preventDefault();
        e.stopPropagation();
        const existingCaption = currentSelection.querySelector('figcaption');
        if (existingCaption) {
          disconnectCaptionListener();
          existingCaption.remove();
          updateToolbarButtonStates(currentSelection, currentSelection.dataset.float as GraphFloat || 'none', false);
        } else {
          const figcaption = document.createElement('figcaption');
          figcaption.contentEditable = 'true';
          figcaption.style.cssText = 'margin-top: 8px; font-size: 14px; color: #6b7280; text-align: inherit; display: block; white-space: normal;';
          currentSelection.appendChild(figcaption);
          setupCaptionListener(figcaption);

          const nextEl = currentSelection.nextElementSibling;
          if (!nextEl || !['P', 'H1', 'H2', 'H3', 'H4'].includes(nextEl.tagName)) {
              const newPara = document.createElement('p');
              newPara.innerHTML = '<br>';
              currentSelection.insertAdjacentElement('afterend', newPara);
          }
          
          updateToolbarButtonStates(currentSelection, currentSelection.dataset.float as GraphFloat || 'none', true);
          setTimeout(() => {
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(figcaption);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
            figcaption.focus();
          }, 10);
        }
        propsRef.current.saveToHistory(true);
        return;
      }
      const actionButton = target.closest('button[data-float-type]');
      if (actionButton) {
        e.preventDefault();
        e.stopPropagation();
        const floatType = actionButton.getAttribute('data-float-type') as GraphFloat;
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
        const aspectRatio = currentSelection.offsetHeight / currentSelection.offsetWidth;
        resizeStart.current = { width: currentSelection.offsetWidth, height: currentSelection.offsetHeight, x: e.clientX, y: e.clientY, aspectRatio };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !selectionRef.current) return;
      const { width, height, x, y, aspectRatio } = resizeStart.current;
      const handle = resizeHandleRef.current;
      const dx = e.clientX - x;
      const dy = e.clientY - y;
      let newWidth = width;

      if (handle?.includes('e')) {
        newWidth = width + dx;
      } else if (handle?.includes('w')) {
        newWidth = width - dx;
      } else if (handle?.includes('s')) {
        const newHeight = height + dy;
        newWidth = newHeight / aspectRatio;
      } else if (handle?.includes('n')) {
        const newHeight = height - dy;
        newWidth = newHeight / aspectRatio;
      } else { // Corner handles
        newWidth = width + dx;
      }

      const pageContent = selectionRef.current.closest('.page-content') as HTMLElement;
      const maxWidth = pageContent ? pageContent.clientWidth : 800;

      newWidth = Math.max(50, Math.min(newWidth, maxWidth));
      const newHeight = newWidth * aspectRatio;

      try {
        const graphData = JSON.parse(selectionRef.current.dataset.graph || '{}') as GraphData;
        const newGraphData = { ...graphData, width: newWidth, height: newHeight };
        selectionRef.current.dataset.graph = JSON.stringify(newGraphData);
        selectionRef.current.style.width = `${newWidth}px`;
        selectionRef.current.dispatchEvent(new CustomEvent('updateGraph', { detail: newGraphData }));
      } catch (error) {
        console.error("Failed to update graph data on resize:", error);
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
      disconnectCaptionListener();
    };
  }, [pageContainerRef, createControls, cleanupControls, updateToolbarButtonStates, disconnectCaptionListener, setupCaptionListener]);

  return null;
};