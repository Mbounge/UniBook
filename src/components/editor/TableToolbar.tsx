// src/components/editor/TableToolbar.tsx

"use client";

import React from 'react';
import { 
  Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight 
} from 'lucide-react';

interface TableToolbarProps {
  onAction: (action: TableAction) => void;
}

export type TableAction = 
  | 'addRowAbove' 
  | 'addRowBelow' 
  | 'deleteRow' 
  | 'addColLeft' 
  | 'addColRight' 
  | 'deleteCol';

const ActionButton: React.FC<{
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  variant?: 'default' | 'danger';
}> = ({ onClick, title, children, variant = 'default' }) => (
  <button
    onClick={onClick}
    title={title}
    className={`w-full flex items-center text-left px-3 py-2 rounded-md text-sm transition-colors duration-200 ${
      variant === 'danger'
        ? 'text-red-600 hover:bg-red-50'
        : 'text-gray-700 hover:bg-gray-100'
    }`}
  >
    {children}
  </button>
);

export const TableToolbar: React.FC<TableToolbarProps> = ({ onAction }) => {
  return (
    <div
      className="bg-white rounded-lg shadow-lg border border-gray-200 p-2 w-56 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200"
      onMouseDown={(e) => e.preventDefault()} // Prevent editor from losing focus
    >
      {/* Row Actions */}
      <div className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-500 uppercase">Row</div>
      <ActionButton onClick={() => onAction('addRowAbove')} title="Add Row Above">
        <ArrowUp className="w-4 h-4 mr-2" />
        Insert row above
      </ActionButton>
      <ActionButton onClick={() => onAction('addRowBelow')} title="Add Row Below">
        <ArrowDown className="w-4 h-4 mr-2" />
        Insert row below
      </ActionButton>
      <ActionButton onClick={() => onAction('deleteRow')} title="Delete Row" variant="danger">
        <Trash2 className="w-4 h-4 mr-2" />
        Delete row
      </ActionButton>

      {/* Divider */}
      <div className="h-px bg-gray-200 my-1"></div>

      {/* Column Actions */}
      <div className="px-3 pt-1 pb-1 text-xs font-semibold text-gray-500 uppercase">Column</div>
      <ActionButton onClick={() => onAction('addColLeft')} title="Add Column Left">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Insert column left
      </ActionButton>
      <ActionButton onClick={() => onAction('addColRight')} title="Add Column Right">
        <ArrowRight className="w-4 h-4 mr-2" />
        Insert column right
      </ActionButton>
      <ActionButton onClick={() => onAction('deleteCol')} title="Delete Column" variant="danger">
        <Trash2 className="w-4 h-4 mr-2" />
        Delete column
      </ActionButton>
    </div>
  );
};