import fs from 'fs/promises';
import path from 'path';

// --- CONFIGURATION ---
const outputDir = path.join(process.cwd(), 'src', 'lib');
const imagesDir = path.join(outputDir, 'images');
const structuredInputLog = path.join(outputDir, 'structured-output.log.jsonl');
const finalOutputFile = path.join(outputDir, 'oer-library.json');
// ---------------------

async function main() {
  console.log('--- Starting Phase 5: Post-Processing & Finalization ---');

  try {
    // 1. Load the structured data from the Phase 4 log file
    console.log(`Loading structured data from: ${path.basename(structuredInputLog)}`);
    const fileContent = await fs.readFile(structuredInputLog, 'utf-8');
    const lines = fileContent.trim().split('\n');
    if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
      throw new Error('Structured data log file is empty.');
    }
    const structuredData = lines.map(line => JSON.parse(line));
    console.log(`   -> Loaded ${structuredData.length} sections.`);

    // 2. Get a sorted inventory of all extracted image files
    console.log(`Loading image inventory from: ${path.basename(imagesDir)}`);
    const allFiles = await fs.readdir(imagesDir);
    const imageFiles = allFiles
      .filter(file => /\.(png|jpg|jpeg|gif)$/i.test(file))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })); // Natural sort
    console.log(`   -> Found ${imageFiles.length} image files.`);

    // 3. Iterate through the data and replace placeholders with HTML <img> tags
    console.log('Replacing image placeholders with HTML tags...');
    const finalData = structuredData.map(section => {
      // Use a replacer function to dynamically generate the <img> tag
      const newContent = section.content.replace(
        /\[IMAGE_PLACEHOLDER_(\d+)\]/g,
        (match, placeholderNumberStr) => {
          const placeholderNumber = parseInt(placeholderNumberStr, 10);
          // The placeholder numbers are 1-based, array indices are 0-based
          const imageIndex = placeholderNumber - 1;

          if (imageIndex >= 0 && imageIndex < imageFiles.length) {
            const imageName = imageFiles[imageIndex];
            // This path should be relative to how it will be served in a web app
            const imagePath = `/images/${imageName}`;
            return `<img src="${imagePath}" alt="Textbook Image ${placeholderNumber}">`;
          } else {
            console.warn(`⚠️ Warning: Could not find a matching image for placeholder number ${placeholderNumber}.`);
            return match; // If no image is found, leave the placeholder as-is
          }
        }
      );

      return { ...section, content: newContent };
    });

    // 4. Save the final, production-ready JSON file
    await fs.writeFile(finalOutputFile, JSON.stringify(finalData, null, 2));

    console.log(`\n✅ Success! Phase 5 complete.`);
    console.log(`   - Processed and enriched ${finalData.length} sections.`);
    console.log(`   - Final production-ready file saved to: ${path.basename(finalOutputFile)}`);

  } catch (error) {
    console.error('\n❌ An unexpected error occurred during the finalization process:', error);
  }
}

main();