//src/components/editor/DocumentEditor.tsx 2.0

'use client';

import React, { useCallback, useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { ImageResizer } from './ImageResizer';
import { GraphResizer } from './GraphResizer';
import { StatusBar } from './StatusBar';
import { useThemeStore } from '@/hooks/useTheme';
import { useLineSpacing, LineSpacing } from '@/hooks/useLineSpacing';
import { Plus } from 'lucide-react';
import { GraphData } from './GraphBlock';

interface DocumentEditorProps {
  pageContainerRef: React.RefObject<HTMLDivElement | null>;
  onToggleOutline: () => void;
  onToggleTemplateGallery: () => void;
  onToggleAiPanel: () => void;
  isTocOpen: boolean;
  isTemplateGalleryOpen: boolean;
  isAiPanelOpen: boolean;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saveToHistory: (force?: boolean) => void;
  insertImage: (imageData: any) => void;
  insertMath: (isInline?: boolean) => void;
  insertGraph: (graphData: GraphData) => void;
  insertTemplate: (html: string) => void;
  rehydrateMathBlocks: (container: HTMLElement) => void;
  rehydrateGraphBlocks: (container: HTMLElement) => void;
  isContentHubOpen: boolean;
  isHubExpanded: boolean;
  onGalleryTemplateDrop: () =>  void;
  resetHistory: () => void;
  scheduleReflow: (delay?: number) => void;
  immediateReflow: () => void;
}

export interface DocumentEditorHandle {
  resetHistory: () => void;
}

export const DocumentEditor = forwardRef<DocumentEditorHandle, DocumentEditorProps>((props, ref) => {
  const {
    pageContainerRef,
    onToggleOutline,
    onToggleTemplateGallery,
    onToggleAiPanel,
    isTocOpen,
    isTemplateGalleryOpen,
    isAiPanelOpen,
    undo,
    redo,
    canUndo,
    canRedo,
    saveToHistory,
    insertImage,
    insertMath,
    insertGraph,
    insertTemplate,
    rehydrateMathBlocks,
    rehydrateGraphBlocks,
    isContentHubOpen,
    isHubExpanded,
    onGalleryTemplateDrop,
    resetHistory,
    scheduleReflow,
    immediateReflow,
  } = props;

  useImperativeHandle(ref, () => ({
    resetHistory() {
      resetHistory();
    }
  }), [resetHistory]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedImageElement, setSelectedImageElement] = useState<HTMLImageElement | null>(null);
  const [selectedGraphElement, setSelectedGraphElement] = useState<HTMLElement | null>(null);
  
  const { 
    currentLineSpacing, 
    applyLineSpacing, 
    detectCurrentLineSpacing, 
    initializeDefaultLineSpacing,
    applyDefaultLineSpacingToElement 
  } = useLineSpacing();
  
  const savedRangeRef = useRef<Range | null>(null);
  const isInitialized = useRef(false);

  const [currentChapter, setCurrentChapter] = useState(1);
  const [totalChapters, setTotalChapters] = useState(1);
  const [dropIndicatorPosition, setDropIndicatorPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [textAlign, setTextAlign] = useState('left');
  const [currentBlockType, setCurrentBlockType] = useState('p');
  const [currentFont, setCurrentFont] = useState('Inter');
  const [currentSize, setCurrentSize] = useState('14pt');
  const [currentTextColor, setCurrentTextColor] = useState('#000000');

  const isCursorAtEndOfPage = useCallback((): boolean => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    
    const range = selection.getRangeAt(0);
    const pageContent = range.startContainer.nodeType === Node.ELEMENT_NODE 
      ? (range.startContainer as HTMLElement).closest('.page-content')
      : range.startContainer.parentElement?.closest('.page-content');
    
    if (!pageContent) return false;
    
    const endRange = document.createRange();
    endRange.selectNodeContents(pageContent);
    endRange.collapse(false); 
    
    const comparison = range.compareBoundaryPoints(Range.START_TO_START, endRange);
    
    if (comparison === 0) return true;
    
    const afterRange = document.createRange();
    afterRange.setStart(range.endContainer, range.endOffset);
    afterRange.setEnd(endRange.endContainer, endRange.endOffset);
    
    const textAfterCursor = afterRange.toString().trim();
    
    return textAfterCursor === '' || /^\s*$/.test(textAfterCursor);
  }, []);

  const moveCursorToNextPage = useCallback((currentPageContent: HTMLElement) => {
    if (!pageContainerRef.current) return;
    
    const pages = Array.from(pageContainerRef.current.querySelectorAll('.page'));
    const currentPage = currentPageContent.closest('.page');
    const currentPageIndex = pages.indexOf(currentPage as HTMLElement);
    
    let nextPage = pages[currentPageIndex + 1] as HTMLElement;
    
    if (!nextPage) {
      const newPageDiv = document.createElement('div');
      newPageDiv.className = 'page';
      const newPageContent = document.createElement('div');
      newPageContent.className = 'page-content';
      newPageContent.contentEditable = 'true';
      newPageContent.innerHTML = '<p><br></p>';
      newPageDiv.appendChild(newPageContent);
      pageContainerRef.current.appendChild(newPageDiv);
      nextPage = newPageDiv;
      
      setTimeout(() => saveToHistory(true), 50);
    }
    
    const nextPageContent = nextPage.querySelector('.page-content') as HTMLElement;
    if (nextPageContent) {
      let targetElement: Element | null = null;
      
      const firstParagraph = nextPageContent.querySelector('p');
      const firstHeading = nextPageContent.querySelector('h1, h2, h3, h4, h5, h6');
      const firstBlock = nextPageContent.querySelector('div, li');
      
      targetElement = firstParagraph || firstHeading || firstBlock;
      
      if (!targetElement) {
        const newP = document.createElement('p');
        newP.innerHTML = '<br>';
        nextPageContent.appendChild(newP);
        targetElement = newP;
      }
      
      const range = document.createRange();
      const selection = window.getSelection();
      
      try {
        if (targetElement.tagName === 'P' && targetElement.innerHTML === '<br>') {
          range.setStart(targetElement, 0);
        } else if (targetElement.firstChild) {
          range.setStart(targetElement.firstChild, 0);
        } else {
          range.setStart(targetElement, 0);
        }
        
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        nextPageContent.focus();
        
        console.log('Set cursor in element:', targetElement.tagName, targetElement.innerHTML);
        
        setTimeout(() => {
          if (!targetElement) {
            console.error('targetElement is null, cannot scroll');
            return;
          }
          
          console.log('Starting scroll calculation...');
          
          const elementRect = targetElement.getBoundingClientRect();
          const pageRect = nextPageContent.getBoundingClientRect();
          
          console.log('Element details:', {
            tagName: targetElement.tagName,
            innerHTML: targetElement.innerHTML,
            elementRect: elementRect,
            pageRect: pageRect
          });
          
          if (elementRect.width > 0 && elementRect.height > 0) {
            const viewportHeight = window.innerHeight;
            const viewportCenterY = viewportHeight / 2;
            
            const scrollOffset = elementRect.top - viewportCenterY;
            
            console.log('Element-based scroll calculation:', {
              elementTop: elementRect.top,
              viewportHeight: viewportHeight,
              viewportCenter: viewportCenterY,
              scrollOffset: scrollOffset
            });
            
            console.log('Performing scroll with offset:', scrollOffset);
            
            const scrollContainer = nextPageContent.closest('.overflow-y-auto') || 
                                 document.querySelector('.overflow-y-auto') ||
                                 document.documentElement;
            
            if (scrollContainer && scrollContainer !== document.documentElement) {
              console.log('Using container scroll (primary method)');
              (scrollContainer as Element).scrollBy({
                top: scrollOffset,
                behavior: 'smooth'
              });
            } else {
              console.log('Using window scroll (fallback)');
              window.scrollBy({
                top: scrollOffset,
                behavior: 'smooth'
              });
            }
            
          } else if (pageRect.width > 0 && pageRect.height > 0) {
            const viewportHeight = window.innerHeight;
            const viewportCenterY = viewportHeight / 2;
            const scrollOffset = pageRect.top - viewportCenterY + 50;
            
            console.log('Using page content fallback:', {
              pageTop: pageRect.top,
              viewportCenter: viewportCenterY,
              scrollOffset: scrollOffset
            });
            
            const scrollContainer = nextPageContent.closest('.overflow-y-auto') || 
                                 document.querySelector('.overflow-y-auto') ||
                                 document.documentElement;
            
            if (scrollContainer && scrollContainer !== document.documentElement) {
              (scrollContainer as Element).scrollBy({
                top: scrollOffset,
                behavior: 'smooth'
              });
            } else {
              window.scrollBy({
                top: scrollOffset,
                behavior: 'smooth'
              });
            }
            
          } else {
            console.error('Both element and page have invalid dimensions!');
            console.log('Force scrolling to next page');
            nextPage.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
        
      } catch (error) {
        console.warn('Could not set precise cursor position, falling back to focus');
        nextPageContent.focus();
        
        setTimeout(() => {
          const pageRect = nextPageContent.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportCenterY = viewportHeight / 2;
          const scrollOffset = pageRect.top - viewportCenterY + 100;
          
          window.scrollBy({
            top: scrollOffset,
            behavior: 'smooth'
          });
        }, 100);
      }
    }
  }, [pageContainerRef, saveToHistory]);
  
  const moveCursorToPreviousPage = useCallback((currentPageContent: HTMLElement) => {
    if (!pageContainerRef.current) return false;
    
    const pages = Array.from(pageContainerRef.current.querySelectorAll('.page'));
    const currentPage = currentPageContent.closest('.page');
    const currentPageIndex = pages.indexOf(currentPage as HTMLElement);
    
    if (currentPageIndex <= 0) return false;
    
    const previousPage = pages[currentPageIndex - 1] as HTMLElement;
    const previousPageContent = previousPage.querySelector('.page-content') as HTMLElement;
    
    if (previousPageContent) {
      const range = document.createRange();
      const selection = window.getSelection();
      
      try {
        const walker = document.createTreeWalker(
          previousPageContent,
          NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
          {
            acceptNode: (node) => {
              if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
              }
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE'].includes(element.tagName)) {
                  return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_SKIP;
              }
              return NodeFilter.FILTER_SKIP;
            }
          }
        );
        
        let lastNode = null;
        let currentNode;
        while (currentNode = walker.nextNode()) {
          lastNode = currentNode;
        }
        
        let targetElement: Element | null = null;
        
        if (lastNode) {
          if (lastNode.nodeType === Node.TEXT_NODE) {
            range.setStart(lastNode, lastNode.textContent?.length || 0);
            targetElement = lastNode.parentElement;
          } else {
            const element = lastNode as Element;
            if (element.lastChild && element.lastChild.nodeType === Node.TEXT_NODE) {
              range.setStart(element.lastChild, element.lastChild.textContent?.length || 0);
            } else {
              range.setStart(element, element.childNodes.length);
            }
            targetElement = element;
          }
        } else {
          range.selectNodeContents(previousPageContent);
          range.collapse(false);
          targetElement = previousPageContent.querySelector('p') || previousPageContent;
        }
        
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        currentPage?.remove();
        
        previousPageContent.focus();
        
        setTimeout(() => {
          if (targetElement) {
            const elementRect = targetElement.getBoundingClientRect();
            
            if (elementRect.width > 0 && elementRect.height > 0) {
              const viewportHeight = window.innerHeight;
              const viewportCenterY = viewportHeight / 2;
              const scrollOffset = elementRect.top - viewportCenterY;
              
              console.log('Previous page element-based scroll:', {
                elementTop: elementRect.top,
                viewportCenter: viewportCenterY,
                scrollOffset: scrollOffset
              });
              
              window.scrollBy({
                top: scrollOffset,
                behavior: 'smooth'
              });
              return;
            }
          }
          
          const pageRect = previousPageContent.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportCenterY = viewportHeight / 2;
          const scrollOffset = pageRect.top - viewportCenterY + 100;
          
          console.log('Using page content fallback for previous page scroll');
          window.scrollBy({
            top: scrollOffset,
            behavior: 'smooth'
          });
        }, 100);
        
        return true;
        
      } catch (error) {
        console.warn('Could not set precise cursor position in previous page');
        previousPageContent.focus();
        currentPage?.remove();
        
        setTimeout(() => {
          const pageRect = previousPageContent.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const viewportCenterY = viewportHeight / 2;
          const scrollOffset = pageRect.top - viewportCenterY + 100;
          
          window.scrollBy({
            top: scrollOffset,
            behavior: 'smooth'
          });
        }, 100);
        
        return true;
      }
    }
    
    return false;
  }, [pageContainerRef]);

  const mergeWithPreviousPage = useCallback((currentPageContent: HTMLElement) => {
    if (!pageContainerRef.current) return false;

    const pages = Array.from(pageContainerRef.current.querySelectorAll('.page'));
    const currentPage = currentPageContent.closest('.page');
    const currentPageIndex = pages.indexOf(currentPage as HTMLElement);

    if (currentPageIndex <= 0) return false;

    const previousPage = pages[currentPageIndex - 1] as HTMLElement;
    const previousPageContent = previousPage.querySelector('.page-content') as HTMLElement;

    if (previousPageContent) {
        const selection = window.getSelection();
        const range = document.createRange();

        const cursorMarker = document.createTextNode('\u200B');
        previousPageContent.appendChild(cursorMarker);

        while (currentPageContent.firstChild) {
            previousPageContent.appendChild(currentPageContent.firstChild);
        }

        currentPage?.remove();
        saveToHistory(true);

        range.setStart(cursorMarker, 1);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);

        cursorMarker.remove();

        previousPageContent.focus();
        immediateReflow();

        return true;
    }

    return false;
  }, [pageContainerRef, saveToHistory, immediateReflow]);

  useEffect(() => {
    const container = pageContainerRef.current;
    if (!container) return;

    const handleClickToPositionCursor = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (target.classList.contains('page-content')) {
        const floatedElements = container.querySelectorAll<HTMLElement>(
          '.image-wrapper[data-float="left"], .image-wrapper[data-float="right"], ' +
          '.graph-wrapper[data-float="left"], .graph-wrapper[data-float="right"], ' +
          '.template-wrapper[data-float="left"], .template-wrapper[data-float="right"]'
        );

        if (floatedElements.length === 0) return;

        const clickY = e.clientY;
        const clickX = e.clientX;

        for (const floatedEl of floatedElements) {
          const rect = floatedEl.getBoundingClientRect();
          const isFloatLeft = floatedEl.dataset.float === 'left';

          const isClickInVerticalBounds = clickY >= rect.top && clickY <= rect.bottom;
          const isClickInHorizontalVoid = isFloatLeft ? clickX > rect.right : clickX < rect.left;

          if (isClickInVerticalBounds && isClickInHorizontalVoid) {
            e.preventDefault();
            e.stopPropagation();

            const range = document.caretRangeFromPoint(e.clientX, e.clientY);
            const selection = window.getSelection();
            
            if (range && selection) {
              selection.removeAllRanges();
              selection.addRange(range);
            }
            
            break;
          }
        }
      }
    };

    container.addEventListener('click', handleClickToPositionCursor);

    return () => {
      container.removeEventListener('click', handleClickToPositionCursor);
    };
  }, [pageContainerRef]);

  const addNewChapter = useCallback(() => {
    if (!pageContainerRef.current) return;
    saveToHistory(true);
    const newPageDiv = document.createElement('div');
    newPageDiv.className = 'page';
    const newPageContent = document.createElement('div');
    newPageContent.className = 'page-content';
    newPageContent.contentEditable = 'true';
    newPageContent.dataset.placeholder = 'Start typing your new chapter...';
    const defaultHeading = document.createElement('h1');
    defaultHeading.innerHTML = 'New Chapter<br>';
    newPageContent.appendChild(defaultHeading);
    newPageDiv.appendChild(newPageContent);
    pageContainerRef.current.appendChild(newPageDiv);
    newPageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const range = document.createRange();
    const selection = window.getSelection();
    range.setStart(defaultHeading, 0);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
    setTimeout(() => {
      saveToHistory(true);
      scheduleReflow();
    }, 100);
  }, [pageContainerRef, saveToHistory, scheduleReflow]);

  useEffect(() => {
    const container = pageContainerRef.current;
    if (container && container.innerHTML && !isInitialized.current) {
      rehydrateMathBlocks(container);
      rehydrateGraphBlocks(container);
    }
  }, [pageContainerRef, rehydrateMathBlocks, rehydrateGraphBlocks]);

  useEffect(() => {
    const container = pageContainerRef.current;
    if (!container) return;
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (!e.dataTransfer) return;
      const isTemplate = e.dataTransfer.types.includes('application/gallery-template-item') || e.dataTransfer.types.includes('application/ai-template-item');
      const isNewGraph = e.dataTransfer.types.includes('application/ai-graph-item');
      const isMovingGraph = e.dataTransfer.types.includes('application/custom-graph-id');
      const isMovingImage = e.dataTransfer.types.includes('application/custom-element-id');
      const isMovingTemplate = e.dataTransfer.types.includes('application/custom-template-id');
      e.dataTransfer.dropEffect = (isTemplate || isNewGraph) ? 'copy' : 'move';
      if (isTemplate || isNewGraph || isMovingGraph || isMovingImage || isMovingTemplate) {
        const range = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (range) {
          const rect = range.getClientRects()[0];
          if (rect) {
            const pageContent = container.querySelector('.page-content');
            setDropIndicatorPosition({
              top: rect.top + window.scrollY,
              left: pageContent ? pageContent.getBoundingClientRect().left + window.scrollX : rect.left + window.scrollX,
              width: pageContent ? pageContent.clientWidth : rect.width,
            });
          }
        }
      }
    };
    const handleDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null || !container.contains(e.relatedTarget as Node)) {
        setDropIndicatorPosition(null);
      }
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setDropIndicatorPosition(null);
      if (!e.dataTransfer) return;
      const isGalleryDrop = e.dataTransfer.types.includes('application/gallery-template-item');
      const isAiTemplateDrop = e.dataTransfer.types.includes('application/ai-template-item');
      const isAiGraphDrop = e.dataTransfer.types.includes('application/ai-graph-item');
      const graphMoveId = e.dataTransfer.getData('application/custom-graph-id');
      const imageMoveId = e.dataTransfer.getData('application/custom-element-id');
      const templateMoveId = e.dataTransfer.getData('application/custom-template-id');

      if (isAiGraphDrop) {
        const graphDataString = e.dataTransfer.getData('application/ai-graph-item');
        try {
          const graphData = JSON.parse(graphDataString);
          const range = document.caretRangeFromPoint(e.clientX, e.clientY);
          if (range) {
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            insertGraph(graphData);
          }
        } catch (error) {
          console.error("Failed to parse dropped graph data:", error);
        }
        return;
      }
      
      const templateHtml = e.dataTransfer.getData('text/html');
      if (templateHtml && (isGalleryDrop || isAiTemplateDrop)) {
        let insertionRange: Range | null = null;
        const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
        const targetPageContent = dropTarget ? dropTarget.closest('.page-content') : null;

        if (targetPageContent) {
          insertionRange = document.caretRangeFromPoint(e.clientX, e.clientY);
        } else {
          const pages = Array.from(container.querySelectorAll('.page')) as HTMLElement[];
          if (pages.length > 0) {
            let closestPage: HTMLElement | null = null;
            for (const page of pages) {
              const rect = page.getBoundingClientRect();
              if (rect.top < e.clientY) { closestPage = page; }
            }
            if (!closestPage) { closestPage = pages[0]; }
            const finalTargetPageContent = closestPage.querySelector('.page-content');
            if (finalTargetPageContent) {
              insertionRange = document.createRange();
              insertionRange.selectNodeContents(finalTargetPageContent);
              insertionRange.collapse(false);
            }
          }
        }

        if (insertionRange) {
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(insertionRange);
            insertTemplate(templateHtml);
            if (isGalleryDrop) {
                onGalleryTemplateDrop();
            }
            saveToHistory(true);
        }
        return;
      }

      if (graphMoveId) {
        const draggedElement = document.getElementById(graphMoveId);
        if (draggedElement) {
          saveToHistory(true);
          const range = document.caretRangeFromPoint(e.clientX, e.clientY);
          if (range) {
            draggedElement.remove();
            range.insertNode(draggedElement);
          }
          setTimeout(() => {
            saveToHistory(true);
            scheduleReflow();
          }, 100);
        }
        return;
      }
      if (imageMoveId) {
        const draggedElement = document.getElementById(imageMoveId);
        if (draggedElement) {
          saveToHistory(true);
          const range = document.caretRangeFromPoint(e.clientX, e.clientY);
          if (range) {
            draggedElement.remove();
            range.insertNode(draggedElement);
          }
          setTimeout(() => {
            saveToHistory(true);
            scheduleReflow();
          }, 100);
        }
        return;
      }
      if (templateMoveId) {
        const draggedElement = document.getElementById(templateMoveId);
        if (draggedElement) {
          saveToHistory(true);
          const range = document.caretRangeFromPoint(e.clientX, e.clientY);
          if (range) {
            draggedElement.remove();
            range.insertNode(draggedElement);
          }
          setTimeout(() => {
            saveToHistory(true);
            scheduleReflow();
          }, 100);
        }
        return;
      }
    };
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);
    container.addEventListener('dragleave', handleDragLeave);
    return () => {
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
      container.removeEventListener('dragleave', handleDragLeave);
    };
  }, [pageContainerRef, saveToHistory, onGalleryTemplateDrop, insertGraph, insertTemplate, scheduleReflow]);

  useEffect(() => {
    const container = pageContainerRef.current;
    if (!container) return;
    container.querySelectorAll('.graph-selected').forEach(el => el.classList.remove('graph-selected'));
    if (selectedGraphElement) {
      selectedGraphElement.classList.add('graph-selected');
    }
  }, [selectedGraphElement, pageContainerRef]);

  useEffect(() => {
    const container = pageContainerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter(entry => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          const topMostEntry = visibleEntries.reduce((prev, current) => {
            return prev.boundingClientRect.top < current.boundingClientRect.top ? prev : current;
          });
          const chapterElements = Array.from(container.querySelectorAll('.page'));
          const index = chapterElements.indexOf(topMostEntry.target as HTMLElement);
          if (index !== -1) {
            setCurrentChapter(index + 1);
          }
        }
      },
      { root: null, rootMargin: '0px 0px -60% 0px', threshold: 0 }
    );
    const chapters = container.querySelectorAll('.page');
    setTotalChapters(chapters.length);
    chapters.forEach((chapter) => observer.observe(chapter));
    const mutationObserver = new MutationObserver(() => {
      const updatedChapters = container.querySelectorAll('.page');
      setTotalChapters(updatedChapters.length);
      observer.disconnect();
      updatedChapters.forEach((chapter) => observer.observe(chapter));
    });
    mutationObserver.observe(container, { childList: true });
    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [pageContainerRef]);

  useEffect(() => {
    if (pageContainerRef.current && !isInitialized.current) {
      const pageContent = pageContainerRef.current.querySelector('.page-content') as HTMLElement;
      if (pageContent) {
        initializeDefaultLineSpacing(pageContent);
        isInitialized.current = true;
      }
    }
  }, [pageContainerRef, initializeDefaultLineSpacing]);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedRangeRef.current = selection.getRangeAt(0);
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (savedRangeRef.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedRangeRef.current);
    }
  }, []);

  const updateToolbarState = useCallback(() => {
    if (!pageContainerRef.current) return;
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    setIsUnderline(document.queryCommandState('underline'));
    detectCurrentLineSpacing();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    let node = selection.anchorNode;
    let element = node?.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : node?.parentElement;
    if (!element) return;
    let blockTypeFound = false, fontFound = false, sizeFound = false, highlightFound = false, colorFound = false;
    while (element && element.contentEditable !== 'true') {
      if (!blockTypeFound && element.nodeName.match(/^(H[1-4]|P|BLOCKQUOTE|PRE)$/)) {
        setCurrentBlockType(element.nodeName.toLowerCase());
        blockTypeFound = true;
      }
      if (!fontFound && element.style.fontFamily) {
        setCurrentFont(element.style.fontFamily.replace(/['"]/g, ''));
        fontFound = true;
      }
      if (!sizeFound && element.nodeName === 'SPAN' && element.style.fontSize) {
        setCurrentSize(element.style.fontSize);
        sizeFound = true;
      }
      if (!highlightFound && element.style.backgroundColor === 'rgb(255, 243, 163)') {
        highlightFound = true;
      }
      if (!colorFound && element.style.color) {
        const color = element.style.color;
        if (color.startsWith('rgb')) {
          const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            setCurrentTextColor(hex);
          }
        } else {
          setCurrentTextColor(color);
        }
        colorFound = true;
      }
      element = element.parentElement;
    }
    setIsHighlighted(highlightFound);
    if (!blockTypeFound) setCurrentBlockType('p');
    if (!fontFound) setCurrentFont('Inter');
    if (!sizeFound) setCurrentSize('14pt');
    if (!colorFound) setCurrentTextColor('#000000');
    if (document.queryCommandState('justifyCenter')) setTextAlign('center');
    else if (document.queryCommandState('justifyRight')) setTextAlign('right');
    else if (document.queryCommandState('justifyFull')) setTextAlign('justify');
    else setTextAlign('left');
    if (selection.isCollapsed && !highlightFound) {
      const browserHighlightState = document.queryCommandValue('hiliteColor');
      if (browserHighlightState && browserHighlightState !== 'transparent' && browserHighlightState !== 'rgb(255, 255, 255)') {
        document.execCommand('hiliteColor', false, 'transparent');
      }
    }
  }, [pageContainerRef, detectCurrentLineSpacing]);

  const checkForAutoList = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return false;
    const textContent = node.textContent || '';
    const cursorPos = range.startOffset;
    const textBeforeCursor = textContent.substring(0, cursorPos);
    const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n');
    const currentLineText = textBeforeCursor.substring(lastNewlineIndex + 1);
    const numberedListMatch = currentLineText.match(/^(\d+)\.\s$/);
    const bulletListMatch = currentLineText.match(/^[\*\-]\s$/);
    if (!numberedListMatch && !bulletListMatch) return false;
    const parentBlock = node.parentElement?.closest('p, div, h1, h2, h3, h4');
    if (!parentBlock || parentBlock.closest('li')) return false;
    const pattern = numberedListMatch ? numberedListMatch[0] : bulletListMatch![0];
    const patternStart = lastNewlineIndex + 1;
    const patternEnd = patternStart + pattern.length;
    const deleteRange = document.createRange();
    deleteRange.setStart(node, patternStart);
    deleteRange.setEnd(node, patternEnd);
    deleteRange.deleteContents();
    const listType = numberedListMatch ? 'ol' : 'ul';
    const listElement = document.createElement(listType);
    const listItem = document.createElement('li');
    while (parentBlock.firstChild) {
      listItem.appendChild(parentBlock.firstChild);
    }
    if (listItem.innerHTML === "") {
      listItem.innerHTML = '<br>';
    }
    listElement.appendChild(listItem);
    parentBlock.parentNode?.replaceChild(listElement, parentBlock);
    const newRange = document.createRange();
    newRange.setStart(listItem, 0);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    return true;
  }, []);

  const checkForMathBlock = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE || range.startOffset < 2) return false;
    const textContent = node.textContent || '';
    if (textContent.substring(range.startOffset - 2, range.startOffset) !== '$$') return;
    const parentBlock = node.parentElement?.closest('p, div');
    if (!parentBlock || parentBlock.textContent?.trim() !== '$$') return false;
    const parent = parentBlock.parentNode;
    if (parent) {
      const tempNode = document.createElement('span');
      parent.insertBefore(tempNode, parentBlock);
      parentBlock.remove();
      const newRange = document.createRange();
      newRange.selectNode(tempNode);
      selection.removeAllRanges();
      selection.addRange(newRange);
      insertMath(false);
      tempNode.remove();
      return true;
    }
    return false;
  }, [insertMath]);

  // RESTORED: Debugging function
  const debugPageHeight = useCallback((pageContent: HTMLElement) => {
    console.log('=== PAGE HEIGHT DIAGNOSTIC ===');
    
    const page = pageContent.closest('.page') as HTMLElement;
    
    if (page) {
      const pageRect = page.getBoundingClientRect();
      const contentRect = pageContent.getBoundingClientRect();
      
      console.log('Page element dimensions:', {
        height: pageRect.height,
        width: pageRect.width
      });
      
      console.log('Page-content element dimensions:', {
        height: contentRect.height,
        width: contentRect.width
      });
      
      const pageStyles = window.getComputedStyle(page);
      const contentStyles = window.getComputedStyle(pageContent);
      
      console.log('Page element styles:', {
        padding: pageStyles.padding,
        margin: pageStyles.margin,
        border: pageStyles.border,
        minHeight: pageStyles.minHeight,
        height: pageStyles.height,
        boxSizing: pageStyles.boxSizing
      });
      
      console.log('Page-content element styles:', {
        padding: contentStyles.padding,
        margin: contentStyles.margin,
        border: contentStyles.border,
        minHeight: contentStyles.minHeight,
        height: contentStyles.height,
        boxSizing: contentStyles.boxSizing
      });
      
      console.log('Text content length:', pageContent.textContent?.length || 0);
      console.log('Inner HTML:', pageContent.innerHTML.substring(0, 200) + '...');
      
      const children = Array.from(pageContent.children);
      console.log('Child elements:', children.map(child => ({
        tagName: child.tagName,
        height: (child as HTMLElement).getBoundingClientRect().height,
        textContent: child.textContent?.substring(0, 50) + '...'
      })));
    }
    
    console.log('=== END DIAGNOSTIC ===');
  }, []);

  const handleInput = useCallback((event: React.FormEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target && target.classList.contains('page-content')) {
      const paragraphs = target.querySelectorAll('p:not([data-line-spacing])');
      paragraphs.forEach(p => { applyDefaultLineSpacingToElement(p as HTMLElement); });
      const blockElements = target.querySelectorAll('h1:not([data-line-spacing]), h2:not([data-line-spacing]), h3:not([data-line-spacing]), h4:not([data-line-spacing]), div:not([data-line-spacing]), blockquote:not([data-line-spacing])');
      blockElements.forEach(el => { applyDefaultLineSpacingToElement(el as HTMLElement); });
    }
    saveToHistory();
    updateToolbarState();
    scheduleReflow(500);
  }, [saveToHistory, updateToolbarState, applyDefaultLineSpacingToElement, scheduleReflow]);

  useEffect(() => {
    const container = pageContainerRef.current;
    if (!container) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          undo();
          return;
      }
      if (((event.metaKey || event.ctrlKey) && event.key === 'y') || (event.metaKey && event.shiftKey && event.key === 'z')) {
          event.preventDefault();
          redo();
          return;
      }
      
      // RESTORED: Enter key handler with console logs
      // REPLACE the existing Enter key handler in the handleKeyDown function with this improved version:

if (event.key === 'Enter') {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const pageContent = range.startContainer.nodeType === Node.ELEMENT_NODE 
      ? (range.startContainer as HTMLElement).closest('.page-content')
      : range.startContainer.parentElement?.closest('.page-content');
    
    if (pageContent) {
      const availableHeight = 936;
      const currentHeight = pageContent.getBoundingClientRect().height;
      const percentageFull = (currentHeight / availableHeight * 100).toFixed(1);
      
      console.log(`Page is ${percentageFull}% full (${currentHeight}px / ${availableHeight}px)`);
      
      pageContent.setAttribute('data-user-active', 'true');
      
      setTimeout(() => {
        pageContent.removeAttribute('data-user-active');
      }, 1000);
      
      const contentRange = document.createRange();
      contentRange.selectNodeContents(pageContent);
      const actualContentHeight = contentRange.getBoundingClientRect().height;
      
      const availableContentHeight = availableHeight - 105.6;
      
      console.log(`Actual content height: ${actualContentHeight}px, Available content space: ${availableContentHeight}px`);
      
      // NEW: Check if cursor is near the end of the page
      const isCursorNearEnd = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return false;
        
        const range = selection.getRangeAt(0);
        const pageContentRect = pageContent.getBoundingClientRect();
        
        // Get cursor position within the page
        let cursorY = 0;
        if (range.getClientRects().length > 0) {
          cursorY = range.getClientRects()[0].top;
        } else {
          // Fallback: use the position of the container element
          const container = range.startContainer.nodeType === Node.ELEMENT_NODE 
            ? range.startContainer as HTMLElement
            : range.startContainer.parentElement;
          if (container) {
            cursorY = container.getBoundingClientRect().top;
          }
        }
        
        // Calculate cursor position relative to page content
        const relativeY = cursorY - pageContentRect.top;
        const cursorPercentage = (relativeY / pageContentRect.height) * 100;
        
        console.log(`Cursor is at ${cursorPercentage.toFixed(1)}% of page height (${relativeY}px from top)`);
        
        // Only consider cursor "near end" if it's in the bottom 20% of the page
        return cursorPercentage > 93;
      };
      
      if (actualContentHeight > (availableContentHeight * 0.9)) {
        console.log('Content is over 90% of available space, checking for overflow after Enter...');
        
        setTimeout(() => {
          const newContentRange = document.createRange();
          newContentRange.selectNodeContents(pageContent);
          const newActualContentHeight = newContentRange.getBoundingClientRect().height;
          
          console.log(`After Enter - actual content height: ${newActualContentHeight}px`);
          
          // MODIFIED: Only move to next page if content overflowed AND cursor is near the end
          if (newActualContentHeight > availableContentHeight && isCursorNearEnd()) {
            console.log('Content overflowed available space AND cursor is near end, triggering reflow');
            immediateReflow();
            
            setTimeout(() => {
              const postReflowSelection = window.getSelection();
              if (postReflowSelection && postReflowSelection.rangeCount > 0) {
                const postReflowRange = postReflowSelection.getRangeAt(0);
                const currentPageAfterReflow = postReflowRange.startContainer.nodeType === Node.ELEMENT_NODE 
                  ? (postReflowRange.startContainer as HTMLElement).closest('.page-content')
                  : postReflowRange.startContainer.parentElement?.closest('.page-content');
                
                if (currentPageAfterReflow === pageContent) {
                  const finalContentRange = document.createRange();
                  finalContentRange.selectNodeContents(currentPageAfterReflow);
                  const finalContentHeight = finalContentRange.getBoundingClientRect().height;
                  
                  if (finalContentHeight > availableContentHeight) {
                    moveCursorToNextPage(currentPageAfterReflow as HTMLElement);
                  }
                }
              }
            }, 50);
          } else if (newActualContentHeight > availableContentHeight) {
            console.log('Content overflowed but cursor is not near end - only running reflow without moving cursor');
            immediateReflow();
          } else {
            console.log('Content did not overflow after Enter');
          }
        }, 0);
      } else {
        console.log('Content not full enough for overflow check, doing normal Enter behavior');
      }
    }
  }
  
  saveToHistory(true);
  return;
}
      
      if (event.key === 'Backspace') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const pageContent = range.startContainer.nodeType === Node.ELEMENT_NODE 
            ? (range.startContainer as HTMLElement).closest('.page-content')
            : range.startContainer.parentElement?.closest('.page-content');
          
          if (pageContent) {
            const isAtBeginningOfPage = () => {
              if (!selection.isCollapsed || range.startOffset !== 0) return false;
              let node = range.startContainer;
              if (node.nodeType === Node.TEXT_NODE) {
                  if (range.startOffset > 0) return false;
                  node = node.parentElement!;
              }
              while (node && node !== pageContent) {
                  if (node.previousSibling) return false;
                  node = node.parentElement!;
              }
              return node === pageContent;
            };
            
            if (isAtBeginningOfPage()) {
              const totalPages = Array.from(pageContainerRef.current?.querySelectorAll('.page') || []).length;
              if (totalPages > 1) {
                event.preventDefault();
                
                const isPageEmpty = !pageContent.textContent?.trim() && pageContent.querySelectorAll('img, .math-wrapper, .graph-wrapper').length === 0;

                if (isPageEmpty) {
                  if (moveCursorToPreviousPage(pageContent as HTMLElement)) {
                    saveToHistory(true);
                  }
                } else {
                  mergeWithPreviousPage(pageContent as HTMLElement);
                }
                return;
              }
            }
          }
        }
        
        saveToHistory(true);
        setTimeout(() => scheduleReflow(200), 50);
        return;
      }
      
      if (event.key === ' ') {
        setTimeout(() => { 
          if (checkForAutoList()) { 
            saveToHistory(true); 
            updateToolbarState();
            scheduleReflow();
          } 
        }, 0);
        return;
      }
      if (event.key === '$') {
        setTimeout(() => { if (checkForMathBlock()) { saveToHistory(true); } }, 0);
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        const startElement = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement) as HTMLElement;
        const listItem = startElement.closest('li');
        if (listItem) {
          document.execCommand(event.shiftKey ? 'outdent' : 'indent');
        } else {
          document.execCommand('insertText', false, '\t');
        }
        saveToHistory(true);
        scheduleReflow();
        return;
      }
    };
    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [pageContainerRef, saveToHistory, checkForAutoList, checkForMathBlock, updateToolbarState, undo, redo, scheduleReflow, isCursorAtEndOfPage, immediateReflow, moveCursorToNextPage, moveCursorToPreviousPage, mergeWithPreviousPage]);

  useEffect(() => {
    document.addEventListener('selectionchange', updateToolbarState);
    return () => document.removeEventListener('selectionchange', updateToolbarState);
  }, [updateToolbarState]);

  const applyCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    saveToHistory(true);
    setTimeout(updateToolbarState, 50);
    scheduleReflow();
  };

  const applyStyle = (style: 'fontFamily' | 'fontSize' | 'color', value: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    if (style === 'fontFamily') span.style.fontFamily = value;
    if (style === 'fontSize') span.style.fontSize = value;
    if (style === 'color') span.style.color = value;
    if (range.collapsed) {
      span.innerHTML = '&#8203;';
      range.insertNode(span);
      range.setStart(span.firstChild!, 1);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      const content = range.extractContents();
      span.appendChild(content);
      range.insertNode(span);
    }
    saveToHistory(true);
    setTimeout(updateToolbarState, 50);
    scheduleReflow();
  };

  const handleTextColorChange = (color: string) => {
    applyStyle('color', color);
    setCurrentTextColor(color);
  };

  const handleHighlight = () => {
    const color = isHighlighted ? 'transparent' : '#FFF3A3';
    document.execCommand('hiliteColor', false, color);
    saveToHistory(true);
    scheduleReflow();
  };

  const handleLineSpacingChange = (spacing: LineSpacing) => {
    saveSelection();
    applyLineSpacing(spacing);
    saveToHistory(true);
    scheduleReflow();
  };

  const handleInsertImage = useCallback(() => fileInputRef.current?.click(), []);
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) insertImage({ src: e.target.result as string, width: 300, height: 200, alt: file.name });
      };
      reader.readAsDataURL(file);
    }
    event.target.value = '';
  }, [insertImage]);

  const handleNavigateToChapter = (chapterNum: number) => {
    const container = pageContainerRef.current;
    if (!container) return;
    const chapters = container.querySelectorAll('.page');
    const targetChapter = chapters[chapterNum - 1];
    if (targetChapter) {
      targetChapter.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleInsertTable = (rows: number, cols: number) => {
    restoreSelection();
    let tableHtml = '<table><tbody>';
    for (let r = 0; r < rows; r++) {
      tableHtml += '<tr>';
      for (let c = 0; c < cols; c++) {
        tableHtml += `<td><br></td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table>';
    document.execCommand('insertHTML', false, tableHtml + '<p><br></p>');
    saveToHistory(true);
    scheduleReflow();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
      {dropIndicatorPosition && (
        <div
          className="absolute h-1 bg-purple-500 rounded-full z-50 pointer-events-none transition-all duration-75"
          style={{
            top: `${dropIndicatorPosition.top}px`,
            left: `${dropIndicatorPosition.left}px`,
            width: `${dropIndicatorPosition.width}px`,
          }}
        />
      )}

      <div className="flex-shrink-0 w-full flex justify-center px-6 pt-4 bg-gray-50 sticky top-0 z-20 no-print">
        <div className="w-full max-w-7xl">
          <EditorToolbar
            onUndo={undo} onRedo={redo} onBlockTypeChange={(type) => applyCommand('formatBlock', type)}
            onFontChange={(font) => applyStyle('fontFamily', font)} onSizeChange={(size) => applyStyle('fontSize', size)}
            onBold={() => applyCommand('bold')} onItalic={() => applyCommand('italic')} onUnderline={() => applyCommand('underline')}
            onHighlight={handleHighlight} onAlign={(align) => applyCommand(`justify${align.charAt(0).toUpperCase() + align.slice(1)}`)}
            onBulletedList={() => applyCommand('insertUnorderedList')} onNumberedList={() => applyCommand('insertOrderedList')}
            onInsertImage={handleInsertImage} onBlockquote={() => applyCommand('formatBlock', 'blockquote')}
            onCodeBlock={() => applyCommand('formatBlock', 'pre')} onInsertTable={handleInsertTable}
            onTableMenuOpen={saveSelection} onTextColorChange={handleTextColorChange} onColorMenuOpen={saveSelection}
            onLineSpacingChange={handleLineSpacingChange} onLineSpacingMenuOpen={saveSelection}
            onInsertMath={() => insertMath(true)}
            canUndo={canUndo} canRedo={canRedo} isBold={isBold} isItalic={isItalic} isUnderline={isUnderline}
            isHighlighted={isHighlighted} textAlign={textAlign} currentBlockType={currentBlockType}
            currentFont={currentFont} currentSize={currentSize} currentTextColor={currentTextColor}
            currentLineSpacing={currentLineSpacing} onToggleOutline={onToggleOutline}
            onToggleStyleStudio={onToggleTemplateGallery} onToggleAiPanel={onToggleAiPanel}
            isTocOpen={isTocOpen} isStyleStudioOpen={isTemplateGalleryOpen} isAiPanelOpen={isAiPanelOpen}
          />
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pt-6 bg-gray-100 flex flex-col items-center relative">
        <div 
          ref={pageContainerRef} 
          className="page-container w-full" 
          onInput={handleInput} 
        >
        </div>
        
        <div 
          onClick={addNewChapter}
          className="w-full max-w-[8.5in] flex justify-center items-center p-8 mt-4 mb-12 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-colors duration-200 cursor-pointer"
        >
          <div className="text-center text-gray-500">
            <Plus className="w-8 h-8 mx-auto mb-2" />
            <p className="font-medium">Add New Chapter</p>
          </div>
        </div>
        
        <ImageResizer 
          pageContainerRef={scrollContainerRef}
          saveToHistory={saveToHistory} 
          selectedImageElement={selectedImageElement} 
          onImageSelect={setSelectedImageElement} 
        />
        <GraphResizer
          pageContainerRef={scrollContainerRef}
          saveToHistory={saveToHistory}
          selectedGraphElement={selectedGraphElement}
          onGraphSelect={setSelectedGraphElement}
        />
      </div>

      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      <StatusBar 
        currentChapter={currentChapter}
        totalChapters={totalChapters}
        onChapterChange={handleNavigateToChapter}
        isContentHubOpen={isContentHubOpen}
        isHubExpanded={isHubExpanded}
      />
    </div>
  );
});

DocumentEditor.displayName = 'DocumentEditor';