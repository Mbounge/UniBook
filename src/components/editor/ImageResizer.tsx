//src/components/editor/ImageResizer.tsx

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- HELPER FUNCTIONS (unchanged) ---
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

const getDeleteIcon = () => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"></polyline><path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;


// --- ImageResizer Component ---
interface ImageResizerProps {
  pageContainerRef: React.RefObject<HTMLDivElement | null>;
  saveToHistory: (force?: boolean) => void;
  // --- MODIFICATION: Make props generic ---
  selectedElement?: HTMLElement | null;
  onElementSelect?: (element: HTMLElement | null) => void;
}

type ImageFloat = 'none' | 'left' | 'right' | 'center';

export const ImageResizer: React.FC<ImageResizerProps> = ({ 
  pageContainerRef,
  saveToHistory, 
  selectedElement,
  onElementSelect 
}) => {
  const [selection, setSelection] = useState<HTMLElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  
  const selectionRef = useRef<HTMLElement | null>(null);
  const isResizingRef = useRef(false);
  const propsRef = useRef({ saveToHistory, onElementSelect });

  const resizeHandleRef = useRef<string | null>(null);
  const resizeStart = useRef({ width: 0, height: 0, x: 0, y: 0, aspectRatio: 1 });
  const previousSelection = useRef<HTMLElement | null>(null);
  const captionBlurHandlerRef = useRef<(() => void) | null>(null);

  const buttonStatesRef = useRef<{
    float: ImageFloat;
    hasCaption: boolean;
  }>({ float: 'none', hasCaption: false });

  useEffect(() => {
    propsRef.current = { saveToHistory, onElementSelect };
  }, [saveToHistory, onElementSelect]);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    isResizingRef.current = isResizing;
  }, [isResizing]);

  useEffect(() => {
    // --- MODIFICATION: Use generic selectedElement prop ---
    const newSelection = selectedElement ? selectedElement.closest('.image-wrapper, .template-wrapper') as HTMLElement : null;
    setSelection(newSelection);
  }, [selectedElement]);

  // ... (rest of the component is unchanged) ...
  const applyButtonStates = useCallback((element: HTMLElement, force: boolean = false) => {
    const toolbar = element.querySelector('.image-toolbar, .template-toolbar');
    if (!toolbar) return;
    const isImage = element.classList.contains('image-wrapper');
    const borderColor = isImage ? '#3b82f6' : '#8b5cf6';
    const currentFloat = (element.dataset.float || 'none') as ImageFloat;
    const currentHasCaption = !!element.querySelector('figcaption');
    buttonStatesRef.current = { float: currentFloat, hasCaption: currentHasCaption };
    toolbar.querySelectorAll('button[data-float-type]').forEach(btn => {
      const button = btn as HTMLElement;
      const buttonType = button.dataset.floatType as ImageFloat;
      const isActive = currentFloat === buttonType;
      button.style.setProperty('background', isActive ? borderColor : 'transparent', 'important');
      button.style.setProperty('color', isActive ? 'white' : '#6b7280', 'important');
    });
    if (isImage) {
      const captionButton = toolbar.querySelector('button[data-caption-button]') as HTMLButtonElement;
      if (captionButton) {
        captionButton.title = currentHasCaption ? 'Remove Caption' : 'Add Caption';
        captionButton.style.setProperty('background', currentHasCaption ? borderColor : 'transparent', 'important');
        captionButton.style.setProperty('color', currentHasCaption ? 'white' : '#6b7280', 'important');
      }
    }
  }, []);

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
      const overlay = currentSelection.querySelector('.image-resize-overlay, .template-resize-overlay');
      const toolbar = currentSelection.querySelector('.image-toolbar, .template-toolbar');
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
        applyButtonStates(currentSelection, true);
        const caption = currentSelection.querySelector('figcaption');
        if (caption && caption.textContent?.trim() === '' && caption.innerHTML !== '') {
          caption.innerHTML = '';
        }
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [applyButtonStates]);

  const cleanupControls = useCallback((element: HTMLElement | null) => {
    if (!element || !document.body.contains(element)) return;
    disconnectCaptionListener();
    const overlay = element.querySelector('.image-resize-overlay, .template-resize-overlay');
    const toolbar = element.querySelector('.image-toolbar, .template-toolbar');
    if (overlay) overlay.remove();
    if (toolbar) toolbar.remove();
    element.classList.remove('template-selected');
    element.style.opacity = '';
  }, [disconnectCaptionListener]);

  const createControls = useCallback((element: HTMLElement) => {
    if (element.querySelector('.image-resize-overlay, .template-resize-overlay')) return;
    const isImage = element.classList.contains('image-wrapper');
    const isTemplate = element.classList.contains('template-wrapper');

    if (isImage || isTemplate) {
      element.draggable = true;
      element.ondragstart = (e) => {
        if ((e.target as HTMLElement).closest('[data-resize-handle]')) {
          e.preventDefault();
          return;
        }
        if (e.dataTransfer) {
          const id = `drag-${isImage ? 'img' : 'template'}-${Date.now()}`;
          element.id = id;
          e.dataTransfer.effectAllowed = 'move';
          if (isImage) {
            e.dataTransfer.setData('application/custom-element-id', id);
          } else {
            e.dataTransfer.setData('application/custom-template-id', id);
          }
          e.dataTransfer.setData('text/plain', id);

          const dragImage = element.cloneNode(true) as HTMLElement;
          dragImage.querySelector('.image-resize-overlay, .template-resize-overlay')?.remove();
          dragImage.querySelector('.image-toolbar, .template-toolbar')?.remove();
          
          dragImage.style.position = 'absolute';
          dragImage.style.top = '-1000px';
          dragImage.style.width = `${element.offsetWidth}px`;
          dragImage.style.background = 'white';
          dragImage.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
          dragImage.style.borderRadius = '8px';
          dragImage.style.opacity = '0.9';
          
          document.body.appendChild(dragImage);
          e.dataTransfer.setDragImage(dragImage, 20, 20);
          
          setTimeout(() => {
            document.body.removeChild(dragImage);
          }, 0);

          setTimeout(() => { element.style.display = 'none'; }, 0);
        }
      };
      element.ondragend = () => {
        element.style.display = 'block';
        if (element.id.startsWith('drag-')) {
          element.removeAttribute('id');
        }
      };
    }

    const config = { borderColor: isImage ? '#3b82f6' : '#8b5cf6' };
    element.style.position = 'relative';
    element.style.opacity = '1';
    if (isTemplate) element.classList.add('template-selected');
    const overlay = document.createElement('div');
    overlay.className = isImage ? 'image-resize-overlay' : 'template-resize-overlay';
    overlay.style.cssText = `position: absolute !important; top: -2px !important; left: -2px !important; right: -2px !important; bottom: -2px !important; border: 2px solid ${config.borderColor} !important; border-radius: 8px !important; pointer-events: none !important; z-index: 10 !important; box-shadow: 0 0 0 1px ${config.borderColor}1A, 0 4px 12px ${config.borderColor}26 !important;`;
    const handles = [{ pos: 'n', cursor: 'ns-resize' }, { pos: 'ne', cursor: 'nesw-resize' }, { pos: 'e', cursor: 'ew-resize' }, { pos: 'se', cursor: 'nwse-resize' }, { pos: 's', cursor: 'ns-resize' }, { pos: 'sw', cursor: 'nesw-resize' }, { pos: 'w', cursor: 'ew-resize' }, { pos: 'nw', cursor: 'nwse-resize' }];
    handles.forEach(handle => {
      const handleEl = document.createElement('div');
      handleEl.dataset.resizeHandle = handle.pos;
      handleEl.style.cssText = `position: absolute !important; width: 12px !important; height: 12px !important; background: ${config.borderColor} !important; border: 2px solid white !important; border-radius: 50% !important; pointer-events: all !important; z-index: 11 !important; cursor: ${handle.cursor} !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important; top: ${handle.pos.includes('n') ? '-6px' : handle.pos.includes('s') ? 'auto' : '50%'} !important; bottom: ${handle.pos.includes('s') ? '-6px' : 'auto'} !important; left: ${handle.pos.includes('w') ? '-6px' : handle.pos.includes('e') ? 'auto' : '50%'} !important; right: ${handle.pos.includes('e') ? '-6px' : 'auto'} !important; transform: translate(${handle.pos.includes('w') || handle.pos.includes('e') ? '0' : '-50%'}, ${handle.pos.includes('n') || handle.pos.includes('s') ? '0' : '-50%'}) !important;`;
      overlay.appendChild(handleEl);
    });
    const toolbar = document.createElement('div');
    toolbar.className = isImage ? 'image-toolbar' : 'template-toolbar';
    toolbar.style.cssText = `position: absolute !important; top: -50px !important; left: auto !important; right: 0 !important; transform: none !important; background: white !important; border-radius: 12px !important; padding: 8px !important; display: flex !important; gap: 4px !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05) !important; pointer-events: all !important; z-index: 12 !important; backdrop-filter: blur(8px) !important; border: 1px solid rgba(255, 255, 255, 0.2) !important;`;
    if (isImage || isTemplate) {
      const dragHandle = document.createElement('div');
      dragHandle.className = isImage ? 'image-drag-handle' : 'template-drag-handle';
      dragHandle.contentEditable = 'false';
      dragHandle.style.cssText = `position: absolute !important; top: -6px !important; left: 50% !important; transform: translateX(-50%) !important; width: 24px !important; height: 12px !important; background: ${config.borderColor} !important; border: 2px solid white !important; border-radius: 6px !important; pointer-events: all !important; z-index: 11 !important; cursor: move !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important; display: flex !important; align-items: center !important; justify-content: center !important;`;
      dragHandle.innerHTML = `<svg width="12" height="8" viewBox="0 0 12 8" fill="white"><circle cx="2" cy="2" r="1"/><circle cx="6" cy="2" r="1"/><circle cx="10" cy="2" r="1"/><circle cx="2" cy="6" r="1"/><circle cx="6" cy="6" r="1"/><circle cx="10" cy="6" r="1"/></svg>`;
      overlay.appendChild(dragHandle);
    }
    const alignmentButtons = [{ type: 'left', title: 'Align Left' }, { type: 'center', title: 'Center' }, { type: 'right', title: 'Align Right' }, { type: 'none', title: 'Default' }];
    alignmentButtons.forEach(btn => {
      const button = document.createElement('button');
      button.dataset.floatType = btn.type;
      button.title = btn.title;
      button.innerHTML = getFloatIcon(btn.type);
      button.style.cssText = `width: 32px !important; height: 32px !important; border: none !important; background: transparent !important; color: #6b7280 !important; border-radius: 8px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: all 0.2s ease !important;`;
      toolbar.appendChild(button);
    });
    if (isImage) {
      const captionButton = document.createElement('button');
      captionButton.dataset.captionButton = 'true';
      captionButton.title = 'Add Caption';
      captionButton.innerHTML = getCaptionIcon();
      captionButton.style.cssText = `width: 32px !important; height: 32px !important; border: none !important; background: transparent !important; color: #6b7280 !important; border-radius: 8px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: all 0.2s ease !important;`;
      toolbar.insertBefore(captionButton, toolbar.firstChild);
    }
    const separator = document.createElement('div');
    separator.style.cssText = 'width: 1px; height: 20px; background: #e5e7eb; margin: 6px 4px;';
    toolbar.appendChild(separator);
    const deleteButton = document.createElement('button');
    deleteButton.title = 'Delete';
    deleteButton.innerHTML = getDeleteIcon();
    deleteButton.dataset.deleteButton = 'true';
    deleteButton.style.cssText = `width: 32px !important; height: 32px !important; border: none !important; background: transparent !important; color: #ef4444 !important; border-radius: 8px !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: all 0.2s ease !important;`;
    toolbar.appendChild(deleteButton);
    element.appendChild(overlay);
    element.appendChild(toolbar);
    
    const existingCaption = element.querySelector('figcaption');
    if (existingCaption) {
      setupCaptionListener(existingCaption as HTMLElement);
    }

    setTimeout(() => applyButtonStates(element), 0);
  }, [applyButtonStates, setupCaptionListener]);

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
    const setFloat = (element: HTMLElement, float: ImageFloat) => {
      propsRef.current.saveToHistory(true);
      element.dataset.float = float;
      const isTemplate = element.classList.contains('template-wrapper');

      element.style.float = 'none';
      element.style.clear = 'none';
      element.style.margin = '';

      switch (float) {
        case 'left':
          element.style.float = 'left';
          element.style.margin = isTemplate ? '8px 24px 8px 0' : '8px 16px 8px 0';
          break;
        case 'right':
          element.style.float = 'right';
          element.style.margin = isTemplate ? '8px 0 8px 24px' : '8px 0 8px 16px';
          break;
        case 'center':
          element.style.margin = '12px auto';
          if (isTemplate) {
            element.style.clear = 'both';
          }
          break;
        default: // 'none'
          element.style.margin = '12px 0';
          if (isTemplate) {
            element.style.clear = 'both';
          }
          break;
      }

      setTimeout(() => applyButtonStates(element, true), 50);
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
      const actionButton = target.closest('button[data-caption-button], button[data-delete-button], button[data-float-type]');
      if (actionButton && currentSelection) {
        e.preventDefault();
        e.stopPropagation();
        if (actionButton.hasAttribute('data-caption-button')) {
          const existingCaption = currentSelection.querySelector('figcaption');
          if (existingCaption) {
            disconnectCaptionListener();
            existingCaption.remove();
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
          setTimeout(() => applyButtonStates(currentSelection, true), 10);
          propsRef.current.saveToHistory(true);
        } else if (actionButton.hasAttribute('data-delete-button')) {
          currentSelection.remove();
          setSelection(null);
          propsRef.current.onElementSelect?.(null);
          propsRef.current.saveToHistory(true);
        } else if (actionButton.hasAttribute('data-float-type')) {
          const floatType = actionButton.getAttribute('data-float-type') as ImageFloat;
          setFloat(currentSelection, floatType);
        }
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
        const img = currentSelection.querySelector('img');
        const aspectRatio = img ? (img.naturalHeight / img.naturalWidth) : 1;
        resizeStart.current = { width: currentSelection.offsetWidth, height: currentSelection.offsetHeight, x: e.clientX, y: e.clientY, aspectRatio };
        return;
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !selectionRef.current) return;
      const { width, height, x, y, aspectRatio } = resizeStart.current;
      const handle = resizeHandleRef.current;
      const dx = e.clientX - x;
      const dy = e.clientY - y;
      
      const isTemplate = selectionRef.current.classList.contains('template-wrapper');
      const pageContent = selectionRef.current.closest('.page-content') as HTMLElement;
      const maxWidth = pageContent ? pageContent.clientWidth : 800;

      if (isTemplate) {
        let newWidth = width;

        if (handle?.includes('e')) {
          newWidth = width + dx;
        } else if (handle?.includes('w')) {
          newWidth = width - dx;
        } else {
          newWidth = width + dx;
        }

        newWidth = Math.max(200, Math.min(newWidth, maxWidth));

        const templateBlock = selectionRef.current.querySelector('.template-block') as HTMLElement;
        if (templateBlock) {
            templateBlock.style.width = `${newWidth}px`;
            templateBlock.style.height = 'auto';
        }
        
        selectionRef.current.style.width = 'fit-content';
        selectionRef.current.style.height = 'auto';

      } else {
        const maintainAspectRatio = e.shiftKey;
        let newWidth = width;
        let newHeight = height;
        
        if (maintainAspectRatio) {
          if (handle?.includes('e') && !handle.includes('n') && !handle.includes('s')) {
            newWidth = width + dx;
            newHeight = newWidth * aspectRatio;
          } else if (handle?.includes('w') && !handle.includes('n') && !handle.includes('s')) {
            newWidth = width - dx;
            newHeight = newWidth * aspectRatio;
          } else if (handle?.includes('s') && !handle.includes('e') && !handle.includes('w')) {
            newHeight = height + dy;
            newWidth = newHeight / aspectRatio;
          } else if (handle?.includes('n') && !handle.includes('e') && !handle.includes('w')) {
            newHeight = height - dy;
            newWidth = newHeight / aspectRatio;
          } else {
            if (handle?.includes('e')) {
              newWidth = width + dx;
            } else if (handle?.includes('w')) {
              newWidth = width - dx;
            }
            newHeight = newWidth * aspectRatio;
          }
        } else {
          if (handle?.includes('e')) newWidth = width + dx;
          if (handle?.includes('w')) newWidth = width - dx;
          if (handle?.includes('s')) newHeight = height + dy;
          if (handle?.includes('n')) newHeight = height - dy;
        }

        newWidth = Math.max(50, Math.min(newWidth, maxWidth));
        newHeight = Math.max(50, newHeight);
        
        const img = selectionRef.current.querySelector('img');
        if (img) {
          img.style.width = `${newWidth}px`;
          img.style.height = `${newHeight}px`;
        }
        selectionRef.current.style.width = `${newWidth}px`;
        selectionRef.current.style.height = `${newHeight}px`;
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
  }, [pageContainerRef, createControls, cleanupControls, applyButtonStates, disconnectCaptionListener, setupCaptionListener]);

  return null;
};