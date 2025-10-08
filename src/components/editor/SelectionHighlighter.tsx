//src/components/editor/SelectionHighlighter.tsx

'use client';

import React from 'react';

export interface SelectionRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SelectionHighlighterProps {
  rects: SelectionRect[];
  containerRef: React.RefObject<HTMLElement | null>;
}

export const SelectionHighlighter: React.FC<SelectionHighlighterProps> = ({ rects, containerRef }) => {
  if (!containerRef.current) {
    return null;
  }

  const containerRect = containerRef.current.getBoundingClientRect();
  const scrollTop = containerRef.current.scrollTop;

  return (
    <>
      {rects.map((rect, i) => (
        <div
          key={i}
          className="custom-selection-highlight"
          style={{
            top: `${rect.top - containerRect.top + scrollTop}px`,
            left: `${rect.left - containerRect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          }}
        />
      ))}
    </>
  );
};