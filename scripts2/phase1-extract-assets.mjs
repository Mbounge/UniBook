//scripts2/phase1-extract-assets.mjs

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);

async function cleanupImageMasks(directoryPath) {
  try {
    const files = await fs.readdir(directoryPath);
    const imageInfo = new Map();

    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      try {
        const metadata = await sharp(filePath).metadata();
        const key = `${metadata.width}x${metadata.height}`;
        if (!imageInfo.has(key)) { imageInfo.set(key, []); }
        imageInfo.get(key).push({
          path: filePath,
          channels: metadata.channels,
        });
      } catch (e) { /* ignore files that are not images */ }
    }

    for (const images of imageInfo.values()) {
      if (images.length > 1) {
        const hasColorImage = images.some(img => img.channels >= 3);
        if (hasColorImage) {
          for (const image of images) {
            if (image.channels === 1) {
              await fs.unlink(image.path);
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Warning: Could not complete image mask cleanup. This is non-critical.');
  }
}

async function generateCoverImage(pdfPath, coversDir, bookIdentifier) {
    console.log('   -> Generating cover image...');
    await fs.mkdir(coversDir, { recursive: true });
    const outputPath = path.join(coversDir, `${bookIdentifier}`);

    const args = ['-f', '1', '-l', '1', '-png', '-singlefile', pdfPath, outputPath];

    // --- THE CRITICAL FIX IS HERE: Wrap in a try/catch block ---
    try {
        await execFileAsync('pdftoppm', args);
        console.log(`   -> Cover image saved to ${coversDir}`);
    } catch (error) {
        console.warn(`\n⚠️ WARNING: Could not generate cover image for "${bookIdentifier}.pdf".`);
        console.warn('   -> This is a non-critical error. The pipeline will continue without a cover for this book.');
        console.warn('   -> Please ensure "pdftoppm" (from the Poppler utility suite) is installed and accessible in your system\'s PATH for cover generation to work.');
    }
    // ---------------------------------------------------------
}

export async function runPhase1(pdfPath, imagesOutputDir, coversDir, bookIdentifier) {
  console.log('\n--- Starting Phase 1: Asset Extraction & Cover Generation ---');
  
  // This call is now safe and will not crash the pipeline
  await generateCoverImage(pdfPath, coversDir, bookIdentifier);

  console.log('   -> Extracting content images...');
  await fs.rm(imagesOutputDir, { recursive: true, force: true });
  await fs.mkdir(imagesOutputDir, { recursive: true });
  
  const outputPrefix = path.join(imagesOutputDir, `${bookIdentifier}-img`);
  const imageArgs = ['-j', '-png', pdfPath, outputPrefix];

  try {
    await execFileAsync('pdfimages', imageArgs);
    await cleanupImageMasks(imagesOutputDir);
    console.log('✅ Phase 1 Complete.');
  } catch (error) {
    if (error.stderr && !error.stderr.toLowerCase().includes('error')) {
      await cleanupImageMasks(imagesOutputDir);
      console.log('✅ Phase 1 Complete (with warnings).');
      return;
    }
    console.error('❌ CRITICAL ERROR in Phase 1: Failed to execute "pdfimages". This is a fatal error.');
    throw error; // We still throw here because content images are essential
  }
}