//src/components/editor/StatusBar.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';

interface StatusBarProps {
  currentChapter: number;
  totalChapters: number;
  onChapterChange: (chapter: number) => void;
  isContentHubOpen: boolean;
  isHubExpanded: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ 
  currentChapter, 
  totalChapters, 
  onChapterChange,
  isContentHubOpen,
  isHubExpanded
}) => {
  const [inputValue, setInputValue] = useState(currentChapter.toString());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(currentChapter.toString());
    }
  }, [currentChapter, isFocused]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const chapterNum = parseInt(inputValue, 10);
      if (!isNaN(chapterNum) && chapterNum >= 1 && chapterNum <= totalChapters) {
        onChapterChange(chapterNum);
      } else {
        setInputValue(currentChapter.toString());
      }
      e.currentTarget.blur();
    }
  };

  const goToPrevChapter = () => {
    if (currentChapter > 1) onChapterChange(currentChapter - 1);
  };

  const goToNextChapter = () => {
    if (currentChapter < totalChapters) onChapterChange(currentChapter + 1);
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
          onClick={goToPrevChapter}
          disabled={currentChapter <= 1}
          className="w-0 opacity-0 group-hover:w-8 group-hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
          aria-label="Previous Chapter"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center px-2">
          <FileText className="w-4 h-4 text-gray-500 mr-2" />
          <span className="font-medium">Chapter</span>
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-10 text-center mx-1.5 bg-gray-50/50 border-b-2 border-transparent rounded-md focus:outline-none focus:bg-white focus:border-blue-500 transition-all duration-200"
          />
          <span className="font-medium text-gray-500">of {totalChapters}</span>
        </div>

        <button 
          onClick={goToNextChapter}
          disabled={currentChapter >= totalChapters}
          className="w-0 opacity-0 group-hover:w-8 group-hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
          aria-label="Next Chapter"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};