//scripts2/phase4-structuring.mjs

import fs from 'fs/promises';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { saveChapter, loadProgress } from './log-manager.mjs';

dotenv.config();

const MODEL_NAME = 'gemini-2.5-flash';

function getSystemPrompt(bookTitle) {
  return `
You are an expert document parser and a master of typography and readability. Your single purpose is to analyze the provided text stream and structure it into a clean JSON array representing the book's hierarchy.

Adhere to the following rules with absolute precision:

1.  **JSON Format:** The entire output MUST be a single, valid JSON array of objects.
2.  **Universal Schema:** Every object in the array must conform to this exact schema:
    {
      "bookTitle": "${bookTitle}",
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
5.  **Markdown Formatting & Readability (NEW):**
    *   The "content" field MUST be formatted using Markdown syntax.
    *   Introduce paragraph breaks (\`\\n\\n\`) within the "content" field to break up long walls of text into smaller, more digestible paragraphs. The goal is maximum readability.
6.  **Content Integrity (Anti-Hallucination Rule):**
    *   The "content" field must contain the verbatim text extracted from the section, formatted for readability.
    *   You MUST NOT summarize, rephrase, add, or omit any of the original text's meaning.
    *   **Ensure words are never incorrectly concatenated.** For example, 'be expected' must not become 'beexpected'. Add spaces where necessary to ensure natural language flow.
7.  **Placeholder Preservation:**
    *   Preserve image placeholder tags like \`[IMAGE_PLACEHOLDER_123]\` exactly as they appear.
8.  **Generic Cleaning:**
    *   Ignore recurring headers/footers and page break markers.
9.  **CRITICAL OUTPUT RULE:** Your entire response MUST be ONLY the raw JSON array, starting with \`[\` and ending with \`]\`. Do not add any conversational text or markdown backticks.
`;
}

function extractJson(text) {
  const match = text.match(/```json\s*([\s\S]*?)\s*```|(\[[\s\S]*\])/);
  if (match) { return match[1] || match[2]; }
  if (text.trim().startsWith('[') && text.trim().endsWith(']')) { return text.trim(); }
  return null;
}

export async function runPhase4(reconstructionInputFile, logFile, bookTitle) {
  console.log('\n--- Starting Phase 4: AI-Powered Structuring ---');
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { throw new Error('GEMINI_API_KEY not found.'); }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: getSystemPrompt(bookTitle),
    generationConfig: { temperature: 0.2, maxOutputTokens: 65000 },
  });

  const bookText = await fs.readFile(reconstructionInputFile, 'utf-8');
  const { chapters: finalBookJson, lastChapter } = await loadProgress(logFile);
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
        if (apiRetries >= maxApiRetries) { break; }
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

    if (!success) {
      console.log('\n🚨 CONTEXT RESET: Persistent API failure. Starting a fresh conversation to recover.');
      const lastSuccessfulChapter = finalBookJson[finalBookJson.length - 1];
      if (!lastSuccessfulChapter) {
          throw new Error('CRITICAL: API failed on the very first chapter. Cannot recover.');
      }
      const lastContentSnippet = lastSuccessfulChapter.content.slice(-200).replace(/\n/g, ' ');
      nextPrompt = `We are resuming a book parsing task that failed due to persistent API errors. The last chapter you successfully processed was "${lastSuccessfulChapter.subsectionTitle}" in the chapter "${lastSuccessfulChapter.chapterTitle}". It ended with the text: "...${lastContentSnippet}".\n\nPlease find the single next chapter that immediately follows this one from the full text provided below.\n\n<FULL_TEXT>\n${bookText}\n</FULL_TEXT>`;
      chat = model.startChat();
      turn++;
      continue;
    }

    const responseText = result.response.text();

    if (responseText.toLowerCase().includes("i am finished")) {
      console.log('✅ LLM signaled completion. Ending the process.');
      break;
    }

    const jsonString = extractJson(responseText);
    
    try {
      // --- MODIFIED: Completed error handling for missing/invalid JSON ---
      if (!jsonString) {
        throw new Error('Failed to extract a valid JSON array from the LLM response.');
      }
      
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
      await saveChapter(logFile, chapterJson);
      finalBookJson.push(...chapterJson);
      lastChapterTitle = newChapterTitle;
    } catch (e) {
      console.error(`❌ Error processing LLM response: ${e.message}`);
      console.log('   -> Raw LLM Response:', responseText); // Log the bad response for debugging
      
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
  const { chapters: finalResult } = await loadProgress(logFile);
  console.log(`✅ Phase 4 Complete: Extracted ${finalResult.length} total sections.`);
}