//src/app/api/ai-assist/route.ts

import {
    GoogleGenerativeAI,
    Part,
    SchemaType,
    FunctionCall,
  } from "@google/generative-ai";
  import { NextResponse } from "next/server";
  
  // The system prompt remains our primary tool for guiding the AI.
  const systemPrompt = `
  
  You are an expert co-author and research assistant integrated into a web-based book editor. Your goal is to be helpful, clear, and collaborative.
  
  **Persona and Tone:**
  - Be conversational but professional.
  - **CRITICAL COMMUNICATION RULE:** NEVER mention technical terms like HTML, CSS, or JSON to the user. Frame your responses in terms of "styled blocks," "layouts," or "components."
  
  **Communication Style and Formatting:**
  - **Use Markdown for Readability:** Structure all your responses with Markdown to make them easy to read and scan.
  - **Emphasize Key Points:** Use **bold** text to highlight important terms, titles, or concepts.
  - **Use Lists:** For any sequence of items, steps, or ideas, use bulleted (-) or numbered (1.) lists. Avoid long paragraphs that could be lists.
  - **Structure Complex Answers:** If your response has multiple distinct parts, use simple headings (e.g., ### Summary) to organize your thoughts.
  - **Keep it Concise:** Keep paragraphs short and focused on a single idea.

  **CRITICAL RULE: You have NO prior knowledge of the library's contents. You MUST use the provided tools to answer any questions about the library.**
  
  **Tool Usage Strategy:**
  - **For ANY user query that asks to find information, chapters, sections, or books about a specific topic (e.g., "bonds," "photosynthesis," "renaissance art"), you MUST prioritize using the 'search_content_hub' tool.** This is your most powerful tool and it returns the most relevant sections from all books.
  - Only use 'find_books_by_subject' for very broad, single-word queries where the user is asking for a general list (e.g., "show me finance books").
  
  **INTERACTIVE COMPONENT SYSTEM:**
  - When you use 'search_content_hub', you MUST present the results in a 'bookDiscovery' JSON block. The results should be grouped by book, showing only the relevant chapters and sections that were found.

  **DYNAMIC TEMPLATE GENERATION (Text-to-Template):**
  - If a user asks you to "create," "design," "style," or "make" a visual element (like a box, a prompt, a key takeaway, etc.), you MUST generate the necessary HTML with inline CSS to fulfill their request.
  - You MUST NOT invent CSS classes. Use only inline \`style="..."\` attributes.
  - You MUST wrap the final HTML string inside a 'contentCreation' JSON block.
  - The JSON block should have \`type: "contentCreation"\`, \`contentType: "html"\`, and crucially, \`"isTemplate": true\`.
  - Example user request: "Make a warning box with a red border and an alert icon."
  - Example JSON output for that request:
    \`\`\`json
    {
      "type": "contentCreation",
      "contentType": "html",
      "isTemplate": true,
      "content": "<div class='template-block' style='background: #fef2f2; border: 1px solid #ef4444; border-left: 5px solid #ef4444; padding: 16px; margin: 16px 0; border-radius: 8px;'><p style='margin:0; color: #b91c1c;'><strong>⚠️ Warning:</strong> This is an important warning.</p></div>"
    }
    \`\`\`

    **GRAPH AND CHART GENERATION:**
  - If a user asks you to "create," "make," "plot," or "draw" a graph, chart, or cartesian plane, you MUST translate their request into a structured JSON object for the graphing component.
  - You MUST wrap this JSON inside a block with \`"type": "graphCreation"\`.
  - The JSON object MUST conform to the following structure:
    - \`type\`: Can be "bar" or "line".
    - \`width\`: A default width in pixels (e.g., 600).
    - \`height\`: A default height in pixels (e.g., 400).
    - \`data\`: Must contain \`labels\` (an array of strings for the X-axis) and \`datasets\` (an array of objects).
    - \`datasets\` objects must contain a \`label\` (string), and \`data\` (an array of numbers).
    - \`options\`: Must contain a \`plugins.title.text\` property for the chart's title.
  - **For Cartesian Planes:** If a user asks for a Cartesian plane, create a 'line' chart with no data points but with appropriate axis labels and a title.
  - **Example User Request:** "create a bar chart showing sales: 50 apples, 75 oranges, and 30 bananas"
  - **Example JSON Output:**
    \`\`\`json
    {
      "type": "graphCreation",
      "graphData": {
        "type": "bar",
        "width": 600,
        "height": 400,
        "data": {
          "labels": ["Apples", "Oranges", "Bananas"],
          "datasets": [{
            "label": "Sales",
            "data": [50, 75, 30],
            "backgroundColor": "rgba(54, 162, 235, 0.6)"
          }]
        },
        "options": {
          "responsive": true,
          "plugins": {
            "legend": { "position": "top" },
            "title": { "display": true, "text": "Product Sales" }
          }
        }
      }
    }
    \`\`\`

  **CRITICAL RULES FOR CONVERSATION:**
  - You MUST use the 'contentCreation' JSON format ONLY when the user explicitly asks you to CREATE or MODIFY a visual template. If the user asks a question ABOUT a template, or asks you to DESCRIBE or EXPLAIN it, you MUST respond with plain text.
  - You MUST use the 'bookDiscovery' JSON format ONLY when the user's primary intent is to SEARCH, FIND, or LIST books or content. If the user asks a follow-up question to CLARIFY, ANALYZE, or DISCUSS the search results (e.g., "Which of these is best for beginners?", "Tell me more about the first book"), you MUST respond with plain text. DO NOT wrap your analysis in a new 'bookDiscovery' JSON block.
  

  **Your Tools:**
  - **list_all_books():** Complete list of all books (returns lightweight overview).
  - **find_books_by_subject(subject: string):** Books related to a subject (returns lightweight overview).
  - **search_content_hub(query: string):** Find specific content/chapters/sections (returns detailed results).
  - **get_book_details(bookTitle: string):** Get full details for a specific book including chapters.
  - **merge_and_rewrite(sources: object[], prompt: string):** Combine and rewrite content.

  Always prioritize creating rich, interactive experiences over plain text responses, but follow the conversational rules above.
  
  `;
  
  // --- Interfaces (unchanged) ---
  interface StagedItem {
    id: string;
    type: "book" | "chapter" | "subsection";
    bookTitle: string;
    chapterTitle?: string;
    subsectionTitle?: string;
    content?: string;
  }
  interface Message {
    role: "user" | "assistant";
    content: string;
    stagedContent?: StagedItem[];
  }
  interface BookSearchResult {
    bookTitle: string;
    coverImage: string;
    year?: number;
    license?: string;
    source?: string;
    chapterCount?: number;
    chapters?: ChapterSearchResult[];
  }
  interface ChapterSearchResult {
    chapterTitle: string;
    subsections: SubsectionSearchResult[];
  }
  interface SubsectionSearchResult {
    subsectionTitle: string;
    content: string;
  }
  async function safeFetch(
    url: string,
    options: any = {},
    timeout: number = 15000,
    retries: number = 2
  ): Promise<any> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (attempt === retries) {
          if (error.name === "AbortError") {
            throw new Error("Request timed out");
          }
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  function shouldCreateBookDiscovery(
    userMessage: string,
    toolUsed: string
  ): boolean {
    const bookSearchKeywords = [
      "find books",
      "search books",
      "books about",
      "show me books",
      "list books",
      "book on",
      "books related to",
      "recommend books",
      "find a book",
      "what books",
      "books available",
    ];
    const contentSearchKeywords = [
      "find content",
      "search for",
      "look for",
      "chapters about",
      "sections on",
    ];
    const message = userMessage.toLowerCase();
    const isBookSearch = bookSearchKeywords.some((keyword) =>
      message.includes(keyword)
    );
    const isContentSearch = contentSearchKeywords.some((keyword) =>
      message.includes(keyword)
    );
    const usedSearchTool = [
      "list_all_books",
      "find_books_by_subject",
      "search_content_hub",
      "get_book_details",
    ].includes(toolUsed);
    return (isBookSearch || isContentSearch) && usedSearchTool;
  }

  // --- HELPER FUNCTIONS REMOVED ---
  // The functions `shouldCreateContent` and `isTemplateCreationRequest` have been removed.

  function formatBooksForDiscovery(
    books: any[],
    includeChapters: boolean = false
  ): BookSearchResult[] {
    return books.map((book) => ({
      bookTitle: book.bookTitle,
      coverImage: book.coverImage,
      chapters: includeChapters ? book.chapters : undefined,
      chapterCount: book.chapterCount || book.chapters?.length,
      year: book.year,
      license: book.license,
      source: book.source,
    }));
  }
  function formatSearchResultsForDiscovery(results: any[]): BookSearchResult[] {
    const bookGroups: { [key: string]: any } = {};
    results.forEach((result) => {
      if (!bookGroups[result.bookTitle]) {
        bookGroups[result.bookTitle] = {
          bookTitle: result.bookTitle,
          coverImage: result.coverImage,
          chapters: {},
          year: result.year,
          license: result.license,
          source: result.source,
        };
      }
      if (!bookGroups[result.bookTitle].chapters[result.chapterTitle]) {
        bookGroups[result.bookTitle].chapters[result.chapterTitle] = {
          chapterTitle: result.chapterTitle,
          subsections: [],
        };
      }
      bookGroups[result.bookTitle].chapters[result.chapterTitle].subsections.push(
        { subsectionTitle: result.subsectionTitle, content: result.content }
      );
    });
    return Object.values(bookGroups).map((book) => ({
      ...book,
      chapters: Object.values(book.chapters),
      chapterCount: Object.keys(book.chapters).length,
    }));
  }
  function containsJSONBlock(content: string, blockType: string): boolean {
    const jsonBlockRegex = /```json\s*[\s\S]*?```/g;
    const matches = content.match(jsonBlockRegex);
    if (!matches) return false;
    return matches.some((match) => {
      try {
        const jsonString = match.replace(/^```json\s*|```$/g, "");
        const block = JSON.parse(jsonString);
        return block.type === blockType;
      } catch {
        return false;
      }
    });
  }
  async function handleFunctionCall(
    functionCall: FunctionCall,
    baseUrl: string
  ): Promise<{ toolData: any; toolResponse: Part }> {
    const { name, args } = functionCall;
    switch (name) {
      case "search_content_hub":
        const query = (args as any)?.query;
        if (!query) {
          throw new Error("Search query is required");
        }
        const searchResults = await safeFetch(
          `${baseUrl}/api/oer-search?q=${encodeURIComponent(query)}`
        );
        return {
          toolData: {
            searchResults: searchResults.slice(0, 10),
            query,
            toolUsed: "search_content_hub",
          },
          toolResponse: {
            functionResponse: {
              name: "search_content_hub",
              response: { results: searchResults.slice(0, 3) },
            },
          },
        };
      case "list_all_books":
        const libraryData = await safeFetch(`${baseUrl}/api/oer-library`);
        return {
          toolData: { books: libraryData, toolUsed: "list_all_books" },
          toolResponse: {
            functionResponse: {
              name: "list_all_books",
              response: { books: libraryData },
            },
          },
        };
      case "find_books_by_subject":
        const subject = (args as any)?.subject;
        if (!subject) {
          throw new Error("Subject is required");
        }
        const books = await safeFetch(
          `${baseUrl}/api/oer-library?q=${encodeURIComponent(subject)}`
        );
        return {
          toolData: { books, subject, toolUsed: "find_books_by_subject" },
          toolResponse: {
            functionResponse: {
              name: "find_books_by_subject",
              response: { books: books },
            },
          },
        };
      case "get_book_details":
        const bookTitle = (args as any)?.bookTitle;
        if (!bookTitle) {
          throw new Error("Book title is required");
        }
        const bookDetails = await safeFetch(
          `${baseUrl}/api/oer-library?bookTitle=${encodeURIComponent(bookTitle)}`
        );
        return {
          toolData: {
            books: bookDetails,
            bookTitle,
            toolUsed: "get_book_details",
          },
          toolResponse: {
            functionResponse: {
              name: "get_book_details",
              response: { book: bookDetails[0] },
            },
          },
        };
      case "merge_and_rewrite":
        const sources = (args as any)?.sources;
        const prompt = (args as any)?.prompt;
        if (!sources || !prompt) {
          throw new Error("Sources and prompt are required");
        }
        let contextString = "Based on the provided sources:\n\n";
        sources.forEach((source: StagedItem, index: number) => {
          contextString += `**Source ${index + 1}**: ${source.bookTitle}`;
          if (source.chapterTitle) contextString += ` - ${source.chapterTitle}`;
          if (source.subsectionTitle)
            contextString += ` - ${source.subsectionTitle}`;
          contextString += `\n${source.content || "[Content not available]"}\n\n`;
        });
        return {
          toolData: {
            sources,
            prompt,
            toolUsed: "merge_and_rewrite",
            contextString,
          },
          toolResponse: {
            functionResponse: {
              name: "merge_and_rewrite",
              response: { context: contextString, prompt },
            },
          },
        };
      default:
        throw new Error(`Unknown function: ${name}`);
    }
  }

  export async function POST(req: Request) {
    if (!process.env.GOOGLE_API_KEY) {
      console.error("🔴 Google AI API key is not configured in .env.local");
      return NextResponse.json(
        {
          error:
            "The AI Assistant is not configured correctly. Please check the server configuration.",
        },
        { status: 500 }
      );
    }
    try {
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const { messages } = await req.json();
      const baseUrl = new URL(req.url).origin;
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: systemPrompt,
        tools: [
          {
            functionDeclarations: [
              {
                name: "search_content_hub",
                description:
                  "Searches for specific sections or topics within all books.",
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: { query: { type: SchemaType.STRING } },
                  required: ["query"],
                },
              },
              {
                name: "list_all_books",
                description:
                  "Provides a complete list of all available books in the library (lightweight overview).",
                parameters: { type: SchemaType.OBJECT, properties: {} },
              },
              {
                name: "find_books_by_subject",
                description:
                  "Finds and lists books related to a specific subject or keyword (lightweight overview).",
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: { subject: { type: SchemaType.STRING } },
                  required: ["subject"],
                },
              },
              {
                name: "get_book_details",
                description:
                  "Gets full details for a specific book including all chapters and sections.",
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: { bookTitle: { type: SchemaType.STRING } },
                  required: ["bookTitle"],
                },
              },
              {
                name: "merge_and_rewrite",
                description:
                  "Merges, combines, or rewrites provided source content based on a user prompt.",
                parameters: {
                  type: SchemaType.OBJECT,
                  properties: {
                    prompt: { type: SchemaType.STRING },
                    sources: {
                      type: SchemaType.ARRAY,
                      items: {
                        type: SchemaType.OBJECT,
                        properties: {
                          bookTitle: { type: SchemaType.STRING },
                          chapterTitle: { type: SchemaType.STRING },
                          subsectionTitle: { type: SchemaType.STRING },
                          content: { type: SchemaType.STRING },
                        },
                      },
                    },
                  },
                  required: ["prompt", "sources"],
                },
              },
            ],
          },
        ],
      });
      const history = messages.slice(0, -1).map((msg: Message) => {
        let combinedContent = msg.content;
        if (
          msg.role === "user" &&
          msg.stagedContent &&
          msg.stagedContent.length > 0
        ) {
          let contextString =
            "\n\n[The user attached the following content for context]:\n";
          for (const item of msg.stagedContent) {
            contextString += `\n--- ${item.type.toUpperCase()}: ${
              item.subsectionTitle || item.chapterTitle || item.bookTitle
            } ---\n${item.content}\n`;
          }
          combinedContent = contextString + "\n[User's message]:\n" + msg.content;
        }
        return {
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: combinedContent }],
        };
      });
      const lastUserMessage: Message = messages[messages.length - 1];
      let finalPromptParts: Part[] = [];
      if (
        lastUserMessage.stagedContent &&
        lastUserMessage.stagedContent.length > 0
      ) {
        let contextString = "\n\n=== ATTACHED CONTEXT ===\n";
        for (const item of lastUserMessage.stagedContent as StagedItem[]) {
          if (item.content) {
            contextString += `\n--- ${item.type.toUpperCase()}: `;
            if (item.type === "book") {
              contextString += `${item.bookTitle} ---\n${item.content}\n`;
            } else if (item.type === "chapter") {
              contextString += `${item.bookTitle} - ${item.chapterTitle} ---\n${item.content}\n`;
            } else if (item.type === "subsection") {
              contextString += `${item.bookTitle} - ${item.chapterTitle} - ${item.subsectionTitle} ---\n${item.content}\n`;
            }
          }
        }
        contextString += "\n=== END CONTEXT ===\n\n";
        contextString +=
          "IMPORTANT: Base your response EXCLUSIVELY on the context provided above.\n\n";
        finalPromptParts.push({ text: contextString });
      }
      finalPromptParts.push({ text: lastUserMessage.content });
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(finalPromptParts);
      const response = await result.response;
      const functionCalls = response.functionCalls();
      const processStreamAndAddFallback = async (
        streamResult: any,
        toolData: any = {}
      ) => {
        const encoder = new TextEncoder();
        return new ReadableStream({
          async start(controller) {
            try {
              let accumulatedResponse = "";
              let hasAddedBookDiscovery = false;
              for await (const chunk of streamResult.stream) {
                const text = chunk.text();
                if (text) {
                  accumulatedResponse += text;
                  controller.enqueue(encoder.encode(text));
                }
              }
              const userMessage = lastUserMessage.content;
              if (
                shouldCreateBookDiscovery(userMessage, toolData.toolUsed) &&
                !containsJSONBlock(accumulatedResponse, "bookDiscovery") &&
                !hasAddedBookDiscovery
              ) {
                let booksForDiscovery: BookSearchResult[] = [];
                let searchQuery = "";
                if (
                  toolData.toolUsed === "search_content_hub" &&
                  toolData.searchResults
                ) {
                  booksForDiscovery = formatSearchResultsForDiscovery(
                    toolData.searchResults
                  );
                  searchQuery = toolData.query;
                } else if (
                  [
                    "list_all_books",
                    "find_books_by_subject",
                    "get_book_details",
                  ].includes(toolData.toolUsed) &&
                  toolData.books
                ) {
                  const includeChapters =
                    toolData.toolUsed === "get_book_details";
                  booksForDiscovery = formatBooksForDiscovery(
                    toolData.books,
                    includeChapters
                  );
                  searchQuery = toolData.subject || toolData.bookTitle || "";
                }
                if (booksForDiscovery.length > 0) {
                  const jsonBlock = `\n\n\`\`\`json\n{\n  "type": "bookDiscovery",\n  "searchQuery": "${searchQuery}",\n  "books": ${JSON.stringify(
                    booksForDiscovery,
                    null,
                    2
                  )}\n}\n\`\`\``;
                  controller.enqueue(encoder.encode(jsonBlock));
                  hasAddedBookDiscovery = true;
                }
              }
              
              // --- CONTENT CREATION FALLBACK LOGIC REMOVED ---
              // The logic that checked `isTemplateCreationRequest` and `shouldCreateContent`
              // has been removed from this section.

            } catch (error: any) {
              console.error("🔴 Error in AI stream processing:", error);
              controller.enqueue(
                encoder.encode(
                  "I'm having trouble generating a response right now. Please try again."
                )
              );
            } finally {
              controller.close();
            }
          },
        });
      };
      if (functionCalls && functionCalls.length > 0) {
        try {
          const call = functionCalls[0];
          const { toolData, toolResponse } = await handleFunctionCall(
            call,
            baseUrl
          );
          const finalResult = await chat.sendMessageStream([toolResponse]);
          const readableStream = await processStreamAndAddFallback(
            finalResult,
            toolData
          );
          return new Response(readableStream, {
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        } catch (toolError: any) {
          console.error(`🔴 Error executing tool:`, toolError);
          return new Response(
            "I encountered an issue while trying to use my tools. Please try again.",
            { headers: { "Content-Type": "text/plain; charset=utf-8" } }
          );
        }
      } else {
        const streamResult = await chat.sendMessageStream(finalPromptParts);
        const readableStream = await processStreamAndAddFallback(streamResult);
        return new Response(readableStream, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    } catch (error: any)
    {
      console.error("🔴 Error during AI request processing:", error);
      let errorMessage = "An error occurred with the AI service.";
      let statusCode = 500;
      if (error.message.includes("API key")) {
        errorMessage = "AI service configuration error.";
      } else if (
        error.message.includes("quota") ||
        error.message.includes("429")
      ) {
        errorMessage =
          "AI service is temporarily unavailable due to high demand.";
        statusCode = 429;
      } else if (error.message.includes("timeout")) {
        errorMessage = "AI service request timed out.";
        statusCode = 408;
      }
      return NextResponse.json({ error: errorMessage }, { status: statusCode });
    }
  }