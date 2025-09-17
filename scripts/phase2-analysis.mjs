// This patches the Node.js environment to include browser APIs pdf.js needs.
import './pdfjs-shim.mjs';

import fs from 'fs/promises';
import path from 'path';

// Now, import pdf.js using the correct legacy build path
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
const { getDocument, OPS } = pdfjsLib;

// --- CONFIGURATION ---
const booksDir = path.join(process.cwd(), 'src', 'books');
const outputDir = path.join(process.cwd(), 'src', 'lib');
const analysisOutputFile = path.join(outputDir, 'content-analysis.json');
// ---------------------

/**
 * Analyzes a PDF's layout to extract coordinates of all text and image placeholders.
 * @param {Uint8Array} pdfData The raw Uint8Array of the PDF file.
 * @returns {Promise<Array<object>>} A promise that resolves to the master list of content objects.
 */
async function analyzePdfLayout(pdfData) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';

  const contentElements = [];
  const loadingTask = getDocument(pdfData);
  const doc = await loadingTask.promise;

  console.log(`PDF loaded. Processing ${doc.numPages} pages...`);

  for (let i = 1; i <= doc.numPages; i++) {
    if (i % 10 === 0 || i === 1 || i === doc.numPages) {
        console.log(`  -> Processing page ${i} of ${doc.numPages}`);
    }
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const pageHeight = viewport.height;

    // --- 1. Extract Text Content (No changes here) ---
    const textContent = await page.getTextContent();
    for (const item of textContent.items) {
      const tx = item.transform[4];
      const ty = item.transform[5];
      contentElements.push({
        type: 'text', content: item.str, page: i,
        x: tx, y: pageHeight - ty, width: item.width, height: item.height,
      });
    }

    // --- 2. ROBUST Image Placeholder Extraction via State Tracking ---
    const opList = await page.getOperatorList();
    const matrixStack = [];
    let currentMatrix = [1, 0, 0, 1, 0, 0]; // Identity matrix

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
          // The currentMatrix at this point is what we need for the image
          const [width, , , height, x, y] = currentMatrix;
          contentElements.push({
            type: 'image',
            page: i,
            x: x,
            y: pageHeight - y - height, // Adjust for coordinate system and height
            width: Math.abs(width),
            height: Math.abs(height),
          });
          break;
      }
    }
  }
  return contentElements;
}

async function main() {
  console.log('--- Starting Phase 2: Structured Content Analysis ---');
  try {
    const files = await fs.readdir(booksDir);
    const pdfFile = files.find(file => path.extname(file).toLowerCase() === '.pdf');
    if (!pdfFile) {
      console.log('No PDF files found in src/books. Exiting.');
      return;
    }
    const sourcePdfPath = path.join(booksDir, pdfFile);

    console.log(`Reading PDF file into memory: ${pdfFile}`);
    const pdfBuffer = await fs.readFile(sourcePdfPath);
    const pdfUint8Array = new Uint8Array(pdfBuffer);

    const analysisResult = await analyzePdfLayout(pdfUint8Array);
    
    await fs.writeFile(analysisOutputFile, JSON.stringify(analysisResult, null, 2));

    console.log(`\n✅ Success! Phase 2 complete.`);
    console.log(`   - Found ${analysisResult.filter(e => e.type === 'text').length} text elements.`);
    console.log(`   - Found ${analysisResult.filter(e => e.type === 'image').length} image placeholders.`);
    console.log(`   - Analysis data saved to: ${analysisOutputFile}`);
  } catch (error) {
    console.error('\n❌ An unexpected error occurred during the process:', error);
  }
}

main();