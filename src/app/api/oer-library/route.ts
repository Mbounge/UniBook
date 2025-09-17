//src/app/api/oer-library/route.ts

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import Fuse from "fuse.js";

export const runtime = 'nodejs';

interface Subsection {
  subsectionTitle: string;
  content: string;
  year?: number;
  license?: string;
  source?: string;
}

interface Chapter {
  chapterTitle: string;
  subsections: Subsection[];
}

interface Book {
  bookTitle: string;
  coverImage: string;
  chapters: Chapter[];
  year?: number;
  license?: string;
  source?: string;
}

// NEW: Lightweight book interface for overview responses
interface BookOverview {
  bookTitle: string;
  coverImage: string;
  year?: number;
  license?: string;
  source?: string;
  chapterCount: number;
}

let library: Book[] | null = null;
let isInitialized = false;

async function initializeLibrary() {
  if (isInitialized) {
    return;
  }

  console.log("🚀 Initializing OER Library data for API (Node.js Runtime)...");
  const libraryDir = path.join(process.cwd(), "src", "lib");
  const tempLibrary: { [identifier: string]: { 
    bookTitle: string;
    coverImage: string; 
    sections: any[];
    year?: number;
    license?: string;
    source?: string;
  } } = {};

  try {
    const files = await fs.readdir(libraryDir);
    const libraryFiles = files.filter(file => file.startsWith("oer-library-") && file.endsWith(".json"));

    for (const file of libraryFiles) {
      const bookIdentifier = file.replace("oer-library-", "").replace(".json", "");
      const filePath = path.join(libraryDir, file);
      const fileContent = await fs.readFile(filePath, "utf-8");
      const sections = JSON.parse(fileContent);
      
      if (sections.length > 0) {
        const { bookTitle, year, license, source } = sections[0];
        tempLibrary[bookIdentifier] = {
          bookTitle,
          coverImage: `/covers/${bookIdentifier}.png`,
          sections: sections,
          year,
          license,
          source,
        };
      }
    }

    const finalLibrary: Book[] = Object.values(tempLibrary).map((data) => {
      const chaptersMap: { [key: string]: Chapter } = {};
      for (const section of data.sections) {
        const { chapterTitle, subsectionTitle, content, year, license, source } = section;
        if (!chaptersMap[chapterTitle]) {
          chaptersMap[chapterTitle] = { chapterTitle: chapterTitle, subsections: [] };
        }
        chaptersMap[chapterTitle].subsections.push({ subsectionTitle, content, year, license, source });
      }
      return {
        bookTitle: data.bookTitle,
        coverImage: data.coverImage,
        chapters: Object.values(chaptersMap),
        year: data.year,
        license: data.license,
        source: data.source,
      };
    });

    library = finalLibrary;
    isInitialized = true;
    console.log(`✅ OER Library API initialized with ${library.length} book(s).`);

  } catch (error) {
    console.error("❌ Failed to initialize OER Library API:", error);
    isInitialized = true; 
  }
}

export async function GET(request: Request) {
  await initializeLibrary();

  if (!library) {
    return NextResponse.json({ error: "Library data is not available or failed to load." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const bookTitle = searchParams.get("bookTitle");
  const includeChapters = searchParams.get("includeChapters") === "true";

  // Handle specific book requests by title
  if (bookTitle) {
    console.log(`📚 OER Library API fetching specific book: "${bookTitle}"`);
    const book = library.find(b => b.bookTitle === bookTitle);
    if (book) {
      return NextResponse.json([book]); // Return as array for consistency
    } else {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }
  }

  // Handle search queries
  if (query) {
    console.log(`📚 OER Library API performing book search for: "${query}"`);
    const fuse = new Fuse(library, {
      keys: [
        { name: 'bookTitle', weight: 0.7 },
        { name: 'chapters.chapterTitle', weight: 0.3 },
        { name: 'chapters.subsections.subsectionTitle', weight: 0.2 },
        { name: 'source', weight: 0.1 },
      ],
      threshold: 0.4,
    });
    const results = fuse.search(query);
    const searchResults = results.map(result => result.item);

    // FIXED: Return appropriate type based on includeChapters parameter
    if (!includeChapters) {
      const lightweightResults: BookOverview[] = searchResults.map(book => ({
        bookTitle: book.bookTitle,
        coverImage: book.coverImage,
        year: book.year,
        license: book.license,
        source: book.source,
        chapterCount: book.chapters.length
      }));
      return NextResponse.json(lightweightResults);
    } else {
      return NextResponse.json(searchResults);
    }
  }

  // Handle requests for library overview
  const includeFullData = searchParams.get("full") === "true";
  
  if (includeFullData) {
    // Return complete library with all chapters
    return NextResponse.json(library);
  } else {
    // FIXED: Return lightweight library overview with proper typing
    const libraryOverview: BookOverview[] = library.map(book => ({
      bookTitle: book.bookTitle,
      coverImage: book.coverImage,
      year: book.year,
      license: book.license,
      source: book.source,
      chapterCount: book.chapters.length
    }));
    return NextResponse.json(libraryOverview);
  }
}