'use client';

import React, { useState, useEffect } from 'react';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';

interface StatusBarProps {
  // --- RENAMED: Props from chapter to page ---
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isContentHubOpen: boolean;
  isHubExpanded: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ 
  // --- RENAMED: Props from chapter to page ---
  currentPage, 
  totalPages, 
  onPageChange,
  isContentHubOpen,
  isHubExpanded
}) => {
  const [inputValue, setInputValue] = useState(currentPage.toString());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(currentPage.toString());
    }
  }, [currentPage, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const pageNum = parseInt(inputValue, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        // --- RENAMED: Call onPageChange ---
        onPageChange(pageNum);
      } else {
        setInputValue(currentPage.toString());
      }
      e.currentTarget.blur();
    }
  };

  // --- RENAMED: Function from goToPrevChapter to goToPrevPage ---
  const goToPrevPage = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  // --- RENAMED: Function from goToNextChapter to goToNextPage ---
  const goToNextPage = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  const calculateRightPosition = () => {
    if (isContentHubOpen) {
      return isHubExpanded ? 'calc(100% + 1.5rem)' : '25.5rem';
    }
    return '1.5rem';
  };

  return (
    <div 
      className="group fixed bottom-6 bg-white/80 backdrop-blur-sm border border-gray-200/80 shadow-lg rounded-full flex items-center justify-center text-sm text-gray-700 z-30 no-print transition-all duration-300 hover:shadow-xl animate-in fade-in slide-in-from-bottom-4"
      style={{ right: calculateRightPosition(), transitionProperty: 'right' }}
    >
      <div className="flex items-center px-3 py-2">
        <button 
          // --- RENAMED: Call goToPrevPage ---
          onClick={goToPrevPage}
          disabled={currentPage <= 1}
          className="w-0 opacity-0 group-hover:w-8 group-hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
          // --- MODIFIED: UI Text ---
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center px-2">
          <FileText className="w-4 h-4 text-gray-500 mr-2" />
          <span className="font-medium">Page</span>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-10 text-center mx-1.5 bg-gray-50/50 border-b-2 border-transparent rounded-md focus:outline-none focus:bg-white focus:border-blue-500 transition-all duration-200"
          />
          {/* --- RENAMED: Use totalPages prop --- */}
          <span className="font-medium text-gray-500">of {totalPages}</span>
        </div>

        <button 
          // --- RENAMED: Call goToNextPage ---
          onClick={goToNextPage}
          disabled={currentPage >= totalPages}
          className="w-0 opacity-0 group-hover:w-8 group-hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
          // --- MODIFIED: UI Text ---
          aria-label="Next Page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};