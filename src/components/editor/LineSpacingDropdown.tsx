//src/components/editor/LineSpaciongDropdown.tsx

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AlignJustify, ChevronDown } from 'lucide-react';
import { LineSpacing } from '@/hooks/useLineSpacing';

interface LineSpacingDropdownProps {
  currentSpacing: LineSpacing;
  onSpacingChange: (spacing: LineSpacing) => void;
  onMenuOpen: () => void;
}

const spacingOptions = [
  { label: 'Single', value: 'single' as LineSpacing, description: '1.2x' },
  { label: '1.5 lines', value: '1.5' as LineSpacing, description: '1.8x' },
  { label: 'Double', value: 'double' as LineSpacing, description: '2.4x' }
];

export const LineSpacingDropdown: React.FC<LineSpacingDropdownProps> = ({
  currentSpacing,
  onSpacingChange,
  onMenuOpen
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = spacingOptions.find(opt => opt.value === currentSpacing) || spacingOptions[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      onMenuOpen();
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (spacing: LineSpacing) => {
    onSpacingChange(spacing);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleToggle}
        className="flex items-center justify-between px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 w-28 hover:scale-105 active:scale-95"
        title={`Line Spacing: ${currentOption.label}`}
      >
        <div className="flex items-center gap-2">
          <AlignJustify className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-700 text-xs">{currentOption.label}</span>
        </div>
        <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-30 top-full mt-2 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden w-40 left-0">
          {spacingOptions.map((option) => (
            <button
              key={option.value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(option.value)}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0 ${
                currentSpacing === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-gray-500">{option.description}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};