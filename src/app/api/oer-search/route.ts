//src/app/api/oer-search/route.ts

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import Fuse from "fuse.js";

export const runtime = 'nodejs';

// --- UPGRADE: Add coverImage to the interface ---
interface OerSection {
  bookTitle: string;
  chapterTitle: string;
  subsectionTitle: string;
  content: string;
  coverImage: string; // <-- ADDED
}

let fuse: Fuse<OerSection> | null = null;
let isInitialized = false;

async function initializeSearchIndex() {
  if (isInitialized) {
    return;
  }

  console.log("🚀 Initializing OER Search Index (Node.js Runtime)...");
  const libraryDir = path.join(process.cwd(), "src", "lib");
  const allSections: OerSection[] = [];

  try {
    const files = await fs.readdir(libraryDir);
    const libraryFiles = files.filter(file => file.startsWith("oer-library-") && file.endsWith(".json"));

    for (const file of libraryFiles) {
      // --- UPGRADE: Generate the cover path from the unique file identifier ---
      const bookIdentifier = file.replace("oer-library-", "").replace(".json", "");
      const coverImage = `/covers/${bookIdentifier}.png`;

      const filePath = path.join(libraryDir, file);
      const fileContent = await fs.readFile(filePath, "utf-8");
      const sectionsFromFile = JSON.parse(fileContent);

      // --- UPGRADE: Add the correct coverImage to every section ---
      const sectionsWithCovers = sectionsFromFile.map((section: any) => ({
        ...section,
        coverImage: coverImage, // <-- ADDED
      }));

      allSections.push(...sectionsWithCovers);
    }

    const options = {
      keys: [
        { name: "subsectionTitle", weight: 0.7 },
        { name: "content", weight: 0.3 },
        { name: "chapterTitle", weight: 0.2 },
        { name: "bookTitle", weight: 0.1 },
      ],
      includeScore: true,
      threshold: 0.4,
      minMatchCharLength: 3,
    };

    fuse = new Fuse(allSections, options);
    isInitialized = true;
    console.log(`✅ OER Search Index initialized with ${allSections.length} sections.`);

  } catch (error)
  {
    console.error("❌ Failed to initialize OER Search Index:", error);
    isInitialized = true;
  }
}

export async function GET(request: Request) {
  await initializeSearchIndex();

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Search query is required." }, { status: 400 });
  }

  if (!fuse) {
    return NextResponse.json({ error: "Search index is not available." }, { status: 500 });
  }

  const results = fuse.search(query);
  const formattedResults = results.map(result => result.item);

  return NextResponse.json(formattedResults);
}