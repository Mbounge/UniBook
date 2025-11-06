"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { createRoot, Root } from "react-dom/client";
import { MathBlock } from "../MathBlock";
import { GraphBlock, GraphData } from "../GraphBlock";
import { useHistory } from "./useHistory";
import { useTextReflow } from "./useTextReflow";
import { useMultiPageSelection } from "./useMultiPageSelection";

const createNewPage = (): HTMLElement => {
  const newPageDiv = document.createElement("div");
  newPageDiv.className = "page";

  const newPageContent = document.createElement("div");
  newPageContent.className = "page-content";
  newPageContent.contentEditable = "true";

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

  const saveToHistory = useCallback(
    (force: boolean = false) => {
      record(force ? "action" : "input");
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

  const fullDocumentReflow = useCallback(() => {
    if (!editorRef.current) return;
    console.log('[Reflow] Starting Full Document Reflow...');
    let currentPage = editorRef.current.querySelector('.page') as HTMLElement | null;
    let pageIndex = 1;
    while (currentPage) {
      console.log(`[Reflow] Processing Page ${pageIndex}...`);
      reflowPage(currentPage);
      currentPage = currentPage.nextElementSibling as HTMLElement | null;
      pageIndex++;
    }
    // After the forward pass, do a backward pass to consolidate space
    const firstPage = editorRef.current.querySelector('.page') as HTMLElement | null;
    if (firstPage) {
      console.log('[Reflow] Starting Backward Consolidation Pass...');
      reflowBackwardFromPage(firstPage);
    }
    console.log('[Reflow] Full Document Reflow Finished.');
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

  const unmountAllReactComponents = useCallback(() => {
    reactRootsRef.current.forEach((root) => root.unmount());
    reactRootsRef.current.clear();
  }, []);

  const mountReactComponent = useCallback(
    (component: React.ReactElement, wrapper: HTMLElement) => {
      const root = createRoot(wrapper);
      root.render(component);
      reactRootsRef.current.set(wrapper, root);
    },
    []
  );

  const rehydrateMathBlocks = useCallback(
    (container: HTMLElement) => {
      const mathPlaceholders = container.querySelectorAll(".math-wrapper");
      mathPlaceholders.forEach((el) => {
        const wrapper = el as HTMLElement;
        if (reactRootsRef.current.has(wrapper)) return;
        const initialTex = wrapper.dataset.tex || "";
        const initialFontSize = parseFloat(wrapper.dataset.fontSize || "16");

        const handleUpdate = (newTex: string) => {
          wrapper.dataset.tex = newTex;
          saveToHistory(true);
          scheduleReflow();
        };
        const handleRemove = () => {
          const root = reactRootsRef.current.get(wrapper);
          if (root) {
            root.unmount();
            reactRootsRef.current.delete(wrapper);
          }
          wrapper.remove();
          saveToHistory(true);
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
      });
    },
    [mountReactComponent, saveToHistory, scheduleReflow]
  );

  const rehydrateGraphBlocks = useCallback(
    (container: HTMLElement) => {
      const graphPlaceholders = container.querySelectorAll(".graph-wrapper");
      graphPlaceholders.forEach((el) => {
        const wrapper = el as HTMLElement;
        if (reactRootsRef.current.has(wrapper) || !wrapper.dataset.graph)
          return;
        const initialGraphData = JSON.parse(wrapper.dataset.graph);
        const handleUpdate = (newGraphData: GraphData) => {
          wrapper.dataset.graph = JSON.stringify(newGraphData);
          saveToHistory(true);
          scheduleReflow();
        };
        const handleRemove = () => {
          const root = reactRootsRef.current.get(wrapper);
          if (root) {
            root.unmount();
            reactRootsRef.current.delete(wrapper);
          }
          wrapper.remove();
          saveToHistory(true);
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
      });
    },
    [mountReactComponent, saveToHistory, scheduleReflow]
  );

  const restoreStateFromHistory = useCallback(
    (
      state: { html: string; startOffset: number; endOffset: number } | null
    ) => {
      if (state && editorRef.current) {
        unmountAllReactComponents();
        editorRef.current.innerHTML = state.html;
        rehydrateMathBlocks(editorRef.current);
        rehydrateGraphBlocks(editorRef.current);

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
      }
    },
    [
      editorRef,
      unmountAllReactComponents,
      rehydrateMathBlocks,
      rehydrateGraphBlocks,
      restoreSelection,
    ]
  );

  const undo = useCallback(() => {
    const prevState = historyUndo();
    restoreStateFromHistory(prevState);
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
      if (
        ["Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.key
        )
      ) {
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
              element.classList.contains("template-wrapper") ||
              element.classList.contains("math-wrapper") ||
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
    saveToHistory(true);

    const allPages = editorRef.current.querySelectorAll(".page");
    const lastPageBeforeAdding =
      allPages.length > 0
        ? (allPages[allPages.length - 1] as HTMLElement)
        : null;

    // --- STEP 1: PAD THE LAST PAGE ---
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

    const newPageDiv = document.createElement("div");
    newPageDiv.className = "page";
    const newPageContent = document.createElement("div");
    newPageContent.className = "page-content";
    newPageContent.contentEditable = "true";
    newPageContent.dataset.placeholder = "Start typing on your new page...";
    newPageDiv.appendChild(newPageContent);
    editorRef.current.appendChild(newPageDiv);

    if (lastPageBeforeAdding) {
      reflowPage(lastPageBeforeAdding);
    }

    newPageContent.innerHTML = ''; // Wipe all temporary content
    const finalParagraph = document.createElement("p");
    finalParagraph.innerHTML = "<br>";
    newPageContent.appendChild(finalParagraph);

    // --- STEP 5: SET CURSOR ---
    newPageDiv.scrollIntoView({ behavior: "smooth", block: "start" });
    const range = document.createRange();
    const selection = window.getSelection();
    range.setStart(finalParagraph, 0);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);

    setTimeout(() => {
      saveToHistory(true);
    }, 100);
  }, [editorRef, saveToHistory, reflowPage, getContentHeight, getAvailableHeight]);


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
      saveToHistory(true);
      let target = findInsertionTarget();
      if (!target) {
        addNewPage();
        target = findInsertionTarget();
        if (!target) return;
      }

      const wrapper = document.createElement("div");
      wrapper.className = "math-wrapper";
      wrapper.contentEditable = "false";
      wrapper.dataset.tex = "";
      wrapper.dataset.fontSize = "16";
      wrapper.style.margin = "1em 0";

      const handleUpdate = (newTex: string) => {
        wrapper.dataset.tex = newTex;
        saveToHistory(true);
        scheduleReflow();
      };
      const handleRemove = () => {
        const root = reactRootsRef.current.get(wrapper);
        if (root) {
          root.unmount();
          reactRootsRef.current.delete(wrapper);
        }
        wrapper.remove();
        saveToHistory(true);
        scheduleReflow();
      };

      mountReactComponent(
        <MathBlock
          initialTex=""
          fontSize={16}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
        />,
        wrapper
      );

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
            "img, .graph-wrapper, .template-wrapper, .math-wrapper"
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
        saveToHistory(true);
        scheduleReflow();
      }, 100);
    },
    [
      saveToHistory,
      findInsertionTarget,
      addNewPage,
      mountReactComponent,
      scheduleReflow,
    ]
  );

  const insertGraph = useCallback(
    (graphData: GraphData) => {
      saveToHistory(true);
      let target = findInsertionTarget();
      if (!target) {
        addNewPage();
        target = findInsertionTarget();
        if (!target) return;
      }
      const wrapper = document.createElement("div");
      wrapper.className = "graph-wrapper";
      wrapper.contentEditable = "false";
      wrapper.dataset.graph = JSON.stringify(graphData);
      wrapper.style.margin = "1em auto";
      wrapper.style.width = `${graphData.width}px`;
      const handleUpdate = (newGraphData: GraphData) => {
        wrapper.dataset.graph = JSON.stringify(newGraphData);
        saveToHistory(true);
        scheduleReflow();
      };
      const handleRemove = () => {
        const root = reactRootsRef.current.get(wrapper);
        if (root) {
          root.unmount();
          reactRootsRef.current.delete(wrapper);
        }
        wrapper.remove();
        saveToHistory(true);
        scheduleReflow();
      };
      mountReactComponent(
        <GraphBlock
          initialGraphData={graphData}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
        />,
        wrapper
      );

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
            "img, .graph-wrapper, .template-wrapper, .math-wrapper"
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
        saveToHistory(true);
        scheduleReflow();
      }, 100);
    },
    [
      saveToHistory,
      findInsertionTarget,
      addNewPage,
      mountReactComponent,
      scheduleReflow,
    ]
  );

  const insertImage = useCallback(
    (imageData: any) => {
      saveToHistory(true);
      let target = findInsertionTarget();
      if (!target) {
        addNewPage();
        target = findInsertionTarget();
        if (!target) return;
      }
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
            "img, .graph-wrapper, .template-wrapper, .math-wrapper"
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
        saveToHistory(true);
        scheduleReflow();
      }, 100);
    },
    [saveToHistory, findInsertionTarget, addNewPage, scheduleReflow]
  );

  const insertContent = useCallback(
    (
      htmlBlocks: string[],
      createNewPages: boolean,
      isInternal: boolean = false
    ) => {
      if (!editorRef.current) return;
      saveToHistory(true);

      const sanitizeAndStyle = (html: string): string => {
        if (isInternal) {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = html;
          tempDiv
            .querySelectorAll(
              ".image-resize-overlay, .image-toolbar, .graph-resize-overlay, .graph-toolbar, .math-resize-overlay, .math-toolbar"
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

      const fragment = finalFragment;
      const lastNodeRef = fragment.lastChild;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        const lastPage = editorRef.current.querySelector(
          ".page-content:last-child"
        );
        lastPage?.appendChild(fragment);
      } else {
        const range = selection.getRangeAt(0);
        let node = range.startContainer;
        let targetBlock = (
          node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement
        ) as HTMLElement;
        while (
          targetBlock &&
          targetBlock.parentElement &&
          !targetBlock.parentElement.classList.contains("page-content")
        ) {
          targetBlock = targetBlock.parentElement;
        }
        if (
          targetBlock &&
          targetBlock.parentElement?.classList.contains("page-content")
        ) {
          const isEffectivelyEmpty =
            (!targetBlock.textContent?.trim() &&
              !targetBlock.querySelector(
                "img, .image-wrapper, .graph-wrapper, .math-wrapper, .template-wrapper"
              )) ||
            targetBlock.innerHTML.toLowerCase().trim() === "<br>";
          if (isEffectivelyEmpty) {
            targetBlock.replaceWith(fragment);
          } else {
            targetBlock.after(fragment);
          }
        } else {
          range.deleteContents();
          range.insertNode(fragment);
        }
      }
      if (lastNodeRef) {
        const newRange = document.createRange();
        newRange.setStartAfter(lastNodeRef);
        newRange.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(newRange);
      }
      
      setTimeout(async () => {
        await document.fonts.ready;
        if (editorRef.current) {
          rehydrateMathBlocks(editorRef.current);
          rehydrateGraphBlocks(editorRef.current);
          
          
          fullDocumentReflow();
        }
        saveToHistory(true);
      }, 100); 
    },
    [
      editorRef,
      saveToHistory,
      findInsertionTarget,
      addNewPage,
      fullDocumentReflow,
      rehydrateGraphBlocks,
      rehydrateMathBlocks,
    ]
  );

  const insertTemplate = useCallback(
    (templateHtml: string) => {
      if (!editorRef.current) return;
      saveToHistory(true);
      let target = findInsertionTarget();
      if (!target) {
        addNewPage();
        target = findInsertionTarget();
        if (!target) return;
      }
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
        saveToHistory(true);
        scheduleReflow();
      }, 100);
    },
    [editorRef, saveToHistory, findInsertionTarget, addNewPage, scheduleReflow]
  );

  useEffect(() => {
    return () => {
      unmountAllReactComponents();
    };
  }, [unmountAllReactComponents]);

  return {
    insertImage,
    insertContent,
    insertTemplate,
    insertMath,
    insertGraph,
    addNewPage,
    undo,
    redo,
    canUndo,
    canRedo,
    saveToHistory,
    rehydrateMathBlocks,
    rehydrateGraphBlocks,
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
    reflowSplitTable, // Add this
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
  };
};