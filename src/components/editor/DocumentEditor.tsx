"use client";

import React, {
  useCallback,
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { EditorToolbar } from "./EditorToolbar";
import { ImageResizer } from "./ImageResizer";
import { GraphResizer } from "./GraphResizer";
import { MathResizer } from "./MathResizer";
import { StatusBar } from "./StatusBar";
import { useLineSpacing, LineSpacing } from "@/hooks/useLineSpacing";
import { Plus } from "lucide-react";
import { GraphData } from "./GraphBlock";
import { analyzeParagraphs } from "./hooks/useTextReflow";
import { SelectionInfo } from "./SelectionInfo";
import { SelectionDebug } from "./SelectionDebug";
import { CustomSelection } from "./hooks/useMultiPageSelection";
import { ReflowDebugger } from "./ReflowDebugger";
import { LinkPopover } from "./LinkPopover";
import { TableToolbar, TableAction } from "./TableToolbar";
import { HeaderFooterEditor } from "./HeaderFooterEditor";
import { FindReplacePanel, FindOptions } from "./FindReplacePanel"; // --- NEW IMPORT ---

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
  insertContent: (
    htmlBlocks: string[],
    createNewPages: boolean,
    isInternal?: boolean
  ) => void;
  insertMath: (isInline?: boolean) => void;
  insertGraph: (graphData: GraphData) => void;
  insertTemplate: (html: string) => void;
  rehydrateMathBlocks: (container: HTMLElement) => void;
  rehydrateGraphBlocks: (container: HTMLElement) => void;
  rehydratePageNumbers: (container: HTMLElement) => void;
  isContentHubOpen: boolean;
  isHubExpanded: boolean;
  onGalleryTemplateDrop: () => void;
  resetHistory: () => void;
  scheduleReflow: (delay?: number) => void;
  immediateReflow: () => void;
  isReflowing: () => boolean;
  reflowPage: (pageElement: HTMLElement) => boolean;
  reflowBackwardFromPage: (pageElement: HTMLElement) => boolean;
  reflowSplitParagraph: (paragraphId: string) => boolean;
  reflowSplitTable: (tableId: string) => boolean;
  reflowSplitList: (listId: string) => boolean;
  fullDocumentReflow: () => void;
  customSelection: CustomSelection | null;
  highlightRects: DOMRect[];
  isSelecting: boolean;
  isMultiPageSelection: boolean;
  selectedPages: number[];
  selectedText: string;
  clearSelection: () => void;
  forceRecalculateRects: () => void;
  startTextSelection: (e: MouseEvent) => void;
  addNewPage: () => void;
  // --- NEW PROPS FOR FIND/REPLACE ---
  findAll: (query: string, options: FindOptions) => void;
  findNext: () => void;
  findPrev: () => void;
  replace: (replaceText: string) => void;
  replaceAll: (replaceText: string) => void;
  clearFindHighlights: () => void;
  findMatchIndex: number;
  findTotalMatches: number;
  isSearching: boolean;
  findHighlightRects: DOMRect[];
  // --- END NEW PROPS ---
}

export interface DocumentEditorHandle {
  resetHistory: () => void;
}

export const DocumentEditor = forwardRef<
  DocumentEditorHandle,
  DocumentEditorProps
>((props, ref) => {
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
    insertContent,
    insertMath,
    insertGraph,
    insertTemplate,
    rehydrateMathBlocks,
    rehydrateGraphBlocks,
    rehydratePageNumbers,
    isContentHubOpen,
    isHubExpanded,
    onGalleryTemplateDrop,
    resetHistory,
    scheduleReflow,
    immediateReflow,
    isReflowing,
    reflowPage,
    reflowBackwardFromPage,
    reflowSplitParagraph,
    fullDocumentReflow,
    reflowSplitList,
    reflowSplitTable,
    customSelection,
    highlightRects,
    isMultiPageSelection,
    selectedPages,
    selectedText,
    clearSelection,
    forceRecalculateRects,
    startTextSelection,
    addNewPage,
    // --- NEW PROPS DESTRUCTURED ---
    findAll,
    findNext,
    findPrev,
    replace,
    replaceAll,
    clearFindHighlights,
    findMatchIndex,
    findTotalMatches,
    isSearching,
    findHighlightRects,
    // --- END NEW PROPS ---
  } = props;

  useImperativeHandle(
    ref,
    () => ({
      resetHistory() {
        resetHistory();
      },
    }),
    [resetHistory]
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [selectedResizableElement, setSelectedResizableElement] =
    useState<HTMLElement | null>(null);
  const [selectedGraphElement, setSelectedGraphElement] =
    useState<HTMLElement | null>(null);
  const [selectedMathElement, setSelectedMathElement] =
    useState<HTMLElement | null>(null);
  const [selectedTableCell, setSelectedTableCell] = useState<HTMLElement | null>(null);
  const [tableToolbarPosition, setTableToolbarPosition] = useState<{ top: number; left: number } | null>(null);

  const [headerHtml, setHeaderHtml] = useState('');
  const [footerHtml, setFooterHtml] = useState('');
  const [editingHeaderFooter, setEditingHeaderFooter] = useState<{
    area: 'header' | 'footer';
    position: { top: number; left: number; width: number; };
  } | null>(null);
  
  const [showHfZones, setShowHfZones] = useState(false);

  // --- NEW STATE FOR FIND/REPLACE PANEL ---
  const [showFindReplace, setShowFindReplace] = useState(false);
  // --- END NEW STATE ---

  const {
    currentLineSpacing,
    detectCurrentLineSpacing,
    initializeDefaultLineSpacing,
    getLineHeightValue,
  } = useLineSpacing();

  const savedRangeRef = useRef<Range | null>(null);
  const isInitialized = useRef(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dropIndicatorPosition, setDropIndicatorPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [textAlign, setTextAlign] = useState("left");
  const [currentBlockType, setCurrentBlockType] = useState("p");
  const [currentFont, setCurrentFont] = useState("Inter");
  const [currentSize, setCurrentSize] = useState("14pt");
  const [currentTextColor, setCurrentTextColor] = useState("#000000");
  const [overflowWarningPage, setOverflowWarningPage] =
    useState<HTMLElement | null>(null);

  const [linkPopoverState, setLinkPopoverState] = useState<{
    visible: boolean;
    url: string;
    rect: DOMRect | null;
  }>({ visible: false, url: '', rect: null });

  const runParagraphAnalysis = useCallback(() => {
    setTimeout(() => {
      if (!pageContainerRef.current) return;
      const pages = Array.from(
        pageContainerRef.current.querySelectorAll(".page-content")
      );
      pages.forEach((pageContent, index) => {
        analyzeParagraphs(pageContent as HTMLElement, index + 1);
      });
    }, 0);
  }, [pageContainerRef]);

  const updateToolbarState = useCallback(() => {
    if (!pageContainerRef.current || editingHeaderFooter) return;

    setIsBold(document.queryCommandState("bold"));
    setIsItalic(document.queryCommandState("italic"));
    setIsUnderline(document.queryCommandState("underline"));

    detectCurrentLineSpacing();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    let node = selection.anchorNode;
    let element =
      node?.nodeType === Node.ELEMENT_NODE
        ? (node as HTMLElement)
        : node?.parentElement;
    if (!element) return;

    const linkElement = element.closest('a');
    setIsLink(!!linkElement);

    let blockTypeFound = false,
      fontFound = false,
      sizeFound = false,
      highlightFound = false,
      colorFound = false;

    while (element && element.contentEditable !== "true") {
      if (
        !blockTypeFound &&
        element.nodeName.match(/^(H[1-4]|P|BLOCKQUOTE|PRE)$/)
      ) {
        setCurrentBlockType(element.nodeName.toLowerCase());
        blockTypeFound = true;
      }

      if (!fontFound && element.style.fontFamily) {
        setCurrentFont(element.style.fontFamily.replace(/['"]/g, ""));
        fontFound = true;
      }

      if (!sizeFound && element.style.fontSize) {
        setCurrentSize(element.style.fontSize);
        sizeFound = true;
      }

      if (
        !highlightFound &&
        (element.style.backgroundColor === "rgb(255, 243, 163)" ||
          element.style.backgroundColor === "#fff3a3")
      ) {
        highlightFound = true;
      }

      if (!colorFound) {
        let foundColor: string | null = null;
        if (element.style.color) {
          foundColor = element.style.color;
        } else if (
          element.nodeName === "FONT" &&
          (element as HTMLFontElement).color
        ) {
          foundColor = (element as HTMLFontElement).color;
        }

        if (foundColor) {
          if (foundColor.startsWith("rgb")) {
            const rgbMatch = foundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
              const r = parseInt(rgbMatch[1]);
              const g = parseInt(rgbMatch[2]);
              const b = parseInt(rgbMatch[3]);
              const hex = `#${r.toString(16).padStart(2, "0")}${g
                .toString(16)
                .padStart(2, "0")}${b.toString(16)
                .padStart(2, "0")}`;
              setCurrentTextColor(hex);
            }
          } else {
            setCurrentTextColor(foundColor);
          }
          colorFound = true;
        }
      }

      element = element.parentElement;
    }

    setIsHighlighted(highlightFound);
    if (!blockTypeFound) setCurrentBlockType("p");
    if (!fontFound) setCurrentFont("Inter");
    if (!sizeFound) setCurrentSize("14pt");
    if (!colorFound) setCurrentTextColor("#000000");

    if (document.queryCommandState("justifyCenter")) setTextAlign("center");
    else if (document.queryCommandState("justifyRight")) setTextAlign("right");
    else if (document.queryCommandState("justifyFull")) setTextAlign("justify");
    else setTextAlign("left");
  }, [pageContainerRef, detectCurrentLineSpacing, editingHeaderFooter]);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      const node = range.startContainer;
      const startElement = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;

      if (startElement?.closest('.link-popover-container')) {
        return;
      }

      savedRangeRef.current = range.cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (savedRangeRef.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedRangeRef.current);
    }
  }, []);

  const handleLink = () => {
    saveSelection();
    
    if (linkPopoverState.visible) {
      setLinkPopoverState({ visible: false, url: '', rect: null });
      return;
    }
    
    const range = savedRangeRef.current;
    if (!range) return;

    const parentElement = range.startContainer.parentElement;
    const linkElement = parentElement?.closest('a');

    if (range.collapsed && !linkElement) {
      return;
    }

    const rect = range.getBoundingClientRect();
    setLinkPopoverState({
      visible: true,
      url: linkElement?.getAttribute('href') || '',
      rect,
    });
  };

  const applyLink = (url: string) => {
    restoreSelection();
    if (url) {
      document.execCommand('createLink', false, url);
    } else {
      document.execCommand('unlink', false);
    }
    setLinkPopoverState({ visible: false, url: '', rect: null });
    saveToHistory(true);
    updateToolbarState();
  };

  const removeLink = () => {
    restoreSelection();
    document.execCommand('unlink', false);
    setLinkPopoverState({ visible: false, url: '', rect: null });
    saveToHistory(true);
    updateToolbarState();
  };

  const handleTableAction = useCallback((action: TableAction) => {
    if (!selectedTableCell || !document.body.contains(selectedTableCell)) {
      setSelectedTableCell(null);
      return;
    }

    const cell = selectedTableCell;
    const row = cell.parentElement as HTMLTableRowElement;
    const table = row.closest('table');
    const tbody = table?.querySelector('tbody');

    if (!row || !table || !tbody) return;

    const rowIndex = Array.from(tbody.children).indexOf(row);
    const colIndex = Array.from(row.children).indexOf(cell);
    const colCount = row.cells.length;

    const createCell = () => {
      const newCell = document.createElement('td');
      newCell.appendChild(document.createElement('br'));
      return newCell;
    };

    switch (action) {
      case 'addRowAbove': {
        const newRow = document.createElement('tr');
        for (let i = 0; i < colCount; i++) newRow.appendChild(createCell());
        row.insertAdjacentElement('beforebegin', newRow);
        break;
      }
      case 'addRowBelow': {
        const newRow = document.createElement('tr');
        for (let i = 0; i < colCount; i++) newRow.appendChild(createCell());
        row.insertAdjacentElement('afterend', newRow);
        break;
      }
      case 'deleteRow': {
        if (tbody.rows.length === 1) {
          table.remove();
          setSelectedTableCell(null);
        } else {
          row.remove();
        }
        break;
      }
      case 'addColLeft': {
        Array.from(tbody.rows).forEach(r => {
          const newCell = createCell();
          r.insertBefore(newCell, r.cells[colIndex]);
        });
        break;
      }
      case 'addColRight': {
        Array.from(tbody.rows).forEach(r => {
          const newCell = createCell();
          r.insertBefore(newCell, r.cells[colIndex + 1]);
        });
        break;
      }
      case 'deleteCol': {
        if (colCount === 1) {
          table.remove();
          setSelectedTableCell(null);
        } else {
          Array.from(tbody.rows).forEach(r => {
            if (r.cells[colIndex]) {
              r.cells[colIndex].remove();
            }
          });
        }
        break;
      }
    }

    saveToHistory(true);
    scheduleReflow();
  }, [selectedTableCell, saveToHistory, scheduleReflow]);

  const handleEditHeaderFooter = (area: 'header' | 'footer') => {
    if (!pageContainerRef.current || !scrollContainerRef.current) return;
    
    setShowHfZones(true);

    setTimeout(() => {
      const firstPage = pageContainerRef.current?.querySelector('.page');
      if (!firstPage) return;

      const areaElement = firstPage.querySelector(`.page-${area}`) as HTMLElement;
      if (!areaElement) return;

      if (area === 'header') {
        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' });
      }

      const areaRect = areaElement.getBoundingClientRect();
      const containerRect = scrollContainerRef.current!.getBoundingClientRect();
      
      setEditingHeaderFooter({
        area,
        position: {
          top: areaRect.top - containerRect.top + scrollContainerRef.current!.scrollTop,
          left: areaRect.left - containerRect.left,
          width: areaRect.width,
        }
      });
    }, 50);
  };

  const handleCloseHeaderFooter = (finalHtml: string) => {
    if (!editingHeaderFooter || !pageContainerRef.current) return;

    const { area } = editingHeaderFooter;
    
    if (area === 'header') {
      setHeaderHtml(finalHtml);
    } else {
      setFooterHtml(finalHtml);
    }

    const allAreaElements = pageContainerRef.current.querySelectorAll<HTMLElement>(`.page-${area}`);
    allAreaElements.forEach(el => {
      el.innerHTML = finalHtml;
    });

    rehydratePageNumbers(pageContainerRef.current);

    saveToHistory(true);

    setEditingHeaderFooter(null);
    setShowHfZones(false);
  };

  useEffect(() => {
    if (!pageContainerRef.current || editingHeaderFooter) return;
    const container = pageContainerRef.current;
    
    const headers = container.querySelectorAll<HTMLElement>('.page-header');
    const footers = container.querySelectorAll<HTMLElement>('.page-footer');
    
    headers.forEach(h => {
      if (h.innerHTML !== headerHtml) h.innerHTML = headerHtml;
    });
    footers.forEach(f => {
      if (f.innerHTML !== footerHtml) f.innerHTML = footerHtml;
    });

  }, [headerHtml, footerHtml, pageContainerRef, rehydratePageNumbers, totalPages, editingHeaderFooter]);

  const applyStyleAcrossPages = useCallback(
    (command: string, value?: string) => {
      if (
        !customSelection ||
        !isMultiPageSelection ||
        !pageContainerRef.current
      )
        return;

      const { start, end, startPage, endPage } = customSelection;
      const allPages = Array.from(
        pageContainerRef.current.querySelectorAll<HTMLElement>(".page-content")
      );
      const selection = window.getSelection();
      if (!selection) return;

      for (let i = startPage; i <= endPage; i++) {
        const pageContent = allPages[i];
        if (!pageContent) continue;

        const range = document.createRange();

        if (i === startPage) {
          range.setStart(start.node, start.offset);
        } else {
          range.setStart(pageContent, 0);
        }

        if (i === endPage) {
          range.setEnd(end.node, end.offset);
        } else {
          range.setEnd(pageContent, pageContent.childNodes.length);
        }

        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand(command, false, value);
      }

      const finalRange = document.createRange();
      finalRange.setStart(start.node, start.offset);
      finalRange.setEnd(end.node, end.offset);
      selection.removeAllRanges();
      selection.addRange(finalRange);
    },
    [customSelection, isMultiPageSelection, pageContainerRef]
  );

  const applyCommand = useCallback(
    (command: string, value?: string) => {
      const selection = window.getSelection();
      if (!selection) return;

      if (command === "formatBlock") {
        document.execCommand(command, false, value);

        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const parentElement = (
            container.nodeType === Node.ELEMENT_NODE
              ? container
              : container.parentElement
          ) as HTMLElement;

          const newBlock = parentElement?.closest(
            "p, h1, h2, h3, h4, li, blockquote, pre"
          );

          if (newBlock instanceof HTMLElement) {
            newBlock.style.fontSize = "";
          }
        }
      } else {
        if (customSelection) {
          const { start, end } = customSelection;
          if (
            !document.body.contains(start.node) ||
            !document.body.contains(end.node)
          ) {
            console.warn("Cannot apply command, selection is stale.");
            clearSelection();
            return;
          }

          if (isMultiPageSelection) {
            applyStyleAcrossPages(command, value);
          } else {
            const range = document.createRange();
            range.setStart(start.node, start.offset);
            range.setEnd(end.node, end.offset);
            selection.removeAllRanges();
            selection.addRange(range);
            document.execCommand(command, false, value);
          }
        } else if (selection.isCollapsed) {
          document.execCommand(command, false, value);
        }
      }

      saveToHistory(true);
      setTimeout(() => {
        updateToolbarState();
        runParagraphAnalysis();
        if (
          isMultiPageSelection &&
          customSelection &&
          pageContainerRef.current
        ) {
          const allPages = Array.from(
            pageContainerRef.current.querySelectorAll<HTMLElement>(".page")
          );
          const startPageElement = allPages[customSelection.startPage];
          if (startPageElement) {
            reflowBackwardFromPage(startPageElement);
          }
        }
      }, 0);
    },
    [
      customSelection,
      isMultiPageSelection,
      pageContainerRef,
      clearSelection,
      applyStyleAcrossPages,
      saveToHistory,
      updateToolbarState,
      runParagraphAnalysis,
      reflowBackwardFromPage,
    ]
  );

  const applyStyle = useCallback(
    (style: "fontFamily" | "fontSize" | "color", value: string) => {
      const selection = window.getSelection();
      if (!selection) return;

      if (customSelection) {
        const { start, end } = customSelection;
        if (
          !document.body.contains(start.node) ||
          !document.body.contains(end.node)
        ) {
          console.warn("Cannot apply style, selection is stale.");
          clearSelection();
          return;
        }

        const commandMap = {
          fontFamily: "fontName",
          fontSize: "fontSize",
          color: "foreColor",
        };
        const command = commandMap[style];

        if (isMultiPageSelection) {
          applyStyleAcrossPages(command, value);
        } else {
          const range = document.createRange();
          range.setStart(start.node, start.offset);
          range.setEnd(end.node, end.offset);
          selection.removeAllRanges();
          selection.addRange(range);
          document.execCommand(command, false, value);
        }
      } else if (selection.rangeCount > 0 && selection.isCollapsed) {
        let range = selection.getRangeAt(0);
        let node = range.startContainer;
        let parentBlock = (
          node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
        ) as HTMLElement;

        while (
          parentBlock &&
          !["P", "H1", "H2", "H3", "H4", "LI", "BLOCKQUOTE"].includes(
            parentBlock.tagName
          ) &&
          parentBlock.contentEditable !== "true"
        ) {
          parentBlock = parentBlock.parentElement as HTMLElement;
        }

        if (!parentBlock || parentBlock.contentEditable === "true") {
          document.execCommand("formatBlock", false, "p");
          const newSelection = window.getSelection();
          if (newSelection && newSelection.rangeCount > 0) {
            range = newSelection.getRangeAt(0);
            node = range.startContainer;
            parentBlock = (
              node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
            ) as HTMLElement;
          }
        }

        const span = document.createElement("span");
        span.style[style as any] = value;
        span.innerHTML = "&#8203;";

        range.insertNode(span);

        range.setStart(span.firstChild!, 1);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      saveToHistory(true);
      setTimeout(() => {
        updateToolbarState();
        runParagraphAnalysis();
        if (
          isMultiPageSelection &&
          customSelection &&
          pageContainerRef.current
        ) {
          const allPages = Array.from(
            pageContainerRef.current.querySelectorAll<HTMLElement>(".page")
          );
          const startPageElement = allPages[customSelection.startPage];
          if (startPageElement) {
            reflowBackwardFromPage(startPageElement);
          }
        }
      }, 0);
    },
    [
      customSelection,
      isMultiPageSelection,
      pageContainerRef,
      clearSelection,
      applyStyleAcrossPages,
      saveToHistory,
      updateToolbarState,
      runParagraphAnalysis,
      reflowBackwardFromPage,
    ]
  );

  const handleLineSpacingChange = useCallback(
    (spacing: LineSpacing) => {
      const lineHeight = getLineHeightValue(spacing);
      const elementsToUpdate = new Set<HTMLElement>();
      const selection = window.getSelection();

      let range: Range | null = null;
      if (customSelection) {
        range = document.createRange();
        range.setStart(
          customSelection.start.node,
          customSelection.start.offset
        );
        range.setEnd(customSelection.end.node, customSelection.end.offset);
      } else if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      }

      if (!range) return;

      const getBlockParent = (node: Node): HTMLElement | null => {
        let current =
          node.nodeType === Node.ELEMENT_NODE
            ? (node as HTMLElement)
            : node.parentElement;
        while (current) {
          if (
            ["P", "H1", "H2", "H3", "H4", "LI", "BLOCKQUOTE"].includes(
              current.tagName
            )
          ) {
            return current;
          }
          if (current.contentEditable === "true") return null;
          current = current.parentElement;
        }
        return null;
      };

      const startBlock = getBlockParent(range.startContainer);
      const endBlock = getBlockParent(range.endContainer);

      if (startBlock && endBlock) {
        if (startBlock === endBlock) {
          elementsToUpdate.add(startBlock);
        } else {
          let commonAncestor = range.commonAncestorContainer;
          if (commonAncestor.nodeType === Node.TEXT_NODE) {
            commonAncestor = commonAncestor.parentElement!;
          }

          const walker = document.createTreeWalker(
            commonAncestor,
            NodeFilter.SHOW_ELEMENT
          );
          while (walker.nextNode()) {
            const el = walker.currentNode as HTMLElement;
            if (
              ["P", "H1", "H2", "H3", "H4", "LI", "BLOCKQUOTE"].includes(
                el.tagName
              )
            ) {
              if (range.intersectsNode(el)) {
                elementsToUpdate.add(el);
              }
            }
          }
        }
      }

      if (elementsToUpdate.size > 0) {
        elementsToUpdate.forEach((element) => {
          element.style.lineHeight = lineHeight;
          element.dataset.lineSpacing = spacing;
        });
        saveToHistory(true);
        updateToolbarState();
        setTimeout(() => {
          forceRecalculateRects();
        }, 0);
      }
    },
    [
      customSelection,
      getLineHeightValue,
      saveToHistory,
      updateToolbarState,
      forceRecalculateRects,
    ]
  );

  const handleImmediateOverflow = useCallback(
    (pageContent: HTMLElement) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        reflowPage(pageContent.parentElement as HTMLElement);
        return;
      }

      const range = selection.getRangeAt(0);
      const markerId = `cursor-marker-${Date.now()}`;
      const marker = document.createElement("span");
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
    },
    [reflowPage, pageContainerRef]
  );

  const checkAndReflowOnOverflow = useCallback(
    (pageContent: HTMLElement): boolean => {
      if (isReflowing()) {
        return false;
      }

      const RED_LINE_THRESHOLD_PX = 950;
      const currentContentHeight = pageContent.getBoundingClientRect().height;

      if (currentContentHeight > RED_LINE_THRESHOLD_PX) {
        handleImmediateOverflow(pageContent);
        return true;
      }
      return false;
    },
    [isReflowing, handleImmediateOverflow]
  );

  const updateOverflowWarning = useCallback(() => {
    const selection = window.getSelection();

    if (overflowWarningPage) {
      const currentHeight = overflowWarningPage.getBoundingClientRect().height;
      const AVAILABLE_CONTENT_HEIGHT = 9.9 * 96;
      const WARNING_THRESHOLD = AVAILABLE_CONTENT_HEIGHT * 0.95;

      if (currentHeight <= WARNING_THRESHOLD) {
        overflowWarningPage.classList.remove("overflow-warning");
        setOverflowWarningPage(null);
      }
    }

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const startNode = range.startContainer;
      const parentElement =
        startNode.nodeType === Node.ELEMENT_NODE
          ? (startNode as HTMLElement)
          : startNode.parentElement;
      const pageContent = parentElement?.closest(
        ".page-content"
      ) as HTMLElement | null;

      if (pageContent) {
        const AVAILABLE_CONTENT_HEIGHT = 9.9 * 96;
        const WARNING_THRESHOLD = AVAILABLE_CONTENT_HEIGHT * 0.95;
        const currentContentHeight = pageContent.getBoundingClientRect().height;

        if (currentContentHeight > WARNING_THRESHOLD) {
          pageContent.classList.add("overflow-warning");
          setOverflowWarningPage(pageContent);
        } else {
          pageContent.classList.remove("overflow-warning");
          if (overflowWarningPage === pageContent) {
            setOverflowWarningPage(null);
          }
        }
      }
    }
  }, [overflowWarningPage]);

  const handleInput = useCallback(
    (event: React.FormEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      const pageContent = target.closest(".page-content") as HTMLElement;

      const nativeEvent = event.nativeEvent as InputEvent;
      const isDeletion = nativeEvent.inputType.startsWith("delete");

      if (!isDeletion && pageContent && checkAndReflowOnOverflow(pageContent)) {
        return;
      }

      const page = target.closest(".page") as HTMLElement;
      if (page) {
        setTimeout(() => {
          reflowBackwardFromPage(page);

          const content = page.querySelector(".page-content");
          if (!content) return;

          const children = Array.from(content.children);
          for (let i = 0; i < children.length - 1; i++) {
            const currentEl = children[i] as HTMLElement;
            const nextEl = children[i + 1] as HTMLElement;
            
            if (
              currentEl.dataset.paragraphId &&
              currentEl.dataset.paragraphId === nextEl.dataset.paragraphId
            ) {
              reflowSplitParagraph(currentEl.dataset.paragraphId);
            }

            if (
              currentEl.dataset.tableId &&
              currentEl.dataset.tableId === nextEl.dataset.tableId
            ) {
              reflowSplitTable(currentEl.dataset.tableId);
            }

            if (
              currentEl.dataset.listId &&
              currentEl.dataset.listId === nextEl.dataset.listId
            ) {
              reflowSplitList(currentEl.dataset.listId);
            }
          }
        }, 50);
      }

      updateOverflowWarning();
      saveToHistory();
      updateToolbarState();
      runParagraphAnalysis();

    },
    [
      saveToHistory,
      updateToolbarState,
      checkAndReflowOnOverflow,
      reflowBackwardFromPage,
      reflowSplitParagraph,
      reflowSplitTable,
      reflowSplitList,  
      updateOverflowWarning,
      runParagraphAnalysis,
    ]
  );

  const handleBackspaceAtPageStart = useCallback(
    (currentPage: HTMLElement, previousPage: HTMLElement) => {
      const prevPageContent = previousPage.querySelector(
        ".page-content"
      ) as HTMLElement;
      const currentPageContent = currentPage.querySelector(
        ".page-content"
      ) as HTMLElement;
      if (!prevPageContent || !currentPageContent) return;

      reflowBackwardFromPage(previousPage);

      const isCurrentPageNowEmpty =
        !currentPageContent.textContent?.trim() &&
        !currentPageContent.querySelector(
          "img, .image-wrapper, .graph-wrapper, .math-wrapper, .template-wrapper"
        );

      if (isCurrentPageNowEmpty) {
        currentPage.remove();
      }

      const lastBlock = prevPageContent.lastElementChild as HTMLElement;
      if (!lastBlock) return;

      const newRange = document.createRange();
      const newSel = window.getSelection();

      const hasContent =
        lastBlock.textContent?.trim() !== "" ||
        lastBlock.querySelector(
          "img, .image-wrapper, .graph-wrapper, .math-wrapper, .template-wrapper"
        );

      newRange.setStart(lastBlock, 0);
      newRange.collapse(true);

      newSel?.removeAllRanges();
      newSel?.addRange(newRange);

      prevPageContent.focus();

      saveToHistory(true);
      runParagraphAnalysis();
    },
    [reflowBackwardFromPage, saveToHistory, runParagraphAnalysis]
  );

  useEffect(() => {
    if (!pageContainerRef.current) return;

    const observer = new MutationObserver((mutations) => {
      const relevantMutations = mutations.filter((m) => {
        if (m.type === "attributes") {
          if ((m.target as HTMLElement).closest('.link-popover-container')) return false;
          return true;
        }
        const target = m.target;
        if (target.nodeType === Node.ELEMENT_NODE)
          return (target as HTMLElement).closest(".page-content") !== null;
        if (target.nodeType === Node.TEXT_NODE)
          return target.parentElement?.closest(".page-content") !== null;
        return false;
      });

      if (relevantMutations.length === 0) return;

      observer.disconnect();

      let hasStructuralChanges = false;
      const pages =
        pageContainerRef.current?.querySelectorAll(".page-content") || [];

      pages.forEach((pageContent) => {
        pageContent.querySelectorAll("p > div").forEach((divInsideP) => {
          const p = divInsideP.parentElement;
          if (p) {
            p.after(divInsideP);
            hasStructuralChanges = true;

            if (!p.textContent?.trim() && !p.querySelector("img, br")) {
              p.remove();
            }
          }
        });

        pageContent
          .querySelectorAll(
            ":scope > div:not(.image-wrapper):not(.graph-wrapper):not(.template-wrapper):not(.math-wrapper)"
          )
          .forEach((div) => {
            const newParagraph = document.createElement("p");
            newParagraph.style.lineHeight =
              getLineHeightValue(currentLineSpacing);
            newParagraph.dataset.lineSpacing = currentLineSpacing;
            newParagraph.style.fontSize = currentSize;

            while (div.firstChild) {
              newParagraph.appendChild(div.firstChild);
            }

            if (newParagraph.innerHTML === "") {
              newParagraph.innerHTML = "<br>";
            }

            div.replaceWith(newParagraph);
            hasStructuralChanges = true;
          });

        pageContent.querySelectorAll(":scope > p").forEach((p) => {
          if (p instanceof HTMLElement) {
            let needsUpdate = false;

            if (p.style.marginBottom !== "0px") {
              p.style.marginBottom = "0px";
              needsUpdate = true;
            }

            if (
              p.dataset.splitPoint &&
              p.dataset.splitPoint !== "end" &&
              p.style.paddingBottom !== "0px"
            ) {
              p.style.paddingBottom = "0px";
              needsUpdate = true;
            } else if (
              !p.dataset.splitPoint ||
              p.dataset.splitPoint === "end"
            ) {
              if (p.style.paddingBottom !== "1.25rem") {
                p.style.paddingBottom = "1.25rem";
                needsUpdate = true;
              }
            }

            if (!p.dataset.lineSpacing || !p.style.lineHeight) {
              p.style.lineHeight = getLineHeightValue(currentLineSpacing);
              p.dataset.lineSpacing = currentLineSpacing;
              needsUpdate = true;
            }
            if (!p.style.fontSize) {
              p.style.fontSize = currentSize;
              needsUpdate = true;
            }

            if (needsUpdate) {
              hasStructuralChanges = true;
            }
          }
        });

        pageContent
          .querySelectorAll(
            "p span, h1 span, h2 span, h3 span, h4 span, blockquote span"
          )
          .forEach((span) => {
            if (!(span instanceof HTMLElement)) return;

            const style = span.style;

            const hasBold =
              style.fontWeight &&
              !["normal", "400", "500", ""].includes(style.fontWeight);
            const hasItalic =
              style.fontStyle && !["normal", ""].includes(style.fontStyle);
            const hasUnderline =
              style.textDecoration?.includes("underline") ||
              style.textDecorationLine?.includes("underline");
            const hasStrikethrough =
              style.textDecoration?.includes("line-through") ||
              style.textDecorationLine?.includes("line-through");

            const bgColor = style.backgroundColor?.toLowerCase() || "";
            const hasHighlight =
              bgColor &&
              bgColor !== "initial" &&
              bgColor !== "transparent" &&
              bgColor !== "" &&
              bgColor !== "rgba(0, 0, 0, 0)" &&
              bgColor !== "rgb(255, 255, 255)" &&
              !bgColor.includes("initial");

            const hasMeaningfulFormatting =
              hasBold ||
              hasItalic ||
              hasUnderline ||
              hasStrikethrough ||
              hasHighlight;
            const hasClasses = span.className && span.className.trim() !== "";

            if (!hasMeaningfulFormatting && !hasClasses) {
              const parent = span.parentNode;
              if (parent) {
                while (span.firstChild) {
                  parent.insertBefore(span.firstChild, span);
                }
                parent.removeChild(span);
                hasStructuralChanges = true;
              }
            }
          });

        const children = Array.from(pageContent.childNodes);
        for (let i = 0; i < children.length; i++) {
          const node = children[i] as Node;
          const knownInlineTags = [
            "SPAN",
            "B",
            "I",
            "U",
            "A",
            "CODE",
            "EM",
            "STRONG",
            "FONT",
            "SUB",
            "SUP",
          ];
          const isStrayNode =
            (node.nodeType === Node.TEXT_NODE &&
              node.textContent?.trim() !== "") ||
            (node.nodeType === Node.ELEMENT_NODE &&
              knownInlineTags.includes((node as HTMLElement).tagName));
          if (isStrayNode) {
            const p = document.createElement("p");
            p.style.lineHeight = getLineHeightValue(currentLineSpacing);
            p.dataset.lineSpacing = currentLineSpacing;
            p.style.fontSize = currentSize;
            p.style.marginBottom = "0px";
            p.style.paddingBottom = "1.25rem";
            pageContent.insertBefore(p, node);
            p.appendChild(node);
            while (children[i + 1]) {
              const nextNode = children[i + 1];
              const isNextNodeStray =
                nextNode.nodeType === Node.TEXT_NODE ||
                (nextNode.nodeType === Node.ELEMENT_NODE &&
                  knownInlineTags.includes((nextNode as HTMLElement).tagName));
              if (isNextNodeStray) {
                p.appendChild(nextNode);
                i++;
              } else {
                break;
              }
            }
            hasStructuralChanges = true;
          }
        }

        pageContent.querySelectorAll("li").forEach((li) => {
          const isEffectivelyEmpty =
            li.textContent?.trim() === "" &&
            li.querySelector("img, .math-wrapper, .graph-wrapper, br") === null;
          if (isEffectivelyEmpty) {
            const parentList = li.parentElement;
            li.remove();
            if (parentList && parentList.children.length === 0) {
              parentList.remove();
            }
            hasStructuralChanges = true;
          }
        });

        pageContent.querySelectorAll("p, h1, h2, h3, h4").forEach((block) => {
          const isVisuallyEmpty =
            block.textContent?.trim() === "" &&
            block.querySelector(
              "img, video, canvas, .math-wrapper, .graph-wrapper, br"
            ) === null;
          if (isVisuallyEmpty) {
            const allBlocks = pageContent.querySelectorAll(
              "p, h1, h2, h3, h4, ul, ol, blockquote, pre, table"
            );
            if (allBlocks.length > 1) {
              block.remove();
              hasStructuralChanges = true;
            }
          }
        });

        Array.from(pageContent.childNodes).forEach((node) => {
          if (node.nodeName === "BR") {
            node.remove();
            hasStructuralChanges = true;
          }
        });
      });

      if (hasStructuralChanges) {
        saveToHistory(true);
      }

      if (pageContainerRef.current) {
        observer.observe(pageContainerRef.current, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true, 
          attributeOldValue: true,
        });
      }
    });

    observer.observe(pageContainerRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeOldValue: true,
    });

    return () => observer.disconnect();
  }, [
    pageContainerRef,
    saveToHistory,
    currentLineSpacing,
    getLineHeightValue,
    currentSize,
  ]);

  useEffect(() => {
    const container = pageContainerRef.current;
    if (container && container.innerHTML && !isInitialized.current) {
      rehydrateMathBlocks(container);
      rehydrateGraphBlocks(container);
      rehydratePageNumbers(container);
    }
  }, [pageContainerRef, rehydrateMathBlocks, rehydrateGraphBlocks, rehydratePageNumbers]);

  useEffect(() => {
    const container = pageContainerRef.current;
    if (!container) return;
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (!e.dataTransfer) return;
      const isTemplate =
        e.dataTransfer.types.includes("application/gallery-template-item") ||
        e.dataTransfer.types.includes("application/ai-template-item");
      const isNewGraph = e.dataTransfer.types.includes(
        "application/ai-graph-item"
      );
      e.dataTransfer.dropEffect = isTemplate || isNewGraph ? "copy" : "move";
      if (isTemplate || isNewGraph) {
        const range = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (range) {
          const rect = range.getClientRects()[0];
          if (rect) {
            const pageContent = container.querySelector(".page-content");
            setDropIndicatorPosition({
              top: rect.top + window.scrollY,
              left: pageContent
                ? pageContent.getBoundingClientRect().left + window.scrollX
                : rect.left + window.scrollX,
              width: pageContent ? pageContent.clientWidth : rect.width,
            });
          }
        }
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (
        e.relatedTarget === null ||
        !container.contains(e.relatedTarget as Node)
      ) {
        setDropIndicatorPosition(null);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setDropIndicatorPosition(null);
      if (!e.dataTransfer) return;
      const isGalleryDrop = e.dataTransfer.types.includes(
        "application/gallery-template-item"
      );
      const isAiTemplateDrop = e.dataTransfer.types.includes(
        "application/ai-template-item"
      );
      const isAiGraphDrop = e.dataTransfer.types.includes(
        "application/ai-graph-item"
      );

      if (isAiGraphDrop) {
        const graphDataString = e.dataTransfer.getData(
          "application/ai-graph-item"
        );
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

      const templateHtml = e.dataTransfer.getData("text/html");
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
    container.addEventListener("dragover", handleDragOver);
    container.addEventListener("drop", handleDrop);
    container.addEventListener("dragleave", handleDragLeave);
    return () => {
      container.removeEventListener("dragover", handleDragOver);
      container.removeEventListener("drop", handleDrop);
      container.removeEventListener("dragleave", handleDragLeave);
    };
  }, [
    pageContainerRef,
    saveToHistory,
    onGalleryTemplateDrop,
    insertGraph,
    insertTemplate,
    runParagraphAnalysis,
  ]);

  useEffect(() => {
    const container = pageContainerRef.current;
    if (!container) return;
    container
      .querySelectorAll(".graph-selected")
      .forEach((el) => el.classList.remove("graph-selected"));
    if (selectedGraphElement) {
      selectedGraphElement.classList.add("graph-selected");
    }
  }, [selectedGraphElement, pageContainerRef]);

  useEffect(() => {
    const container = pageContainerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          const topMostEntry = visibleEntries.reduce((prev, current) => {
            return prev.boundingClientRect.top < current.boundingClientRect.top
              ? prev
              : current;
          });

          const pageElements = Array.from(container.querySelectorAll(".page"));
          const index = pageElements.indexOf(
            topMostEntry.target as HTMLElement
          );
          if (index !== -1) {
            setCurrentPage(index + 1);
          }
        }
      },
      { root: null, rootMargin: "0px 0px -60% 0px", threshold: 0 }
    );

    const pages = container.querySelectorAll(".page");

    setTotalPages(pages.length);
    pages.forEach((page) => observer.observe(page));
    const mutationObserver = new MutationObserver(() => {
      const updatedPages = container.querySelectorAll(".page");

      setTotalPages(updatedPages.length);
      observer.disconnect();
      updatedPages.forEach((page) => observer.observe(page));
    });
    mutationObserver.observe(container, { childList: true });
    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, [pageContainerRef]);

  useEffect(() => {
    if (pageContainerRef.current && !isInitialized.current) {
      const pageContent = pageContainerRef.current.querySelector(
        ".page-content"
      ) as HTMLElement;
      if (pageContent) {
        initializeDefaultLineSpacing(pageContent);
        isInitialized.current = true;
      }
    }
  }, [pageContainerRef, initializeDefaultLineSpacing]);

  useEffect(() => {
    if (!pageContainerRef.current) return;

    const checkForOverflow = () => {
      const overflowPages = pageContainerRef.current?.querySelectorAll(
        ".page-content.overflow-warning"
      );
      if (overflowPages && overflowPages.length > 0) {
        overflowPages.forEach((pageContent) => {
          const page = pageContent.closest(".page") as HTMLElement;
          if (page) {
            reflowPage(page);
          }
        });
      }
    };

    const timeoutId = setTimeout(checkForOverflow, 200);

    return () => clearTimeout(timeoutId);
  }, [pageContainerRef, reflowPage]);

  const checkForAutoList = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return false;
    const textContent = node.textContent || "";
    const cursorPos = range.startOffset;
    const textBeforeCursor = textContent.substring(0, cursorPos);
    const lastNewlineIndex = textBeforeCursor.lastIndexOf("\n");
    const currentLineText = textBeforeCursor.substring(lastNewlineIndex + 1);
    const numberedListMatch = currentLineText.match(/^(\d+)\.\s$/);
    const bulletListMatch = currentLineText.match(/^[\*\-]\s$/);
    if (!numberedListMatch && !bulletListMatch) return false;
    const parentBlock = node.parentElement?.closest("p, div, h1, h2, h3, h4");
    if (!parentBlock || parentBlock.closest("li")) return false;
    const pattern = numberedListMatch
      ? numberedListMatch[0]
      : bulletListMatch![0];
    const patternStart = lastNewlineIndex + 1;
    const patternEnd = patternStart + pattern.length;
    const deleteRange = document.createRange();
    deleteRange.setStart(node, patternStart);
    deleteRange.setEnd(node, patternEnd);
    deleteRange.deleteContents();
    const listType = numberedListMatch ? "ol" : "ul";
    const listElement = document.createElement(listType);
    const listItem = document.createElement("li");
    while (parentBlock.firstChild) {
      listItem.appendChild(parentBlock.firstChild);
    }
    if (listItem.innerHTML === "") {
      listItem.innerHTML = "<br>";
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
    if (!selection || !selection.isCollapsed || selection.rangeCount === 0)
      return false;
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE || range.startOffset < 2) return false;
    const textContent = node.textContent || "";
    if (
      textContent.substring(range.startOffset - 2, range.startOffset) !== "$$"
    )
      return false;
    const parentBlock = node.parentElement?.closest("p, div");
    if (!parentBlock || parentBlock.textContent?.trim() !== "$$") return false;
    const parent = parentBlock.parentNode;
    if (parent) {
      const tempNode = document.createElement("span");
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

  const deleteSelectionManually = useCallback(
    (save: boolean = true) => {
      if (!customSelection || !pageContainerRef.current) return;
      const selection = window.getSelection();
      if (!selection) return;

      const { start, end, startPage } = customSelection;
      const startNode = start.node;
      const startOffset = start.offset;
      const startParent = startNode.parentElement;
      
      const startElement = (startNode.nodeType === Node.ELEMENT_NODE ? startNode : startNode.parentElement) as HTMLElement;
      const endElement = (end.node.nodeType === Node.ELEMENT_NODE ? end.node : end.node.parentElement) as HTMLElement;

      const safeBlockAnchor = startElement?.closest('p, h1, h2, h3, h4, li, blockquote, pre');
      const ultimateAnchor = startElement?.closest('.page-content');

      const allPages = Array.from(pageContainerRef.current.querySelectorAll<HTMLElement>(".page"));

      let isBoundaryDeletion = false;
      const startPiece = startElement?.closest('p[data-split-point="start"]');
      const endPiece = endElement?.closest('p[data-split-point="end"]');

      if (startPiece && endPiece && (startPiece as HTMLElement).dataset.paragraphId === (endPiece as HTMLElement).dataset.paragraphId) {
        const endOfStartRange = document.createRange();
        endOfStartRange.selectNodeContents(startPiece);
        endOfStartRange.setStart(start.node, start.offset);
        
        const startOfEndRange = document.createRange();
        startOfEndRange.selectNodeContents(endPiece);
        startOfEndRange.setEnd(end.node, end.offset);

        if (endOfStartRange.toString().trim() === "" && startOfEndRange.toString().trim() === "") {
          isBoundaryDeletion = true;
        }
      }

      const range = document.createRange();
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
      
      range.deleteContents();

      if (isBoundaryDeletion && (startPiece as HTMLElement)?.dataset.paragraphId) {
        console.log("Performing merge on boundary deletion.");
        reflowSplitParagraph((startPiece as HTMLElement).dataset.paragraphId!);
      }

      const wrapperSelector = ".image-wrapper, .graph-wrapper, .math-wrapper, .template-wrapper";
      if (pageContainerRef.current) {
        pageContainerRef.current.querySelectorAll(wrapperSelector).forEach((el) => {
            if (!el.querySelector("img, .template-block, .math-rendered, .math-editor, .graph-container")) {
              el.remove();
            }
        });
      }
      if (selectedResizableElement && !document.body.contains(selectedResizableElement)) setSelectedResizableElement(null);
      if (selectedGraphElement && !document.body.contains(selectedGraphElement)) setSelectedGraphElement(null);
      if (selectedMathElement && !document.body.contains(selectedMathElement)) setSelectedMathElement(null);

      clearSelection();

      try {
        const newRange = document.createRange();
        if (document.body.contains(startNode)) {
          const newOffset = Math.min(startOffset, startNode.textContent?.length || 0);
          newRange.setStart(startNode, newOffset);
        } else if (startParent && document.body.contains(startParent)) {
          newRange.selectNodeContents(startParent);
          newRange.collapse(true);
        } else if (safeBlockAnchor && document.body.contains(safeBlockAnchor)) {
          newRange.selectNodeContents(safeBlockAnchor);
          newRange.collapse(true);
        } else if (ultimateAnchor && document.body.contains(ultimateAnchor)) {
          newRange.selectNodeContents(ultimateAnchor);
          newRange.collapse(true);
        } else {
           throw new Error("Catastrophic failure: Could not find any valid anchor to restore cursor.");
        }
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        const parentContentEditable = (ultimateAnchor || pageContainerRef.current)?.closest<HTMLElement>('[contenteditable="true"]');
        parentContentEditable?.focus();
      } catch (e) {
        console.error("Error restoring cursor after deletion.", e);
        pageContainerRef.current?.focus();
      }

      if (save) {
        saveToHistory(true);
      }

      if (!isBoundaryDeletion) {
        const startPageElement = allPages[startPage];
        if (startPageElement) {
          reflowPage(startPageElement);
          reflowBackwardFromPage(startPageElement);
          runParagraphAnalysis();
        }
      }
    },
    [
      customSelection,
      pageContainerRef,
      clearSelection,
      saveToHistory,
      reflowPage,
      reflowBackwardFromPage,
      runParagraphAnalysis,
      reflowSplitParagraph,
      selectedResizableElement,
      selectedGraphElement,
      selectedMathElement,
    ]
  );

  useEffect(() => {
    const container = pageContainerRef.current;
    if (!container) return;

    const handleGlobalMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (
        toolbarRef.current?.contains(target) ||
        target.closest(
          ".image-toolbar, .template-toolbar, .graph-toolbar, .math-toolbar, [data-resize-handle], .link-popover-container, .table-toolbar-container"
        )
      ) {
        return;
      }

      const hfZone = target.closest('[data-hf]') as HTMLElement;
      if (hfZone && showHfZones) {
        handleEditHeaderFooter(hfZone.dataset.hf as 'header' | 'footer');
        return;
      }

      const mathWrapper = target.closest(".math-wrapper") as HTMLElement | null;
      const graphWrapper = target.closest(
        ".graph-wrapper"
      ) as HTMLElement | null;
      const imageOrTemplateWrapper = target.closest(
        ".image-wrapper, .template-wrapper"
      ) as HTMLElement | null;

      if (mathWrapper) {
        if (selectedMathElement !== mathWrapper) {
          clearSelection();
          setSelectedResizableElement(null);
          setSelectedGraphElement(null);
          setSelectedMathElement(mathWrapper);
        }
        return;
      }

      if (graphWrapper) {
        if (selectedGraphElement !== graphWrapper) {
          clearSelection();
          setSelectedResizableElement(null);
          setSelectedMathElement(null);
          setSelectedGraphElement(graphWrapper);
        }
        return;
      }

      if (imageOrTemplateWrapper) {
        const elementToSelect =
          imageOrTemplateWrapper.querySelector("img") || imageOrTemplateWrapper;
        if (selectedResizableElement !== elementToSelect) {
          clearSelection();
          setSelectedGraphElement(null);
          setSelectedMathElement(null);
          setSelectedResizableElement(elementToSelect);
        }
        return;
      }

      if (container.contains(target)) {
        if (
          selectedGraphElement ||
          selectedResizableElement ||
          selectedMathElement
        ) {
          setSelectedGraphElement(null);
          setSelectedResizableElement(null);
          setSelectedMathElement(null);
        }
        if (editingHeaderFooter) {
          // This case is handled by the HeaderFooterEditor's own click-outside logic
        } else {
           startTextSelection(e);
        }
      } else {
        setSelectedGraphElement(null);
        setSelectedResizableElement(null);
        setSelectedMathElement(null);
        clearSelection();
      }
    };

    document.addEventListener("mousedown", handleGlobalMouseDown);

    return () => {
      document.removeEventListener("mousedown", handleGlobalMouseDown);
    };
  }, [
    clearSelection,
    startTextSelection,
    selectedGraphElement,
    selectedResizableElement,
    selectedMathElement,
    editingHeaderFooter,
    showHfZones,
  ]);

  const cleanupParagraphStructure = useCallback((paragraph: HTMLElement) => {
    const walker = document.createTreeWalker(
      paragraph,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
    );

    const nodesToRemove: Node[] = [];
    let node: Node | null;

    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;

        if (element.tagName === "SPAN" && !element.textContent?.trim()) {
          nodesToRemove.push(element);
        }

        if (
          element.tagName === "SPAN" &&
          element.children.length === 1 &&
          element.firstElementChild?.tagName === "SPAN"
        ) {
          const child = element.firstElementChild as HTMLElement;
          const parentStyle = element.style.cssText;
          const childStyle = child.style.cssText;

          if (!parentStyle || parentStyle === childStyle) {
            while (child.firstChild) {
              element.parentNode?.insertBefore(child.firstChild, element);
            }
            nodesToRemove.push(element);
          }
        }
      }
    }

    nodesToRemove.forEach((n) => n.parentNode?.removeChild(n));

    paragraph.normalize();
  }, []);

  useEffect(() => {
    const container = pageContainerRef.current;
    if (!container) return;

    const isEventRelevant = () => {
      const activeEl = document.activeElement;
      return (
        (activeEl && container.contains(activeEl)) ||
        selectedResizableElement ||
        selectedGraphElement ||
        selectedMathElement
      );
    };

    const handleCopy = (event: ClipboardEvent) => {
      if (!isEventRelevant() || !customSelection) return;

      event.preventDefault();

      const { start, end, startPage, endPage } = customSelection;
      if (startPage === -1 || endPage === -1) return;

      const allPages = Array.from(
        container.querySelectorAll<HTMLElement>(".page-content")
      );
      const masterFragment = document.createDocumentFragment();
      const intersectingWrappers: Element[] = [];
      const wrapperSelector =
        ".image-wrapper, .graph-wrapper, .math-wrapper, .template-wrapper";

      try {
        const originalRange = document.createRange();
        originalRange.setStart(start.node, start.offset);
        originalRange.setEnd(end.node, end.offset);

        container
          .querySelectorAll(wrapperSelector)
          .forEach((wrapper, index) => {
            if (originalRange.intersectsNode(wrapper)) {
              wrapper.setAttribute("data-copy-id", `copy-${index}`);
              intersectingWrappers.push(wrapper);
            }
          });

        for (let i = startPage; i <= endPage; i++) {
          const pageContent = allPages[i];
          if (!pageContent) continue;

          const pageRange = document.createRange();
          if (i === startPage) pageRange.setStart(start.node, start.offset);
          else pageRange.setStart(pageContent, 0);

          if (i === endPage) pageRange.setEnd(end.node, end.offset);
          else pageRange.setEnd(pageContent, pageContent.childNodes.length);

          masterFragment.appendChild(pageRange.cloneContents());
        }

        const tempDiv = document.createElement("div");
        tempDiv.appendChild(masterFragment);

        tempDiv.querySelectorAll("[data-copy-id]").forEach((partialWrapper) => {
          const id = partialWrapper.getAttribute("data-copy-id");
          const originalWrapper = container.querySelector(
            `[data-copy-id="${id}"]`
          );
          if (originalWrapper) {
            const cleanClone = originalWrapper.cloneNode(true) as HTMLElement;
            cleanClone.removeAttribute("data-copy-id");
            partialWrapper.replaceWith(cleanClone);
          }
        });

        const startPieces = tempDiv.querySelectorAll<HTMLParagraphElement>(
          'p[data-paragraph-id][data-split-point="start"]'
        );
        startPieces.forEach((startPiece) => {
          const paragraphId = startPiece.dataset.paragraphId;
          let currentPiece: Element | null = startPiece;

          while (
            currentPiece?.nextElementSibling?.matches("p") &&
            (currentPiece.nextElementSibling as HTMLElement).dataset
              .paragraphId === paragraphId
          ) {
            const nextPiece = currentPiece.nextElementSibling;
            startPiece.append(...Array.from(nextPiece.childNodes));
            nextPiece.remove();
          }

          startPiece.removeAttribute("data-paragraph-id");
          startPiece.removeAttribute("data-split-point");
        });

        tempDiv
          .querySelectorAll(
            ".image-resize-overlay, .image-toolbar, .graph-resize-overlay, .graph-toolbar, .math-resize-overlay, .math-toolbar, .template-resize-overlay, .template-toolbar"
          )
          .forEach((uiEl) => uiEl.remove());
        tempDiv
          .querySelectorAll(
            ".graph-selected, .math-selected, .template-selected"
          )
          .forEach((el) =>
            el.classList.remove(
              "graph-selected",
              "math-selected",
              "template-selected"
            )
          );
        tempDiv.querySelectorAll(wrapperSelector).forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.position = "";
            el.style.opacity = "";
            if (!el.getAttribute("style")?.trim()) {
              el.removeAttribute("style");
            }
          }
        });

        const contentToCopy = tempDiv.innerHTML;
        const textToCopy = customSelection.text;

        if (contentToCopy && event.clipboardData) {
          event.clipboardData.setData("text/html", contentToCopy);
          event.clipboardData.setData("text/plain", textToCopy);
          event.clipboardData.setData("application/x-editor-internal", "true");
        }
      } finally {
        intersectingWrappers.forEach((wrapper) => {
          wrapper.removeAttribute("data-copy-id");
        });
      }
    };

    const handleCut = (event: ClipboardEvent) => {
      if (!isEventRelevant()) return;

      handleCopy(event);
      event.preventDefault();

      if (customSelection) {
        deleteSelectionManually(true);
      } else if (
        selectedResizableElement ||
        selectedGraphElement ||
        selectedMathElement
      ) {
        const selectedWrapper =
          selectedResizableElement?.closest(
            ".image-wrapper, .template-wrapper"
          ) ||
          selectedGraphElement ||
          selectedMathElement;
        const page = selectedWrapper?.closest(".page");
        selectedWrapper?.remove();
        setSelectedResizableElement(null);
        setSelectedGraphElement(null);
        setSelectedMathElement(null);
        saveToHistory(true);
        if (page) {
          reflowBackwardFromPage(page as HTMLElement);
        } else {
          scheduleReflow();
        }
      }
    };

    const handlePaste = (event: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (!activeEl || !container.contains(activeEl)) return;

      event.preventDefault();
      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      if (clipboardData.files && clipboardData.files.length > 0) {
        const imageFile = Array.from(clipboardData.files).find((file) =>
          file.type.startsWith("image/")
        );
        if (imageFile) {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target && typeof e.target.result === "string") {
              const imageUrl = e.target.result;
              const img = new Image();
              img.onload = () => {
                const MAX_INSERT_WIDTH = 300;
                const aspectRatio = img.height / img.width;
                const width = Math.min(img.width, MAX_INSERT_WIDTH);
                const height = width * aspectRatio;
                insertImage({
                  src: imageUrl,
                  width,
                  height,
                  alt: imageFile.name,
                });
              };
              img.src = imageUrl;
            }
          };
          reader.readAsDataURL(imageFile);
          return;
        }
      }

      const isInternalPaste = clipboardData.types.includes(
        "application/x-editor-internal"
      );
      let pastedHtml = clipboardData.getData("text/html");
      if (pastedHtml) {
        insertContent([pastedHtml], false, isInternalPaste);

        setTimeout(() => {
          if (pageContainerRef.current) {
            const paragraphs = pageContainerRef.current.querySelectorAll("p");
            paragraphs.forEach((p) => {
              if (p instanceof HTMLElement) {
                cleanupParagraphStructure(p);
              }
            });
          }
          saveToHistory(true);
          scheduleReflow();
        }, 100);
        return;
      }

      const pastedText = clipboardData.getData("text/plain");
      if (pastedText) {
        document.execCommand("insertText", false, pastedText);
        saveToHistory(true);
        scheduleReflow();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Backspace" || event.key === "Delete") {
        const target = event.target as HTMLElement;
        const isEditingTemplate =
          target.closest('[contenteditable="true"]') &&
          selectedResizableElement?.closest(".template-wrapper");
        const isEditingMath =
          target.closest(".math-editor") && selectedMathElement;

        if (
          (selectedResizableElement ||
            selectedGraphElement ||
            selectedMathElement) &&
          !isEditingTemplate &&
          !isEditingMath
        ) {
          event.preventDefault();
          const selectedWrapper =
            selectedResizableElement?.closest(
              ".image-wrapper, .template-wrapper"
            ) ||
            selectedGraphElement ||
            selectedMathElement;
          if (selectedWrapper) {
            const page = selectedWrapper.closest(".page") as HTMLElement | null;
            selectedWrapper.remove();
            setSelectedResizableElement(null);
            setSelectedGraphElement(null);
            setSelectedMathElement(null);
            saveToHistory(true);
            if (page) {
              reflowBackwardFromPage(page);
            } else {
              scheduleReflow();
            }
          }
          return;
        }

        const page = (event.target as HTMLElement).closest(".page") as HTMLElement;
        if (page) {
            setTimeout(() => {
                reflowBackwardFromPage(page);

                const content = page.querySelector(".page-content");
                if (!content) return;

                const children = Array.from(content.children);
                for (let i = 0; i < children.length - 1; i++) {
                    const currentEl = children[i] as HTMLElement;
                    const nextEl = children[i + 1] as HTMLElement;
                    
                    if (
                      currentEl.dataset.paragraphId &&
                      currentEl.dataset.paragraphId === nextEl.dataset.paragraphId
                    ) {
                      reflowSplitParagraph(currentEl.dataset.paragraphId);
                    }
                    if (
                      currentEl.dataset.tableId &&
                      currentEl.dataset.tableId === nextEl.dataset.tableId
                    ) {
                      reflowSplitTable(currentEl.dataset.tableId);
                    }
                    if (
                      currentEl.dataset.listId &&
                      currentEl.dataset.listId === nextEl.dataset.listId
                    ) {
                      reflowSplitList(currentEl.dataset.listId);
                    }
                }
            }, 50);
        }


      }

      const isCtrlOrMeta = event.metaKey || event.ctrlKey;
      if (isCtrlOrMeta) {
        switch (event.key.toLowerCase()) {
          case "b":
          case "i":
          case "u":
            event.preventDefault();
            applyCommand(
              event.key.toLowerCase() === "b"
                ? "bold"
                : event.key.toLowerCase() === "i"
                ? "italic"
                : "underline"
            );
            return;
          case "z":
            if (!event.shiftKey) {
              event.preventDefault();
              undo();
              runParagraphAnalysis();
            }
            return;
          case "y":
            event.preventDefault();
            redo();
            runParagraphAnalysis();
            return;
          // --- NEW SHORTCUT FOR FIND/REPLACE ---
          case "f":
            event.preventDefault();
            setShowFindReplace(true);
            return;
          // --- END NEW SHORTCUT ---
        }
        if (event.shiftKey && event.key.toLowerCase() === "z") {
          event.preventDefault();
          redo();
          runParagraphAnalysis();
          return;
        }
      }
      
      // --- NEW: Close find/replace with Escape key ---
      if (event.key === 'Escape') {
        if (showFindReplace) {
          event.preventDefault();
          setShowFindReplace(false);
          clearFindHighlights();
        }
      }
      // --- END NEW LOGIC ---

      if (customSelection && selectedText) {
        if (event.key === "Backspace" || event.key === "Delete") {
          event.preventDefault();
          deleteSelectionManually(true);
          return;
        }

        if (event.key.length === 1 && !isCtrlOrMeta && !event.altKey) {
          event.preventDefault();
          deleteSelectionManually(false);
          document.execCommand("insertText", false, event.key);
          saveToHistory(true);
          return;
        }
      }

      if (event.key === "Enter") {
        const selection = window.getSelection();
        if (selection && selection.isCollapsed && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const startElement = (
            range.startContainer.nodeType === Node.ELEMENT_NODE
              ? range.startContainer
              : range.startContainer.parentElement
          ) as HTMLElement;

          const currentBlock = startElement.closest(
            "p, h1, h2, h3, h4, blockquote, pre, li"
          ) as HTMLElement | null;;

          const listItem = startElement.closest("li");
          if (listItem) {
            event.preventDefault();

            const isEmpty =
              listItem.textContent?.trim() === "" &&
              !listItem.querySelector("img, .math-wrapper, .graph-wrapper, br");

            if (isEmpty) {
              const parentList = listItem.parentElement;
              const newParagraph = document.createElement("p");
              newParagraph.style.lineHeight =
                getLineHeightValue(currentLineSpacing);
              newParagraph.dataset.lineSpacing = currentLineSpacing;
              newParagraph.style.fontSize = currentSize;
              newParagraph.style.marginBottom = "0px";
              newParagraph.style.paddingBottom = "1.25rem";
              newParagraph.innerHTML = "<br>";

              if (parentList) {
                if (parentList.children.length === 1) {
                  parentList.replaceWith(newParagraph);
                } else {
                  parentList.after(newParagraph);
                  listItem.remove();
                }

                const newRange = document.createRange();
                newRange.setStart(newParagraph, 0);
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
            } else {
              document.execCommand("insertParagraph");
            }

            saveToHistory(true);
            updateToolbarState();
            scheduleReflow();
            return;
          }

         if (currentBlock && currentBlock.tagName === "P") {
        event.preventDefault();

        const isSplitParagraph = currentBlock.dataset.paragraphId;
        const splitPoint = currentBlock.dataset.splitPoint;

        if (isSplitParagraph && splitPoint) {
          const paragraphId = currentBlock.dataset.paragraphId;
          
          const preRange = document.createRange();
          preRange.selectNodeContents(currentBlock);
          preRange.setEnd(range.startContainer, range.startOffset);
          const textBeforeCursor = preRange.toString();
          
          const postRange = document.createRange();
          postRange.setStart(range.startContainer, range.startOffset);
          postRange.setEndAfter(currentBlock.lastChild || currentBlock);
          const textAfterCursor = postRange.toString();
          
          const isAtVeryStart = textBeforeCursor.trim() === '';
          const isAtVeryEnd = textAfterCursor.trim() === '';

          if (splitPoint === 'start') {
            if (!isAtVeryStart && !isAtVeryEnd) {
              const newParagraph = document.createElement('p');
              newParagraph.style.lineHeight = getLineHeightValue(currentLineSpacing);
              newParagraph.dataset.lineSpacing = currentLineSpacing;
              newParagraph.style.fontSize = currentSize;
              newParagraph.style.marginBottom = '0px';
              newParagraph.style.paddingBottom = '1.25rem';
              
              const rangeToExtract = document.createRange();
              rangeToExtract.setStartBefore(currentBlock.firstChild || currentBlock);
              rangeToExtract.setEnd(range.startContainer, range.startOffset);
              const contentFragment = rangeToExtract.extractContents();
              newParagraph.appendChild(contentFragment);
              
              if (newParagraph.innerHTML.trim() === '') {
                newParagraph.innerHTML = '<br>';
              }
              
              currentBlock.before(newParagraph);
              
              if (currentBlock.innerHTML.trim() === '') {
                currentBlock.innerHTML = '<br>';
              }
              
              const newRange = document.createRange();
              newRange.setStart(currentBlock, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
              
            } else if (isAtVeryEnd) {
              const newParagraph = document.createElement('p');
              newParagraph.innerHTML = '<br>';
              newParagraph.style.lineHeight = getLineHeightValue(currentLineSpacing);
              newParagraph.dataset.lineSpacing = currentLineSpacing;
              newParagraph.style.fontSize = currentSize;
              newParagraph.style.marginBottom = '0px';
              newParagraph.style.paddingBottom = '1.25rem';
              
              currentBlock.removeAttribute('data-paragraph-id');
              currentBlock.removeAttribute('data-split-point');
              currentBlock.style.paddingBottom = '1.25rem';
              
              currentBlock.after(newParagraph);
              
              const endPiece = pageContainerRef.current?.querySelector(
                `p[data-paragraph-id="${paragraphId}"][data-split-point="end"]`
              ) as HTMLElement | null;
              
              if (endPiece) {
                endPiece.removeAttribute('data-paragraph-id');
                endPiece.removeAttribute('data-split-point');
                endPiece.style.paddingBottom = '1.25rem';
              }
              
              const newRange = document.createRange();
              newRange.setStart(newParagraph, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            } else {
              if (event.shiftKey) {
                document.execCommand("insertLineBreak");
              } else {
                const preRange = document.createRange();
                preRange.selectNodeContents(currentBlock);
                preRange.setEnd(range.startContainer, range.startOffset);

                if (preRange.toString().trim() === "") {
                  const newParagraph = document.createElement("p");
                  newParagraph.innerHTML = "<br>";
                  newParagraph.style.lineHeight =
                    getLineHeightValue(currentLineSpacing);
                  newParagraph.dataset.lineSpacing = currentLineSpacing;
                  newParagraph.style.fontSize = currentSize;
                  newParagraph.style.marginBottom = "0px";
                  newParagraph.style.paddingBottom = "1.25rem";

                  currentBlock.before(newParagraph);
                } else {
                  const newParagraph = document.createElement("p");
                  newParagraph.style.lineHeight =
                    getLineHeightValue(currentLineSpacing);
                  newParagraph.dataset.lineSpacing = currentLineSpacing;
                  newParagraph.style.fontSize = currentSize;
                  newParagraph.style.marginBottom = "0px";
                  newParagraph.style.paddingBottom = "1.25rem";

                  const rangeToEnd = document.createRange();
                  rangeToEnd.setStart(range.startContainer, range.startOffset);
                  rangeToEnd.setEndAfter(currentBlock.lastChild || currentBlock);

                  const contentFragment = rangeToEnd.extractContents();
                  newParagraph.appendChild(contentFragment);

                  if (newParagraph.innerHTML.trim() === "") {
                    newParagraph.innerHTML = "<br>";
                  }
                  if (currentBlock.innerHTML.trim() === "") {
                    currentBlock.innerHTML = "<br>";
                  }

                  currentBlock.after(newParagraph);

                  const newRange = document.createRange();
                  newRange.setStart(newParagraph, 0);
                  newRange.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(newRange);
                }
              }
            }
            
          } else if (splitPoint === 'end') {
            if (isAtVeryStart) {
              const newParagraph = document.createElement('p');
              newParagraph.innerHTML = '<br>';
              newParagraph.style.lineHeight = getLineHeightValue(currentLineSpacing);
              newParagraph.dataset.lineSpacing = currentLineSpacing;
              newParagraph.style.fontSize = currentSize;
              newParagraph.style.marginBottom = '0px';
              newParagraph.style.paddingBottom = '1.25rem';
              
              currentBlock.before(newParagraph);
              
              const startPiece = pageContainerRef.current?.querySelector(
                `p[data-paragraph-id="${paragraphId}"][data-split-point="start"]`
              ) as HTMLElement | null;
              
              if (startPiece) {
                startPiece.removeAttribute('data-paragraph-id');
                startPiece.removeAttribute('data-split-point');
                startPiece.style.paddingBottom = '1.25rem';
              }
              
              currentBlock.removeAttribute('data-paragraph-id');
              currentBlock.removeAttribute('data-split-point');
              currentBlock.style.paddingBottom = '1.25rem';
              
              const newRange = document.createRange();
              newRange.setStart(newParagraph, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
              
            } else if (!isAtVeryEnd) {
              const newParagraph = document.createElement('p');
              newParagraph.style.lineHeight = getLineHeightValue(currentLineSpacing);
              newParagraph.dataset.lineSpacing = currentLineSpacing;
              newParagraph.style.fontSize = currentSize;
              newParagraph.style.marginBottom = '0px';
              newParagraph.style.paddingBottom = '1.25rem';
              
              const rangeToEnd = document.createRange();
              rangeToEnd.setStart(range.startContainer, range.startOffset);
              rangeToEnd.setEndAfter(currentBlock.lastChild || currentBlock);
              const contentFragment = rangeToEnd.extractContents();
              newParagraph.appendChild(contentFragment);
              
              if (newParagraph.innerHTML.trim() === '') {
                newParagraph.innerHTML = '<br>';
              }
              if (currentBlock.innerHTML.trim() === '') {
                currentBlock.innerHTML = '<br>';
              }
              
              currentBlock.after(newParagraph);
              
              const newRange = document.createRange();
              newRange.setStart(newParagraph, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            } else {
              if (event.shiftKey) {
                document.execCommand("insertLineBreak");
              } else {
                const preRange = document.createRange();
                preRange.selectNodeContents(currentBlock);
                preRange.setEnd(range.startContainer, range.startOffset);

                if (preRange.toString().trim() === "") {
                  const newParagraph = document.createElement("p");
                  newParagraph.innerHTML = "<br>";
                  newParagraph.style.lineHeight =
                    getLineHeightValue(currentLineSpacing);
                  newParagraph.dataset.lineSpacing = currentLineSpacing;
                  newParagraph.style.fontSize = currentSize;
                  newParagraph.style.marginBottom = "0px";
                  newParagraph.style.paddingBottom = "1.25rem";

                  currentBlock.before(newParagraph);
                } else {
                  const newParagraph = document.createElement("p");
                  newParagraph.style.lineHeight =
                    getLineHeightValue(currentLineSpacing);
                  newParagraph.dataset.lineSpacing = currentLineSpacing;
                  newParagraph.style.fontSize = currentSize;
                  newParagraph.style.marginBottom = "0px";
                  newParagraph.style.paddingBottom = "1.25rem";

                  const rangeToEnd = document.createRange();
                  rangeToEnd.setStart(range.startContainer, range.startOffset);
                  rangeToEnd.setEndAfter(currentBlock.lastChild || currentBlock);

                  const contentFragment = rangeToEnd.extractContents();
                  newParagraph.appendChild(contentFragment);

                  if (newParagraph.innerHTML.trim() === "") {
                    newParagraph.innerHTML = "<br>";
                  }
                  if (currentBlock.innerHTML.trim() === "") {
                    currentBlock.innerHTML = "<br>";
                  }

                  currentBlock.after(newParagraph);

                  const newRange = document.createRange();
                  newRange.setStart(newParagraph, 0);
                  newRange.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(newRange);
                }
              }
            }
          }
          
        } else {
          if (event.shiftKey) {
            document.execCommand("insertLineBreak");
          } else {
            const preRange = document.createRange();
            preRange.selectNodeContents(currentBlock);
            preRange.setEnd(range.startContainer, range.startOffset);

            if (preRange.toString().trim() === "") {
              const newParagraph = document.createElement("p");
              newParagraph.innerHTML = "<br>";
              newParagraph.style.lineHeight =
                getLineHeightValue(currentLineSpacing);
              newParagraph.dataset.lineSpacing = currentLineSpacing;
              newParagraph.style.fontSize = currentSize;
              newParagraph.style.marginBottom = "0px";
              newParagraph.style.paddingBottom = "1.25rem";

              currentBlock.before(newParagraph);
            } else {
              const newParagraph = document.createElement("p");
              newParagraph.style.lineHeight =
                getLineHeightValue(currentLineSpacing);
              newParagraph.dataset.lineSpacing = currentLineSpacing;
              newParagraph.style.fontSize = currentSize;
              newParagraph.style.marginBottom = "0px";
              newParagraph.style.paddingBottom = "1.25rem";

              const rangeToEnd = document.createRange();
              rangeToEnd.setStart(range.startContainer, range.startOffset);
              rangeToEnd.setEndAfter(currentBlock.lastChild || currentBlock);

              const contentFragment = rangeToEnd.extractContents();
              newParagraph.appendChild(contentFragment);

              if (newParagraph.innerHTML.trim() === "") {
                newParagraph.innerHTML = "<br>";
              }
              if (currentBlock.innerHTML.trim() === "") {
                currentBlock.innerHTML = "<br>";
              }

              currentBlock.after(newParagraph);

              const newRange = document.createRange();
              newRange.setStart(newParagraph, 0);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          }
        }

        saveToHistory(true);

        const pageContent = currentBlock.closest(
          ".page-content"
        ) as HTMLElement;
        if (pageContent) {
          setTimeout(() => checkAndReflowOnOverflow(pageContent), 0);
        }
        return;
      }
    }
    saveToHistory(true);
    return;
  }

      if (event.key === "Backspace") {
        const selection = window.getSelection();
        if (selection && selection.isCollapsed && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const startElement = (
            range.startContainer.nodeType === Node.ELEMENT_NODE
              ? range.startContainer
              : range.startContainer.parentElement
          ) as HTMLElement;

          const currentParagraph = startElement?.closest<HTMLElement>(
            'p[data-split-point="start"]'
          );
          if (currentParagraph && currentParagraph.dataset.paragraphId) {
            const preCaretRange = document.createRange();
            preCaretRange.selectNodeContents(currentParagraph);
            preCaretRange.setEnd(range.startContainer, range.startOffset);

            if (preCaretRange.toString().trim() === "") {
              event.preventDefault();

              const previousElement =
                currentParagraph.previousElementSibling as HTMLElement | null;
              const currentPage = currentParagraph.closest(
                ".page"
              ) as HTMLElement | null;

              if (previousElement) {
                if (
                  previousElement.classList.contains("image-wrapper") ||
                  previousElement.classList.contains("graph-wrapper") ||
                  previousElement.classList.contains("math-wrapper") ||
                  previousElement.classList.contains("template-wrapper")
                ) {
                  previousElement.remove();

                  const newRange = document.createRange();
                  const sel = window.getSelection();
                  newRange.setStart(currentParagraph, 0);
                  newRange.collapse(true);
                  sel?.removeAllRanges();
                  sel?.addRange(newRange);

                  saveToHistory(true);

                  if (currentPage) {
                    setTimeout(() => reflowBackwardFromPage(currentPage), 0);
                  }
                  return;
                }

                if (
                  previousElement.tagName === "P" &&
                  previousElement.textContent?.trim() === "" &&
                  !previousElement.querySelector(
                    "img, .math-wrapper, .graph-wrapper, br"
                  )
                ) {
                  previousElement.remove();

                  const newRange = document.createRange();
                  const sel = window.getSelection();
                  newRange.setStart(currentParagraph, 0);
                  newRange.collapse(true);
                  sel?.removeAllRanges();
                  sel?.addRange(newRange);

                  saveToHistory(true);

                  if (currentPage) {
                    setTimeout(() => reflowBackwardFromPage(currentPage), 0);
                  }
                  return;
                }

                if (
                  ["P", "H1", "H2", "H3", "H4", "BLOCKQUOTE"].includes(
                    previousElement.tagName
                  )
                ) {
                  const paragraphId = currentParagraph.dataset.paragraphId;
                  const lineSpacing = currentParagraph.dataset.lineSpacing;

                  const cursorPosition =
                    previousElement.textContent?.length || 0;

                  if (
                    previousElement.innerHTML.toLowerCase().trim() === "<br>"
                  ) {
                    previousElement.innerHTML = "";
                  }

                  const contentToMove = document.createDocumentFragment();
                  while (currentParagraph.firstChild) {
                    contentToMove.appendChild(currentParagraph.firstChild);
                  }

                  previousElement.appendChild(contentToMove);

                  const cleanupSpans = (element: HTMLElement) => {
                    element.normalize();

                    const walker = document.createTreeWalker(
                      element,
                      NodeFilter.SHOW_ELEMENT,
                      null
                    );

                    const spansToUnwrap: HTMLElement[] = [];
                    let node: Node | null;
                    while ((node = walker.nextNode())) {
                      if (node.nodeName === "SPAN") {
                        const span = node as HTMLElement;
                        const style = span.style;

                        const hasBold =
                          style.fontWeight &&
                          !["normal", "400", ""].includes(style.fontWeight);
                        const hasItalic =
                          style.fontStyle &&
                          !["normal", ""].includes(style.fontStyle);
                        const hasUnderline =
                          style.textDecoration?.includes("underline") ||
                          style.textDecorationLine?.includes("underline");
                        const hasStrikethrough =
                          style.textDecoration?.includes("line-through") ||
                          style.textDecorationLine?.includes("line-through");

                        const bgColor =
                          style.backgroundColor?.toLowerCase() || "";
                        const hasHighlight =
                          bgColor &&
                          bgColor !== "initial" &&
                          bgColor !== "transparent" &&
                          bgColor !== "" &&
                          bgColor !== "rgba(0, 0, 0, 0)" &&
                          bgColor !== "rgb(255, 255, 255)" &&
                          !bgColor.includes("initial");

                        const hasMeaningfulFormatting =
                          hasBold ||
                          hasItalic ||
                          hasUnderline ||
                          hasStrikethrough ||
                          hasHighlight;
                        const hasClasses =
                          span.className && span.className.trim() !== "";

                        if (!hasMeaningfulFormatting && !hasClasses) {
                          spansToUnwrap.push(span);
                        }
                      }
                    }

                    spansToUnwrap.forEach((span) => {
                      const parent = span.parentNode;
                      if (parent) {
                        while (span.firstChild) {
                          parent.insertBefore(span.firstChild, span);
                        }
                        parent.removeChild(span);
                      }
                    });

                    element.normalize();
                  };

                  cleanupSpans(previousElement);
                  Promise.resolve().then(() => cleanupSpans(previousElement));

                  currentParagraph.remove();

                  previousElement.dataset.paragraphId = paragraphId;
                  previousElement.dataset.splitPoint = "start";
                  previousElement.style.paddingBottom = "0px";
                  if (lineSpacing) {
                    previousElement.dataset.lineSpacing = lineSpacing;
                  }

                  const sel = window.getSelection();
                  const textWalker = document.createTreeWalker(
                    previousElement,
                    NodeFilter.SHOW_TEXT,
                    null
                  );

                  let charCount = 0;
                  let targetNode: Node | null = null;
                  let targetOffset = 0;
                  let textNode: Node | null;

                  while ((textNode = textWalker.nextNode())) {
                    const nodeLength = textNode.textContent?.length || 0;
                    if (charCount + nodeLength >= cursorPosition) {
                      targetNode = textNode;
                      targetOffset = cursorPosition - charCount;
                      break;
                    }
                    charCount += nodeLength;
                  }

                  const newRange = document.createRange();
                  if (targetNode) {
                    newRange.setStart(targetNode, targetOffset);
                  } else {
                    newRange.selectNodeContents(previousElement);
                    newRange.collapse(false);
                  }
                  newRange.collapse(true);
                  sel?.removeAllRanges();
                  sel?.addRange(newRange);

                  saveToHistory(true);

                  if (currentPage) {
                    setTimeout(() => {
                      reflowBackwardFromPage(currentPage);

                      const updatedStartPiece =
                        pageContainerRef.current?.querySelector(
                          `p[data-paragraph-id="${paragraphId}"][data-split-point="start"]`
                        ) as HTMLElement | null;
                      const updatedEndPiece =
                        pageContainerRef.current?.querySelector(
                          `p[data-paragraph-id="${paragraphId}"][data-split-point="end"]`
                        ) as HTMLElement | null;

                      if (updatedStartPiece && updatedEndPiece) {
                        const startPage = updatedStartPiece.closest(".page");
                        const endPage = updatedEndPiece.closest(".page");

                        if (startPage === endPage) {
                          reflowSplitParagraph(paragraphId);
                        }
                      }
                    }, 0);
                  }
                  return;
                }
              }

              return;
            }
          } else {
            const endParagraph = startElement?.closest<HTMLElement>(
              'p[data-split-point="end"]'
            );
            if (endParagraph) {
              const preCaretRange = document.createRange();
              preCaretRange.selectNodeContents(endParagraph);
              preCaretRange.setEnd(range.startContainer, range.startOffset);

              if (preCaretRange.toString().trim() === "") {
                event.preventDefault();

                const paragraphId = endParagraph.dataset.paragraphId;
                if (!paragraphId || !pageContainerRef.current) return;

                const startPiece = pageContainerRef.current.querySelector(
                  `p[data-paragraph-id="${paragraphId}"][data-split-point="start"]`
                ) as HTMLElement | null;

                if (startPiece) {
                  const selection = window.getSelection();
                  if (selection) {
                    const newRange = document.createRange();

                    newRange.selectNodeContents(startPiece);
                    
                    newRange.collapse(false);

                    selection.removeAllRanges();
                    selection.addRange(newRange);
            
                    startPiece.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }
                  return;
                }
              }
            }
          }

          const currentBlock = startElement.closest("p, h1, h2, h3, h4");
          if (
            currentBlock &&
            !currentBlock.hasAttribute("data-split-point") &&
            range.startOffset === 0
          ) {
            const preCaretRange = document.createRange();
            preCaretRange.selectNodeContents(currentBlock);
            preCaretRange.setEnd(range.startContainer, range.startOffset);

            if (preCaretRange.toString().trim() === "") {
              const previousBlock = currentBlock.previousElementSibling;
              if (previousBlock && ["P", "H1", "H2", "H3", "H4"].includes(previousBlock.tagName)) {
                event.preventDefault();
                
                const cursorPosition = previousBlock.textContent?.length || 0;

                if (previousBlock.innerHTML.toLowerCase().trim() === "<br>") {
                  previousBlock.innerHTML = "";
                }

                while (currentBlock.firstChild) {
                  previousBlock.appendChild(currentBlock.firstChild);
                }
                currentBlock.remove();

                const textWalker = document.createTreeWalker(previousBlock, NodeFilter.SHOW_TEXT);
                let charCount = 0;
                let targetNode: Node | null = null;
                let targetOffset = 0;
                let node: Node | null;

                while ((node = textWalker.nextNode())) {
                  const nodeLength = node.textContent?.length || 0;
                  if (charCount + nodeLength >= cursorPosition) {
                    targetNode = node;
                    targetOffset = cursorPosition - charCount;
                    break;
                  }
                  charCount += nodeLength;
                }
                
                const newRange = document.createRange();
                if (targetNode) {
                  newRange.setStart(targetNode, targetOffset);
                } else {
                  newRange.selectNodeContents(previousBlock);
                  newRange.collapse(false);
                }
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);

                saveToHistory(true);
                scheduleReflow();
                return;
              }
            }
          }

          const listItem = startElement.closest("li");
          if (
            listItem &&
            range.startOffset === 0 &&
            !listItem.textContent?.trim()
          ) {
            const parentList = listItem.parentElement;
            if (parentList && !listItem.previousElementSibling) {
              event.preventDefault();
              document.execCommand("outdent");
              saveToHistory(true);
              scheduleReflow();

              return;
            }
          }

          const pageContent = startElement?.closest(".page-content");
          if (pageContent) {
            const preCaretRange = document.createRange();
            preCaretRange.selectNodeContents(pageContent);
            preCaretRange.setEnd(range.startContainer, range.startOffset);
            if (
              preCaretRange.toString().trim() === "" &&
              pageContent.children.length > 0 &&
              pageContent.firstElementChild ===
                startElement.closest(".page-content > *")
            ) {
              const currentPage = pageContent.closest(".page") as HTMLElement;
              const previousPage =
                currentPage?.previousElementSibling as HTMLElement;
              if (previousPage) {
                event.preventDefault();

                handleBackspaceAtPageStart(currentPage, previousPage);

                return;
              }
            }
          }
        }

        saveToHistory();
        console.log('wordddddd')
        return;
      }

      if (event.key === " ") {
        setTimeout(() => {
          if (checkForAutoList()) {
            saveToHistory(true);
            updateToolbarState();
            scheduleReflow();
          }
        }, 0);
        return;
      }
      if (event.key === "$") {
        setTimeout(() => {
          if (checkForMathBlock()) {
            saveToHistory(true);
          }
        }, 0);
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        document.execCommand(event.shiftKey ? "outdent" : "indent");
        saveToHistory(true);
        scheduleReflow();
        return;
      }
    };

    const handleSelectionChange = () => {
      updateToolbarState();
      updateOverflowWarning();
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const node = selection.anchorNode;
        const parent = node?.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node?.parentElement;
        const cell = parent?.closest('td, th') as HTMLElement | null;
        setSelectedTableCell(cell || null);
      } else {
        setSelectedTableCell(null);
      }
    };

    const handleMouseUp = () => {
      setTimeout(() => updateToolbarState(), 0);
    };

    container.addEventListener("keydown", handleKeyDown);
    document.addEventListener("cut", handleCut);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("copy", handleCopy);
    container.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("copy", handleCopy);
      container.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [
    pageContainerRef,
    saveToHistory,
    checkForAutoList,
    checkForMathBlock,
    updateToolbarState,
    undo,
    redo,
    scheduleReflow,
    immediateReflow,
    updateOverflowWarning,
    handleBackspaceAtPageStart,
    reflowBackwardFromPage,
    runParagraphAnalysis,
    selectedText,
    deleteSelectionManually,
    customSelection,
    applyCommand,
    applyStyle,
    checkAndReflowOnOverflow,
    reflowSplitParagraph,
    selectedResizableElement,
    selectedGraphElement,
    selectedMathElement,
    insertImage,
    insertContent,
    showFindReplace, // --- NEW DEPENDENCY ---
    clearFindHighlights, // --- NEW DEPENDENCY ---
  ]);
  
  useEffect(() => {
    if (selectedTableCell && scrollContainerRef.current) {
      const table = selectedTableCell.closest('table');
      if (table) {
        const tableRect = table.getBoundingClientRect();
        const containerRect = scrollContainerRef.current.getBoundingClientRect();
        const scrollTop = scrollContainerRef.current.scrollTop;

        setTableToolbarPosition({
          top: tableRect.top - containerRect.top + scrollTop,
          left: tableRect.right - containerRect.left + 10,
        });
      }
    } else {
      setTableToolbarPosition(null);
    }
  }, [selectedTableCell]);

  useEffect(() => {
    pageContainerRef.current?.querySelectorAll('.selectedCell').forEach(cell => {
      cell.classList.remove('selectedCell');
    });
    if (selectedTableCell) {
      selectedTableCell.classList.add('selectedCell');
    }
  }, [selectedTableCell]);


  const handleTextColorChange = (color: string) => {
    applyStyle("color", color);
    setCurrentTextColor(color);
  };

  const handleHighlight = () => {
    const color = isHighlighted ? "transparent" : "#FFF3A3";
    applyCommand("hiliteColor", color);
  };

  const handleInsertImage = useCallback(
    () => fileInputRef.current?.click(),
    []
  );

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target && typeof e.target.result === "string") {
            const imageUrl = e.target.result;
            const img = new Image();
            img.onload = () => {
              const MAX_INSERT_WIDTH = 300;
              const aspectRatio = img.height / img.width;
              const width = Math.min(img.width, MAX_INSERT_WIDTH);
              const height = width * aspectRatio;
              insertImage({ src: imageUrl, width, height, alt: file.name });
            };
            img.src = imageUrl;
          }
        };
        reader.readAsDataURL(file);
      }
      event.target.value = "";
    },
    [insertImage]
  );

  const handleNavigateToPage = (pageNum: number) => {
    const container = pageContainerRef.current;
    if (!container) return;
    const pages = container.querySelectorAll(".page");
    const targetPage = pages[pageNum - 1];
    if (targetPage) {
      targetPage.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleInsertTable = (rows: number, cols: number) => {
    restoreSelection();
    let tableHtml = "<table><tbody>";
    for (let r = 0; r < rows; r++) {
      tableHtml += "<tr>";
      for (let c = 0; c < cols; c++) {
        tableHtml += `<td><br></td>`;
      }
      tableHtml += "</tr>";
    }
    tableHtml += "</tbody></table>";
    document.execCommand("insertHTML", false, tableHtml + "<p><br></p>");
    saveToHistory(true);
    scheduleReflow();
    runParagraphAnalysis();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
      {linkPopoverState.visible && linkPopoverState.rect && (
        <div
          className="link-popover-container absolute z-30"
          style={{
            top: `${linkPopoverState.rect.bottom + 8 + (scrollContainerRef.current?.scrollTop || 0)}px`,
            left: `${linkPopoverState.rect.left}px`,
          }}
        >
          <LinkPopover
            initialUrl={linkPopoverState.url}
            onApply={applyLink}
            onRemove={removeLink}
            onClose={() => setLinkPopoverState({ visible: false, url: '', rect: null })}
          />
        </div>
      )}

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

      <div
        ref={toolbarRef}
        className="flex-shrink-0 w-full flex justify-center px-6 pt-4 bg-gray-50 sticky top-0 z-20 no-print"
      >
        <div className="w-full max-w-7xl">
          <EditorToolbar
            onUndo={undo}
            onRedo={redo}
            onBlockTypeChange={(type) => applyCommand("formatBlock", type)}
            onFontChange={(font) => applyStyle("fontFamily", font)}
            onSizeChange={(size) => applyStyle("fontSize", size)}
            onBold={() => applyCommand("bold")}
            onItalic={() => applyCommand("italic")}
            onUnderline={() => applyCommand("underline")}
            onHighlight={handleHighlight}
            onAlign={(align) =>
              applyCommand(
                `justify${align.charAt(0).toUpperCase() + align.slice(1)}`
              )
            }
            onBulletedList={() => applyCommand("insertUnorderedList")}
            onNumberedList={() => applyCommand("insertOrderedList")}
            onInsertImage={handleInsertImage}
            onBlockquote={() => applyCommand("formatBlock", "blockquote")}
            onCodeBlock={() => applyCommand("formatBlock", "pre")}
            onInsertTable={handleInsertTable}
            onTableMenuOpen={saveSelection}
            onTextColorChange={handleTextColorChange}
            onColorMenuOpen={saveSelection}
            onLineSpacingChange={handleLineSpacingChange}
            onLineSpacingMenuOpen={saveSelection}
            onInsertMath={() => insertMath()}
            onLink={handleLink}
            onEditHeader={() => handleEditHeaderFooter('header')}
            onEditFooter={() => handleEditHeaderFooter('footer')}
            canUndo={canUndo}
            canRedo={canRedo}
            isBold={isBold}
            isItalic={isItalic}
            isUnderline={isUnderline}
            isHighlighted={isHighlighted}
            isLink={isLink}
            textAlign={textAlign}
            currentBlockType={currentBlockType}
            currentFont={currentFont}
            currentSize={currentSize}
            currentTextColor={currentTextColor}
            currentLineSpacing={currentLineSpacing}
            onToggleOutline={onToggleOutline}
            onToggleStyleStudio={onToggleTemplateGallery}
            onToggleAiPanel={onToggleAiPanel}
            onFind={() => setShowFindReplace(true)}
            isTocOpen={isTocOpen}
            isStyleStudioOpen={isTemplateGalleryOpen}
            isAiPanelOpen={isAiPanelOpen}
          />
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto pt-6 bg-gray-100 flex flex-col items-center relative ${showHfZones ? 'show-hf-zones' : ''}`}
      >
        {/* --- NEW: RENDER FIND/REPLACE PANEL --- */}
        {showFindReplace && (
          <FindReplacePanel
            onFindNext={findAll}
            onFindPrev={findPrev}
            onReplace={replace}
            onReplaceAll={(q, r, o) => {
              findAll(q, o);
              replaceAll(r);
            }}
            onClose={() => {
              setShowFindReplace(false);
              clearFindHighlights();
            }}
            onClearHighlights={clearFindHighlights}
            matchIndex={findMatchIndex}
            totalMatches={findTotalMatches}
            isSearching={isSearching}
          />
        )}
        {/* --- END NEW PANEL --- */}

        {tableToolbarPosition && (
          <div
            className="table-toolbar-container absolute z-30"
            style={{
              top: `${tableToolbarPosition.top}px`,
              left: `${tableToolbarPosition.left}px`,
            }}
          >
            <TableToolbar onAction={handleTableAction} />
          </div>
        )}

        {editingHeaderFooter && (
          <HeaderFooterEditor
            areaType={editingHeaderFooter.area}
            initialHtml={editingHeaderFooter.area === 'header' ? headerHtml : footerHtml}
            position={editingHeaderFooter.position}
            onClose={handleCloseHeaderFooter}
          />
        )}

        <div className="selection-overlay">
          {/* --- NEW: RENDER FIND HIGHLIGHTS --- */}
          {findHighlightRects.map((rect, index) => {
            const containerRect = scrollContainerRef.current?.getBoundingClientRect();
            if (!containerRect) return null;
            const scrollTop = scrollContainerRef.current?.scrollTop || 0;
            const isCurrentMatch = index === findMatchIndex;
            return (
              <div
                key={`find-${index}`}
                className={`find-match-highlight ${isCurrentMatch ? 'current' : ''}`}
                style={{
                  top: rect.top - containerRect.top + scrollTop,
                  left: rect.left - containerRect.left,
                  width: rect.width,
                  height: rect.height,
                }}
              />
            );
          })}
          {/* --- END NEW HIGHLIGHTS --- */}

          {highlightRects.map((rect, index) => {
            const containerRect =
              scrollContainerRef.current?.getBoundingClientRect();
            if (!containerRect) return null;

            const scrollTop = scrollContainerRef.current?.scrollTop || 0;

            return (
              <div
                key={index}
                className="custom-selection-highlight"
                style={{
                  top: rect.top - containerRect.top + scrollTop,
                  left: rect.left - containerRect.left,
                  width: rect.width,
                  height: rect.height,
                }}
              />
            );
          })}
        </div>

        <div
          ref={pageContainerRef}
          className="page-container w-full"
          onInput={handleInput}
        ></div>

        <div
          onClick={addNewPage}
          className="w-full max-w-[8.5in] flex justify-center items-center p-8 mt-4 mb-12 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-colors duration-200 cursor-pointer"
        >
          <div className="text-center text-gray-500">
            <Plus className="w-8 h-8 mx-auto mb-2" />
            <p className="font-medium">Add New Page</p>
          </div>
        </div>

        <ImageResizer
          pageContainerRef={scrollContainerRef}
          saveToHistory={saveToHistory}
          selectedElement={selectedResizableElement}
          onElementSelect={setSelectedResizableElement}
          reflowBackwardFromPage={reflowBackwardFromPage}
          fullDocumentReflow={fullDocumentReflow}
        />
        <GraphResizer
          pageContainerRef={scrollContainerRef}
          saveToHistory={saveToHistory}
          selectedGraphElement={selectedGraphElement}
          onGraphSelect={setSelectedGraphElement}
          reflowBackwardFromPage={reflowBackwardFromPage}
          fullDocumentReflow={fullDocumentReflow}
        />
        <MathResizer
          pageContainerRef={scrollContainerRef}
          saveToHistory={saveToHistory}
          selectedMathElement={selectedMathElement}
          onMathSelect={setSelectedMathElement}
          reflowBackwardFromPage={reflowBackwardFromPage}
          fullDocumentReflow={fullDocumentReflow}
        />
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* <ReflowDebugger
        pageContainerRef={pageContainerRef}
        currentPage={currentPage}
      /> */}

      <StatusBar
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handleNavigateToPage}
        isContentHubOpen={isContentHubOpen}
        isHubExpanded={isHubExpanded}
      />

      <SelectionInfo
        selectedText={selectedText}
        isMultiPageSelection={isMultiPageSelection}
        selectedPages={selectedPages}
      />
      {/* <SelectionDebug
        selectedText={selectedText}
        isMultiPageSelection={isMultiPageSelection}
        selectedPages={selectedPages}
      /> */}
    </div>
  );
});

DocumentEditor.displayName = "DocumentEditor";