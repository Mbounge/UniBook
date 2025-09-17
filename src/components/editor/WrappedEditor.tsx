"use client";

import React, { useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useState } from 'react';

// --- Types and Interfaces ---
export interface EditorController {
  applyFormatting: (command: string, value?: string) => void;
  insertImage: (imageData: { src: string; width: number; height: number; alt: string }) => void;
}

interface WrappedEditorProps {
  initialContent: string;
  onSelectionChange: (formats: ActiveFormats) => void;
  onPageCountChange: (pageInfo: { current: number, total: number }) => void;
}

export interface ActiveFormats {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  fontName: string;
  fontSize: string;
}

// --- The Main Component ---
export const WrappedEditor = forwardRef<EditorController, WrappedEditorProps>(
  ({ initialContent, onSelectionChange, onPageCountChange }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);

    // --- CORE EDITOR COMMANDS (Exposed via ref) ---
    useImperativeHandle(ref, () => ({
      applyFormatting(command: string, value?: string) {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
      },
      insertImage(imageData) {
        const editor = editorRef.current;
        if (!editor) return;
        const selection = window.getSelection();
        let range: Range;

        if (selection && selection.rangeCount > 0 && editor.contains(selection.getRangeAt(0).commonAncestorContainer)) {
          range = selection.getRangeAt(0);
        } else {
          range = document.createRange();
          range.selectNodeContents(editor);
          range.collapse(false);
        }

        const img = document.createElement('img');
        img.src = imageData.src;
        img.alt = imageData.alt;
        img.className = 'editor-image';
        img.style.cssText = `width: ${imageData.width}px; height: ${imageData.height}px; max-width: 100%; display: block;`;
        img.contentEditable = 'false';
        img.draggable = false;

        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        wrapper.style.cssText = `display: inline-block; position: relative; width: ${imageData.width}px; height: ${imageData.height}px;`;
        wrapper.contentEditable = 'false';
        wrapper.appendChild(img);

        range.deleteContents();
        range.insertNode(wrapper);
        const spaceNode = document.createTextNode('\u00A0');
        range.setStartAfter(wrapper);
        range.insertNode(spaceNode);
        range.setStartAfter(spaceNode);
        range.collapse(true);

        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        editor.focus();
      },
    }));

    // --- PAGE & SELECTION STATE REPORTING ---
    const reportSelectionState = useCallback(() => {
      onSelectionChange({
        isBold: document.queryCommandState('bold'),
        isItalic: document.queryCommandState('italic'),
        isUnderline: document.queryCommandState('underline'),
        align: document.queryCommandState('justifyLeft') ? 'left' :
               document.queryCommandState('justifyCenter') ? 'center' :
               document.queryCommandState('justifyRight') ? 'right' : 'justify',
        fontName: document.queryCommandValue('fontName').replace(/['"]/g, ''),
        fontSize: document.queryCommandValue('fontSize'),
      });
    }, [onSelectionChange]);

    const reportPageCount = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;
        const pageHeight = 1056;
        const total = Math.max(1, Math.ceil(editor.scrollHeight / pageHeight));
        let current = 1;
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (editor.contains(range.commonAncestorContainer)) {
                const cursorY = range.getBoundingClientRect().top - editor.getBoundingClientRect().top;
                current = Math.max(1, Math.floor(cursorY / pageHeight) + 1);
            }
        }
        onPageCountChange({ current, total });
    }, [onPageCountChange]);


    // --- IMAGE RESIZER LOGIC (Integrated directly) ---
    const updateOverlayPosition = useCallback(() => {
        if (!selectedImage || !overlayRef.current) return;
        const rect = selectedImage.getBoundingClientRect();
        overlayRef.current.style.left = `${rect.left + window.scrollX}px`;
        overlayRef.current.style.top = `${rect.top + window.scrollY}px`;
        overlayRef.current.style.width = `${rect.width}px`;
        overlayRef.current.style.height = `${rect.height}px`;
    }, [selectedImage]);

    // This effect manages the entire lifecycle of the editor's event listeners
    useEffect(() => {
      const editor = editorRef.current;
      if (!editor) return;

      // Set initial content if editor is empty
      if (editor.innerHTML === '') {
        editor.innerHTML = initialContent;
      }

      const isResizing = { current: false };
      const resizeStart = { width: 0, height: 0, x: 0, y: 0 };

      const handleMouseDown = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('editor-image')) {
          e.preventDefault();
          setSelectedImage(target as HTMLImageElement);
        } else if (target.dataset.handle && selectedImage) {
          e.preventDefault();
          isResizing.current = true;
          const rect = selectedImage.getBoundingClientRect();
          resizeStart.width = rect.width;
          resizeStart.height = rect.height;
          resizeStart.x = e.clientX;
          resizeStart.y = e.clientY;
        } else if (!target.closest('.image-resize-overlay')) {
          setSelectedImage(null);
        }
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing.current || !selectedImage) return;
        const handle = document.querySelector('[data-handle]:hover')?.getAttribute('data-handle');
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;

        if (handle?.includes('right')) newWidth = resizeStart.width + deltaX;
        if (handle?.includes('left')) newWidth = resizeStart.width - deltaX;
        if (handle?.includes('bottom')) newHeight = resizeStart.height + deltaY;
        if (handle?.includes('top')) newHeight = resizeStart.height - deltaY;
        
        selectedImage.style.width = `${Math.max(50, newWidth)}px`;
        selectedImage.style.height = 'auto'; // Maintain aspect ratio
        const wrapper = selectedImage.closest('.image-wrapper') as HTMLElement;
        if (wrapper) {
            wrapper.style.width = selectedImage.style.width;
            wrapper.style.height = 'auto';
        }
        updateOverlayPosition();
      };

      const handleMouseUp = () => {
        isResizing.current = false;
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (selectedImage && (e.key === 'Backspace' || e.key === 'Delete')) {
          e.preventDefault();
          const wrapper = selectedImage.closest('.image-wrapper');
          (wrapper || selectedImage).remove();
          setSelectedImage(null);
        }
      };
      
      const observer = new MutationObserver(() => {
          reportSelectionState();
          reportPageCount();
      });
      observer.observe(editor, { childList: true, subtree: true, characterData: true });

      document.addEventListener('mousedown', handleMouseDown, true);
      document.addEventListener('mousemove', handleMouseMove, true);
      document.addEventListener('mouseup', handleMouseUp, true);
      document.addEventListener('keydown', handleKeyDown, true);
      document.addEventListener('selectionchange', reportSelectionState);

      return () => {
        observer.disconnect();
        document.removeEventListener('mousedown', handleMouseDown, true);
        document.removeEventListener('mousemove', handleMouseMove, true);
        document.removeEventListener('mouseup', handleMouseUp, true);
        document.removeEventListener('keydown', handleKeyDown, true);
        document.removeEventListener('selectionchange', reportSelectionState);
      };
    }, [initialContent, selectedImage, updateOverlayPosition, reportSelectionState, reportPageCount]);

    // Effect for creating and managing the image resize overlay
    useEffect(() => {
      if (selectedImage) {
        const overlay = document.createElement('div');
        overlayRef.current = overlay;
        overlay.className = 'image-resize-overlay';
        overlay.style.cssText = `position: absolute; border: 2px solid #3b82f6; pointer-events: none; z-index: 10;`;
        const handles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        handles.forEach(handle => {
          const handleEl = document.createElement('div');
          handleEl.dataset.handle = handle;
          handleEl.style.cssText = `position: absolute; width: 10px; height: 10px; background: #fff; border: 1px solid #3b82f6; border-radius: 50%; pointer-events: all; cursor: nwse-resize;
            ${handle.includes('top') ? 'top: -6px;' : 'bottom: -6px;'}
            ${handle.includes('left') ? 'left: -6px;' : 'right: -6px;'}
          `;
          overlay.appendChild(handleEl);
        });
        document.body.appendChild(overlay);
        updateOverlayPosition();
        window.addEventListener('resize', updateOverlayPosition);
        window.addEventListener('scroll', updateOverlayPosition, true);

        return () => {
          overlay.remove();
          overlayRef.current = null;
          window.removeEventListener('resize', updateOverlayPosition);
          window.removeEventListener('scroll', updateOverlayPosition, true);
        };
      }
    }, [selectedImage, updateOverlayPosition]);

    return (
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="w-full h-full p-24 outline-none prose max-w-none"
        style={{ minHeight: '11in' }}
      />
    );
  }
);

WrappedEditor.displayName = 'WrappedEditor';