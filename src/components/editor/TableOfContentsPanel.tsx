'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { X, ListTree, ChevronRight } from 'lucide-react';

export interface Heading {
  level: number;
  text: string;
  element: HTMLElement;
}

// --- RENAMED: from ChapterOutline to PageOutline ---
export interface PageOutline {
  pageNumber: number;
  pageTitle: string;
  pageElement: HTMLElement;
  headings: Heading[];
}

interface TableOfContentsPanelProps {
  pageContainerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export const TableOfContentsPanel: React.FC<TableOfContentsPanelProps> = ({ pageContainerRef, onClose }) => {
  // --- RENAMED: from outline to pageOutlines ---
  const [pageOutlines, setPageOutlines] = useState<PageOutline[]>([]);
  // --- RENAMED: from collapsedChapters to collapsedPages ---
  const [collapsedPages, setCollapsedPages] = useState<number[]>([]);

  const updateOutline = useCallback(() => {
    if (!pageContainerRef.current) return;

    // --- RENAMED: from chapterElements to pageElements ---
    const pageElements = pageContainerRef.current.querySelectorAll<HTMLElement>('.page');
    // --- RENAMED: from newOutline to newPageOutlines ---
    const newPageOutlines: PageOutline[] = Array.from(pageElements).map((pageEl, index) => {
      const headingElements = pageEl.querySelectorAll<HTMLElement>('h1, h2, h3, h4');
      
      const headings: Heading[] = Array.from(headingElements).map(el => ({
        level: parseInt(el.tagName.substring(1), 10),
        text: el.innerText || 'Untitled Heading',
        element: el,
      }));

      // Find the most prominent heading on the page to use as the title
      const mainHeading = headings.find(h => h.level === 1) || headings.find(h => h.level === 2);
      // --- RENAMED: from chapterTitle to pageTitle ---
      // --- MODIFIED: Fallback text is now "Page X" ---
      const pageTitle = mainHeading?.text || `Page ${index + 1}`;

      return {
        // --- RENAMED: from chapterNumber to pageNumber ---
        pageNumber: index + 1,
        pageTitle,
        // --- RENAMED: from chapterElement to pageElement ---
        pageElement: pageEl,
        headings,
      };
    });

    setPageOutlines(newPageOutlines);
  }, [pageContainerRef]);

  useEffect(() => {
    if (!pageContainerRef.current) return;
    
    updateOutline();

    const observer = new MutationObserver(updateOutline);
    observer.observe(pageContainerRef.current, { 
      childList: true,
      subtree: true,
      characterData: true 
    });

    return () => observer.disconnect();
  }, [pageContainerRef, updateOutline]);

  const handleNavigate = (element: HTMLElement) => {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // This small adjustment helps account for a sticky toolbar at the top
    setTimeout(() => {
      const scrollContainer = pageContainerRef.current?.parentElement;
      if (scrollContainer) {
        scrollContainer.scrollBy(0, -80);
      }
    }, 700);
  };

  // --- RENAMED: from toggleChapterCollapse to togglePageCollapse ---
  const togglePageCollapse = (pageNumber: number) => {
    setCollapsedPages(prev =>
      prev.includes(pageNumber)
        ? prev.filter(pn => pn !== pageNumber) // Remove if it's already there (expand)
        : [...prev, pageNumber] // Add if it's not there (collapse)
    );
  };

  return (
    <div className="w-80 bg-white border-r border-gray-100 flex flex-col h-full flex-shrink-0 animate-in slide-in-from-left duration-300">
      <div className="p-6 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg"><ListTree className="w-5 h-5 text-blue-600" /></div>
            <h3 className="text-lg font-bold text-gray-900">Outline</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {pageOutlines.length > 0 ? (
          <ul className="space-y-1">
            {pageOutlines.map((page) => {
              const isCollapsed = collapsedPages.includes(page.pageNumber);
              return (
                <li key={page.pageNumber}>
                  <div className="flex items-center group">
                    <button 
                      // --- RENAMED: Call togglePageCollapse ---
                      onClick={() => togglePageCollapse(page.pageNumber)}
                      className="p-1 rounded-md hover:bg-gray-200"
                      aria-expanded={!isCollapsed}
                    >
                      <ChevronRight 
                        className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${!isCollapsed ? 'rotate-90' : 'rotate-0'}`} 
                      />
                    </button>
                    <button 
                      // --- RENAMED: Navigate to pageElement ---
                      onClick={() => handleNavigate(page.pageElement)} 
                      className="flex-1 text-left text-sm font-bold text-gray-800 hover:text-blue-700 p-2 rounded-md transition-colors truncate"
                    >
                      {page.pageTitle}
                    </button>
                  </div>

                  {!isCollapsed && page.headings.length > 0 && (
                    <ul className="mt-1 space-y-1 border-l-2 border-gray-200 ml-4 pl-2 transition-all duration-300">
                      {page.headings.map((heading, index) => (
                        <li key={index} style={{ paddingLeft: `${(heading.level - 1) * 0.75}rem` }}>
                          <button 
                            onClick={() => handleNavigate(heading.element)} 
                            className="w-full text-left text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 p-2 rounded-md transition-colors truncate"
                          >
                            {heading.text}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-12">
            <ListTree className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500 font-medium">Your document outline will appear here.</p>
            <p className="text-xs text-gray-400 mt-2">Start by adding a heading (e.g., Heading 1).</p>
          </div>
        )}
      </div>
    </div>
  );
};