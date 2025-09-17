'use client';

import React from 'react';

interface PageProps {
  pageNumber: number;
  children: React.ReactNode;
  isActive?: boolean;
}

export const Page: React.FC<PageProps> = ({ pageNumber, children, isActive = false }) => {
  return (
    <div 
      className={`bg-white mx-auto mb-6 shadow-lg relative ${isActive ? 'ring-2 ring-blue-500' : ''}`}
      style={{ 
        width: '8.5in', 
        minHeight: '11in',
        pageBreakAfter: 'always'
      }}
    >
      {/* Page number */}
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400">
        {pageNumber}
      </div>
      
      {/* Page content area */}
      <div className="h-full">
        {children}
      </div>
    </div>
  );
};