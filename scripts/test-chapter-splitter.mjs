import fs from 'fs/promises';
import path from 'path';

// --- CONFIGURATION ---
const outputDir = path.join(process.cwd(), 'src', 'lib');
const reconstructionInputFile = path.join(outputDir, 'reconstructed-text.txt');
// ---------------------

/**
 * Splits the reconstructed text into an array of chapters based on common patterns.
 * This function is designed to be tested and tuned.
 * @param {string} text The full reconstructed text.
 * @returns {Array<{chapterTitle: string, content: string}>}
 */
function splitTextIntoChapters(text) {
  const chapters = [];
  // This regex is the core logic. It looks for common chapter heading formats.
  // It's designed to be universal but can be tuned if needed.
  const chapterRegex = /^\s*(Chapter\s+\d+|Part\s+\d+|^\d{1,2})\s*\n(.*?)\n/gm;
  
  let lastIndex = 0;
  let match;

  // First, see if there is any content before the very first chapter match.
  // This is often a Preface, Foreword, or general Introduction.
  const firstMatch = chapterRegex.exec(text);
  if (firstMatch && firstMatch.index > 0) {
    chapters.push({
      chapterTitle: 'Introduction / Front Matter',
      content: text.substring(0, firstMatch.index).trim()
    });
  }
  chapterRegex.lastIndex = 0; // Reset the regex to search from the beginning again.

  // Now, loop through all chapter matches to define the chapter boundaries.
  let lastMatchEnd = 0;
  const chapterHeaders = [];
  while ((match = chapterRegex.exec(text)) !== null) {
    const title = `${match[1]}: ${match[2]}`.replace(/\n/g, ' ').trim();
    chapterHeaders.push({ title, startIndex: match.index });
  }

  // Now that we have all the headers, we can slice the text between them.
  for (let i = 0; i < chapterHeaders.length; i++) {
    const currentHeader = chapterHeaders[i];
    const nextHeader = chapterHeaders[i + 1];
    
    const contentStart = currentHeader.startIndex;
    const contentEnd = nextHeader ? nextHeader.startIndex : text.length;
    
    chapters.push({
      chapterTitle: currentHeader.title,
      content: text.substring(contentStart, contentEnd).trim()
    });
  }

  // If no chapters were found at all, treat the entire book as a single chapter.
  if (chapters.length === 0 && text.length > 0) {
    chapters.push({ chapterTitle: 'Full Document', content: text });
  }

  return chapters;
}

async function main() {
  console.log('--- Running Chapter Splitting Diagnostic Test ---');
  
  try {
    const fullText = await fs.readFile(reconstructionInputFile, 'utf-8');
    const chapters = splitTextIntoChapters(fullText);

    console.log('\n=================================================');
    console.log(`✅ DIAGNOSTIC COMPLETE: Found ${chapters.length} potential chapters.`);
    console.log('=================================================\n');

    if (chapters.length > 0) {
      console.log('Please review the following chapter breakdown:\n');
      
      chapters.forEach((chapter, index) => {
        console.log(`--- Chapter ${index + 1} ---`);
        console.log(`  Title: ${chapter.chapterTitle}`);
        console.log(`  Size: ${chapter.content.length} characters`);
        console.log(`  Preview: "${chapter.content.substring(0, 250).replace(/\n/g, ' ')}..."`);
        console.log(''); // Add a blank line for readability
      });
    } else {
      console.log('No chapters were identified based on the current rules.');
    }

  } catch (error) {
    console.error('\n❌ An error occurred during the test:', error);
  }
}

main();