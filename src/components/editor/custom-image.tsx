// src/components/editor/custom-image.tsx

"use client";

import React, { useRef, useCallback } from 'react';
import { NodeViewWrapper, NodeViewProps, ReactNodeViewRenderer } from '@tiptap/react';
import { Image as ImageExtension } from '@tiptap/extension-image';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

// The React component that will be rendered for our image node
const ImageView = (props: NodeViewProps) => {
  // CORRECTED: Added `height` to the destructuring
  const { node, updateAttributes, selected } = props;
  const { src, alt, title, width, height, float } = node.attrs;

  const containerRef = useRef<HTMLDivElement>(null);

  const handleResize = useCallback((e: React.MouseEvent<HTMLDivElement>, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = containerRef.current.offsetWidth;
    const startHeight = containerRef.current.offsetHeight;
    const aspectRatio = startWidth / startHeight;

    const handleDrag = (moveEvent: MouseEvent) => {
      let newWidth = startWidth;
      let newHeight = startHeight;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      switch (direction) {
        case 'bottom-right':
          newWidth = startWidth + deltaX;
          newHeight = newWidth / aspectRatio;
          break;
        case 'bottom-left':
          newWidth = startWidth - deltaX;
          newHeight = newWidth / aspectRatio;
          break;
        case 'top-right':
          newWidth = startWidth + deltaX;
          newHeight = newWidth / aspectRatio;
          break;
        case 'top-left':
          newWidth = startWidth - deltaX;
          newHeight = newWidth / aspectRatio;
          break;
        case 'right':
          newWidth = startWidth + deltaX;
          break;
        case 'left':
          newWidth = startWidth - deltaX;
          break;
        case 'bottom':
          newHeight = startHeight + deltaY;
          break;
        case 'top':
          newHeight = startHeight - deltaY;
          break;
      }

      containerRef.current!.style.width = `${newWidth}px`;
      containerRef.current!.style.height = `${newHeight}px`;
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleMouseUp);
      updateAttributes({
        width: containerRef.current!.offsetWidth,
        height: containerRef.current!.offsetHeight,
      });
    };

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleMouseUp);
  }, [updateAttributes]);

  const handleFloat = (newFloat: 'left' | 'right' | null) => {
    updateAttributes({ float: newFloat });
  };

  const containerClasses = [
    "relative", "inline-block",
    float === 'left' ? "float-left mr-4" : "",
    float === 'right' ? "float-right ml-4" : "",
    !float ? "block mx-auto" : "",
  ].join(" ");

  const resizeHandleClasses = "absolute w-3 h-3 bg-blue-600 border-2 border-white rounded-full";

  return (
    <NodeViewWrapper
      ref={containerRef}
      as="div"
      className={containerClasses}
      style={{
        width: width || 'auto',
        height: height || 'auto',
        outline: selected ? '2px solid #3b82f6' : 'none',
        borderRadius: '4px',
      }}
      data-drag-handle
    >
      <img src={src} alt={alt} title={title} className="block w-full h-full" />
      {selected && (
        <>
          {/* Floating Toolbar */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white p-1 rounded-lg flex gap-1 z-10">
            <button onClick={() => handleFloat('left')} className={`p-1 rounded ${float === 'left' ? 'bg-gray-600' : 'hover:bg-gray-700'}`} title="Float Left"><AlignLeft className="w-4 h-4" /></button>
            <button onClick={() => handleFloat(null)} className={`p-1 rounded ${!float ? 'bg-gray-600' : 'hover:bg-gray-700'}`} title="Align Center"><AlignCenter className="w-4 h-4" /></button>
            <button onClick={() => handleFloat('right')} className={`p-1 rounded ${float === 'right' ? 'bg-gray-600' : 'hover:bg-gray-700'}`} title="Float Right"><AlignRight className="w-4 h-4" /></button>
          </div>

          {/* 8-Point Resize Handles */}
          <div onMouseDown={(e) => handleResize(e, 'top-left')} className={`${resizeHandleClasses} -top-1.5 -left-1.5 cursor-nwse-resize`}></div>
          <div onMouseDown={(e) => handleResize(e, 'top')} className={`${resizeHandleClasses} -top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize`}></div>
          <div onMouseDown={(e) => handleResize(e, 'top-right')} className={`${resizeHandleClasses} -top-1.5 -right-1.5 cursor-nesw-resize`}></div>
          <div onMouseDown={(e) => handleResize(e, 'right')} className={`${resizeHandleClasses} top-1/2 -translate-y-1/2 -right-1.5 cursor-ew-resize`}></div>
          <div onMouseDown={(e) => handleResize(e, 'bottom-right')} className={`${resizeHandleClasses} -bottom-1.5 -right-1.5 cursor-nwse-resize`}></div>
          <div onMouseDown={(e) => handleResize(e, 'bottom')} className={`${resizeHandleClasses} -bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize`}></div>
          <div onMouseDown={(e) => handleResize(e, 'bottom-left')} className={`${resizeHandleClasses} -bottom-1.5 -left-1.5 cursor-nesw-resize`}></div>
          <div onMouseDown={(e) => handleResize(e, 'left')} className={`${resizeHandleClasses} top-1/2 -translate-y-1/2 -left-1.5 cursor-ew-resize`}></div>
        </>
      )}
    </NodeViewWrapper>
  );
};

// The Tiptap extension that uses our React component
export const CustomImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      height: { default: null },
      float: { default: null, renderHTML: attrs => ({ 'data-float': attrs.float }) },
    };
  },
  draggable: true,
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});