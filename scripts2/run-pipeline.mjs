//scripts2/run-pipeline.mjs

import fs from 'fs/promises';
import path from 'path';
import { runPhase1 } from './phase1-extract-assets.mjs';
import { runPhase2 } from './phase2-analysis.mjs';
import { runPhase3 } from './phase3-reconstruction.mjs';
import { runPhase4 } from './phase4-structuring.mjs';
import { runPhase5 } from './phase5-finalization.mjs';

// --- CONFIGURATION ---
const booksDir = path.join(process.cwd(), 'src', 'books');
const outputDir = path.join(process.cwd(), 'src', 'lib');
const publicDir = path.join(process.cwd(), 'public');
// ---------------------

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('--- 🚀 Starting Full Automation Pipeline ---');
  try {
    await fs.mkdir(outputDir, { recursive: true });

    const manifestPath = path.join(booksDir, 'manifest.json');
    if (!(await fileExists(manifestPath))) {
      console.error('❌ CRITICAL ERROR: manifest.json not found in src/books/. Please create it. Exiting.');
      return;
    }
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const booksToProcess = JSON.parse(manifestContent);

    if (booksToProcess.length === 0) {
      console.log('No books listed in manifest.json. Exiting.');
      return;
    }

    console.log(`Found ${booksToProcess.length} book(s) in the manifest to process.`);

    for (const book of booksToProcess) {
      // --- MODIFIED: Destructure the new "source" field from the manifest object ---
      const { filename: pdfFile, title: bookTitle, year, license, source } = book;
      const bookIdentifier = path.basename(pdfFile, '.pdf');
      
      console.log(`\n\n==================================================`);
      console.log(`--- Processing Book: "${bookTitle}" ---`);
      console.log(`==================================================`);

      const pdfPath = path.join(booksDir, pdfFile);
      const finalOutputFile = path.join(outputDir, `oer-library-${bookIdentifier}.json`);
      const imagesDir = path.join(publicDir, `${bookIdentifier}-images`);
      const coversDir = path.join(publicDir, 'covers');
      const analysisFile = path.join(outputDir, `${bookIdentifier}-analysis.json`);
      const reconstructedFile = path.join(outputDir, `${bookIdentifier}-reconstructed.txt`);
      const logFile = path.join(outputDir, `${bookIdentifier}-structured.log.jsonl`);

      if (await fileExists(finalOutputFile)) {
        console.log(`✅ SKIPPING BOOK: Final output for "${bookTitle}" already exists.`);
        continue;
      }
      
      if (!(await fileExists(pdfPath))) {
        console.warn(`⚠️ SKIPPING BOOK: Could not find PDF file "${pdfFile}" in src/books/.`);
        continue;
      }

      if (!(await fileExists(imagesDir))) {
        await runPhase1(pdfPath, imagesDir, coversDir, bookIdentifier);
      } else {
        console.log('⏭️ Skipping Phase 1: Image directory already exists.');
      }

      if (!(await fileExists(analysisFile))) {
        await runPhase2(pdfPath, analysisFile);
      } else {
        console.log('⏭️ Skipping Phase 2: Analysis file already exists.');
      }

      if (!(await fileExists(reconstructedFile))) {
        await runPhase3(analysisFile, reconstructedFile);
      } else {
        console.log('⏭️ Skipping Phase 3: Reconstructed text file already exists.');
      }

      await runPhase4(reconstructedFile, logFile, bookTitle);
      
      // --- MODIFIED: Pass the new "source" metadata to the finalization phase ---
      await runPhase5(logFile, imagesDir, finalOutputFile, bookTitle, year, license, source);

      console.log(`\n🎉 --- Finished processing "${bookTitle}" ---`);
    }

    console.log('\n\n--- ✅ All books processed. Pipeline complete. ---');

  } catch (error) {
    console.error('\n❌ A critical error occurred in the main pipeline:', error);
  }
}

main();