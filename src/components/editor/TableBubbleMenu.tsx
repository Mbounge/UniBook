'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  Trash2, CornerUpLeft, CornerUpRight, Pilcrow, ChevronsLeft, ChevronsRight, ChevronsUp, ChevronsDown 
} from 'lucide-react';

interface TableBubbleMenuProps {
  activeCell: HTMLElement;
  onAddRowBefore: () => void;
  onAddRowAfter: () => void;
  onDeleteRow: () => void;
  onAddColBefore: () => void;
  onAddColAfter: () => void;
  onDeleteCol: () => void;
  onDeleteTable: () => void;
}

const MenuButton = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
  <button onClick={onClick} title={title} className="p-2 rounded-md transition-all duration-200 hover:bg-gray-800 text-white">
    {children}
  </button>
);

export const TableBubbleMenu: React.FC<TableBubbleMenuProps> = (props) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const cellRect = props.activeCell.getBoundingClientRect();
    const menuRect = menuRef.current?.getBoundingClientRect();
    
    if (menuRect) {
      setPosition({
        top: cellRect.top - menuRect.height - 5 + window.scrollY,
        left: cellRect.left + (cellRect.width / 2) - (menuRect.width / 2) + window.scrollX,
      });
    }
  }, [props.activeCell]);

  return (
    <div
      ref={menuRef}
      className="bg-gray-900/95 backdrop-blur-sm p-2 rounded-lg flex gap-1 border border-gray-700 fixed z-20"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      contentEditable={false}
    >
      <MenuButton onClick={props.onAddRowBefore} title="Add Row Before"><ChevronsUp size={16} /></MenuButton>
      <MenuButton onClick={props.onAddRowAfter} title="Add Row After"><ChevronsDown size={16} /></MenuButton>
      <MenuButton onClick={props.onDeleteRow} title="Delete Row"><Pilcrow size={16} /></MenuButton>
      <div className="w-px bg-gray-700 mx-1"></div>
      <MenuButton onClick={props.onAddColBefore} title="Add Column Before"><ChevronsLeft size={16} /></MenuButton>
      <MenuButton onClick={props.onAddColAfter} title="Add Column After"><ChevronsRight size={16} /></MenuButton>
      <MenuButton onClick={props.onDeleteCol} title="Delete Column"><CornerUpLeft size={16} /></MenuButton>
      <div className="w-px bg-gray-700 mx-1"></div>
      <MenuButton onClick={props.onDeleteTable} title="Delete Table"><Trash2 size={16} /></MenuButton>
    </div>
  );
};