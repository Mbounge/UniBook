//src/components/editor/TableRowMenu.tsx

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, ChevronsUp, ChevronsDown, GripVertical } from 'lucide-react';

interface TableRowMenuProps {
  table: HTMLTableElement;
  hoveredRow: HTMLTableRowElement;
  onAddRowBefore: (row: HTMLTableRowElement) => void;
  onAddRowAfter: (row: HTMLTableRowElement) => void;
  onDeleteRow: (row: HTMLTableRowElement) => void;
}

const MenuButton = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
  <button 
    onMouseDown={e => e.preventDefault()} 
    onClick={onClick} 
    title={title} 
    className="p-2 rounded-md transition-all duration-200 hover:bg-gray-200 text-gray-700"
  >
    {children}
  </button>
);

export const TableRowMenu: React.FC<TableRowMenuProps> = (props) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: -9999, left: -9999 });

  useEffect(() => {
    const tableRect = props.table.getBoundingClientRect();
    const rowRect = props.hoveredRow.getBoundingClientRect();
    
    setPosition({
      top: rowRect.top + window.scrollY,
      left: tableRect.left - 40 + window.scrollX,
    });
  }, [props.hoveredRow, props.table]);

  return (
    <div
      ref={menuRef}
      className="bg-white p-1 rounded-lg flex flex-col items-center gap-1 border border-gray-200 shadow-lg fixed z-20"
      style={{ top: `${position.top}px`, left: `${position.left}px`, height: `${props.hoveredRow.offsetHeight}px` }}
      contentEditable={false}
    >
      <div className="cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical size={16} />
      </div>
      <div className="flex-1"></div>
      <MenuButton onClick={() => props.onAddRowBefore(props.hoveredRow)} title="Add Row Before"><ChevronsUp size={16} /></MenuButton>
      <MenuButton onClick={() => props.onAddRowAfter(props.hoveredRow)} title="Add Row After"><ChevronsDown size={16} /></MenuButton>
      <MenuButton onClick={() => props.onDeleteRow(props.hoveredRow)} title="Delete Row"><Trash2 size={16} color="#ef4444" /></MenuButton>
      <div className="flex-1"></div>
    </div>
  );
};