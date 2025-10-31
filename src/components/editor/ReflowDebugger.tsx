//src/components/editor/ReflowDebugger.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useTextReflow } from './hooks/useTextReflow';

interface ReflowDebuggerProps {
  pageContainerRef: React.RefObject<HTMLDivElement | null>;
  currentPage: number; // The current page number (1-based)
}

export const ReflowDebugger: React.FC<ReflowDebuggerProps> = ({ pageContainerRef, currentPage }) => {
  const [pageInfo, setPageInfo] = useState({
    contentHeight: 0,
    availableHeight: 0,
    remainingSpace: 0,
  });

  // We instantiate a new instance of the hook just to get access to its measurement functions
  const { getContentHeight, getAvailableHeight } = useTextReflow(pageContainerRef, () => {});

  useEffect(() => {
    const calculatePageMetrics = () => {
      if (!pageContainerRef.current || currentPage < 1) return;

      const allPages = Array.from(pageContainerRef.current.querySelectorAll('.page'));
      const targetPage = allPages[currentPage - 1] as HTMLElement;
      const pageContent = targetPage?.querySelector('.page-content') as HTMLElement;

      if (pageContent) {
        const availableHeight = getAvailableHeight();
        const contentHeight = getContentHeight(pageContent);
        const remainingSpace = availableHeight - contentHeight;

        setPageInfo({
          contentHeight: Math.round(contentHeight),
          availableHeight: Math.round(availableHeight),
          remainingSpace: Math.round(remainingSpace),
        });
      }
    };

    // Recalculate on every render and when the current page changes
    const timeoutId = setTimeout(calculatePageMetrics, 50); // Small delay to wait for DOM updates
    return () => clearTimeout(timeoutId);

  }, [pageContainerRef, currentPage, getContentHeight, getAvailableHeight]); // Rerun whenever the editor state might change

  return (
    <div className="fixed bottom-50 right-6 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 font-mono text-sm no-print">
      <h4 className="font-bold text-lg mb-2 border-b border-gray-600 pb-1 text-green-400">Reflow Debugger</h4>
      <p>Current Page: <span className="font-bold text-yellow-300">{currentPage}</span></p>
      <p>Content Height: <span className="font-bold text-yellow-300">{pageInfo.contentHeight}px</span></p>
      <p>Available Height: <span className="font-bold text-yellow-300">{pageInfo.availableHeight}px</span></p>
      <p className={pageInfo.remainingSpace < 0 ? 'text-red-500' : 'text-green-400'}>
        Remaining Space: <span className="font-bold">{pageInfo.remainingSpace}px</span>
      </p>
    </div>
  );
};