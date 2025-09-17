import fs from 'fs/promises';
import path from 'path';

const outputDir = path.join(process.cwd(), 'src', 'lib');
// --- CHANGE: Export this constant ---
export const LOG_FILE_PATH = path.join(outputDir, 'structured-output.log.jsonl');

/**
 * Appends a successfully parsed chapter's JSON to the log file.
 * @param {Array<object>} chapterJson - The array of subsection objects for the chapter.
 */
export async function saveChapter(chapterJson) {
  const linesToAppend = chapterJson.map(subsection => JSON.stringify(subsection)).join('\n');
  await fs.appendFile(LOG_FILE_PATH, linesToAppend + '\n');
  console.log(`   -> 📝 Log updated for Chapter: "${chapterJson[0]?.chapterTitle}"`);
}

/**
 * Reads the log file to resume progress.
 * @returns {Promise<{ chapters: Array<object>, lastChapter: object | null }>}
 */
export async function loadProgress() {
  try {
    const fileContent = await fs.readFile(LOG_FILE_PATH, 'utf-8');
    const lines = fileContent.trim().split('\n');
    
    if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
      return { chapters: [], lastChapter: null };
    }

    const chapters = lines.map(line => JSON.parse(line));
    const lastChapter = chapters[chapters.length - 1];

    return { chapters, lastChapter };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { chapters: [], lastChapter: null };
    }
    throw error;
  }
}