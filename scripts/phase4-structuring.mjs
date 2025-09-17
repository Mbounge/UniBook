import fs from 'fs/promises';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { saveChapter, loadProgress, LOG_FILE_PATH } from './log-manager.mjs';

dotenv.config();

// --- CONFIGURATION ---
const outputDir = path.join(process.cwd(), 'src', 'lib');
const reconstructionInputFile = path.join(outputDir, 'reconstructed-text.txt');
const structuredOutputFile = path.join(outputDir, 'structured-output.json');
const MODEL_NAME = 'gemini-2.5-flash';
// ---------------------

const SYSTEM_PROMPT = `
You are an expert, generic document parser. Your single purpose is to analyze the provided text stream and structure it into a clean JSON array representing the book's hierarchy.

Adhere to the following rules with absolute precision:

1.  **JSON Format:** The entire output MUST be a single, valid JSON array of objects.
2.  **Universal Schema:** Every object in the array must conform to this exact schema:
    {
      "chapterTitle": "string",
      "subsectionTitle": "string",
      "content": "string"
    }
3.  **Content Scoping (Start of Extraction):**
    *   You MUST IGNORE and DISCARD all preliminary content (front matter).
    *   Begin your extraction ONLY when you encounter the first official chapter (e.g., "Chapter 1") or a formal "Introduction".
4.  **Chapter Completeness and Control (CRITICAL):**
    *   When you process a chapter, you MUST process it in its entirety, including ALL of its subsections.
    *   You MUST only process and return ONE chapter per turn.
5.  **Markdown Formatting:**
    *   The "content" field MUST be formatted using Markdown syntax.
6.  **Content Integrity (Anti-Hallucination Rule):**
    *   The "content" field must contain the verbatim text extracted from the section, formatted in Markdown.
    *   You MUST NOT summarize, rephrase, add, or omit any of the original text.
7.  **Placeholder Preservation:**
    *   Preserve image placeholder tags like \`[IMAGE_PLACEHOLDER_123]\` exactly as they appear.
8.  **Generic Cleaning:**
    *   Ignore recurring headers/footers and page break markers.
9.  **CRITICAL OUTPUT RULE:** Your entire response MUST be ONLY the raw JSON array, starting with \`[\` and ending with \`]\`. Do not add any conversational text or markdown backticks.
`;

function extractJson(text) {
  const match = text.match(/```json\s*([\s\S]*?)\s*```|(\[[\s\S]*\])/);
  if (match) { return match[1] || match[2]; }
  if (text.trim().startsWith('[') && text.trim().endsWith(']')) { return text.trim(); }
  return null;
}

async function main() {
  console.log('--- Starting Phase 4: AI-Powered Structuring ---');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: GEMINI_API_KEY not found. Please create a .env file.');
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { temperature: 0.2, maxOutputTokens: 65000 },
    });

    const bookText = await fs.readFile(reconstructionInputFile, 'utf-8');
    const { chapters: finalBookJson, lastChapter } = await loadProgress();
    let lastChapterTitle = lastChapter?.chapterTitle || "N/A";

    let chat = model.startChat();
    let turn = 1;
    const maxTurns = 50;
    let nextPrompt;

    if (lastChapter) {
      console.log(`✅ Resuming from a previous session. Last successful chapter was "${lastChapter.chapterTitle}".`);
      const lastContentSnippet = lastChapter.content.slice(-200).replace(/\n/g, ' ');
      nextPrompt = `We are resuming a book parsing task. The last chapter you successfully processed was "${lastChapter.subsectionTitle}" in the chapter "${lastChapter.chapterTitle}". It ended with the text: "...${lastContentSnippet}".\n\nPlease find the single next chapter that immediately follows this one from the full text provided below.\n\n<FULL_TEXT>\n${bookText}\n</FULL_TEXT>`;
    } else {
      console.log('🚀 Starting a fresh session.');
      nextPrompt = `Here is the full text of the book. Please find the very first chapter and provide its content in the required JSON format. Remember to include ALL of its subsections and provide only this single chapter.\n\n<FULL_TEXT>\n${bookText}\n</FULL_TEXT>`;
    }

    while (turn <= maxTurns) {
      console.log(`\n--- Turn ${turn}: Asking for the next chapter... ---`);
      
      let result;
      let success = false;
      let apiRetries = 0;
      const maxApiRetries = 3;

      while (!success && apiRetries < maxApiRetries) {
        try {
          result = await chat.sendMessage(nextPrompt);
          success = true;
        } catch (error) {
          apiRetries++;
          console.warn(`\n⚠️ API call failed (Attempt ${apiRetries}/${maxApiRetries}).`);
          console.error('   -> Error:', error.message);

          if (apiRetries >= maxApiRetries) {
            console.error('❌ Max API retries reached for this turn.');
            break;
          }

          if (error.status === 429) {
            const waitSeconds = 65;
            console.log(`   -> Rate limit hit. Applying a fixed wait of ${waitSeconds} seconds.`);
            await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
          } else {
            const backoffSeconds = 5 * (2 ** (apiRetries - 1));
            console.log(`   -> Network error. Applying backoff of ${backoffSeconds} seconds.`);
            await new Promise(resolve => setTimeout(resolve, backoffSeconds * 1000));
          }
        }
      }

      // --- THE CRITICAL CHANGE IS HERE ---
      if (!success) {
        console.log('\n🚨 CONTEXT RESET: Persistent API failure. Starting a fresh conversation to recover.');
        const lastSuccessfulChapter = finalBookJson[finalBookJson.length - 1];
        if (!lastSuccessfulChapter) {
            console.error('❌ CRITICAL: API failed on the very first chapter. Cannot recover. Please check API key and network.');
            break;
        }
        const lastContentSnippet = lastSuccessfulChapter.content.slice(-200).replace(/\n/g, ' ');
        nextPrompt = `We are resuming a book parsing task that failed due to persistent API errors. The last chapter you successfully processed was "${lastSuccessfulChapter.subsectionTitle}" in the chapter "${lastSuccessfulChapter.chapterTitle}". It ended with the text: "...${lastContentSnippet}".\n\nPlease find the single next chapter that immediately follows this one from the full text provided below.\n\n<FULL_TEXT>\n${bookText}\n</FULL_TEXT>`;
        chat = model.startChat();
        turn++;
        continue; // Skip the rest of this loop and start the next turn with the fresh chat
      }
      // --- End of Change ---

      const responseText = result.response.text();

      if (responseText.toLowerCase().includes("i am finished")) {
        console.log('✅ LLM signaled completion. Ending the process.');
        break;
      }

      const jsonString = extractJson(responseText);
      if (!jsonString) { /* ... error handling ... */ }

      try {
        const chapterJson = JSON.parse(jsonString);

        if (!Array.isArray(chapterJson) || chapterJson.length === 0) {
            console.log('✅ LLM returned an empty array, signaling completion. Ending the process.');
            break;
        }

        const newChapterTitle = chapterJson[0]?.chapterTitle;
        if (newChapterTitle === lastChapterTitle) {
          console.warn(`⚠️ Warning: LLM returned the same chapter ("${newChapterTitle}") twice. Ending loop.`);
          break;
        }

        console.log(`   -> Successfully parsed and received Chapter: "${newChapterTitle}"`);
        await saveChapter(chapterJson);
        finalBookJson.push(...chapterJson);
        lastChapterTitle = newChapterTitle;

      } catch (e) {
        console.error(`❌ Error parsing JSON from LLM response.`);
        console.log('\n🚨 CONTEXT RESET: Invalid JSON received. Starting a fresh conversation to recover.');
        const lastSuccessfulChapter = finalBookJson[finalBookJson.length - 1];
        const lastContentSnippet = lastSuccessfulChapter.content.slice(-200).replace(/\n/g, ' ');
        nextPrompt = `We are resuming a book parsing task that failed due to invalid output. The last chapter you successfully processed was "${lastSuccessfulChapter.subsectionTitle}" in the chapter "${lastSuccessfulChapter.chapterTitle}". It ended with the text: "...${lastContentSnippet}".\n\nPlease find the single next chapter that immediately follows this one from the full text provided below.\n\n<FULL_TEXT>\n${bookText}\n</FULL_TEXT>`;
        chat = model.startChat();
        turn++;
        continue;
      }

      nextPrompt = `Thank you. Please find the single next chapter immediately following the one you just provided. Analyze the full text provided below to find it.\n\n<FULL_TEXT>\n${bookText}\n</FULL_TEXT>`;
      turn++;
    }

    if (turn > maxTurns) {
        console.warn('⚠️ Warning: Reached maximum turns. The extraction may be incomplete.');
    }

    console.log('\n--- Finalizing Process ---');
    const { chapters: finalResult } = await loadProgress();
    await fs.writeFile(structuredOutputFile, JSON.stringify(finalResult, null, 2));
    console.log(`✅ Success! Phase 4 complete.`);
    console.log(`   - Extracted a total of ${finalResult.length} sections.`);
    console.log(`   - Final structured book data saved to: ${structuredOutputFile}`);
    console.log(`   - Raw progress log is available at: ${path.basename(LOG_FILE_PATH)}`);

  } catch (error) {
    console.error('\n❌ An unexpected error occurred during the AI structuring process:', error);
  }
}

main();