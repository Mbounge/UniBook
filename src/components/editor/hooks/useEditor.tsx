//src/components/editor/hooks/useEditor.tsx

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MathBlock } from '../MathBlock';
import { GraphBlock, GraphData } from '../GraphBlock';
import { useHistory } from './useHistory';
import { useTextReflow } from './useTextReflow';
import { useMultiPageSelection } from './useMultiPageSelection';

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
      const isInline = wrapper.dataset.inline === 'true';
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
      mountReactComponent(<MathBlock initialTex={initialTex} isInline={isInline} onUpdate={handleUpdate} onRemove={handleRemove} />, wrapper);
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

  // --- MODIFICATION: This function now handles the scrolling ---
  const restoreStateFromHistory = useCallback((state: { html: string; startOffset: number; endOffset: number; } | null) => {
    if (state && editorRef.current) {
      unmountAllReactComponents();
      editorRef.current.innerHTML = state.html;
      rehydrateMathBlocks(editorRef.current);
      rehydrateGraphBlocks(editorRef.current);
      
      // `restoreSelection` now returns the element that should be scrolled to.
      const elementToFocus = restoreSelection(editorRef.current, state.startOffset, state.endOffset);

      // If we got an element back, scroll to it after a short delay.
      if (elementToFocus) {
        setTimeout(() => {
          elementToFocus.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }, 50); // 50ms is a more reliable delay than 0 to ensure rendering is complete.
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

  const insertMath = useCallback((isInline = false) => {
    saveToHistory(true);
    let target = findInsertionTarget();
    if (!target) { addNewChapter(); target = findInsertionTarget(); if (!target) return; }
    const wrapper = document.createElement('span');
    wrapper.className = 'math-wrapper';
    wrapper.contentEditable = 'false';
    wrapper.dataset.tex = '';
    wrapper.dataset.inline = String(isInline);
    wrapper.style.display = isInline ? 'inline-block' : 'block';
    if (!isInline) wrapper.style.margin = '1em 0';
    const handleUpdate = (newTex: string) => { 
      wrapper.dataset.tex = newTex; 
      saveToHistory(true);
      scheduleReflow();
    };
    const handleRemove = () => {
      const root = reactRootsRef.current.get(wrapper);
      if (root) { root.unmount(); reactRootsRef.current.delete(wrapper); }
      const nextNode = wrapper.nextSibling;
      if (nextNode && nextNode.nodeType === Node.TEXT_NODE && nextNode.textContent === '\u200B') { nextNode.remove(); }
      wrapper.remove();
      saveToHistory(true);
      scheduleReflow();
    };
    mountReactComponent(<MathBlock initialTex="" isInline={isInline} onUpdate={handleUpdate} onRemove={handleRemove} />, wrapper);
    const selection = window.getSelection();
    if (target.range) {
      target.range.insertNode(wrapper);
      const zeroWidthSpace = document.createTextNode('\u200B');
      wrapper.after(zeroWidthSpace);
      target.range.setStartAfter(zeroWidthSpace);
      target.range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(target.range);
    } else {
      target.container.appendChild(wrapper);
    }
    if (!isInline) {
      const nextEl = wrapper.nextElementSibling;
      if (!nextEl || nextEl.tagName !== 'P') {
        const newPara = document.createElement('p');
        newPara.innerHTML = '<br>';
        wrapper.insertAdjacentElement('afterend', newPara);
        const newRange = document.createRange();
        newRange.setStart(newPara, 0);
        newRange.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(newRange);
      }
    }
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

  const insertContent = useCallback((htmlBlocks: string[], createChapters: boolean) => {
    if (!editorRef.current) return;
    saveToHistory(true);

    const sanitizeAndStyle = (html: string): DocumentFragment => {
      const fragment = document.createDocumentFragment();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      tempDiv.querySelectorAll('script, style, link').forEach(el => el.remove());
      tempDiv.querySelectorAll('*').forEach(el => { el.removeAttribute('onclick'); el.removeAttribute('onload'); el.removeAttribute('onerror'); el.removeAttribute('id'); });
      tempDiv.querySelectorAll('img').forEach(img => {
        if (img.parentElement?.classList.contains('image-wrapper')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'image-wrapper';
        wrapper.dataset.float = 'none';
        wrapper.contentEditable = 'false';
        wrapper.style.cssText = 'display: block; margin: 12px auto; text-align: center; max-width: 80%; width: fit-content;';
        img.className = 'editor-image';
        img.style.cssText = 'max-width: 100%; height: auto;';
        img.parentNode?.insertBefore(wrapper, img);
        wrapper.appendChild(img);
      });
      tempDiv.querySelectorAll('.template-block').forEach(template => { template.setAttribute('contenteditable', 'true'); template.setAttribute('data-template-inserted', 'true'); });
      Array.from(tempDiv.childNodes).forEach(node => fragment.appendChild(node.cloneNode(true)));
      return fragment;
    };

    if (createChapters) {
      htmlBlocks.forEach(block => {
        const newPageDiv = createNewPage();
        const newPageContent = newPageDiv.querySelector('.page-content') as HTMLElement;
        const contentFragment = sanitizeAndStyle(block);
        newPageContent.appendChild(contentFragment);
        editorRef.current?.appendChild(newPageDiv);
      });
      const lastPage = editorRef.current.querySelector('.page:last-child');
      lastPage?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => immediateReflow(), 100);

    } else {
      let target = findInsertionTarget();
      if (!target) { addNewChapter(); target = findInsertionTarget(); if (!target) return; }
      
      let { container: currentTargetPageContent, range } = target;
      if (!currentTargetPageContent) return;

      if (range && !range.collapsed) {
        range.deleteContents();
      }

      const combinedHtml = htmlBlocks.join('<br>');
      const contentFragment = sanitizeAndStyle(combinedHtml);
      const contentChunks = Array.from(contentFragment.childNodes);
      const availableHeight = getAvailableHeight();

      for (const chunk of contentChunks) {
        if (range) {
          range.insertNode(chunk);
          range.setStartAfter(chunk);
          range.collapse(true);
        } else {
          currentTargetPageContent.appendChild(chunk);
        }

        const currentHeight = getContentHeight(currentTargetPageContent);
        if (currentHeight > availableHeight) {
          const currentPageElement = currentTargetPageContent.closest('.page') as HTMLElement;
          
          reflowPage(currentPageElement);

          const nextPageElement = currentPageElement.nextElementSibling as HTMLElement;
          if (nextPageElement && nextPageElement.classList.contains('page')) {
            currentTargetPageContent = nextPageElement.querySelector('.page-content') as HTMLElement;
            range = document.createRange();
            range.selectNodeContents(currentTargetPageContent);
            range.collapse(false);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
        }
      }
    }

    saveToHistory(true);
    
  }, [editorRef, saveToHistory, findInsertionTarget, addNewChapter, immediateReflow, getContentHeight, getAvailableHeight, reflowPage]);

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
  };
};