//scripts2/pdfjs-shim.mjs

// This file patches the Node.js global environment to mimic a browser,
// which is necessary for the 'pdfjs-dist' library to work correctly.

import { DOMMatrix } from 'canvas';

// The critical part: pdf.js needs DOMMatrix. The 'canvas' package provides it.
// We add it to the global scope *before* pdf.js is imported, so it can be found.
if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = DOMMatrix;
}