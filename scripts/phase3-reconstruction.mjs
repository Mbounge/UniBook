import fs from 'fs/promises';
import path from 'path';

// --- CONFIGURATION ---
const outputDir = path.join(process.cwd(), 'src', 'lib');
const analysisInputFile = path.join(outputDir, 'content-analysis.json');
const reconstructionOutputFile = path.join(outputDir, 'reconstructed-text.txt');
// ---------------------

// This threshold determines how big a vertical jump between text elements
// is considered a new paragraph. You may need to tune this value.
const PARAGRAPH_Y_THRESHOLD = 10; // in PDF points

async function main() {
  console.log('--- Starting Phase 3: Linear Content Reconstruction ---');

  try {
    // 1. Load the structured content analysis file from Phase 2
    console.log(`Loading analysis data from: ${analysisInputFile}`);
    const analysisData = JSON.parse(await fs.readFile(analysisInputFile, 'utf-8'));

    if (!analysisData || analysisData.length === 0) {
      console.error('Error: Analysis file is empty. Cannot proceed.');
      return;
    }

    // 2. Sort all content elements into the correct human reading order.
    // This is the most critical step of this phase.
    // NOTE: This simple sort works well for single-column layouts. For complex
    // multi-column documents, a more advanced layout analysis would be needed here.
    analysisData.sort((a, b) => {
      if (a.page !== b.page) {
        return a.page - b.page; // Sort by page number first
      }
      if (Math.abs(a.y - b.y) > 5) { // A small tolerance for y-alignment
        return a.y - b.y; // Then by vertical position (top to bottom)
      }
      return a.x - b.x; // Finally by horizontal position (left to right)
    });
    console.log('Successfully sorted all content elements.');

    // 3. Rebuild the document into a single text stream
    let reconstructedText = '';
    let imageCounter = 0;
    let lastElement = null;

    for (const element of analysisData) {
      if (lastElement) {
        // Check for a page break
        if (element.page > lastElement.page) {
          reconstructedText += `\n\n--- PAGE ${element.page} ---\n\n`;
        } else {
          // Check for a paragraph break (a significant vertical jump)
          const yDifference = element.y - (lastElement.y + lastElement.height);
          if (yDifference > PARAGRAPH_Y_THRESHOLD) {
            reconstructedText += '\n\n';
          }
        }
      }

      if (element.type === 'text') {
        // Add a space if the next text block is on the same line
        if (lastElement && element.page === lastElement.page && Math.abs(element.y - lastElement.y) < 5) {
            reconstructedText += ' ';
        }
        reconstructedText += element.content.trim();
      } else if (element.type === 'image') {
        imageCounter++;
        // Insert a unique, numbered placeholder for each image
        reconstructedText += `\n\n[IMAGE_PLACEHOLDER_${imageCounter}]\n\n`;
      }
      lastElement = element;
    }
    console.log('Reconstructed the text stream.');

    // 4. Save the final output
    await fs.writeFile(reconstructionOutputFile, reconstructedText);

    console.log(`\n✅ Success! Phase 3 complete.`);
    console.log(`   - Processed ${analysisData.length} content elements.`);
    console.log(`   - Inserted ${imageCounter} image placeholders.`);
    console.log(`   - Reconstructed text saved to: ${reconstructionOutputFile}`);

  } catch (error) {
    console.error('\n❌ An unexpected error occurred during the process:', error);
  }
}

main();