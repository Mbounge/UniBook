import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

// --- CONFIGURATION ---
const booksDir = path.join(process.cwd(), 'src', 'books');
const outputDir = path.join(process.cwd(), 'src', 'lib');
const outputFile = path.join(outputDir, 'oer-library.json');
// ---------------------

async function parsePdf(filePath, bookTitle) {
  console.log(`Parsing "${bookTitle}"...`);
  const dataBuffer = await fs.readFile(filePath);
  const data = await pdf(dataBuffer);
  // Normalize line endings and clean up common PDF text artifacts
  let text = data.text.replace(/\r\n/g, '\n').replace(/’/g, "'");

  // --- STEP 1: Create a single, sorted list of all structural markers ---
  const markers = [];

  // Find all chapter markers (Title on one line, number on the next)
  const chapterRegex = /^([A-Z][A-Za-z\s&,]+?)\n(\d{1,2})\n/gm;
  let chapterMatch;
  while ((chapterMatch = chapterRegex.exec(text)) !== null) {
    const title = chapterMatch[1].trim();
    // Filter out false positives like the "CONTENTS" page
    if (title.toLowerCase() !== 'contents' && title.length < 100) {
      markers.push({
        type: 'chapter',
        title: title,
        number: parseInt(chapterMatch[2], 10),
        startIndex: chapterMatch.index,
        headerLength: chapterMatch[0].length
      });
    }
  }

  // Find all subsection markers (e.g., "1.1 What Is Finance?")
  const subsectionRegex = /^\s*(\d{1,2}\.\d{1,2})\s+(.*?)\n/gm;
  let subsectionMatch;
  while ((subsectionMatch = subsectionRegex.exec(text)) !== null) {
    const title = subsectionMatch[2].trim().replace(/\s*\d+$/, '').replace(/^•\s*/, '').trim();
    // Filter out false positives
    if (title && title.length < 150 && !title.toLowerCase().includes('learning outcomes')) {
      markers.push({
        type: 'subsection',
        id: subsectionMatch[1],
        title: title,
        startIndex: subsectionMatch.index,
        headerLength: subsectionMatch[0].length
      });
    }
  }

  if (markers.length === 0) {
    console.log("  -> CRITICAL ERROR: Could not find any structural markers. Exiting.");
    return [];
  }

  // Sort all markers by their position in the text to create a definitive map
  markers.sort((a, b) => a.startIndex - b.startIndex);

  // --- STEP 2: Process the sorted markers to build the library ---
  const fullLibrary = [];
  let currentChapterTitle = "Unknown Chapter";
  let currentChapterNumber = 0;

  for (let i = 0; i < markers.length; i++) {
    const currentMarker = markers[i];
    const nextMarker = (i + 1 < markers.length) ? markers[i + 1] : null;
    const contentEndIndex = nextMarker ? nextMarker.startIndex : text.length;

    if (currentMarker.type === 'chapter') {
      currentChapterTitle = currentMarker.title;
      currentChapterNumber = currentMarker.number;
      console.log(`  -> Processing Chapter ${currentChapterNumber}: "${currentChapterTitle}"`);

      // The "Why It Matters" section starts after the chapter header
      const contentStartIndex = currentMarker.startIndex + currentMarker.headerLength;
      
      if (contentEndIndex > contentStartIndex) {
        let chapterIntroText = text.substring(contentStartIndex, contentEndIndex);
        
        // Isolate the "Why It Matters" text specifically
        const whyItMattersMatch = chapterIntroText.match(/Why It Matters([\s\S]*)/);
        if (whyItMattersMatch && whyItMattersMatch[1]) {
          const cleanedText = whyItMattersMatch[1].replace(/Access for free at openstax\.org/g, '').trim();
          const paragraphs = cleanedText
            .split(/\n\s*\n/)
            .map(p => p.trim().replace(/\n/g, ' '))
            .filter(p => p.length > 100);

          if (paragraphs.length > 0) {
            const htmlContent = `<h1>Why It Matters</h1>` + paragraphs.map(p => `<p>${p}</p>`).join('');
            fullLibrary.push({
              bookTitle,
              chapterTitle: currentChapterTitle,
              subsectionTitle: "Why It Matters",
              content: htmlContent,
            });
          }
        }
      }
    } else if (currentMarker.type === 'subsection') {
      // Ensure the subsection belongs to the current chapter before processing
      if (currentMarker.id.startsWith(currentChapterNumber + '.')) {
        const contentStartIndex = currentMarker.startIndex + currentMarker.headerLength;

        if (contentEndIndex > contentStartIndex) {
          let subsectionText = text.substring(contentStartIndex, contentEndIndex);

          // Clean out any "Learning Outcomes" blocks
          subsectionText = subsectionText.replace(/^\s*Learning Outcomes[\s\S]*?By the end of this section, you will be able to:[\s\S]*?\n/, '').trim();
          subsectionText = subsectionText.replace(/Access for free at openstax\.org/g, '');

          const paragraphs = subsectionText
            .split(/\n\s*\n/)
            .map(p => p.trim().replace(/\n/g, ' '))
            .filter(p => p.length > 100);

          if (paragraphs.length > 0) {
            const htmlContent = `<h1>${currentMarker.title}</h1>` + paragraphs.map(p => `<p>${p}</p>`).join('');
            fullLibrary.push({
              bookTitle,
              chapterTitle: currentChapterTitle,
              subsectionTitle: `${currentMarker.id} ${currentMarker.title}`,
              content: htmlContent,
            });
          }
        }
      }
    }
  }

  return fullLibrary;
}

async function main() {
  console.log('Starting book ingestion process...');
  try {
    await fs.mkdir(outputDir, { recursive: true });
    const files = await fs.readdir(booksDir);
    const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');
    if (pdfFiles.length === 0) {
      console.log('No PDF files found in src/books. Exiting.');
      return;
    }

    const fullLibrary = await parsePdf(path.join(booksDir, pdfFiles[0]), 'Principles of Finance');

    await fs.writeFile(outputFile, JSON.stringify(fullLibrary, null, 2));
    console.log(`\n✅ Success! Library generated at ${outputFile}`);
    console.log(`Total subsections indexed: ${fullLibrary.length}`);

  } catch (error) {
    console.error('\n❌ Error during book ingestion:', error);
  }
}

main();