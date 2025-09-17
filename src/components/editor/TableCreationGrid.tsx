//src/components/editor/TableCreationGrid.tsx

'use client';

import React, { useState } from 'react';

interface TableCreationGridProps {
  onSelect: (rows: number, cols: number) => void;
}

export const TableCreationGrid: React.FC<TableCreationGridProps> = ({ onSelect }) => {
  const [hovered, setHovered] = useState({ rows: 0, cols: 0 });

  return (
    // --- CORRECTED: Removed all positioning classes (absolute, right-0, etc.) ---
    // The parent component is now responsible for positioning.
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-xl">
      {Array.from({ length: 5 }).map((_, r) => (
        <div key={r} className="flex">
          {Array.from({ length: 5 }).map((_, c) => (
            <div
              key={c}
              onMouseEnter={() => setHovered({ rows: r + 1, cols: c + 1 })}
              onClick={() => onSelect(r + 1, c + 1)}
              className={`w-6 h-6 border border-gray-300 cursor-pointer transition-all duration-100 ${
                r < hovered.rows && c < hovered.cols ? "bg-blue-300 border-blue-400" : "bg-white hover:bg-gray-100"
              }`}
            />
          ))}
        </div>
      ))}
      <div className="text-center text-sm mt-2 font-medium text-gray-600">
        {hovered.rows} x {hovered.cols}
      </div>
    </div>
  );
};