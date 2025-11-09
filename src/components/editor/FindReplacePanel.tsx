"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronUp, ChevronDown, CaseSensitive, WholeWord } from 'lucide-react';

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

  // Debounce effect for triggering search automatically as the user types.
  useEffect(() => {
    if (findQuery.length === 0) {
      onClearHighlights();
      return;
    }

    const handler = setTimeout(() => {
      if (findQuery.length > 0) {
        onFindNext(findQuery, options);
      }
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [findQuery, options, onFindNext, onClearHighlights]);

  // Focus the find input when the panel first opens.
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
      className="absolute top-4 right-4 z-40 w-80 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 animate-in fade-in slide-in-from-top-4 duration-300"
      onMouseDown={(e) => e.stopPropagation()} // Prevents the editor from losing focus when interacting with the panel.
    >
      <div className="p-3 space-y-2">
        {/* Find Input */}
        <div className="relative">
          <input
            ref={findInputRef}
            type="text"
            placeholder="Find"
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-gray-50 border border-gray-200 rounded-md pl-3 pr-24 py-1.5 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-0.5">
            {totalMatches > 0 ? (
              <span className="text-xs text-gray-500 font-mono">
                {matchIndex + 1}/{totalMatches}
              </span>
            ) : findQuery && !isSearching ? (
               <span className="text-xs text-gray-500 font-mono">0/0</span>
            ) : null}
            <button
              onClick={handleFindPrev}
              disabled={!findQuery || totalMatches === 0}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-40"
              title="Previous match (Shift+Enter)"
            >
              <ChevronUp className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={handleFindNext}
              disabled={!findQuery || totalMatches === 0}
              className="p-1 rounded hover:bg-gray-200 disabled:opacity-40"
              title="Next match (Enter)"
            >
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Replace Input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Replace"
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-md pl-3 pr-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
          />
        </div>

        {/* Actions and Options */}
        <div className="flex items-center justify-between">
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
          <div className="flex items-center gap-2">
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
      
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200"
        title="Close"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
};