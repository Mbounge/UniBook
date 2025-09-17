// This function saves the current selection's character offset within an element.
export const saveSelection = (containerEl: Node): { start: number; end: number } | null => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const { startContainer, endContainer, startOffset, endOffset } = range;
  
      // Ensure the selection is within the container element
      if (!containerEl.contains(startContainer) || !containerEl.contains(endContainer)) {
        return null;
      }
  
      const preSelectionRange = document.createRange();
      preSelectionRange.selectNodeContents(containerEl);
      preSelectionRange.setEnd(startContainer, startOffset);
      const start = preSelectionRange.toString().length;
  
      return {
        start,
        end: start + range.toString().length,
      };
    }
    return null;
  };
  
  // This function restores a selection based on a saved character offset.
  export const restoreSelection = (containerEl: HTMLElement, savedSel: { start: number; end: number } | null) => {
    if (!savedSel) return;
  
    let charIndex = 0;
    const range = document.createRange();
    range.setStart(containerEl, 0);
    range.collapse(true);
  
    const nodeStack: Node[] = [containerEl];
    let node: Node | undefined;
    let foundStart = false;
    let stop = false;
  
    while (!stop && (node = nodeStack.pop())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const nextCharIndex = charIndex + node.textContent!.length;
        if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
          range.setStart(node, savedSel.start - charIndex);
          foundStart = true;
        }
        if (foundStart && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
          range.setEnd(node, savedSel.end - charIndex);
          stop = true;
        }
        charIndex = nextCharIndex;
      } else {
        let i = node.childNodes.length;
        while (i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }
  
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };