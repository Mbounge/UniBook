'use client';

import { useCallback, useEffect, useState } from 'react';

const A4_HEIGHT = 1056; // ~11 inches at 96 DPI
const LINE_HEIGHT = 24; // 1.5rem
const LINES_PER_PAGE = Math.floor(A4_HEIGHT / LINE_HEIGHT) - 4; // Account for margins

export const usePagination = () => {
  const [pageHeight, setPageHeight] = useState(A4_HEIGHT);

  const calculatePageBreaks = useCallback((content: any[]) => {
    const pages: any[][] = [];
    let currentPage: any[] = [];
    let currentHeight = 0;

    content.forEach(item => {
      const itemHeight = item.type === 'image' 
        ? item.imageData?.height || 200 
        : LINE_HEIGHT;

      if (currentHeight + itemHeight > pageHeight && currentPage.length > 0) {
        pages.push([...currentPage]);
        currentPage = [item];
        currentHeight = itemHeight;
      } else {
        currentPage.push(item);
        currentHeight += itemHeight;
      }
    });

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages.length > 0 ? pages : [[]];
  }, [pageHeight]);

  return {
    pageHeight,
    calculatePageBreaks,
    linesPerPage: LINES_PER_PAGE
  };
};