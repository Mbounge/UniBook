// src/components/editor/PageNavigator.tsx
"use client";

import React, { useState, useEffect } from 'react';

interface PageNavigatorProps {
  totalPages: number;
}

const PageNavigator: React.FC<PageNavigatorProps> = ({ totalPages }) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Update current page based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const pages = document.querySelectorAll('[data-line-id]');
      if (!pages.length) return;

      const viewportCenter = window.innerHeight / 2 + window.scrollY;
      
      // Find which page is currently in view
      let visiblePage = 1;
      pages.forEach((pageElement) => {
        const rect = pageElement.getBoundingClientRect();
        const elementTop = rect.top + window.scrollY;
        const elementBottom = elementTop + rect.height;
        
        if (viewportCenter >= elementTop && viewportCenter <= elementBottom) {
          const lineElement = pageElement as HTMLElement;
          const lineId = lineElement.dataset.lineId;
          if (lineId) {
            // Extract page number from context or calculate it
            // This is a simplified approach - you might want to enhance this
            const allLines = Array.from(pages);
            const lineIndex = allLines.indexOf(pageElement);
            const linesPerPage = 25; // Should match the calculation in EditorContext
            visiblePage = Math.floor(lineIndex / linesPerPage) + 1;
          }
        }
      });

      setCurrentPage(Math.min(visiblePage, totalPages));
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call

    return () => window.removeEventListener('scroll', handleScroll);
  }, [totalPages]);

  const scrollToPage = (pageNumber: number) => {
    const targetPage = document.querySelector(`[data-page-number="${pageNumber}"]`);
    if (targetPage) {
      targetPage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="sticky top-20 z-20 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <span className="text-sm text-gray-600 font-medium min-w-[80px] text-center">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => scrollToPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Page thumbnails for quick navigation */}
        {totalPages > 1 && totalPages <= 10 && (
          <div className="flex items-center space-x-1 border-l border-gray-300 pl-4">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => scrollToPage(pageNum)}
                className={`w-6 h-8 text-xs rounded border transition-colors ${
                  pageNum === currentPage
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
                title={`Go to page ${pageNum}`}
              >
                {pageNum}
              </button>
            ))}
          </div>
        )}

        {/* Jump to page input for many pages */}
        {totalPages > 10 && (
          <div className="flex items-center space-x-2 border-l border-gray-300 pl-4">
            <label className="text-sm text-gray-600">Go to:</label>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const pageNum = parseInt(e.target.value);
                if (pageNum >= 1 && pageNum <= totalPages) {
                  scrollToPage(pageNum);
                }
              }}
              className="w-16 text-sm border border-gray-300 rounded px-2 py-1"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PageNavigator;