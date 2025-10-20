//src/components/editor/TableColumnMenu.tsx

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, ChevronsLeft, ChevronsRight, GripHorizontal } from 'lucide-react';

interface TableColumnMenuProps {
  table: HTMLTableElement;
  hoveredColumnIndex: number;
  onAddColBefore: (colIndex: number) => void;
  onAddColAfter: (colIndex: number) => void;
  onDeleteCol: (colIndex: number) => void;
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

export const TableColumnMenu: React.FC<TableColumnMenuProps> = (props) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: -9999, left: -9999 });

  useEffect(() => {
    if (props.hoveredColumnIndex < 0) return;
    
    const tableRect = props.table.getBoundingClientRect();
    const firstRow = props.table.rows[0];
    if (!firstRow || !firstRow.cells[props.hoveredColumnIndex]) return;

    const cellRect = firstRow.cells[props.hoveredColumnIndex].getBoundingClientRect();
    
    setPosition({
      top: tableRect.top - 40 + window.scrollY,
      left: cellRect.left + window.scrollX,
    });
  }, [props.hoveredColumnIndex, props.table]);

  if (props.hoveredColumnIndex < 0) return null;

  const cell = props.table.rows[0]?.cells[props.hoveredColumnIndex];
  if (!cell) return null;

  return (
    <div
      ref={menuRef}
      className="bg-white p-1 rounded-lg flex items-center gap-1 border border-gray-200 shadow-lg fixed z-20"
      style={{ top: `${position.top}px`, left: `${position.left}px`, width: `${cell.offsetWidth}px` }}
      contentEditable={false}
    >
       <div className="cursor-grab text-gray-400 hover:text-gray-600">
        <GripHorizontal size={16} />
      </div>
      <div className="flex-1"></div>
      <MenuButton onClick={() => props.onAddColBefore(props.hoveredColumnIndex)} title="Add Column Before"><ChevronsLeft size={16} /></MenuButton>
      <MenuButton onClick={() => props.onAddColAfter(props.hoveredColumnIndex)} title="Add Column After"><ChevronsRight size={16} /></MenuButton>
      <MenuButton onClick={() => props.onDeleteCol(props.hoveredColumnIndex)} title="Delete Column"><Trash2 size={16} color="#ef4444" /></MenuButton>
      <div className="flex-1"></div>
    </div>
  );
};