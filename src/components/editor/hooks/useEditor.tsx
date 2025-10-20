//src/components/editor/hooks/useEditor.tsx

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MathBlock } from '../MathBlock';
import { GraphBlock, GraphData } from '../GraphBlock';
import { useHistory } from './useHistory';
import { useTextReflow } from './useTextReflow';
import { useMultiPageSelection } from './useMultiPageSelection';

// ... (rest of the file is unchanged until the insertContent function) ...
const createNewPage = (): HTMLElement => {
  const newPageDiv = document.createElement('div');
  newPageDiv.className = 'page';
  
  const newPageContent = document.createElement('div');
  newPageContent.className = 'page-content';
  newPageContent.contentEditable = 'true';
  
  newPageDiv.appendChild(newPageContent);
  return newPageDiv;
};

export const useEditor = (editorRef: React.RefObject<HTMLDivElement | null>) => {
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

  const saveToHistory = useCallback((force: boolean = false) => {
    record(force ? 'action' : 'input');
  }, [record]);

  const { 
    scheduleReflow, 
    immediateReflow, 
    isReflowing, 
    reflowPage, 
    reflowBackwardFromPage, 
    reflowSplitParagraph,
    getContentHeight,
    getAvailableHeight 
  } = useTextReflow(editorRef, saveToHistory);

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

  const mountReactComponent = useCallback((component: React.ReactElement, wrapper: HTMLElement) => {
    const root = createRoot(wrapper);
    root.render(component);
    reactRootsRef.current.set(wrapper, root);
  }, []);

  const rehydrateMathBlocks = useCallback((container: HTMLElement) => {
    const mathPlaceholders = container.querySelectorAll('.math-wrapper');
    mathPlaceholders.forEach(el => {
      const wrapper = el as HTMLElement;
      if (reactRootsRef.current.has(wrapper)) return;
      const initialTex = wrapper.dataset.tex || '';
      const initialFontSize = parseFloat(wrapper.dataset.fontSize || '16');
      
      const handleUpdate = (newTex: string) => { 
        wrapper.dataset.tex = newTex; 
        saveToHistory(true);
        scheduleReflow();
      };
      const handleRemove = () => {
        const root = reactRootsRef.current.get(wrapper);
        if (root) { root.unmount(); reactRootsRef.current.delete(wrapper); }
        wrapper.remove();
        saveToHistory(true);
        scheduleReflow();
      };
      mountReactComponent(<MathBlock initialTex={initialTex} fontSize={initialFontSize} onUpdate={handleUpdate} onRemove={handleRemove} />, wrapper);
    });
  }, [mountReactComponent, saveToHistory, scheduleReflow]);

  const rehydrateGraphBlocks = useCallback((container: HTMLElement) => {
    const graphPlaceholders = container.querySelectorAll('.graph-wrapper');
    graphPlaceholders.forEach(el => {
      const wrapper = el as HTMLElement;
      if (reactRootsRef.current.has(wrapper) || !wrapper.dataset.graph) return;
      const initialGraphData = JSON.parse(wrapper.dataset.graph);
      const handleUpdate = (newGraphData: GraphData) => { 
        wrapper.dataset.graph = JSON.stringify(newGraphData); 
        saveToHistory(true);
        scheduleReflow();
      };
      const handleRemove = () => {
        const root = reactRootsRef.current.get(wrapper);
        if (root) { root.unmount(); reactRootsRef.current.delete(wrapper); }
        wrapper.remove();
        saveToHistory(true);
        scheduleReflow();
      };
      mountReactComponent(<GraphBlock initialGraphData={initialGraphData} onUpdate={handleUpdate} onRemove={handleRemove} />, wrapper);
    });
  }, [mountReactComponent, saveToHistory, scheduleReflow]);

  const restoreStateFromHistory = useCallback((state: { html: string; startOffset: number; endOffset: number; } | null) => {
    if (state && editorRef.current) {
      unmountAllReactComponents();
      editorRef.current.innerHTML = state.html;
      rehydrateMathBlocks(editorRef.current);
      rehydrateGraphBlocks(editorRef.current);
      
      const elementToFocus = restoreSelection(editorRef.current, state.startOffset, state.endOffset);

      if (elementToFocus) {
        setTimeout(() => {
          elementToFocus.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }, 50);
      }
    }
  }, [editorRef, unmountAllReactComponents, rehydrateMathBlocks, rehydrateGraphBlocks, restoreSelection]);

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
      if (['Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        forceCommit();
      }
    };
    const handleMouseUp = () => {
      forceCommit();
    };
    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('mouseup', handleMouseUp);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('mouseup', handleMouseUp);
    };
  }, [editorRef, forceCommit]);

  const findInsertionTarget = useCallback((): { container: HTMLElement, range?: Range } | null => {
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
          if (!wrapperElement && (element.classList.contains('image-wrapper') || element.classList.contains('template-wrapper') || element.classList.contains('math-wrapper') || element.classList.contains('graph-wrapper'))) {
            wrapperElement = element;
          }
          if (element.classList.contains('page-content')) {
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
    const pages = Array.from(editorRef.current.querySelectorAll('.page-content')) as HTMLElement[];
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

  const addNewChapter = useCallback(() => {
    if (!editorRef.current) return;
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
    editorRef.current.appendChild(newPageDiv);
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
  }, [editorRef, saveToHistory, scheduleReflow]);

  const ensureCursorFriendlyBlocks = (wrapper: HTMLElement, selection: Selection | null) => {
    const isSpecialWrapper = (el: Element | null): boolean => {
      if (!el) return false;
      return ['image-wrapper', 'template-wrapper', 'graph-wrapper', 'math-wrapper'].some(cls => el.classList.contains(cls));
    };

    const prevEl = wrapper.previousElementSibling;
    if (!prevEl || isSpecialWrapper(prevEl)) {
      const newPara = document.createElement('p');
      newPara.innerHTML = '<br>';
      wrapper.insertAdjacentElement('beforebegin', newPara);
    }

    const nextEl = wrapper.nextElementSibling;
    let cursorTargetPara: HTMLElement;
    if (!nextEl || isSpecialWrapper(nextEl)) {
      const newPara = document.createElement('p');
      newPara.innerHTML = '<br>';
      wrapper.insertAdjacentElement('afterend', newPara);
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

  const insertMath = useCallback((isInline?: boolean) => {
    saveToHistory(true);
    let target = findInsertionTarget();
    if (!target) { addNewChapter(); target = findInsertionTarget(); if (!target) return; }
    
    const wrapper = document.createElement('div');
    wrapper.className = 'math-wrapper';
    wrapper.contentEditable = 'false';
    wrapper.dataset.tex = '';
    wrapper.dataset.fontSize = '16';
    wrapper.style.margin = '1em 0';

    const handleUpdate = (newTex: string) => { 
      wrapper.dataset.tex = newTex; 
      saveToHistory(true);
      scheduleReflow();
    };
    const handleRemove = () => {
      const root = reactRootsRef.current.get(wrapper);
      if (root) { root.unmount(); reactRootsRef.current.delete(wrapper); }
      wrapper.remove();
      saveToHistory(true);
      scheduleReflow();
    };
    
    mountReactComponent(<MathBlock initialTex="" fontSize={16} onUpdate={handleUpdate} onRemove={handleRemove} />, wrapper);
    
    const selection = window.getSelection();
    if (target.range) {
      let node = target.range.commonAncestorContainer;
      let blockElement = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement) as HTMLElement;
      while (blockElement && blockElement.parentElement && blockElement.parentElement !== target.container) {
        blockElement = blockElement.parentElement;
      }
      const isEffectivelyEmpty = blockElement && (blockElement.textContent ?? '').trim() === '' && blockElement.querySelectorAll('img, .graph-wrapper, .template-wrapper, .math-wrapper').length === 0;

      if (isEffectivelyEmpty && blockElement.parentElement === target.container) {
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
  }, [saveToHistory, findInsertionTarget, addNewChapter, mountReactComponent, scheduleReflow]);

  const insertGraph = useCallback((graphData: GraphData) => {
    saveToHistory(true);
    let target = findInsertionTarget();
    if (!target) { addNewChapter(); target = findInsertionTarget(); if (!target) return; }
    const wrapper = document.createElement('div');
    wrapper.className = 'graph-wrapper';
    wrapper.contentEditable = 'false';
    wrapper.dataset.graph = JSON.stringify(graphData);
    wrapper.style.margin = '1em auto';
    wrapper.style.width = `${graphData.width}px`;
    const handleUpdate = (newGraphData: GraphData) => { 
      wrapper.dataset.graph = JSON.stringify(newGraphData); 
      saveToHistory(true);
      scheduleReflow();
    };
    const handleRemove = () => {
      const root = reactRootsRef.current.get(wrapper);
      if (root) { root.unmount(); reactRootsRef.current.delete(wrapper); }
      wrapper.remove();
      saveToHistory(true);
      scheduleReflow();
    };
    mountReactComponent(<GraphBlock initialGraphData={graphData} onUpdate={handleUpdate} onRemove={handleRemove} />, wrapper);
    
    const selection = window.getSelection();
    if (target.range) {
      let node = target.range.commonAncestorContainer;
      let blockElement = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement) as HTMLElement;
      while (blockElement && blockElement.parentElement && blockElement.parentElement !== target.container) {
        blockElement = blockElement.parentElement;
      }
      const isEffectivelyEmpty = blockElement && (blockElement.textContent ?? '').trim() === '' && blockElement.querySelectorAll('img, .graph-wrapper, .template-wrapper, .math-wrapper').length === 0;

      if (isEffectivelyEmpty && blockElement.parentElement === target.container) {
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
  }, [saveToHistory, findInsertionTarget, addNewChapter, mountReactComponent, scheduleReflow]);

  const insertImage = useCallback((imageData: any) => {
    saveToHistory(true);
    let target = findInsertionTarget();
    if (!target) { addNewChapter(); target = findInsertionTarget(); if (!target) return; }
    const wrapper = document.createElement('div');
    wrapper.className = 'image-wrapper';
    wrapper.dataset.float = 'none';
    wrapper.style.cssText = `display: block; margin: 12px auto; text-align: center; max-width: 80%; width: ${imageData.width}px; height: ${imageData.height}px;`;
    wrapper.contentEditable = 'false';
    const img = document.createElement('img');
    img.src = imageData.src;
    img.alt = imageData.alt || '';
    img.className = 'editor-image';
    img.style.width = `${imageData.width}px`;
    img.style.height = `${imageData.height}px`;
    wrapper.appendChild(img);
    
    const selection = window.getSelection();
    if (target.range) {
      let node = target.range.commonAncestorContainer;
      let blockElement = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement) as HTMLElement;
      while (blockElement && blockElement.parentElement && blockElement.parentElement !== target.container) {
        blockElement = blockElement.parentElement;
      }
      const isEffectivelyEmpty = blockElement && (blockElement.textContent ?? '').trim() === '' && blockElement.querySelectorAll('img, .graph-wrapper, .template-wrapper, .math-wrapper').length === 0;

      if (isEffectivelyEmpty && blockElement.parentElement === target.container) {
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
  }, [saveToHistory, findInsertionTarget, addNewChapter, scheduleReflow]);

  const insertContent = useCallback((htmlBlocks: string[], createChapters: boolean, isInternal: boolean = false) => {
    if (!editorRef.current) return;
    saveToHistory(true);

    const sanitizeAndStyle = (html: string): string => {
      if (isInternal) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        tempDiv.querySelectorAll('.image-resize-overlay, .image-toolbar, .graph-resize-overlay, .graph-toolbar, .math-resize-overlay, .math-toolbar').forEach(uiEl => uiEl.remove());
        return tempDiv.innerHTML;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');

      doc.body.querySelectorAll('script, style, meta, title, link, head').forEach(el => el.remove());

      const allowedTags = new Set(['P', 'B', 'STRONG', 'I', 'EM', 'U', 'A', 'UL', 'OL', 'LI', 'BR', 'H1', 'H2', 'H3', 'H4', 'IMG']);
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
      const nodesToProcess = [];
      while(walker.nextNode()) {
        nodesToProcess.push(walker.currentNode as HTMLElement);
      }

      nodesToProcess.forEach(el => {
        for (const attr of Array.from(el.attributes)) {
          const attrName = attr.name.toLowerCase();
          if (el.tagName === 'A' && attrName === 'href') continue;
          if (el.tagName === 'IMG' && (attrName === 'src' || attrName === 'alt')) continue;
          el.removeAttribute(attr.name);
        }
        
        if (!allowedTags.has(el.tagName)) {
          el.replaceWith(...el.childNodes);
        }
      });

      const newBody = doc.createElement('body');
      const topLevelNodes = Array.from(doc.body.childNodes);
      let currentParagraph: HTMLParagraphElement | null = null;

      topLevelNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE && ['P', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4'].includes((node as HTMLElement).tagName)) {
          if (currentParagraph) {
            newBody.appendChild(currentParagraph);
            currentParagraph = null;
          }
          newBody.appendChild(node.cloneNode(true));
        } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
          if (!currentParagraph) {
            currentParagraph = doc.createElement('p');
          }
          currentParagraph.appendChild(node.cloneNode(true));
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (!currentParagraph) {
            currentParagraph = doc.createElement('p');
          }
          currentParagraph.appendChild(node.cloneNode(true));
        }
      });

      if (currentParagraph) {
        newBody.appendChild(currentParagraph);
      }

      return newBody.innerHTML;
    };

    const sanitizedHtml = sanitizeAndStyle(htmlBlocks.join(''));
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      let target = findInsertionTarget();
      if (!target) { addNewChapter(); target = findInsertionTarget(); if (!target) return; }
      if (target.range) {
        selection?.removeAllRanges();
        selection?.addRange(target.range);
      } else {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        target.container.appendChild(p);
        const newRange = document.createRange();
        newRange.setStart(p, 0);
        selection?.removeAllRanges();
        selection?.addRange(newRange);
      }
    }
    
    document.execCommand('insertHTML', false, sanitizedHtml);

    if (editorRef.current) {
      rehydrateMathBlocks(editorRef.current);
      rehydrateGraphBlocks(editorRef.current);
      
      // --- FIX: Add null checks and type assertions ---
      const currentSelection = window.getSelection();
      if (currentSelection && currentSelection.anchorNode) {
        const startNode = currentSelection.anchorNode;
        const pageElement = (startNode.nodeType === Node.ELEMENT_NODE 
          ? (startNode as HTMLElement).closest('.page')
          : startNode.parentElement?.closest('.page')) as HTMLElement | null;
        
        if (pageElement) {
          reflowPage(pageElement);
          reflowBackwardFromPage(pageElement);
        } else {
          immediateReflow();
        }
      } else {
        immediateReflow();
      }
    }
    saveToHistory(true);
    
  }, [editorRef, saveToHistory, findInsertionTarget, addNewChapter, immediateReflow, reflowPage, reflowBackwardFromPage, rehydrateGraphBlocks, rehydrateMathBlocks]);

  // ... (rest of useEditor hook remains the same) ...
  const insertTemplate = useCallback((templateHtml: string) => {
    if (!editorRef.current) return;
    saveToHistory(true);
    let target = findInsertionTarget();
    if (!target) { addNewChapter(); target = findInsertionTarget(); if (!target) return; }
    const { container: targetContainer, range } = target;
    if (targetContainer && range) {
      const templateWrapper = document.createElement('div');
      templateWrapper.className = 'template-wrapper';
      templateWrapper.contentEditable = 'false';
      templateWrapper.style.cssText = `position: relative; display: block; width: fit-content; margin: 16px 0; cursor: pointer; border: 2px solid transparent; border-radius: 8px; transition: all 0.2s ease;`;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = templateHtml;
      tempDiv.querySelectorAll('.template-block').forEach(template => {
        template.setAttribute('contenteditable', 'true');
        template.setAttribute('data-template-inserted', 'true');
        (template as HTMLElement).style.outline = 'none';
      });
      Array.from(tempDiv.childNodes).forEach(node => { templateWrapper.appendChild(node.cloneNode(true)); });
      
      let node = range.commonAncestorContainer;
      let blockElement = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement) as HTMLElement;
      while (blockElement && blockElement.parentElement && blockElement.parentElement !== targetContainer) {
        blockElement = blockElement.parentElement;
      }
      
      if (blockElement && blockElement.parentElement === targetContainer) {
        const isEffectivelyEmpty = (blockElement.textContent ?? '').trim() === '' && blockElement.querySelectorAll('img').length === 0;
        if (isEffectivelyEmpty) {
          blockElement.parentElement.replaceChild(templateWrapper, blockElement);
        } else {
          blockElement.insertAdjacentElement('afterend', templateWrapper);
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
  }, [editorRef, saveToHistory, findInsertionTarget, addNewChapter, scheduleReflow]);

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
    addNewChapter,
    setImages: () => {},
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