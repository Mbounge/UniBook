// src/components/editor/PageNumber.tsx

"use client";

import React from 'react';

interface PageNumberProps {
  pageNumber: number;
}

export const PageNumber: React.FC<PageNumberProps> = ({ pageNumber }) => {
  return <span className="page-number-render">{pageNumber}</span>;
};