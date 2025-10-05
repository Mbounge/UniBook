//DocumentEditor.tsx

'use client';

import React, { useCallback, useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { ImageResizer } from './ImageResizer';
import { GraphResizer } from './GraphResizer';
import { StatusBar } from './StatusBar';
import { useLineSpacing, LineSpacing } from '@/hooks/useLineSpacing';
import { Plus } from 'lucide-react';
import { GraphData } from './GraphBlock';
import { analyzeParagraphs } from './hooks/useTextReflow';

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
  isReflowing: () => boolean;
  reflowPage: (pageElement: HTMLElement) => boolean;
  reflowBackwardFromPage: (pageElement: HTMLElement) => boolean;
  reflowSplitParagraph: (paragraphId: string) => boolean; // NEW
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
    isReflowing,
    reflowPage,
    reflowBackwardFromPage,
    reflowSplitParagraph, // NEW
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
  const [overflowWarningPage, setOverflowWarningPage] = useState<HTMLElement | null>(null);

  const runParagraphAnalysis = useCallback(() => {
    setTimeout(() => {
      if (!pageContainerRef.current) return;
      console.log('%c--- Running Full Paragraph Analysis ---', 'color: white; background-color: #4A90E2; padding: 2px 5px; border-radius: 3px;');
      const pages = Array.from(pageContainerRef.current.querySelectorAll('.page-content'));
      pages.forEach((pageContent, index) => {
        analyzeParagraphs(pageContent as HTMLElement, index + 1);
      });
    }, 0);
  }, [pageContainerRef]);

  const reflowWithCursor = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      immediateReflow();
      return;
    }

    const range = selection.getRangeAt(0);
    const markerId = `cursor-marker-${Date.now()}`;
    const marker = document.createElement('span');
    marker.id = markerId;
    
    range.insertNode(marker);
    immediateReflow();

    const newMarker = pageContainerRef.current?.querySelector(`#${markerId}`);
    if (newMarker) {
      const newRange = document.createRange();
      const newSelection = window.getSelection();
      
      newRange.setStartBefore(newMarker);
      newRange.collapse(true);
      
      newSelection?.removeAllRanges();
      newSelection?.addRange(newRange);

      newMarker.parentNode?.removeChild(newMarker);
    }
  }, [immediateReflow, pageContainerRef]);

  const handleImmediateOverflow = useCallback((pageContent: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      reflowPage(pageContent.parentElement as HTMLElement);
      return;
    }

    const range = selection.getRangeAt(0);
    const markerId = `cursor-marker-${Date.now()}`;
    const marker = document.createElement('span');
    marker.id = markerId;
    
    range.insertNode(marker);
    
    reflowPage(pageContent.parentElement as HTMLElement);

    const newMarker = pageContainerRef.current?.querySelector(`#${markerId}`);
    if (newMarker) {
      const newRange = document.createRange();
      const newSelection = window.getSelection();
      
      newRange.setStartBefore(newMarker);
      newRange.collapse(true);
      
      newSelection?.removeAllRanges();
      newSelection?.addRange(newRange);

      newMarker.parentNode?.removeChild(newMarker);
    }
  }, [reflowPage, pageContainerRef]);

  const checkAndReflowOnOverflow = useCallback((pageContent: HTMLElement): boolean => {
    if (isReflowing()) {
      console.log('%c[DEBUG] Reflow already in progress. Skipping trigger.', 'color: orange;');
      return false;
    }

    const RED_LINE_THRESHOLD_PX = 950;
    const currentContentHeight = pageContent.getBoundingClientRect().height;

    if (currentContentHeight > RED_LINE_THRESHOLD_PX) {
      console.log(
        `%c[DEBUG] Red Line Crossed! Content height (${Math.round(currentContentHeight)}px) > Threshold (${RED_LINE_THRESHOLD_PX}px). Triggering reflow.`,
        'color: red; font-weight: bold;'
      );
      handleImmediateOverflow(pageContent);
      return true;
    }
    return false;
  }, [isReflowing, handleImmediateOverflow]);

  // NEW: Check if we're editing a split paragraph and trigger live reflow
  const checkAndReflowSplitParagraph = useCallback((element: HTMLElement) => {
    if (isReflowing()) return;

    // Find the paragraph we're editing
    const paragraph = element.closest('p[data-paragraph-id]') as HTMLElement;
    if (!paragraph) return;

    const paragraphId = paragraph.dataset.paragraphId;
    if (!paragraphId) return;

    console.log(`%c[Live Reflow]: Detected edit in split paragraph [${paragraphId}]`, 'color: #FF6B6B; font-weight: bold;');

    // Save cursor position
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      reflowSplitParagraph(paragraphId);
      return;
    }

    const range = selection.getRangeAt(0);
    const markerId = `cursor-marker-${Date.now()}`;
    const marker = document.createElement('span');
    marker.id = markerId;
    marker.style.display = 'inline';
    
    try {
      range.insertNode(marker);
    } catch (e) {
      console.warn('Could not insert cursor marker', e);
      reflowSplitParagraph(paragraphId);
      return;
    }

    // Trigger reflow for this specific split paragraph
    reflowSplitParagraph(paragraphId);

    // Restore cursor
    setTimeout(() => {
      const newMarker = pageContainerRef.current?.querySelector(`#${markerId}`);
      if (newMarker) {
        const newRange = document.createRange();
        const newSelection = window.getSelection();
        
        newRange.setStartBefore(newMarker);
        newRange.collapse(true);
        
        newSelection?.removeAllRanges();
        newSelection?.addRange(newRange);

        newMarker.parentNode?.removeChild(newMarker);
      }
    }, 0);
  }, [isReflowing, reflowSplitParagraph, pageContainerRef]);

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
  }, [pageContainerRef, detectCurrentLineSpacing]);

  const updateOverflowWarning = useCallback(() => {
    const selection = window.getSelection();
    if (overflowWarningPage) {
      overflowWarningPage.classList.remove('overflow-warning');
    }

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const startNode = range.startContainer;
      const parentElement = startNode.nodeType === Node.ELEMENT_NODE ? startNode as HTMLElement : startNode.parentElement;
      const pageContent = parentElement?.closest('.page-content') as HTMLElement | null;

      if (pageContent) {
        const AVAILABLE_CONTENT_HEIGHT = 9.9 * 96;
        const WARNING_THRESHOLD = AVAILABLE_CONTENT_HEIGHT * 0.95;
        const currentContentHeight = pageContent.getBoundingClientRect().height;

        if (currentContentHeight > WARNING_THRESHOLD) {
          pageContent.classList.add('overflow-warning');
          setOverflowWarningPage(pageContent);
        } else {
          setOverflowWarningPage(null);
        }
      }
    }
  }, [overflowWarningPage]);

  const handleInput = useCallback((event: React.FormEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    
    // NEW: Check if we're editing a split paragraph first
    const editedParagraph = target.closest('p[data-paragraph-id]') as HTMLElement;
    if (editedParagraph && editedParagraph.dataset.paragraphId) {
      console.log(`%c[Input Event]: Editing split paragraph [${editedParagraph.dataset.paragraphId}]`, 'color: #4ECDC4;');
      checkAndReflowSplitParagraph(target);
      updateToolbarState();
      runParagraphAnalysis();
      return;
    }

    // Regular overflow check for non-split paragraphs
    const pageContent = target.closest('.page-content') as HTMLElement;
    if (pageContent && checkAndReflowOnOverflow(pageContent)) {
      return;
    }

    updateOverflowWarning();
    saveToHistory();
    updateToolbarState();
    runParagraphAnalysis();
  }, [saveToHistory, updateToolbarState, checkAndReflowOnOverflow, updateOverflowWarning, runParagraphAnalysis, checkAndReflowSplitParagraph]);

  const handleBackspaceAtPageStart = useCallback((currentPage: HTMLElement, previousPage: HTMLElement) => {
    const prevPageContent = previousPage.querySelector('.page-content') as HTMLElement;
    const currentPageContent = currentPage.querySelector('.page-content') as HTMLElement;
    if (!prevPageContent || !currentPageContent) return;

    const PAGE_CONTENT_HEIGHT = 9 * 96;
    const prevContentHeight = prevPageContent.getBoundingClientRect().height;
    const remainingHeight = PAGE_CONTENT_HEIGHT - prevContentHeight;
    const LINE_HEIGHT_BUFFER = 25;

    if (remainingHeight < LINE_HEIGHT_BUFFER) {
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(prevPageContent);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
      return;
    }

    reflowBackwardFromPage(previousPage);

    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(prevPageContent);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
    
    const isCurrentPageEmpty = !currentPageContent.textContent?.trim() && !currentPageContent.querySelector('img, .math-wrapper, .graph-wrapper, .template-wrapper');
    if (isCurrentPageEmpty) {
      currentPage.remove();
    }

    saveToHistory(true);
    runParagraphAnalysis();
  }, [reflowBackwardFromPage, saveToHistory, runParagraphAnalysis]);

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
      runParagraphAnalysis();
    }, 100);
  }, [pageContainerRef, saveToHistory, scheduleReflow, runParagraphAnalysis]);

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
      e.dataTransfer.dropEffect = (isTemplate || isNewGraph) ? 'copy' : 'move';
      if (isTemplate || isNewGraph) {
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
        const range = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (range) {
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            insertTemplate(templateHtml);
            if (isGalleryDrop) {
                onGalleryTemplateDrop();
            }
            saveToHistory(true);
            runParagraphAnalysis();
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
  }, [pageContainerRef, saveToHistory, onGalleryTemplateDrop, insertGraph, insertTemplate, runParagraphAnalysis]);

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
    if (textContent.substring(range.startOffset - 2, range.startOffset) !== '$$') return false;
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

  useEffect(() => {
    const container = pageContainerRef.current;
    if (!container) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          undo();
          runParagraphAnalysis();
          return;
      }
      if (((event.metaKey || event.ctrlKey) && event.key === 'y') || (event.metaKey && event.shiftKey && event.key === 'z')) {
          event.preventDefault();
          redo();
          runParagraphAnalysis();
          return;
      }
      
      if (event.key === 'Enter') {
        setTimeout(() => {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const startNode = range.startContainer;
            const parentElement = startNode.nodeType === Node.ELEMENT_NODE ? startNode as HTMLElement : startNode.parentElement;
            const pageContent = parentElement?.closest('.page-content') as HTMLElement | null;
            if (pageContent) {
              if (checkAndReflowOnOverflow(pageContent)) return;
            }
          }
        }, 0);
        
        saveToHistory(true);
        return;
      }
      
      if (event.key === 'Backspace') {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && selection.isCollapsed) {
          const range = selection.getRangeAt(0);
          const startNode = range.startContainer;
          const startElement = (startNode.nodeType === Node.ELEMENT_NODE ? startNode : startNode.parentElement) as HTMLElement;
          
          const listItem = startElement.closest('li');
          if (listItem && range.startOffset === 0) {
            const preCaretRange = document.createRange();
            preCaretRange.selectNodeContents(listItem);
            preCaretRange.setEnd(range.startContainer, range.startOffset);
            if (preCaretRange.toString().trim() === '') {
              event.preventDefault();
              document.execCommand('outdent');
              saveToHistory(true);
              scheduleReflow();
              return;
            }
          }

          const currentParagraph = startElement?.closest('p');
          if (currentParagraph && currentParagraph.dataset.splitPoint === 'end' && currentParagraph.dataset.paragraphId && range.startOffset === 0) {
            event.preventDefault();
            const paragraphId = currentParagraph.dataset.paragraphId;
            const previousParagraph = container.querySelector(`p[data-paragraph-id="${paragraphId}"][data-split-point="start"]`) as HTMLElement;

            if (previousParagraph) {
              const lastNodeBeforeMerge = previousParagraph.lastChild;
              const offsetBeforeMerge = lastNodeBeforeMerge ? (lastNodeBeforeMerge.nodeType === Node.TEXT_NODE ? (lastNodeBeforeMerge as Text).length : lastNodeBeforeMerge.childNodes.length) : 0;

              while (currentParagraph.firstChild) {
                previousParagraph.appendChild(currentParagraph.firstChild);
              }
              
              previousParagraph.removeAttribute('data-split-point');
              previousParagraph.removeAttribute('data-paragraph-id');
              currentParagraph.remove();
              
              const newRange = document.createRange();
              
              if (lastNodeBeforeMerge) {
                newRange.setStart(lastNodeBeforeMerge, offsetBeforeMerge);
              } else {
                newRange.setStart(previousParagraph, 0);
              }
              newRange.collapse(true);
              
              selection.removeAllRanges();
              selection.addRange(newRange);

              saveToHistory(true);
              reflowWithCursor();
              runParagraphAnalysis();
              return;
            }
          }

          const pageContent = startElement?.closest('.page-content');
          if (pageContent) {
            const isAtBeginningOfPage = () => {
              if (!selection.isCollapsed) return false;
              const preCaretRange = document.createRange();
              preCaretRange.selectNodeContents(pageContent);
              preCaretRange.setEnd(range.startContainer, range.startOffset);
              return preCaretRange.toString().trim() === '';
            };
            
            if (isAtBeginningOfPage()) {
              const currentPage = pageContent.closest('.page') as HTMLElement;
              const previousPage = currentPage?.previousElementSibling as HTMLElement;
              
              const isLastPage = !currentPage.nextElementSibling;
              const isPageEmpty = !pageContent.textContent?.trim() && !pageContent.querySelector('img, .math-wrapper, .graph-wrapper, .template-wrapper');

              if (previousPage && isLastPage && isPageEmpty) {
                event.preventDefault();
                
                const prevPageContent = previousPage.querySelector('.page-content');
                if (prevPageContent) {
                  const newRange = document.createRange();
                  const sel = window.getSelection();
                  newRange.selectNodeContents(prevPageContent);
                  newRange.collapse(false);
                  sel?.removeAllRanges();
                  sel?.addRange(newRange);
                }

                currentPage.remove();
                saveToHistory(true);
                return; 
              }
              
              if (previousPage) {
                event.preventDefault();
                handleBackspaceAtPageStart(currentPage, previousPage);
                return;
              }
            }
          }
        }
        
        saveToHistory(true);
        setTimeout(() => {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const pageContent = (range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer as HTMLElement : range.startContainer.parentElement)?.closest('.page-content');
            if (pageContent && pageContent.parentElement) {
              reflowBackwardFromPage(pageContent.parentElement);
            }
          }
        }, 0);
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
    
    const handleSelectionChange = () => {
      updateToolbarState();
      updateOverflowWarning();
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [
    pageContainerRef, saveToHistory, checkForAutoList, checkForMathBlock, 
    updateToolbarState, undo, redo, scheduleReflow, immediateReflow, checkAndReflowOnOverflow, 
    updateOverflowWarning, handleBackspaceAtPageStart, reflowBackwardFromPage, reflowWithCursor,
    runParagraphAnalysis
  ]);

  const applyCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    saveToHistory(true);
    setTimeout(updateToolbarState, 50);
    scheduleReflow();
    runParagraphAnalysis();
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
    runParagraphAnalysis();
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
    runParagraphAnalysis();
  };

  const handleLineSpacingChange = (spacing: LineSpacing) => {
    saveSelection();
    applyLineSpacing(spacing);
    saveToHistory(true);
    scheduleReflow();
    runParagraphAnalysis();
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
    runParagraphAnalysis();
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