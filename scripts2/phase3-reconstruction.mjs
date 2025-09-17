//scripts2/phase3-reconstruction.mjs

import fs from 'fs/promises';

const PARAGRAPH_Y_THRESHOLD = 10;

export async function runPhase3(analysisInputFile, reconstructionOutputFile) {
  console.log('\n--- Starting Phase 3: Linear Content Reconstruction ---');
  const analysisData = JSON.parse(await fs.readFile(analysisInputFile, 'utf-8'));
  
  analysisData.sort((a, b) => {
    if (a.page !== b.page) { return a.page - b.page; }
    if (Math.abs(a.y - b.y) > 5) { return a.y - b.y; }
    return a.x - b.x;
  });

  let reconstructedText = '';
  let imageCounter = 0;
  let lastElement = null;

  for (const element of analysisData) {
    if (lastElement) {
      if (element.page > lastElement.page) {
        reconstructedText += `\n\n--- PAGE ${element.page} ---\n\n`;
      } else {
        const yDifference = element.y - (lastElement.y + lastElement.height);
        if (yDifference > PARAGRAPH_Y_THRESHOLD) {
          reconstructedText += '\n\n';
        }
      }
    }
    if (element.type === 'text') {
      // --- THE CRITICAL FIX ---
      // If the last character isn't a newline or a space, add a space.
      // This prevents words from mashing together.
      if (reconstructedText.length > 0 && !reconstructedText.endsWith('\n') && !reconstructedText.endsWith(' ')) {
        reconstructedText += ' ';
      }
      reconstructedText += element.content;
    } else if (element.type === 'image') {
      imageCounter++;
      reconstructedText += `\n\n[IMAGE_PLACEHOLDER_${imageCounter}]\n\n`;
    }
    lastElement = element;
  }

  await fs.writeFile(reconstructionOutputFile, reconstructedText);
  console.log(`✅ Phase 3 Complete: Inserted ${imageCounter} image placeholders.`);
}