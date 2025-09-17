//scripts2/phase5-finalization.mjs

import fs from 'fs/promises';
import path from 'path';

// --- MODIFIED: Function now accepts "source" ---
export async function runPhase5(structuredInputLog, imagesDir, finalOutputFile, bookTitle, year, license, source) {
  console.log('\n--- Starting Phase 5: Post-Processing & Finalization ---');

  try {
    const fileContent = await fs.readFile(structuredInputLog, 'utf-8');
    const lines = fileContent.trim().split('\n');
    const structuredData = lines.map(line => JSON.parse(line));

    const allFiles = await fs.readdir(imagesDir);
    const imageFiles = allFiles
      .filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    const finalData = structuredData.map(section => {
      const newContent = section.content.replace(
        /\[IMAGE_PLACEHOLDER_(\d+)\]/g,
        (match, placeholderNumberStr) => {
          const placeholderNumber = parseInt(placeholderNumberStr, 10);
          const imageIndex = placeholderNumber - 1;

          if (imageIndex >= 0 && imageIndex < imageFiles.length) {
            const imageName = imageFiles[imageIndex];
            const imagePath = `/${path.basename(imagesDir)}/${imageName}`;
            return `<img src="${imagePath}" alt="${bookTitle} - Image ${placeholderNumber}">`;
          } else {
            return match;
          }
        }
      );
      // --- MODIFIED: Add the new "source" field to the final JSON object ---
      return { 
        ...section, 
        bookTitle: bookTitle, 
        content: newContent,
        year: year,
        license: license,
        source: source
      };
    });

    await fs.writeFile(finalOutputFile, JSON.stringify(finalData, null, 2));
    console.log(`✅ Phase 5 Complete: Final file saved with enriched metadata.`);

  } catch (error) {
    console.error('\n❌ An unexpected error occurred during the finalization process:', error);
    throw error;
  }
}