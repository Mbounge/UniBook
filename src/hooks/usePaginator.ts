//src/hooks/usePaginator.ts

import { useMemo } from 'react';
import { DocumentBlock, Page, RichTextSpan, TextBlock } from '@/lib/editor-types';

// --- CONSTANTS ---
const PAGE_WIDTH_PX = 816;
const PAGE_HEIGHT_PX = 1056;
const PAGE_PADDING_TOP_PX = 96;
const PAGE_PADDING_BOTTOM_PX = 72;
const PAGE_PADDING_HORIZONTAL_PX = 96;

export const CONTENT_WIDTH_PX = PAGE_WIDTH_PX - (PAGE_PADDING_HORIZONTAL_PX * 2);
export const CONTENT_HEIGHT_PX = PAGE_HEIGHT_PX - PAGE_PADDING_TOP_PX - PAGE_PADDING_BOTTOM_PX;

// --- UTILITY FUNCTIONS (Unchanged) ---
const spansToHtml = (spans: RichTextSpan[]): string => {
    if (!spans || spans.length === 0) return '<br>';
    return spans.map(span => {
        const styles: Omit<RichTextSpan, 'text'> = { ...span };
        delete (styles as any).text;
        const styleProps = Object.entries(styles).map(([key, value]) => {
            if (!value) return '';
            const cssProp = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
            return `${cssProp}: ${value};`;
        }).join(' ');
        const sanitizedText = span.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (styleProps.trim()) {
            return `<span style="${styleProps}">${sanitizedText}</span>`;
        }
        return sanitizedText;
    }).join('');
};

const renderBlockForMeasurement = (block: DocumentBlock, measureNode: HTMLElement): void => {
    measureNode.innerHTML = '';
    measureNode.style.textAlign = (block as TextBlock).textAlign || 'left';
    switch (block.type) {
        case 'h1': case 'h2': case 'h3': case 'h4': case 'paragraph':
            const el = document.createElement(block.type === 'paragraph' ? 'p' : block.type);
            el.innerHTML = spansToHtml(block.spans);
            if (block.lineSpacing) {
                const lineHeightMap = { 'single': '1.2', '1.5': '1.8', 'double': '2.4' };
                el.style.lineHeight = lineHeightMap[block.lineSpacing];
            }
            measureNode.appendChild(el);
            break;
        case 'image': case 'graph':
            const wrapper = document.createElement('div');
            wrapper.style.width = `${block.width}px`;
            wrapper.style.height = `${block.height}px`;
            wrapper.style.float = block.float === 'center' ? 'none' : block.float;
            wrapper.style.margin = block.float === 'center' ? '12px auto' : (block.float === 'left' ? '8px 16px 8px 0' : '8px 0 8px 16px');
            measureNode.appendChild(wrapper);
            break;
    }
};

const findSplitPoint = (block: TextBlock, availableHeight: number, measureNode: HTMLElement): number | null => {
    const originalSpans = block.spans;
    const fullText = originalSpans.map(s => s.text).join('');
    let low = 0;
    let high = fullText.length;
    let bestFitIndex = 0;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        let charCount = 0;
        const tempSpans: RichTextSpan[] = [];
        for (const span of originalSpans) {
            const remaining = mid - charCount;
            if (remaining <= 0) break;
            const newText = span.text.substring(0, remaining);
            tempSpans.push({ ...span, text: newText });
            charCount += span.text.length;
        }
        const tempBlock: TextBlock = { ...block, spans: tempSpans };
        renderBlockForMeasurement(tempBlock, measureNode);
        const currentHeight = measureNode.scrollHeight;
        if (currentHeight <= availableHeight) {
            bestFitIndex = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    if (bestFitIndex === 0 || bestFitIndex === fullText.length) {
        return null;
    }
    return bestFitIndex;
};

export const usePaginator = (document: DocumentBlock[]) => {
    const paginatedDocument: Page[] = useMemo(() => {
        const pages: Page[] = [{ blocks: [] }];
        if (document.length === 0) return pages;

        const measureNode = window.document.getElementById('offscreen-measure-div');
        
        // --- *** THE FIX *** ---
        // If the measureNode isn't in the DOM yet (on the first render),
        // we gracefully return the document as a single, unpaginated page.
        // The hook will re-run correctly on the next render or state change.
        if (!measureNode) {
            return [{ blocks: document }];
        }

        let currentPageIndex = 0;
        let currentHeightOnPage = 0;

        for (const block of document) {
            renderBlockForMeasurement(block, measureNode);
            const blockHeight = measureNode.scrollHeight;

            if (currentHeightOnPage + blockHeight <= CONTENT_HEIGHT_PX) {
                pages[currentPageIndex].blocks.push(block);
                currentHeightOnPage += blockHeight;
            } else {
                const availableHeight = CONTENT_HEIGHT_PX - currentHeightOnPage;
                if (block.type !== 'paragraph' && block.type !== 'h1' && block.type !== 'h2' && block.type !== 'h3' && block.type !== 'h4') {
                    currentPageIndex++;
                    pages[currentPageIndex] = { blocks: [block] };
                    currentHeightOnPage = blockHeight;
                    continue;
                }
                const splitCharIndex = findSplitPoint(block, availableHeight, measureNode);
                if (splitCharIndex) {
                    let charCount = 0;
                    let splitSpanIndex = -1;
                    let splitCharInSpanIndex = -1;
                    for (let i = 0; i < block.spans.length; i++) {
                        const span = block.spans[i];
                        if (charCount + span.text.length >= splitCharIndex) {
                            splitSpanIndex = i;
                            splitCharInSpanIndex = splitCharIndex - charCount;
                            break;
                        }
                        charCount += span.text.length;
                    }
                    const firstPartSpans: RichTextSpan[] = [];
                    const secondPartSpans: RichTextSpan[] = [];
                    block.spans.forEach((span, i) => {
                        if (i < splitSpanIndex) {
                            firstPartSpans.push(span);
                        } else if (i === splitSpanIndex) {
                            const text1 = span.text.substring(0, splitCharInSpanIndex);
                            const text2 = span.text.substring(splitCharInSpanIndex);
                            if (text1) firstPartSpans.push({ ...span, text: text1 });
                            if (text2) secondPartSpans.push({ ...span, text: text2 });
                        } else {
                            secondPartSpans.push(span);
                        }
                    });
                    const firstBlockPart: TextBlock = { ...block, spans: firstPartSpans };
                    const secondBlockPart: TextBlock = { ...block, id: `${block.id}-split-${Date.now()}`, spans: secondPartSpans };
                    if (firstPartSpans.length > 0) {
                        pages[currentPageIndex].blocks.push(firstBlockPart);
                    }
                    currentPageIndex++;
                    renderBlockForMeasurement(secondBlockPart, measureNode);
                    currentHeightOnPage = measureNode.scrollHeight;
                    pages[currentPageIndex] = { blocks: [secondBlockPart] };
                } else {
                    currentPageIndex++;
                    pages[currentPageIndex] = { blocks: [block] };
                    currentHeightOnPage = blockHeight;
                }
            }
        }
        return pages;
    }, [document]);

    return { paginatedDocument };
};