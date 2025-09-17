//scripts2/phase2-analysis.mjs

import './pdfjs-shim.mjs';
import fs from 'fs/promises';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
const { getDocument, OPS } = pdfjsLib;

export async function runPhase2(pdfPath, analysisOutputFile) {
  console.log('\n--- Starting Phase 2: Structured Content Analysis ---');
  const pdfBuffer = await fs.readFile(pdfPath);
  const pdfUint8Array = new Uint8Array(pdfBuffer);
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';
  const contentElements = [];
  const loadingTask = getDocument(pdfUint8Array);
  const doc = await loadingTask.promise;

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const pageHeight = viewport.height;

    const textContent = await page.getTextContent();
    for (const item of textContent.items) {
      const tx = item.transform[4];
      const ty = item.transform[5];
      contentElements.push({
        type: 'text', content: item.str, page: i,
        x: tx, y: pageHeight - ty, width: item.width, height: item.height,
      });
    }

    const opList = await page.getOperatorList();
    const matrixStack = [];
    let currentMatrix = [1, 0, 0, 1, 0, 0];

    for (let j = 0; j < opList.fnArray.length; j++) {
      const fn = opList.fnArray[j];
      const args = opList.argsArray[j];
      switch (fn) {
        case OPS.save:
          matrixStack.push(currentMatrix);
          break;
        case OPS.restore:
          currentMatrix = matrixStack.pop() || [1, 0, 0, 1, 0, 0];
          break;
        case OPS.transform:
          currentMatrix = args;
          break;
        case OPS.paintImageXObject:
          const [width, , , height, x, y] = currentMatrix;
          if (Math.abs(width) < 50 || Math.abs(height) < 50) {
            continue;
          }
          contentElements.push({
            type: 'image', page: i, x: x, y: pageHeight - y - height,
            width: Math.abs(width), height: Math.abs(height),
          });
          break;
      }
    }
  }

  await fs.writeFile(analysisOutputFile, JSON.stringify(contentElements, null, 2));
  const imageCount = contentElements.filter(e => e.type === 'image').length;
  console.log(`✅ Phase 2 Complete: Found ${imageCount} image placeholders.`);
}