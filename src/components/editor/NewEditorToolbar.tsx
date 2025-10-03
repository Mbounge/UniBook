'use client';

import React from 'react';
import { Bold } from 'lucide-react';
import { TextSpan } from '@/types/editor'; // <-- Import TextSpan

// Re-using the button component style from your reference for consistency
const ToolbarButton = React.forwardRef<
  HTMLButtonElement,
  {
    onClick: () => void;
    title: string;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
  }
>(({ onClick, title, isActive, disabled, children }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`p-2 rounded-lg transition-all duration-200 ${
      isActive
        ? 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border border-blue-200'
        : 'hover:bg-gray-100 text-gray-700 hover:text-gray-900 border border-transparent'
    } disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95`}
  >
    {children}
  </button>
));
ToolbarButton.displayName = 'ToolbarButton';

interface NewEditorToolbarProps {
  // CORRECTED: Use the specific keyof type from TextSpan['formatting']
  onToggleFormatting: (format: keyof NonNullable<TextSpan['formatting']>) => void;
  // CORRECTED: The current formatting is for a span, not a whole line
  currentFormatting: NonNullable<TextSpan['formatting']>;
}

export const NewEditorToolbar: React.FC<NewEditorToolbarProps> = ({
  onToggleFormatting,
  currentFormatting,
}) => {
  return (
    <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-lg p-3 flex items-center flex-wrap gap-1 mb-8 sticky top-4 z-50">
      <ToolbarButton
        onClick={() => onToggleFormatting('bold')}
        title="Bold"
        isActive={!!currentFormatting.bold}
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
};