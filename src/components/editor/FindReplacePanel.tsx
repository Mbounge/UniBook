"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronUp, ChevronDown, CaseSensitive, WholeWord, Search } from 'lucide-react';

// This interface will be used by the useEditor hook later.
export interface FindOptions {
  matchCase: boolean;
  wholeWord: boolean;
}

interface FindReplacePanelProps {
  onFindNext: (query: string, options: FindOptions) => void;
  onFindPrev: (query: string, options: FindOptions) => void;
  onReplace: (replaceText: string) => void;
  onReplaceAll: (query: string, replaceText: string, options: FindOptions) => void;
  onClose: () => void;
  onClearHighlights: () => void;
  matchIndex: number; // 0-based index of the current match
  totalMatches: number;
  isSearching: boolean;
}

const OptionButton: React.FC<{ title: string; isActive: boolean; onClick: () => void; children: React.ReactNode }> = ({ title, isActive, onClick, children }) => (
  <button
    title={title}
    onClick={onClick}
    className={`p-1.5 rounded-md transition-colors duration-200 ${
      isActive ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
    }`}
  >
    {children}
  </button>
);

export const FindReplacePanel: React.FC<FindReplacePanelProps> = ({
  onFindNext,
  onFindPrev,
  onReplace,
  onReplaceAll,
  onClose,
  onClearHighlights,
  matchIndex,
  totalMatches,
  isSearching,
}) => {
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [options, setOptions] = useState<FindOptions>({ matchCase: false, wholeWord: false });
  const panelRef = useRef<HTMLDivElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (findQuery.length === 0) {
      onClearHighlights();
      return;
    }

    const handler = setTimeout(() => {
      if (findQuery.length > 0) {
        onFindNext(findQuery, options);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [findQuery, options, onFindNext, onClearHighlights]);

  useEffect(() => {
    findInputRef.current?.focus();
    findInputRef.current?.select();
  }, []);

  const handleFindNext = () => {
    if (findQuery) onFindNext(findQuery, options);
  };

  const handleFindPrev = () => {
    if (findQuery) onFindPrev(findQuery, options);
  };

  const handleReplace = () => {
    if (findQuery) onReplace(replaceQuery);
  };

  const handleReplaceAll = () => {
    if (findQuery) onReplaceAll(findQuery, replaceQuery, options);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handleFindPrev();
      } else {
        handleFindNext();
      }
    }
  };

  return (
    <div
      ref={panelRef}
      // --- FIX: Added a stable class name for focus detection ---
      className="find-replace-panel absolute top-4 right-4 z-40 w-80 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200 animate-in fade-in slide-in-from-top-4 duration-300"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between p-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-500 ml-2" />
          <h3 className="text-sm font-semibold text-gray-800">Find & Replace</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-gray-200"
          title="Close (Esc)"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        <div className="relative">
          <input
            ref={findInputRef}
            type="text"
            placeholder="Find"
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-gray-50 border border-gray-300 rounded-md pl-3 pr-28 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-colors"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
            {totalMatches > 0 ? (
              <span className="text-xs text-gray-500 font-mono px-1">
                {matchIndex + 1}/{totalMatches}
              </span>
            ) : findQuery && !isSearching ? (
               <span className="text-xs text-gray-500 font-mono px-1">0/0</span>
            ) : null}
            <div className="h-4 w-px bg-gray-300"></div>
            <button
              onClick={handleFindPrev}
              disabled={!findQuery || totalMatches === 0}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40"
              title="Previous match (Shift+Enter)"
            >
              <ChevronUp className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={handleFindNext}
              disabled={!findQuery || totalMatches === 0}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40"
              title="Next match (Enter)"
            >
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Replace"
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 rounded-md pl-3 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center justify-between bg-gray-50 p-1.5 rounded-md">
          <div className="flex items-center gap-1">
            <OptionButton
              title="Match Case"
              isActive={options.matchCase}
              onClick={() => setOptions(prev => ({ ...prev, matchCase: !prev.matchCase }))}
            >
              <CaseSensitive className="w-4 h-4" />
            </OptionButton>
            <OptionButton
              title="Whole Word"
              isActive={options.wholeWord}
              onClick={() => setOptions(prev => ({ ...prev, wholeWord: !prev.wholeWord }))}
            >
              <WholeWord className="w-4 h-4" />
            </OptionButton>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReplace}
              disabled={!findQuery || totalMatches === 0}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Replace
            </button>
            <button
              onClick={handleReplaceAll}
              disabled={!findQuery || totalMatches === 0}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Replace All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};