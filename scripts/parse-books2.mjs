import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';

// Promisify execFile to use it with async/await
const execFileAsync = promisify(execFile);

// --- CONFIGURATION ---
const booksDir = path.join(process.cwd(), 'src', 'books');
const outputDir = path.join(process.cwd(), 'src', 'lib');
const imagesOutputDir = path.join(outputDir, 'images'); // Specific folder for images
// ---------------------

/**
 * Executes the 'pdfimages' command to extract images from a PDF.
 * The '-j' flag is used to prevent the extraction of most image masks.
 * @param {string} pdfPath - The full path to the source PDF file.
 * @param {string} outputPrefix - The path and prefix for the output image files.
 */
async function extractPdfImages(pdfPath, outputPrefix) {
  console.log(`  -> Starting image extraction from "${path.basename(pdfPath)}"...`);

  const args = ['-j', '-png', pdfPath, outputPrefix];

  try {
    await execFileAsync('pdfimages', args);
    console.log('  -> Raw image extraction command executed.');
    return true;
  } catch (error) {
    // Check if the error is just a warning, which is common
    if (error.stderr && !error.stderr.toLowerCase().includes('error')) {
      console.log('  -> Raw image extraction command executed with warnings (this is often normal).');
      return true;
    }
    console.error('\n❌ CRITICAL ERROR: Failed to execute the "pdfimages" command.');
    console.error('Please ensure that Poppler is installed and accessible in your system\'s PATH.');
    console.error(`  -> Details: ${error.message}`);
    return false;
  }
}

/**
 * Scans a directory for extracted images and removes likely masks.
 * A mask is identified as a grayscale image that has a corresponding
 * color image with the exact same dimensions.
 * @param {string} directoryPath The path to the directory containing the images.
 */
async function cleanupImageMasks(directoryPath) {
  console.log('  -> Starting mask cleanup process...');
  const files = await fs.readdir(directoryPath);
  const imageInfo = new Map();

  // 1. Gather metadata for all images
  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    try {
      const metadata = await sharp(filePath).metadata();
      const key = `${metadata.width}x${metadata.height}`;
      
      if (!imageInfo.has(key)) {
        imageInfo.set(key, []);
      }
      
      imageInfo.get(key).push({
        path: filePath,
        channels: metadata.channels, // 1 for grayscale, 3 for RGB, 4 for RGBA
      });
    } catch (e) {
      console.warn(`   - Could not read metadata for ${file}. Skipping.`);
    }
  }

  // 2. Find and delete masks
  let deletedCount = 0;
  for (const images of imageInfo.values()) {
    // Only check for masks if there are multiple images with the same dimensions
    if (images.length > 1) {
      const hasColorImage = images.some(img => img.channels >= 3);
      
      // If a color image exists, any grayscale images are likely masks
      if (hasColorImage) {
        for (const image of images) {
          if (image.channels === 1) { // This is a grayscale image
            await fs.unlink(image.path);
            console.log(`   - Deleted mask: ${path.basename(image.path)}`);
            deletedCount++;
          }
        }
      }
    }
  }
  console.log(`  -> Cleanup complete. Deleted ${deletedCount} mask(s).`);
}


async function main() {
  console.log('--- Starting Phase 1: Asset Extraction ---');

  try {
    // 1. Find the first PDF file in the books directory
    const files = await fs.readdir(booksDir);
    const pdfFile = files.find(file => path.extname(file).toLowerCase() === '.pdf');

    if (!pdfFile) {
      console.log('No PDF files found in src/books. Exiting.');
      return;
    }

    const sourcePdfPath = path.join(booksDir, pdfFile);
    const bookTitle = path.basename(pdfFile, '.pdf');

    console.log(`Processing book: "${bookTitle}"`);

    // 2. Ensure the output directories exist and are empty
    await fs.rm(imagesOutputDir, { recursive: true, force: true });
    await fs.mkdir(imagesOutputDir, { recursive: true });
    console.log('  -> Cleaned and prepared output directory.');

    // 3. Define a prefix for the output files
    const outputPrefix = path.join(imagesOutputDir, `${bookTitle}-img`);

    // 4. Run the extraction process
    const success = await extractPdfImages(sourcePdfPath, outputPrefix);

    if (success) {
        // 5. Run the cleanup process to remove masks
        await cleanupImageMasks(imagesOutputDir);

        const finalFiles = await fs.readdir(imagesOutputDir);
        if (finalFiles.length > 0) {
            console.log(`\n✅ Success! Final image count: ${finalFiles.length}.`);
            console.log(`   Images are located in: ${imagesOutputDir}`);
        } else {
            console.log(`\nℹ️ Process completed, but no usable images were found in the PDF.`);
        }
    }

  } catch (error) {
    console.error('\n❌ An unexpected error occurred during the process:', error);
  }
}

main();