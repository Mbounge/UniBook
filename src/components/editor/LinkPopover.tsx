// src/components/editor/LinkPopover.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { Link, Check, Trash2, X } from 'lucide-react';

interface LinkPopoverProps {
  initialUrl: string;
  onApply: (url: string) => void;
  onRemove: () => void;
  onClose: () => void;
}

export const LinkPopover: React.FC<LinkPopoverProps> = ({ initialUrl, onApply, onRemove, onClose }) => {
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    setUrl(initialUrl);
  }, [initialUrl]);

  const handleApply = () => {
    let finalUrl = url.trim();
    if (finalUrl && !/^https?:\/\//i.test(finalUrl) && !/^mailto:/i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }
    onApply(finalUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200"
      onMouseDown={(e) => e.preventDefault()} // Prevent editor from losing focus
    >
      <Link className="w-4 h-4 text-gray-500 flex-shrink-0" />
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Paste or type a link..."
        className="flex-grow bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
        autoFocus
      />
      <button
        onClick={handleApply}
        className="p-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        title="Apply link"
      >
        <Check className="w-4 h-4" />
      </button>
      {initialUrl && (
        <button
          onClick={onRemove}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
          title="Remove link"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
       <button
          onClick={onClose}
          className="p-2 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
    </div>
  );
};