"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { createRoot, Root } from "react-dom/client";
import { MathBlock } from "../MathBlock";
import { GraphBlock, GraphData } from "../GraphBlock";
import { CanvasBlock } from "@/components/editor/CanvasBlock";
import { useHistory } from "./useHistory";
import { useTextReflow } from "./useTextReflow";
import { useMultiPageSelection } from "./useMultiPageSelection";
import { PageNumber } from "../PageNumber";
import { useFindReplace } from "./useFindReplace";

const createNewPage = (): HTMLElement => {
  const newPageDiv = document.createElement("div");
  newPageDiv.className = "page";

  const headerDiv = document.createElement("div");
  headerDiv.className = "page-header";
  headerDiv.setAttribute("data-hf", "header");
  headerDiv.innerHTML = '';

  const footerDiv = document.createElement("div");
  footerDiv.className = "page-footer";
  footerDiv.setAttribute("data-hf", "footer");
  footerDiv.innerHTML = '';

  const pageNumberContainer = document.createElement("div");
  pageNumberContainer.className = "page-number-container";
  pageNumberContainer.innerHTML = '<span class="page-number-placeholder" contenteditable="false">#</span>';

  const newPageContent = document.createElement("div");
  newPageContent.className = "page-content";
  newPageContent.contentEditable = "true";

  newPageDiv.appendChild(headerDiv);
  newPageDiv.appendChild(footerDiv);
  newPageDiv.appendChild(pageNumberContainer);
  newPageDiv.appendChild(newPageContent);

  return newPageDiv;
};

export const useEditor = (
  editorRef: React.RefObject<HTMLDivElement | null>
) => {
  const {
    record,
    undo: historyUndo,
    redo: historyRedo,
    canUndo,
    canRedo,
    initialize: initializeHistory,
    resetHistory,
    forceCommit,
    restoreSelection,
  } = useHistory(editorRef);

  const reactRootsRef = useRef<Map<HTMLElement, Root>>(new Map());
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hydratedElements = useRef<Set<HTMLElement>>(new Set());
  const dropLock = useRef(false);

  const saveToHistory = useCallback(
    (force: boolean = false, affectedElements?: HTMLElement[]) => {
      record(force ? "action" : "input", affectedElements);
    },
    [record]
  );

  const {
    scheduleReflow,
    immediateReflow,
    isReflowing,
    reflowPage,
    reflowBackwardFromPage,
    reflowSplitParagraph,
    getContentHeight,
    getAvailableHeight,
    reflowSplitTable,  
    reflowSplitList
  } = useTextReflow(editorRef, saveToHistory);

  const fullDocumentReflow = useCallback(async () => {
    if (!editorRef.current) return;
    let currentPage = editorRef.current.querySelector('.page') as HTMLElement | null;
    let pageIndex = 1;
    while (currentPage) {
      reflowPage(currentPage);
      currentPage = currentPage.nextElementSibling as HTMLElement | null;
      pageIndex++;
    }
    const firstPage = editorRef.current.querySelector('.page') as HTMLElement | null;
    if (firstPage) {
      reflowBackwardFromPage(firstPage);
    }
  }, [editorRef, reflowPage, reflowBackwardFromPage]);


  const {
    highlightRects,
    isSelecting,
    isMultiPageSelection,
    selectedPages,
    selectedText,
    clearSelection,
    customSelection,
    forceRecalculateRects,
    startTextSelection,
  } = useMultiPageSelection(editorRef);

  const {
    findAll,
    findNext,
    findPrev,
    replace,
    replaceAll,
    clearFindHighlights,
    findMatchIndex,
    findTotalMatches,
    isSearching,
    matches,
  } = useFindReplace(editorRef, saveToHistory, fullDocumentReflow);

  const unmountAllReactComponents = useCallback(() => {
    reactRootsRef.current.forEach((root) => {
      root.unmount();
    });
    reactRootsRef.current.clear();
    hydratedElements.current.clear();
  }, []);

  const mountReactComponent = useCallback(
    (component: React.ReactElement, wrapper: HTMLElement) => {
      if (reactRootsRef.current.has(wrapper)) {
        const root = reactRootsRef.current.get(wrapper)!;
        root.render(component);
      } else {
        const root = createRoot(wrapper);
        root.render(component);
        reactRootsRef.current.set(wrapper, root);
      }
    },
    []
  );

  // --- HYDRATION LOGIC ---

  const hydrateMathBlockSingle = useCallback((wrapper: HTMLElement) => {
    if (reactRootsRef.current.has(wrapper)) return;
    
    const initialTex = wrapper.dataset.tex || "";
    const initialFontSize = parseFloat(wrapper.dataset.fontSize || "16");

    const handleUpdate = (newTex: string) => {
      wrapper.dataset.tex = newTex;
      saveToHistory(true, [wrapper]);
      scheduleReflow();
    };
    const handleRemove = () => {
      const page = wrapper.closest('.page') as HTMLElement;
      const root = reactRootsRef.current.get(wrapper);
      if (root) {
        root.unmount();
        reactRootsRef.current.delete(wrapper);
      }
      wrapper.remove();
      saveToHistory(true, page ? [page] : undefined);
      scheduleReflow();
    };
    
    mountReactComponent(
      <MathBlock
        initialTex={initialTex}
        fontSize={initialFontSize}
        onUpdate={handleUpdate}
        onRemove={handleRemove}
      />,
      wrapper
    );
  }, [mountReactComponent, saveToHistory, scheduleReflow]);

  const hydrateGraphBlockSingle = useCallback((wrapper: HTMLElement) => {
    if (reactRootsRef.current.has(wrapper) || !wrapper.dataset.graph) return;
    
    const initialGraphData = JSON.parse(wrapper.dataset.graph);
    const handleUpdate = (newGraphData: GraphData) => {
      wrapper.dataset.graph = JSON.stringify(newGraphData);
      saveToHistory(true, [wrapper]);
      scheduleReflow();
    };
    const handleRemove = () => {
      const page = wrapper.closest('.page') as HTMLElement;
      const root = reactRootsRef.current.get(wrapper);
      if (root) {
        root.unmount();
        reactRootsRef.current.delete(wrapper);
      }
      wrapper.remove();
      saveToHistory(true, page ? [page] : undefined);
      scheduleReflow();
    };

    mountReactComponent(
      <GraphBlock
        initialGraphData={initialGraphData}
        onUpdate={handleUpdate}
        onRemove={handleRemove}
      />,
      wrapper
    );
  }, [mountReactComponent, saveToHistory, scheduleReflow]);

  const hydrateCanvasBlockSingle = useCallback((wrapper: HTMLElement) => {
    if (reactRootsRef.current.has(wrapper)) return;

    const initialData = JSON.parse(wrapper.dataset.canvas || '{}');
    const width = parseInt(wrapper.dataset.width || '500');
    const height = parseInt(wrapper.dataset.height || '300');

    const handleUpdate = (newData: any) => {
      wrapper.dataset.canvas = JSON.stringify(newData);
    };

    mountReactComponent(
      <CanvasBlock 
        initialData={initialData} 
        width={width}
        height={height}
        onUpdate={handleUpdate}
        isEditing={true} 
      />, 
      wrapper
    );
  }, [mountReactComponent]);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      const target = entry.target as HTMLElement;
      
      if (entry.isIntersecting) {
        if (!hydratedElements.current.has(target)) {
          if (target.classList.contains('math-wrapper')) {
             hydrateMathBlockSingle(target);
          } else if (target.classList.contains('graph-wrapper')) {
             hydrateGraphBlockSingle(target);
          } else if (target.classList.contains('canvas-wrapper')) {
             hydrateCanvasBlockSingle(target);
          }
          hydratedElements.current.add(target);
        }
      }
    });
  }, [hydrateMathBlockSingle, hydrateGraphBlockSingle, hydrateCanvasBlockSingle]);

  // Initialize Observer
  useEffect(() => {
    if (!editorRef.current) return;
    
    const scrollContainer = editorRef.current.parentElement;

    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: scrollContainer, 
      rootMargin: '400px', 
      threshold: 0.01
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [editorRef, handleIntersection]);


  const rehydratePageNumbers = useCallback(
    (container: HTMLElement) => {
      const pages = Array.from(container.querySelectorAll('.page'));
      pages.forEach((page, index) => {
        const pageNumberPlaceholders = page.querySelectorAll(".page-number-placeholder");
        pageNumberPlaceholders.forEach((el) => {
          const wrapper = el as HTMLElement;
          mountReactComponent(
            <PageNumber pageNumber={index + 1} />,
            wrapper
          );
        });
      });
    },
    [mountReactComponent]
  );

  const rehydrateMathBlocks = useCallback(
    (container: HTMLElement) => {
      const mathPlaceholders = container.querySelectorAll(".math-wrapper");
      mathPlaceholders.forEach((el) => {
        observerRef.current?.observe(el);
      });
    },
    []
  );

  const rehydrateGraphBlocks = useCallback(
    (container: HTMLElement) => {
      const graphPlaceholders = container.querySelectorAll(".graph-wrapper");
      graphPlaceholders.forEach((el) => {
        observerRef.current?.observe(el);
      });
    },
    []
  );

  const rehydrateCanvasBlocks = useCallback(
    (container: HTMLElement) => {
      const placeholders = container.querySelectorAll(".canvas-wrapper");
      placeholders.forEach((el) => {
        observerRef.current?.observe(el);
      });
    },
    []
  );

  const restoreStateFromHistory = useCallback(
    (state: { patches: { pageIndex: number; html: string }[]; startOffset: number; endOffset: number } | null) => {
      if (!state || !editorRef.current) return;

      unmountAllReactComponents();

      const allPages = Array.from(editorRef.current.querySelectorAll('.page'));

      state.patches.forEach(patch => {
        const pageToUpdate = allPages[patch.pageIndex] as HTMLElement | undefined;
        if (pageToUpdate) {
          pageToUpdate.innerHTML = patch.html;
        } else {
          const newPage = document.createElement('div');
          newPage.className = 'page';
          newPage.innerHTML = patch.html;
          if (patch.pageIndex >= allPages.length) {
            editorRef.current?.appendChild(newPage);
          } else {
            editorRef.current?.insertBefore(newPage, allPages[patch.pageIndex]);
          }
        }
      });
      
      rehydrateMathBlocks(editorRef.current);
      rehydrateGraphBlocks(editorRef.current);
      rehydrateCanvasBlocks(editorRef.current);
      rehydratePageNumbers(editorRef.current);

      const elementToFocus = restoreSelection(
        editorRef.current,
        state.startOffset,
        state.endOffset
      );

      if (elementToFocus) {
        setTimeout(() => {
          elementToFocus.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }, 50);
      }
    },
    [
      editorRef,
      unmountAllReactComponents,
      rehydrateMathBlocks,
      rehydrateGraphBlocks,
      rehydrateCanvasBlocks,
      rehydratePageNumbers,
      restoreSelection,
    ]
  );

  const undo = useCallback(() => {
    const previousState = historyUndo();
    restoreStateFromHistory(previousState);
  }, [historyUndo, restoreStateFromHistory]);

  const redo = useCallback(() => {
    const nextState = historyRedo();
    restoreStateFromHistory(nextState);
  }, [historyRedo, restoreStateFromHistory]);

  useEffect(() => {
    if (editorRef.current) {
      initializeHistory();
    }
  }, [editorRef, initializeHistory]);

  useEffect(() => {
    const container = editorRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        forceCommit();
      }
    };

    const handleMouseUp = () => {
      forceCommit();
    };

    container.addEventListener("keydown", handleKeyDown);
    container.addEventListener("mouseup", handleMouseUp);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      container.removeEventListener("mouseup", handleMouseUp);
    };
  }, [editorRef, forceCommit]);

  const findInsertionTarget = useCallback((): {
    container: HTMLElement;
    range?: Range;
  } | null => {
    if (!editorRef.current) return null;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let node: Node | null = range.commonAncestorContainer;
      let pageContentContainer: HTMLElement | null = null;
      let wrapperElement: HTMLElement | null = null;
      while (node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          if (
            !wrapperElement &&
            (element.classList.contains("image-wrapper") ||
              element.classList.contains("canvas-wrapper") ||
              element.classList.contains("math-wrapper") ||
              element.classList.contains("template-wrapper") ||
              element.classList.contains("graph-wrapper"))
          ) {
            wrapperElement = element;
          }
          if (element.classList.contains("page-content")) {
            pageContentContainer = element;
            break;
          }
        }
        node = node.parentNode;
      }
      if (pageContentContainer) {
        if (wrapperElement) {
          range.setStartAfter(wrapperElement);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        return { container: pageContentContainer, range };
      }
    }
    const pages = Array.from(
      editorRef.current.querySelectorAll(".page-content")
    ) as HTMLElement[];
    if (pages.length > 0) {
      let mostVisiblePage: HTMLElement | null = null;
      let minTop = Infinity;
      for (const page of pages) {
        const rect = page.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          if (rect.top < minTop) {
            minTop = rect.top;
            mostVisiblePage = page;
          }
        }
      }
      if (mostVisiblePage) return { container: mostVisiblePage };
      return { container: pages[pages.length - 1] };
    }
    return null;
  }, [editorRef]);

  const addNewPage = useCallback(() => {
    if (!editorRef.current) return;
    const allPages = editorRef.current.querySelectorAll(".page");
    const lastPageBeforeAdding =
      allPages.length > 0
        ? (allPages[allPages.length - 1] as HTMLElement)
        : null;

    saveToHistory(true, lastPageBeforeAdding ? [lastPageBeforeAdding] : undefined);

    if (lastPageBeforeAdding) {
      const lastPageContent = lastPageBeforeAdding.querySelector('.page-content') as HTMLElement;
      if (lastPageContent) {
        const availableHeight = getAvailableHeight();
        const contentHeight = getContentHeight(lastPageContent);
        let remainingSpace = availableHeight - contentHeight;
        
        const tempP = document.createElement('p');
        tempP.innerHTML = '<br>';
        tempP.style.fontSize = '14pt';
        tempP.style.lineHeight = '1.5';
        lastPageContent.appendChild(tempP);
        const paragraphHeight = tempP.getBoundingClientRect().height;
        lastPageContent.removeChild(tempP);

        if (paragraphHeight > 0) {
          const paragraphsNeeded = Math.floor(remainingSpace / paragraphHeight);
          for (let i = 0; i < paragraphsNeeded; i++) {
            const paddingParagraph = document.createElement('p');
            paddingParagraph.innerHTML = '<br>';
            lastPageContent.appendChild(paddingParagraph);
          }
        }
      }
    }

    const newPageDiv = createNewPage();
    editorRef.current.appendChild(newPageDiv);
    
    rehydratePageNumbers(editorRef.current);

    if (lastPageBeforeAdding) {
      reflowPage(lastPageBeforeAdding);
    }

    const newPageContent = newPageDiv.querySelector('.page-content') as HTMLElement;
    newPageContent.innerHTML = '';
    const finalParagraph = document.createElement("p");
    finalParagraph.innerHTML = "<br>";
    newPageContent.appendChild(finalParagraph);

    newPageDiv.scrollIntoView({ behavior: "smooth", block: "start" });
    const range = document.createRange();
    const selection = window.getSelection();
    range.setStart(finalParagraph, 0);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);

    setTimeout(() => {
      saveToHistory(true, [newPageDiv]);
    }, 100);
  }, [editorRef, saveToHistory, reflowPage, getContentHeight, getAvailableHeight, rehydratePageNumbers]);


  const ensureCursorFriendlyBlocks = (
    wrapper: HTMLElement,
    selection: Selection | null
  ) => {
    const isSpecialWrapper = (el: Element | null): boolean => {
      if (!el) return false;
      return [
        "image-wrapper",
        "template-wrapper",
        "graph-wrapper",
        "math-wrapper",
        "canvas-wrapper",
      ].some((cls) => el.classList.contains(cls));
    };

    const prevEl = wrapper.previousElementSibling;
    if (!prevEl || isSpecialWrapper(prevEl)) {
      const newPara = document.createElement("p");
      newPara.innerHTML = "<br>";
      wrapper.insertAdjacentElement("beforebegin", newPara);
    }

    const nextEl = wrapper.nextElementSibling;
    let cursorTargetPara: HTMLElement;
    if (!nextEl || isSpecialWrapper(nextEl)) {
      const newPara = document.createElement("p");
      newPara.innerHTML = "<br>";
      wrapper.insertAdjacentElement("afterend", newPara);
      cursorTargetPara = newPara;
    } else {
      cursorTargetPara = nextEl as HTMLElement;
    }

    if (selection) {
      const newRange = document.createRange();
      newRange.setStart(cursorTargetPara, 0);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  };

  const insertMath = useCallback(
    (isInline?: boolean) => {
      let target = findInsertionTarget();
      if (!target) {
        addNewPage();
        target = findInsertionTarget();
        if (!target) return;
      }
      const page = (target.container.closest('.page') as HTMLElement);
      saveToHistory(true, page ? [page] : undefined);

      const wrapper = document.createElement("div");
      wrapper.className = "math-wrapper";
      wrapper.contentEditable = "false";
      wrapper.dataset.tex = "";
      wrapper.dataset.fontSize = "16";
      wrapper.style.margin = "1em 0";

      const selection = window.getSelection();
      if (target.range) {
        let node = target.range.commonAncestorContainer;
        let blockElement = (
          node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
        ) as HTMLElement;
        while (
          blockElement &&
          blockElement.parentElement &&
          blockElement.parentElement !== target.container
        ) {
          blockElement = blockElement.parentElement;
        }
        const isEffectivelyEmpty =
          blockElement &&
          (blockElement.textContent ?? "").trim() === "" &&
          blockElement.querySelectorAll(
            "img, .graph-wrapper, .template-wrapper, .math-wrapper, .canvas-wrapper"
          ).length === 0;

        if (
          isEffectivelyEmpty &&
          blockElement.parentElement === target.container
        ) {
          blockElement.parentElement.replaceChild(wrapper, blockElement);
        } else {
          target.range.insertNode(wrapper);
        }
      } else {
        target.container.appendChild(wrapper);
      }

      ensureCursorFriendlyBlocks(wrapper, selection);
      
      observerRef.current?.observe(wrapper);

      setTimeout(() => {
        const page = wrapper.closest('.page') as HTMLElement;
        saveToHistory(true, page ? [page] : undefined);
        scheduleReflow();
      }, 100);
    },
    [
      saveToHistory,
      findInsertionTarget,
      addNewPage,
      scheduleReflow,
    ]
  );

  const insertGraph = useCallback(
    (graphData: GraphData) => {
      let target = findInsertionTarget();
      if (!target) {
        addNewPage();
        target = findInsertionTarget();
        if (!target) return;
      }
      const page = (target.container.closest('.page') as HTMLElement);
      saveToHistory(true, page ? [page] : undefined);

      const wrapper = document.createElement("div");
      wrapper.className = "graph-wrapper";
      wrapper.contentEditable = "false";
      wrapper.dataset.graph = JSON.stringify(graphData);
      wrapper.style.margin = "1em auto";
      wrapper.style.width = `${graphData.width}px`;
      
      const selection = window.getSelection();
      if (target.range) {
        let node = target.range.commonAncestorContainer;
        let blockElement = (
          node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
        ) as HTMLElement;
        while (
          blockElement &&
          blockElement.parentElement &&
          blockElement.parentElement !== target.container
        ) {
          blockElement = blockElement.parentElement;
        }
        const isEffectivelyEmpty =
          blockElement &&
          (blockElement.textContent ?? "").trim() === "" &&
          blockElement.querySelectorAll(
            "img, .graph-wrapper, .template-wrapper, .math-wrapper, .canvas-wrapper"
          ).length === 0;

        if (
          isEffectivelyEmpty &&
          blockElement.parentElement === target.container
        ) {
          blockElement.parentElement.replaceChild(wrapper, blockElement);
        } else {
          target.range.insertNode(wrapper);
        }
      } else {
        target.container.appendChild(wrapper);
      }

      ensureCursorFriendlyBlocks(wrapper, selection);
      
      observerRef.current?.observe(wrapper);

      setTimeout(() => {
        const page = wrapper.closest('.page') as HTMLElement;
        saveToHistory(true, page ? [page] : undefined);
        scheduleReflow();
      }, 100);
    },
    [
      saveToHistory,
      findInsertionTarget,
      addNewPage,
      scheduleReflow,
    ]
  );

  // --- INSERT CANVAS ---
  const insertCanvas = useCallback((initialShape?: string, dropX?: number, dropY?: number) => {
    // Prevent insertion if we are already inside a canvas wrapper (nesting check)
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const element = container.nodeType === Node.ELEMENT_NODE ? container as HTMLElement : container.parentElement;
      if (element?.closest('.canvas-wrapper')) {
        return; // Already inside a canvas
      }
    }

    let target = findInsertionTarget();
    if (!target) { addNewPage(); target = findInsertionTarget(); if (!target) return; }
    
    // Double check target container
    if (target.container.closest('.canvas-wrapper')) return;

    const page = target.container.closest('.page') as HTMLElement;
    saveToHistory(true, page ? [page] : undefined);

    const wrapper = document.createElement("div");
    wrapper.className = "canvas-wrapper";
    wrapper.contentEditable = "false";
    wrapper.dataset.canvas = "{}";
    wrapper.dataset.width = "500";
    wrapper.dataset.height = "300";
    wrapper.style.width = "500px";
    wrapper.style.height = "300px";
    wrapper.style.margin = "1em auto";
    wrapper.style.border = "1px dashed #ccc"; 
    wrapper.style.position = "relative";

    if (target.range) {
      let node = target.range.commonAncestorContainer;
      let blockElement = (
        node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
      ) as HTMLElement;
      while (
        blockElement &&
        blockElement.parentElement &&
        blockElement.parentElement !== target.container
      ) {
        blockElement = blockElement.parentElement;
      }
      const isEffectivelyEmpty =
        blockElement &&
        (blockElement.textContent ?? "").trim() === "" &&
        blockElement.querySelectorAll(
          "img, .graph-wrapper, .template-wrapper, .math-wrapper, .canvas-wrapper"
        ).length === 0;

      if (
        isEffectivelyEmpty &&
        blockElement.parentElement === target.container
      ) {
        blockElement.parentElement.replaceChild(wrapper, blockElement);
      } else {
        target.range.insertNode(wrapper);
      }
    } else {
      target.container.appendChild(wrapper);
    }

    ensureCursorFriendlyBlocks(wrapper, window.getSelection());
    observerRef.current?.observe(wrapper);
    hydrateCanvasBlockSingle(wrapper);

    if (initialShape) {
      setTimeout(() => {
        const event = new CustomEvent('canvas-add-shape', { 
          detail: { shapeType: initialShape, clientX: dropX, clientY: dropY }
        });
        wrapper.dispatchEvent(event);
      }, 150);
    }

    setTimeout(() => {
      saveToHistory(true);
      scheduleReflow();
    }, 200);
  }, [saveToHistory, findInsertionTarget, addNewPage, scheduleReflow, hydrateCanvasBlockSingle]);

  const insertImage = useCallback(
    (imageData: any) => {
      let target = findInsertionTarget();
      if (!target) {
        addNewPage();
        target = findInsertionTarget();
        if (!target) return;
      }
      const page = (target.container.closest('.page') as HTMLElement);
      saveToHistory(true, page ? [page] : undefined);

      const wrapper = document.createElement("div");
      wrapper.className = "image-wrapper";
      wrapper.dataset.float = "none";
      wrapper.style.cssText = `display: block; margin: 12px auto; text-align: center; max-width: 80%; width: ${imageData.width}px; height: ${imageData.height}px;`;
      wrapper.contentEditable = "false";
      const img = document.createElement("img");
      img.src = imageData.src;
      img.alt = imageData.alt || "";
      img.className = "editor-image";
      img.style.width = `${imageData.width}px`;
      img.style.height = `${imageData.height}px`;
      wrapper.appendChild(img);

      const selection = window.getSelection();
      if (target.range) {
        let node = target.range.commonAncestorContainer;
        let blockElement = (
          node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
        ) as HTMLElement;
        while (
          blockElement &&
          blockElement.parentElement &&
          blockElement.parentElement !== target.container
        ) {
          blockElement = blockElement.parentElement;
        }
        const isEffectivelyEmpty =
          blockElement &&
          (blockElement.textContent ?? "").trim() === "" &&
          blockElement.querySelectorAll(
            "img, .graph-wrapper, .template-wrapper, .math-wrapper, .canvas-wrapper"
          ).length === 0;

        if (
          isEffectivelyEmpty &&
          blockElement.parentElement === target.container
        ) {
          blockElement.parentElement.replaceChild(wrapper, blockElement);
        } else {
          target.range.insertNode(wrapper);
        }
      } else {
        target.container.appendChild(wrapper);
      }

      ensureCursorFriendlyBlocks(wrapper, selection);
      setTimeout(() => {
        const page = wrapper.closest('.page') as HTMLElement;
        saveToHistory(true, page ? [page] : undefined);
        scheduleReflow();
      }, 100);
    },
    [saveToHistory, findInsertionTarget, addNewPage, scheduleReflow]
  );

  const insertContent = useCallback(
    async (
      htmlBlocks: string[],
      createNewPages: boolean,
      isInternal: boolean = false,
      setProgressMessage?: (message: string) => void
    ) => {
      if (!editorRef.current) return;
      
      const target = findInsertionTarget();
      const initialPage = target?.container.closest('.page') as HTMLElement;
      saveToHistory(true, initialPage ? [initialPage] : undefined);

      setProgressMessage?.("Sanitizing content...");
      await new Promise(resolve => setTimeout(resolve, 10)); // Yield

      const sanitizeAndStyle = (html: string): string => {
        if (isInternal) {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = html;
          tempDiv
            .querySelectorAll(
              ".image-resize-overlay, .image-toolbar, .graph-resize-overlay, .graph-toolbar, .math-resize-overlay, .math-toolbar, .canvas-resize-overlay, .canvas-toolbar"
            )
            .forEach((uiEl) => uiEl.remove());
          return tempDiv.innerHTML;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(`<body>${html}</body>`, "text/html");
        doc.body
          .querySelectorAll("script, style, meta, title, link, head")
          .forEach((el) => el.remove());

        const allowedTags = new Set([
          "P", "B", "STRONG", "I", "EM", "U", "A", "UL", "OL", "LI", "BR", "H1", "H2", "H3", "H4", "IMG",
        ]);
        const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
        const nodesToProcess = [];
        while (walker.nextNode()) {
          nodesToProcess.push(walker.currentNode as HTMLElement);
        }

        nodesToProcess.forEach((el) => {
          for (const attr of Array.from(el.attributes)) {
            const attrName = attr.name.toLowerCase();
            if (attrName === "style" || attrName.startsWith("data-")) continue;
            if (el.tagName === "A" && attrName === "href") continue;
            if (
              el.tagName === "IMG" &&
              (attrName === "src" || attrName === "alt" || attrName === "width" || attrName === "height")
            )
              continue;
            el.removeAttribute(attr.name);
          }
          if (!allowedTags.has(el.tagName)) {
            el.replaceWith(...el.childNodes);
          }
        });

        doc.body.querySelectorAll("h1, h2, h3, h4, p").forEach((el) => {
          if (!el.textContent?.trim() && !el.querySelector("img, br")) {
            el.remove();
          }
        });

        const newBody = doc.createElement("body");
        const topLevelNodes = Array.from(doc.body.childNodes);
        let currentParagraph: HTMLParagraphElement | null = null;

        topLevelNodes.forEach((node) => {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            ["P", "UL", "OL", "H1", "H2", "H3", "H4", "IMG"].includes(
              (node as HTMLElement).tagName
            )
          ) {
            if (currentParagraph) {
              newBody.appendChild(currentParagraph);
              currentParagraph = null;
            }
            newBody.appendChild(node.cloneNode(true));
          } else if (
            node.nodeType === Node.TEXT_NODE &&
            node.textContent?.trim()
          ) {
            if (!currentParagraph) {
              currentParagraph = doc.createElement("p");
            }
            currentParagraph.appendChild(node.cloneNode(true));
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (!currentParagraph) {
              currentParagraph = doc.createElement("p");
            }
            currentParagraph.appendChild(node.cloneNode(true));
          }
        });

        if (currentParagraph) {
          newBody.appendChild(currentParagraph);
        }

        return newBody.innerHTML;
      };

      const sanitizedHtml = sanitizeAndStyle(htmlBlocks.join(""));
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = sanitizedHtml;

      tempDiv.querySelectorAll("p, h1, h2, h3, h4").forEach((el) => {
        const element = el as HTMLElement;
        element.removeAttribute('style');
        switch (element.tagName) {
          case "P":
            if (!element.style.fontSize) element.style.fontSize = "14pt";
            if (!element.style.lineHeight) element.style.lineHeight = "1.5";
            element.style.marginBottom = "0";
            break;
          case "H1":
            if (!element.style.fontSize) element.style.fontSize = "27pt";
            if (!element.style.lineHeight) element.style.lineHeight = "1.1";
            if (!element.style.marginTop) element.style.marginTop = "1.5rem";
            if (!element.style.marginBottom) element.style.marginBottom = "0.5rem";
            break;
          case "H2":
            if (!element.style.fontSize) element.style.fontSize = "22pt";
            if (!element.style.lineHeight) element.style.lineHeight = "1.2";
            if (!element.style.marginTop) element.style.marginTop = "1.5rem";
            if (!element.style.marginBottom) element.style.marginBottom = "0.5rem";
            break;
          case "H3":
            if (!element.style.fontSize) element.style.fontSize = "18pt";
            if (!element.style.lineHeight) element.style.lineHeight = "1.3";
            if (!element.style.marginTop) element.style.marginTop = "1.5rem";
            if (!element.style.marginBottom) element.style.marginBottom = "0.5rem";
            break;
          case "H4":
            if (!element.style.fontSize) element.style.fontSize = "15pt";
            if (!element.style.lineHeight) element.style.lineHeight = "1.4";
            if (!element.style.marginTop) element.style.marginTop = "1.5rem";
            if (!element.style.marginBottom) element.style.marginBottom = "0.5rem";
            break;
        }
        if (!element.dataset.lineSpacing && element.tagName === "P") {
          element.dataset.lineSpacing = "1.2";
        }
      });
      
      const nodesToProcess = Array.from(tempDiv.childNodes);
      const finalFragment = document.createDocumentFragment();

      nodesToProcess.forEach((node) => {
        if (
          node.nodeType === Node.ELEMENT_NODE &&
          (node as HTMLElement).tagName === "IMG"
        ) {
          const img = node as HTMLImageElement;
          const wrapper = document.createElement("div");
          wrapper.className = "image-wrapper";
          const width = parseInt(img.getAttribute("width") || "300", 10);
          const height = parseInt(img.getAttribute("height") || "200", 10);
          wrapper.style.cssText = `display: block; margin: 12px auto; text-align: center; max-width: 80%; width: ${width}px; height: ${height}px;`;
          wrapper.contentEditable = "false";
          const newImg = img.cloneNode(true) as HTMLImageElement;
          newImg.className = "editor-image";
          newImg.style.width = `${width}px`;
          newImg.style.height = `${height}px`;
          wrapper.appendChild(newImg);
          finalFragment.appendChild(wrapper);
        } else if (
          node.nodeType === Node.ELEMENT_NODE &&
          (node as HTMLElement).tagName === "P"
        ) {
          const p = node as HTMLParagraphElement;
          const imagesInside = Array.from(p.querySelectorAll("img"));
          if (imagesInside.length === 0) {
            finalFragment.appendChild(p.cloneNode(true));
          } else {
            let currentSegment = document.createElement("p");
            Array.from(p.childNodes).forEach((childNode) => {
              if (
                childNode.nodeType === Node.ELEMENT_NODE &&
                (childNode as HTMLElement).tagName === "IMG"
              ) {
                if (currentSegment.hasChildNodes()) {
                  finalFragment.appendChild(currentSegment);
                }
                const img = childNode as HTMLImageElement;
                const wrapper = document.createElement("div");
                wrapper.className = "image-wrapper";
                const width = parseInt(img.getAttribute("width") || "300", 10);
                const height = parseInt(img.getAttribute("height") || "200", 10);
                wrapper.style.cssText = `display: block; margin: 12px auto; text-align: center; max-width: 80%; width: ${width}px; height: ${height}px;`;
                wrapper.contentEditable = "false";
                const newImg = img.cloneNode(true) as HTMLImageElement;
                newImg.className = "editor-image";
                newImg.style.width = `${width}px`;
                newImg.style.height = `${height}px`;
                wrapper.appendChild(newImg);
                finalFragment.appendChild(wrapper);
                currentSegment = document.createElement("p");
              } else {
                currentSegment.appendChild(childNode.cloneNode(true));
              }
            });
            if (currentSegment.hasChildNodes()) {
              finalFragment.appendChild(currentSegment);
            }
          }
        } else {
          finalFragment.appendChild(node.cloneNode(true));
        }
      });

      const fragmentNodes = Array.from(finalFragment.childNodes);
      const lastNodeRef = fragmentNodes.length > 0 ? fragmentNodes[fragmentNodes.length - 1] : null;

      const selection = window.getSelection();
      let insertionPoint: Node | null = null;
      let insertBeforeNode: Node | null = null;

      if (!selection || selection.rangeCount === 0) {
        insertionPoint = editorRef.current.querySelector(".page-content:last-child");
      } else {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        let targetBlock = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement) as HTMLElement;
        while (targetBlock && targetBlock.parentElement && !targetBlock.parentElement.classList.contains("page-content")) {
          targetBlock = targetBlock.parentElement;
        }
        if (targetBlock && targetBlock.parentElement?.classList.contains("page-content")) {
          const isEffectivelyEmpty = (!targetBlock.textContent?.trim() && !targetBlock.querySelector("img, .image-wrapper, .graph-wrapper, .math-wrapper, .template-wrapper, .canvas-wrapper")) || targetBlock.innerHTML.toLowerCase().trim() === "<br>";
          if (isEffectivelyEmpty) {
            insertionPoint = targetBlock.parentElement;
            insertBeforeNode = targetBlock;
          } else {
            insertionPoint = targetBlock.parentElement;
            insertBeforeNode = targetBlock.nextSibling;
          }
        } else {
          range.deleteContents();
          const emptySpan = document.createElement('span');
          range.insertNode(emptySpan);
          insertionPoint = emptySpan.parentElement;
          insertBeforeNode = emptySpan;
        }
      }

      if (!insertionPoint) {
        insertionPoint = editorRef.current.querySelector(".page-content:last-child");
      }

      if (!insertionPoint) {
        console.error("Could not find a valid insertion point for content.");
        setProgressMessage?.("Error: Could not find insertion point.");
        return;
      }

      setProgressMessage?.("Adding new content...");
      await new Promise(resolve => setTimeout(resolve, 10)); // Yield

      const CHUNK_SIZE = 5;
      for (let i = 0; i < fragmentNodes.length; i += CHUNK_SIZE) {
        const chunk = fragmentNodes.slice(i, i + CHUNK_SIZE);
        const chunkFragment = document.createDocumentFragment();
        chunk.forEach(node => chunkFragment.appendChild(node));

        if (insertBeforeNode) {
          insertionPoint.insertBefore(chunkFragment, insertBeforeNode);
        } else {
          insertionPoint.appendChild(chunkFragment);
        }
        
        await new Promise(resolve => setTimeout(resolve, 20)); 
      }
      
      if (insertBeforeNode instanceof Element && insertBeforeNode.tagName === 'SPAN' && insertBeforeNode.innerHTML === '') {
        insertBeforeNode.remove();
      } else if (insertBeforeNode instanceof Element && insertBeforeNode.tagName !== 'SPAN') {
        const prevSibling = insertBeforeNode.previousSibling;
        if (prevSibling instanceof Element) {
          prevSibling.remove();
        }
      }
      
      if (lastNodeRef) {
        const newRange = document.createRange();
        newRange.setStartAfter(lastNodeRef);
        newRange.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(newRange);
      }

      await document.fonts.ready;
      
      if (editorRef.current) {
        setProgressMessage?.("Applying styles...");
        await new Promise(resolve => setTimeout(resolve, 50));
        rehydrateMathBlocks(editorRef.current);
        rehydrateGraphBlocks(editorRef.current);
        rehydrateCanvasBlocks(editorRef.current);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const paginationMessages = [
            "Arranging content onto pages...",
            "Optimizing text flow...",
            "Adjusting page breaks...",
            "Formatting new pages..."
        ];
        let messageIndex = 0;
        setProgressMessage?.(paginationMessages[0]);
        
        const pages = Array.from(editorRef.current.querySelectorAll('.page'));
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i] as HTMLElement;
          reflowPage(page);
          
          if (i > 0 && i % 2 === 0) {
            messageIndex = (messageIndex + 1) % paginationMessages.length;
            setProgressMessage?.(paginationMessages[messageIndex]);
          }
          
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        setProgressMessage?.("Finalizing layout...");
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const firstPage = editorRef.current.querySelector('.page') as HTMLElement | null;
        if (firstPage) {
          reflowBackwardFromPage(firstPage);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      saveToHistory(true, Array.from(editorRef.current.querySelectorAll('.page')) as HTMLElement[]);
    },
    [
      editorRef,
      saveToHistory,
      findInsertionTarget,
      addNewPage,
      reflowPage,
      reflowBackwardFromPage,
      rehydrateGraphBlocks,
      rehydrateMathBlocks,
      rehydrateCanvasBlocks,
    ]
  );

  const insertTemplate = useCallback(
    (templateHtml: string) => {
      if (!editorRef.current) return;
      let target = findInsertionTarget();
      if (!target) {
        addNewPage();
        target = findInsertionTarget();
        if (!target) return;
      }
      const page = target.container.closest('.page') as HTMLElement;
      saveToHistory(true, page ? [page] : undefined);

      const { container: targetContainer, range } = target;
      if (targetContainer && range) {
        const templateWrapper = document.createElement("div");
        templateWrapper.className = "template-wrapper";
        templateWrapper.contentEditable = "false";
        templateWrapper.style.cssText = `position: relative; display: block; width: fit-content; margin: 16px 0; cursor: pointer; border: 2px solid transparent; border-radius: 8px; transition: all 0.2s ease;`;
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = templateHtml;
        tempDiv.querySelectorAll(".template-block").forEach((template) => {
          template.setAttribute("contenteditable", "true");
          template.setAttribute("data-template-inserted", "true");
          (template as HTMLElement).style.outline = "none";
        });
        Array.from(tempDiv.childNodes).forEach((node) => {
          templateWrapper.appendChild(node.cloneNode(true));
        });

        let node = range.commonAncestorContainer;
        let blockElement = (
          node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
        ) as HTMLElement;
        while (
          blockElement &&
          blockElement.parentElement &&
          blockElement.parentElement !== targetContainer
        ) {
          blockElement = blockElement.parentElement;
        }

        if (blockElement && blockElement.parentElement === targetContainer) {
          const isEffectivelyEmpty =
            (blockElement.textContent ?? "").trim() === "" &&
            blockElement.querySelectorAll("img").length === 0;
          if (isEffectivelyEmpty) {
            blockElement.parentElement.replaceChild(
              templateWrapper,
              blockElement
            );
          } else {
            blockElement.insertAdjacentElement("afterend", templateWrapper);
          }
        } else {
          range.deleteContents();
          range.insertNode(templateWrapper);
        }

        const selection = window.getSelection();
        ensureCursorFriendlyBlocks(templateWrapper, selection);
      }
      setTimeout(() => {
        const page = target?.container.closest('.page') as HTMLElement;
        saveToHistory(true, page ? [page] : undefined);
        scheduleReflow();
      }, 100);
    },
    [editorRef, saveToHistory, findInsertionTarget, addNewPage, scheduleReflow]
  );

  useEffect(() => {
    return () => {
      setTimeout(unmountAllReactComponents, 0);
    };
  }, [unmountAllReactComponents]);

  // --- DRAG AND DROP ---
  useEffect(() => {
    const container = editorRef.current;
    if (!container) return;

    const handleDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("application/canvas-shape") || 
          e.dataTransfer?.types.includes("application/gallery-template-item")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }
    };

    const handleDrop = (e: DragEvent) => {
      // Check lock
      if (dropLock.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const shapeType = e.dataTransfer?.getData("application/canvas-shape");
      if (shapeType) {
        e.preventDefault();
        e.stopPropagation();
        
        // Activate lock
        dropLock.current = true;
        setTimeout(() => { dropLock.current = false; }, 100);

        // Check if dropping on existing canvas
        const target = e.target as HTMLElement;
        const existingCanvas = target.closest('.canvas-wrapper');

        if (existingCanvas) {
          const event = new CustomEvent('canvas-add-shape', { 
            detail: { shapeType, clientX: e.clientX, clientY: e.clientY } 
          });
          existingCanvas.dispatchEvent(event);
        } else {
          const range = document.caretRangeFromPoint(e.clientX, e.clientY);
          if (range) {
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            insertCanvas(shapeType, e.clientX, e.clientY);
          }
        }
        return;
      }

      const htmlData = e.dataTransfer?.getData("text/html");
      if (htmlData && e.dataTransfer?.types.includes("application/gallery-template-item")) {
         e.preventDefault();
         e.stopPropagation();
         
         dropLock.current = true;
         setTimeout(() => { dropLock.current = false; }, 100);

         const range = document.caretRangeFromPoint(e.clientX, e.clientY);
         if (range) {
           const selection = window.getSelection();
           selection?.removeAllRanges();
           selection?.addRange(range);
           insertTemplate(htmlData);
         }
      }
    };

    container.addEventListener("dragover", handleDragOver);
    container.addEventListener("drop", handleDrop);
    return () => {
      container.removeEventListener("dragover", handleDragOver);
      container.removeEventListener("drop", handleDrop);
    };
  }, [insertCanvas, insertTemplate]);

  return {
    insertImage,
    insertContent,
    insertTemplate,
    insertMath,
    insertGraph,
    insertCanvas,
    addNewPage,
    undo,
    redo,
    canUndo,
    canRedo,
    saveToHistory,
    rehydrateMathBlocks,
    rehydrateGraphBlocks,
    rehydrateCanvasBlocks,
    rehydratePageNumbers,
    resetHistory,
    scheduleReflow,
    immediateReflow,
    isReflowing,
    reflowPage,
    reflowBackwardFromPage,
    reflowSplitParagraph,
    getContentHeight,
    getAvailableHeight,
    fullDocumentReflow, 
    reflowSplitTable,
    reflowSplitList,

    highlightRects,
    isSelecting,
    isMultiPageSelection,
    selectedPages,
    selectedText,
    clearSelection,
    customSelection,
    forceRecalculateRects,
    startTextSelection,
    
    findAll,
    findNext,
    findPrev,
    replace,
    replaceAll,
    clearFindHighlights,
    findMatchIndex,
    findTotalMatches,
    isSearching,
    matches,
  };
};