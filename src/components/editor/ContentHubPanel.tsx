//src/components/editor/ContentHubPanel.tsx

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { marked } from "marked";
import Fuse from "fuse.js";
import {
  ArrowLeft,
  Library,
  X,
  Loader2,
  Search,
  Maximize,
  Minimize,
  Check,
  Plus,
  Trash2,
  GripVertical,
  Book,
  FileText,
  Bot,
  ShoppingCart,
  Globe,
  Folder,
} from "lucide-react";

// --- Types and Interfaces (Unchanged) ---
interface Subsection {
  subsectionTitle: string;
  content: string;
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
interface BookOverview {
  bookTitle: string;
  coverImage: string;
  year?: number;
  license?: string;
  source?: string;
  chapterCount: number;
}
interface SearchResultItem {
  bookTitle: string;
  coverImage: string;
  chapterTitle: string;
  subsectionTitle: string;
  content: string;
  year?: number;
  license?: string;
  source?: string;
}
interface DraggableContent {
  type: "book" | "chapter" | "subsection";
  bookTitle: string;
  coverImage: string;
  chapterTitle?: string;
  subsectionTitle?: string;
  content?: string;
}

const contentFilters = [
  {
    id: "oer",
    name: "OER",
    icon: Book,
    color: "blue",
    description: "Open Educational Resources",
  },
  {
    id: "resources",
    name: "Resources",
    icon: Folder,
    color: "green",
    description: "General Resources",
  },
  {
    id: "ai",
    name: "AI",
    icon: Bot,
    color: "purple",
    description: "AI Generated Content",
  },
  {
    id: "marketplace",
    name: "Marketplace",
    icon: ShoppingCart,
    color: "orange",
    description: "Premium Content",
  },
];

// --- NEW: Reusable ContentItemCard Component ---
// This component unifies the look and feel of all draggable content items.
const ContentItemCard = ({
  item,
  isSelected,
  onToggleSelect,
  onDragStart,
}: {
  item: SearchResultItem;
  isSelected: boolean;
  onToggleSelect: (item: SearchResultItem) => void;
  onDragStart: (e: React.DragEvent, data: DraggableContent) => void;
}) => (
  <div
    className={`flex items-center gap-3 group p-4 transition-all duration-200 cursor-grab rounded-xl ${
      isSelected
        ? "bg-blue-50/50 border border-blue-200"
        : "bg-gray-50/50 hover:bg-white hover:shadow-sm border border-transparent"
    }`}
    draggable
    onDragStart={(e) => onDragStart(e, { type: "subsection", ...item })}
  >
    <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0 group-hover:text-gray-600 transition-colors" />
    <div className="flex-1 min-w-0">
      <span className="text-sm font-medium text-gray-900 block truncate">
        {item.subsectionTitle}
      </span>
      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
        {item.chapterTitle}
      </p>
    </div>
    <button
      onClick={() => onToggleSelect(item)}
      className={`ml-4 text-xs font-medium px-3 py-1.5 rounded-md transition-all duration-200 flex items-center gap-1.5 cursor-pointer flex-shrink-0 ${
        isSelected
          ? "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm"
          : "bg-blue-600 text-white hover:bg-blue-700"
      }`}
    >
      {isSelected ? (
        <Check className="w-3 h-3" />
      ) : (
        <Plus className="w-3 h-3" />
      )}
      {isSelected ? "Selected" : "Add"}
    </button>
  </div>
);

// --- ContentFilterBar and StagingModal (Unchanged) ---
const ContentFilterBar = ({
  activeFilter,
  onFilterChange,
  isExpanded,
}: {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  isExpanded: boolean;
}) => (
  <div className="p-4 border-b border-gray-100 flex-shrink-0">
    {" "}
    <div
      className={`flex gap-2 ${isExpanded ? "flex-wrap" : "overflow-x-auto"}`}
    >
      {" "}
      {contentFilters.map((filter) => {
        const IconComponent = filter.icon;
        const isActive = activeFilter === filter.id;
        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            title={filter.description}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
              isActive
                ? `bg-${filter.color}-50 text-${filter.color}-700 border border-${filter.color}-200 shadow-sm`
                : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200"
            }`}
          >
            {" "}
            <IconComponent className="w-4 h-4" /> <span>{filter.name}</span>{" "}
          </button>
        );
      })}{" "}
    </div>{" "}
  </div>
);
const StagingModal = ({
  items,
  onImport,
  onClose,
}: {
  items: SearchResultItem[];
  onImport: (htmlBlocks: string[], createChapters: boolean) => void;
  onClose: () => void;
}) => {
  const [stagedItems, setStagedItems] = useState(
    items.map((item) => ({
      ...item,
      id: Math.random(),
      initialContent: item.content,
    }))
  );
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [createChapters, setCreateChapters] = useState(true);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const formatContentAsHtml = (text: string) => {
    if (!text) return "";
    const paragraphs = text.replace(/\r\n?/g, "\n").split("\n\n");
    return paragraphs
      .map((p) =>
        p.trim().length > 0
          ? `<p>${marked.parseInline(p.replace(/\n/g, "<br />"))}</p>`
          : ""
      )
      .join("");
  };
  useEffect(() => {
    contentRefs.current = contentRefs.current.slice(0, stagedItems.length);
  }, [stagedItems]);
  const handleSelectItem = (index: number) => {
    setActiveItemIndex(index);
    contentRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };
  const handleContentChange = (newHtml: string, index: number) => {
    const updatedItems = [...stagedItems];
    updatedItems[index].content = newHtml;
    setStagedItems(updatedItems);
  };
  const handleRemoveItem = (indexToRemove: number) => {
    setStagedItems((prev) => {
      const newItems = prev.filter((_, i) => i !== indexToRemove);
      if (activeItemIndex >= newItems.length) {
        setActiveItemIndex(Math.max(0, newItems.length - 1));
      }
      return newItems;
    });
  };
  const handleDragSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const newStagedItems = [...stagedItems];
    const draggedItemContent = newStagedItems.splice(dragItem.current, 1)[0];
    newStagedItems.splice(dragOverItem.current, 0, draggedItemContent);
    setStagedItems(newStagedItems);
    setActiveItemIndex(dragOverItem.current);
    dragItem.current = null;
    dragOverItem.current = null;
  };
  const handleImportClick = () => {
    const htmlBlocks = stagedItems.map((item) => {
      const header = `<h2>${item.subsectionTitle}</h2>`;
      const subheader = `<h4>From: ${item.bookTitle} - ${item.chapterTitle}</h4>`;
      const contentHtml =
        item.content === item.initialContent
          ? formatContentAsHtml(item.initialContent)
          : item.content;
      return `${header}${subheader}${contentHtml}`;
    });
    onImport(htmlBlocks, createChapters);
  };
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
      {" "}
      <div className="bg-white rounded-xl w-full max-w-7xl flex flex-col h-[90vh] overflow-hidden shadow-2xl border border-gray-200">
        {" "}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          {" "}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Compose & Import
            </h2>
            <p className="text-gray-600 mt-1">
              Organize and edit your selected content before importing.
            </p>
          </div>{" "}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>{" "}
        </div>{" "}
        <div className="flex-1 flex min-h-0">
          {" "}
          <div className="w-80 bg-gray-50/80 border-r border-gray-200 flex flex-col">
            {" "}
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="font-semibold text-gray-900">
                {stagedItems.length} Item(s) Staged
              </h3>
            </div>{" "}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {" "}
              {stagedItems.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onClick={() => handleSelectItem(index)}
                  onDragStart={() => (dragItem.current = index)}
                  onDragEnter={() => (dragOverItem.current = index)}
                  onDragEnd={handleDragSort}
                  onDragOver={(e) => e.preventDefault()}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 group ${
                    activeItemIndex === index
                      ? "bg-blue-50 border border-blue-200"
                      : "hover:bg-white hover:shadow-sm border border-transparent"
                  }`}
                >
                  {" "}
                  <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.subsectionTitle}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {item.bookTitle}
                    </p>
                  </div>{" "}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveItem(index);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex-1 overflow-y-auto p-8 bg-white">
            {" "}
            {stagedItems.length > 0 ? (
              <div className="space-y-8">
                {" "}
                {stagedItems.map((item, index) => (
                  <div
                    key={item.id}
                    ref={(el) => {
                      contentRefs.current[index] = el;
                    }}
                    className={`p-6 rounded-xl transition-all duration-300 ${
                      activeItemIndex === index
                        ? "bg-blue-50/30 ring-2 ring-blue-200/50"
                        : "hover:bg-gray-50/50"
                    }`}
                  >
                    {" "}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {item.subsectionTitle}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {item.bookTitle} • {item.chapterTitle}
                    </p>{" "}
                    <div
                      className="prose prose-sm max-w-none focus:outline-none min-h-[100px] p-4 border border-gray-200 rounded-lg focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      contentEditable
                      suppressContentEditableWarning
                      dangerouslySetInnerHTML={{
                        __html: formatContentAsHtml(item.initialContent),
                      }}
                      onBlur={(e) =>
                        handleContentChange(e.currentTarget.innerHTML, index)
                      }
                    />{" "}
                  </div>
                ))}{" "}
              </div>
            ) : (
              <div className="text-center h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Library className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Staging Area is Empty
                </h3>
                <p className="text-gray-600">
                  Add content from the hub to get started.
                </p>
              </div>
            )}{" "}
          </div>{" "}
        </div>{" "}
        <div className="p-6 bg-gray-50/80 border-t border-gray-200 flex justify-between items-center">
          {" "}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="create-chapters-checkbox"
              checked={createChapters}
              onChange={(e) => setCreateChapters(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
            />
            <label
              htmlFor="create-chapters-checkbox"
              className="ml-3 text-sm font-medium text-gray-700 cursor-pointer"
            >
              Create a new chapter for each item
            </label>
          </div>{" "}
          <button
            onClick={handleImportClick}
            disabled={stagedItems.length === 0}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2 cursor-pointer"
          >
            Import {stagedItems.length > 0 && `${stagedItems.length} Item(s)`}
          </button>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};

// --- BookDetailView (Now uses ContentItemCard) ---
const BookDetailView = ({
  bookOverview,
  onBack,
  selectedItems,
  onToggleSelect,
  onDragStart,
  getBackLabel, // <-- NEW PROP
}: {
  bookOverview: BookOverview;
  onBack: () => void;
  selectedItems: SearchResultItem[];
  onToggleSelect: (item: SearchResultItem) => void;
  onDragStart: (e: React.DragEvent, data: DraggableContent) => void;
  getBackLabel: () => string; // <-- NEW PROP
}) => {
  const { data: fullBooks = [], isLoading: isLoadingBook } = useQuery<Book[]>({
    queryKey: ["fullBook", bookOverview.bookTitle],
    queryFn: async () => {
      const response = await fetch(
        `/api/oer-library?bookTitle=${encodeURIComponent(
          bookOverview.bookTitle
        )}`
      );
      if (!response.ok) throw new Error("Failed to fetch book details");
      return response.json();
    },
  });

  const fullBook = fullBooks[0];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        {/* UPDATED: Back button with dynamic label */}
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-4 font-medium transition-colors duration-200 text-sm cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {getBackLabel()}
        </button>
        <div
          className="flex items-start gap-4 cursor-grab"
          draggable
          onDragStart={(e) =>
            onDragStart(e, {
              type: "book",
              bookTitle: bookOverview.bookTitle,
              coverImage: bookOverview.coverImage,
            })
          }
        >
          <img
            src={bookOverview.coverImage}
            alt={bookOverview.bookTitle}
            className="w-16 h-20 object-cover rounded-lg shadow-sm border border-gray-200 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-gray-900 mb-1 truncate">
              {bookOverview.bookTitle}
            </h3>
            <p className="text-gray-600 text-sm mb-2">
              {isLoadingBook
                ? "Loading chapters..."
                : `${
                    fullBook?.chapters?.length || bookOverview.chapterCount
                  } chapters available`}
            </p>
            {(bookOverview.source ||
              bookOverview.year ||
              bookOverview.license) && (
              <div className="text-xs text-gray-500 space-x-3">
                {bookOverview.source && <span>{bookOverview.source}</span>}
                {bookOverview.year && <span>{bookOverview.year}</span>}
                {bookOverview.license && <span>{bookOverview.license}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoadingBook ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : fullBook?.chapters ? (
          <div className="p-4 space-y-4">
            {fullBook.chapters.map((chapter, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div
                  className="p-4 bg-gray-50/50 border-b border-gray-100 cursor-grab hover:bg-gray-100 transition-colors flex items-center gap-3"
                  draggable
                  onDragStart={(e) =>
                    onDragStart(e, {
                      type: "chapter",
                      bookTitle: bookOverview.bookTitle,
                      coverImage: bookOverview.coverImage,
                      chapterTitle: chapter.chapterTitle,
                    })
                  }
                >
                  <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-base">
                      {chapter.chapterTitle}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {chapter.subsections.length} sections
                    </p>
                  </div>
                </div>
                {/* UPDATED: Using the new ContentItemCard for consistency */}
                <div className="divide-y divide-gray-100">
                  {chapter.subsections.map((subsection, subIndex) => {
                    const item: SearchResultItem = {
                      ...subsection,
                      bookTitle: bookOverview.bookTitle,
                      coverImage: bookOverview.coverImage,
                      chapterTitle: chapter.chapterTitle,
                      source: bookOverview.source,
                      year: bookOverview.year,
                      license: bookOverview.license,
                    };
                    const isSelected = selectedItems.some(
                      (si) =>
                        si.subsectionTitle === item.subsectionTitle &&
                        si.chapterTitle === item.chapterTitle
                    );
                    return (
                      <ContentItemCard
                        key={subIndex}
                        item={item}
                        isSelected={isSelected}
                        onToggleSelect={onToggleSelect}
                        onDragStart={onDragStart}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Library className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">
              No chapters found for this book
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- TopBookResults (Unchanged) ---
const TopBookResults = ({
  rankedBooks,
  onBookSelect,
  selectedBook,
}: {
  rankedBooks: { bookTitle: string; coverImage: string; count: number }[];
  onBookSelect: (bookTitle: string | null) => void;
  selectedBook: string | null;
}) => (
  <div className="mb-8">
    {" "}
    <div className="flex justify-between items-center mb-4 px-6">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
        Top Matches
      </h3>
      {selectedBook && (
        <button
          onClick={() => onBookSelect(null)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all duration-200 cursor-pointer"
        >
          Show all results
        </button>
      )}
    </div>{" "}
    <div className="flex gap-4 overflow-x-auto pb-6 px-6">
      {" "}
      {rankedBooks.map((book) => (
        <button
          key={book.bookTitle}
          onClick={() => onBookSelect(book.bookTitle)}
          className={`flex-shrink-0 w-36 text-center p-3 rounded-xl transition-all duration-300 hover:scale-105 border cursor-pointer ${
            selectedBook === book.bookTitle
              ? "bg-blue-50 border-2 border-blue-200 shadow-sm"
              : "bg-white hover:shadow-md border-gray-200 hover:border-gray-300"
          }`}
        >
          {" "}
          <div className="relative mb-3">
            <img
              src={book.coverImage}
              alt={book.bookTitle}
              className="w-full h-auto object-cover aspect-[3/4] rounded-lg shadow-sm"
            />
            <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
              {book.count}
            </span>
          </div>{" "}
          <p className="text-xs font-semibold text-gray-900 truncate">
            {book.bookTitle}
          </p>{" "}
        </button>
      ))}{" "}
    </div>{" "}
    <div className="mx-6 h-px bg-gray-200" />{" "}
  </div>
);

// --- Main ContentHubPanel Component ---
const ContentHubPanel = ({
  onImport,
  onClose,
  isExpanded,
  onToggleExpand,
  hasLeftPanel,
  isSidebarCollapsed,
}: {
  onImport: (htmlBlocks: string[], createChapters: boolean) => void;
  onClose: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  hasLeftPanel?: boolean;
  isSidebarCollapsed?: boolean;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("oer");
  const [fuse, setFuse] = useState<Fuse<SearchResultItem> | null>(null);

  // --- UPGRADED STATE MANAGEMENT ---
  const [viewStack, setViewStack] = useState<string[]>(["browse"]);
  const currentView = viewStack[viewStack.length - 1];

  const [selectedBook, setSelectedBook] = useState<BookOverview | null>(null);
  const [filteredBookTitle, setFilteredBookTitle] = useState<string | null>(
    null
  );
  const [selectedItems, setSelectedItems] = useState<SearchResultItem[]>([]);
  const [isStagingModalOpen, setIsStagingModalOpen] = useState(false);

  const { data: library = [], isLoading: isLoadingLibrary } = useQuery<
    BookOverview[]
  >({
    queryKey: ["oerLibraryOverview"],
    queryFn: async () => {
      const response = await fetch("/api/oer-library");
      if (!response.ok) throw new Error("Failed to fetch library");
      return response.json();
    },
  });

  useEffect(() => {
    if (library.length > 0) {
      const fetchFullLibraryForSearch = async () => {
        try {
          const response = await fetch("/api/oer-library?full=true");
          const fullLibrary: Book[] = await response.json();

          const allSubsections: SearchResultItem[] = [];
          fullLibrary.forEach((book: Book) => {
            book.chapters.forEach((chapter: Chapter) => {
              chapter.subsections.forEach((subsection: Subsection) => {
                allSubsections.push({
                  ...subsection,
                  bookTitle: book.bookTitle,
                  coverImage: book.coverImage,
                  chapterTitle: chapter.chapterTitle,
                  year: book.year,
                  license: book.license,
                  source: book.source,
                });
              });
            });
          });

          setFuse(
            new Fuse(allSubsections, {
              keys: [
                "subsectionTitle",
                "content",
                "chapterTitle",
                "bookTitle",
                "source",
              ],
              includeScore: true,
              threshold: 0.4,
              minMatchCharLength: 3,
            })
          );
        } catch (error) {
          console.error("Failed to fetch full library for search:", error);
        }
      };

      fetchFullLibraryForSearch();
    }
  }, [library]);

  const handleDragStart = (e: React.DragEvent, data: DraggableContent) => {
    e.dataTransfer.setData(
      "application/oer-content-item",
      JSON.stringify(data)
    );
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleToggleSelectItem = (item: SearchResultItem) => {
    setSelectedItems((prev) => {
      const isSelected = prev.some(
        (si) =>
          si.subsectionTitle === item.subsectionTitle &&
          si.chapterTitle === item.chapterTitle
      );
      if (isSelected) {
        return prev.filter(
          (si) =>
            !(
              si.subsectionTitle === item.subsectionTitle &&
              si.chapterTitle === item.chapterTitle
            )
        );
      } else {
        return [...prev, item];
      }
    });
  };
  const handleImport = (htmlBlocks: string[], createChapters: boolean) => {
    onImport(htmlBlocks, createChapters);
    setIsStagingModalOpen(false);
    setSelectedItems([]);
    onClose();
  };

  // --- UPGRADED NAVIGATION LOGIC ---
  useEffect(() => {
    if (searchQuery.length >= 3) {
      setViewStack(["search"]);
      setFilteredBookTitle(null);
    } else if (currentView === "search") {
      setViewStack(["browse"]);
    }
  }, [searchQuery]);

  const handleBookClick = (book: BookOverview) => {
    setSelectedBook(book);
    setViewStack((prev) => [...prev, "detail"]);
  };

  const handleBack = () => {
    if (viewStack.length > 1) {
      setViewStack((prev) => prev.slice(0, -1));
    }
  };

  const getBackLabel = () => {
    const previousView = viewStack[viewStack.length - 2];
    if (previousView === "search") {
      return `Back to search results for "${searchQuery}"`;
    }
    return "Back to Library";
  };

  const searchResults =
    searchQuery.length >= 3 && fuse ? fuse.search(searchQuery) : [];

  const rankedAndGroupedResults = searchResults.reduce(
    (
      acc: {
        [key: string]: {
          bookTitle: string;
          coverImage: string;
          sections: SearchResultItem[];
          count: number;
          source?: string;
          year?: number;
          license?: string;
        };
      },
      { item }
    ) => {
      if (!acc[item.bookTitle]) {
        acc[item.bookTitle] = {
          bookTitle: item.bookTitle,
          coverImage: item.coverImage,
          sections: [],
          count: 0,
          source: item.source,
          year: item.year,
          license: item.license,
        };
      }
      acc[item.bookTitle].sections.push(item);
      acc[item.bookTitle].count++;
      return acc;
    },
    {}
  );

  const topRankedBooks = Object.values(rankedAndGroupedResults).sort(
    (a, b) => b.count - a.count
  );
  const booksToDisplay = filteredBookTitle
    ? topRankedBooks.filter((b) => b.bookTitle === filteredBookTitle)
    : topRankedBooks;

  const filteredLibrary = library;

  const getOptimalWidth = () => {
    if (isExpanded) {
      let availableWidth = "100vw";
      if (hasLeftPanel) {
        availableWidth = "calc(100vw - 480px)";
      }
      if (!isSidebarCollapsed) {
        availableWidth = hasLeftPanel
          ? "calc(100vw - 480px - 256px)"
          : "calc(100vw - 256px)";
      } else {
        availableWidth = hasLeftPanel
          ? "calc(100vw - 480px - 80px)"
          : "calc(100vw - 80px)";
      }
      return availableWidth;
    } else {
      return "24rem";
    }
  };
  const getGridColumns = () => {
    if (!isExpanded) return "grid-cols-2";
    if (hasLeftPanel && !isSidebarCollapsed) {
      return "grid-cols-3";
    } else if (hasLeftPanel || !isSidebarCollapsed) {
      return "grid-cols-4";
    } else {
      return "grid-cols-6";
    }
  };

  return (
    <>
      <div
        className={`bg-white border-l border-gray-200 flex flex-col h-full flex-shrink-0 transition-all duration-300 shadow-lg`}
        style={{ width: getOptimalWidth() }}
      >
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <Library className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Content Hub</h3>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={onToggleExpand}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 cursor-pointer"
                title={isExpanded ? "Minimize" : "Expand"}
              >
                {isExpanded ? (
                  <Minimize className="w-5 h-5 text-gray-600" />
                ) : (
                  <Maximize className="w-5 h-5 text-gray-600" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 cursor-pointer"
                title="Close Content Hub"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {currentView !== "detail" && (
          <ContentFilterBar
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            isExpanded={isExpanded}
          />
        )}

        {currentView !== "detail" && (
          <div className="p-6 border-b border-gray-100 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder={`Search ${contentFilters
                  .find((f) => f.id === activeFilter)
                  ?.name.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all duration-200"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-24 min-h-0">
          {isLoadingLibrary && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          )}

          {currentView === "browse" && !isLoadingLibrary && (
            <>
              {activeFilter === "oer" && (
                <div className={`grid gap-4 p-6 ${getGridColumns()}`}>
                  {filteredLibrary.map((book: BookOverview, index) => (
                    <div
                      key={index}
                      className="text-left group hover:scale-105 transition-all duration-300 cursor-pointer"
                      draggable
                      onDragStart={(e) =>
                        handleDragStart(e, {
                          type: "book",
                          bookTitle: book.bookTitle,
                          coverImage: book.coverImage,
                        })
                      }
                    >
                      <div
                        onClick={() => handleBookClick(book)}
                        className="overflow-hidden rounded-xl border border-gray-200 shadow-sm group-hover:shadow-md transition-shadow duration-300"
                      >
                        <img
                          src={book.coverImage}
                          alt={book.bookTitle}
                          className="w-full h-auto object-cover aspect-[3/4] group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <p
                        onClick={() => handleBookClick(book)}
                        className="text-sm font-semibold text-gray-900 mt-3 truncate group-hover:text-blue-700 transition-colors duration-200"
                      >
                        {book.bookTitle}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {activeFilter !== "oer" && (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    {React.createElement(
                      contentFilters.find((f) => f.id === activeFilter)?.icon ||
                        Globe,
                      { className: "w-8 h-8 text-gray-400" }
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Coming Soon
                  </h3>
                  <p className="text-gray-600">
                    {
                      contentFilters.find((f) => f.id === activeFilter)
                        ?.description
                    }{" "}
                    will be available in a future update.
                  </p>
                </div>
              )}
            </>
          )}

          {currentView === "search" &&
            !isLoadingLibrary &&
            (topRankedBooks.length > 0 ? (
              <div>
                <TopBookResults
                  rankedBooks={topRankedBooks}
                  onBookSelect={setFilteredBookTitle}
                  selectedBook={filteredBookTitle}
                />
                <div className="p-6 pt-2 space-y-6">
                  {booksToDisplay.map((group, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                    >
                      <div className="p-5 bg-gray-50 flex items-center gap-4">
                        <img
                          src={group.coverImage}
                          alt={group.bookTitle}
                          className="w-12 h-16 object-cover rounded-lg border border-gray-200 shadow-sm"
                        />
                        <div>
                          <h4
                            className="font-bold text-gray-900 text-lg cursor-pointer hover:text-blue-700"
                            onClick={() => {
                              const bookData = library.find(
                                (b) => b.bookTitle === group.bookTitle
                              );
                              if (bookData) {
                                handleBookClick(bookData);
                              }
                            }}
                          >
                            {group.bookTitle}
                          </h4>

                          <p className="text-sm text-gray-600">
                            {group.source ? `${group.source} • ` : ""}
                            {group.sections.length} relevant sections
                          </p>
                        </div>
                      </div>
                      {/* UPDATED: Using the new ContentItemCard for consistency */}
                      <div className="p-2 space-y-1">
                        {group.sections.map((item, subIndex) => {
                          const isSelected = selectedItems.some(
                            (si) =>
                              si.subsectionTitle === item.subsectionTitle &&
                              si.chapterTitle === item.chapterTitle
                          );
                          return (
                            <ContentItemCard
                              key={subIndex}
                              item={item}
                              isSelected={isSelected}
                              onToggleSelect={handleToggleSelectItem}
                              onDragStart={handleDragStart}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">
                  No results found for "{searchQuery}"
                </p>
              </div>
            ))}

          {currentView === "detail" && selectedBook && (
            <BookDetailView
              bookOverview={selectedBook}
              onBack={handleBack}
              selectedItems={selectedItems}
              onToggleSelect={handleToggleSelectItem}
              onDragStart={handleDragStart}
              getBackLabel={getBackLabel}
            />
          )}
        </div>

        {selectedItems.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 flex items-center justify-between animate-in slide-in-from-bottom shadow-lg">
            <p className="text-sm font-semibold text-gray-900">
              <span className="bg-blue-600 text-white rounded-full px-3 py-1.5 mr-3 text-xs font-bold">
                {selectedItems.length}
              </span>
              Item(s) selected
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedItems([])}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 cursor-pointer"
                title="Clear selection"
              >
                <Trash2 className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => setIsStagingModalOpen(true)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors duration-200 cursor-pointer"
              >
                Compose & Import
              </button>
            </div>
          </div>
        )}
      </div>

      {isStagingModalOpen && (
        <StagingModal
          items={selectedItems}
          onImport={handleImport}
          onClose={() => setIsStagingModalOpen(false)}
        />
      )}
    </>
  );
};

export default ContentHubPanel;
