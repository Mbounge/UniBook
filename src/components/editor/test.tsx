"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEditor, EditorContent, BubbleMenu, Editor, ReactNodeViewRenderer } from "@tiptap/react";
import { Extension } from '@tiptap/core';
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { FontSize } from "@/components/editor/font-size";
import { CustomImage } from "@/components/editor/custom-image";
import ChatAssistant from "@/components/ai/chat-assistant";
import {
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Table as TableIcon, ChevronDown, ArrowLeft, Save,
  Image as ImageIcon, Highlighter, Code, MessageSquareQuote, Undo, Redo, Sparkles, Library, X, FileText, Loader2, Search, Book, ChevronRight, Maximize, Minimize, ChevronLeft as ChevronLeftIcon, ListTree,
  Palette
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSidebar } from "../../layout";
import { useQuery } from "@tanstack/react-query";
import { marked } from "marked";
import dynamic from "next/dynamic";
import MarkdownRenderer from "@/components/editor/MarkdownRenderer";
import Fuse from "fuse.js";

import { StyleStudio } from "@/components/editor/StyleStudio";
import { useThemeStore } from "@/hooks/useTheme";
import { CustomDocument } from "@/lib/tiptap/custom-document";
import { Page } from "@/lib/tiptap/page-node";
import PageView from "@/components/editor/PageView";
import { StatusBar } from "@/components/editor/StatusBar";
import "@/styles/editor.css";
import "@/styles/page-view.css";

// --- STEP 1: Import the new, correct PaginationExtension ---
import { PaginationExtension } from "@/lib/tiptap/PaginationExtension";

const TabHandler = Extension.create({
  name: 'tabHandler',
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (editor.isActive('listItem')) return editor.commands.sinkListItem('listItem');
        if (editor.isActive('tableCell')) return editor.commands.goToNextCell();
        return editor.commands.insertContent('\t');
      },
      'Shift-Tab': ({ editor }) => {
        if (editor.isActive('listItem')) return editor.commands.liftListItem('listItem');
        if (editor.isActive('tableCell')) return editor.commands.goToPreviousCell();
        return false;
      },
    };
  },
});

// ... (All other helper components remain unchanged)
const ToolbarButton = ({ onClick, title, isActive, disabled, children }: { onClick: () => void; title: string; isActive?: boolean; disabled?: boolean; children: React.ReactNode; }) => (
  <button onClick={onClick} title={title} disabled={disabled} className={`p-2 rounded-lg transition-all duration-200 ${isActive ? "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border border-blue-200" : "hover:bg-gray-100 text-gray-700 hover:text-gray-900 border border-transparent"} disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95`}>{children}</button>
);

const Dropdown = ({ options, value, onChange, title, widthClass = "w-40" }: { options: { label: string, value: string }[], value: string, onChange: (value: string) => void, title: string, widthClass?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find(opt => opt.value === value)?.label || value;
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className={`flex items-center justify-between px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 ${widthClass} hover:scale-105 active:scale-95`}>
        <span className="truncate font-medium text-gray-700">{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 ml-2 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className={`absolute z-20 top-full mt-2 bg-white rounded-lg border border-gray-200 overflow-hidden max-h-60 overflow-y-auto ${widthClass}`}>
          {options.map(option => (<button key={option.value} onClick={() => { onChange(option.value); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors duration-150 font-medium text-gray-700 hover:text-gray-900">{option.label}</button>))}
        </div>
      )}
    </div>
  );
};

const TableCreationGrid = ({ editor, close }: { editor: Editor; close: () => void; }) => {
  const [hovered, setHovered] = useState({ rows: 0, cols: 0 });
  const createTable = (rows: number, cols: number) => { editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run(); close(); };
  return (
    <div className="absolute z-50 bg-white rounded-lg border border-gray-200 p-4 mt-2 right-0 shadow-xl">
      {Array.from({ length: 5 }).map((_, r) => (<div key={r} className="flex">{Array.from({ length: 5 }).map((_, c) => (<div key={c} onMouseEnter={() => setHovered({ rows: r + 1, cols: c + 1 })} onClick={() => createTable(r + 1, c + 1)} className={`w-6 h-6 border border-gray-300 cursor-pointer transition-all duration-100 ${r < hovered.rows && c < hovered.cols ? "bg-blue-300 border-blue-400" : "bg-white hover:bg-gray-100"}`} />))}</div>))}
      <div className="text-center text-sm mt-2 font-medium text-gray-600">{hovered.rows} x {hovered.cols}</div>
    </div>
  );
};

interface Subsection { subsectionTitle: string; content: string; }
interface Chapter { chapterTitle: string; subsections: Subsection[]; }
interface Book { bookTitle: string; coverImage: string; chapters: Chapter[]; }
interface SearchResultItem { bookTitle: string; coverImage: string; chapterTitle: string; subsectionTitle: string; content: string; }
interface Heading { level: number; text: string; pos: number; }

const PreviewModal = ({ item, onImport, onClose }: { item: Subsection & { bookTitle: string, chapterTitle: string }; onImport: (htmlContent: string) => void; onClose: () => void; }) => {
  const finalHtml = marked.parse(item.content) as string;
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-lg w-full max-w-5xl flex flex-col h-[85vh] overflow-hidden border border-gray-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{item.subsectionTitle}</h2>
            <p className="text-sm text-gray-500 font-medium">{item.bookTitle} • {item.chapterTitle}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"><X className="w-5 h-5 text-gray-600" /></button>
        </div>
        <div className="p-8 flex-1 overflow-y-auto bg-gray-50/50"><MarkdownRenderer content={item.content} /></div>
        <div className="p-6 bg-white border-t border-gray-100 flex justify-end"><button onClick={() => onImport(finalHtml)} className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold hover:scale-105 active:scale-95">Import Content</button></div>
      </div>
    </div>
  );
};

const BookDetailView = ({ book, onBack, onPreview }: { book: Book; onBack: () => void; onPreview: (item: Subsection & { bookTitle: string, chapterTitle: string }) => void; }) => (
  <div className="flex flex-col h-full">
    <div className="p-6 border-b border-gray-100 flex-shrink-0">
      <button onClick={onBack} className="flex items-center text-sm text-blue-600 hover:text-blue-700 mb-6 font-medium transition-colors duration-200"><ArrowLeft className="w-4 h-4 mr-2" />Back to Library</button>
      <div className="flex items-center gap-6">
        <img src={book.coverImage} alt={book.bookTitle} className="w-20 h-24 object-cover rounded-lg border border-gray-200" />
        <div>
          <h3 className="font-bold text-xl text-gray-900 mb-1">{book.bookTitle}</h3>
          <p className="text-sm text-gray-500 font-medium">{book.chapters.length} chapters available</p>
        </div>
      </div>
    </div>
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-6">
        {book.chapters.map((chapter, index) => (<div key={index} className="bg-gray-50 rounded-lg p-5 border border-gray-100">
          <h4 className="font-bold text-gray-800 mb-4 text-lg">{chapter.chapterTitle}</h4>
          <div className="space-y-2">{chapter.subsections.map((subsection, subIndex) => (<div key={subIndex} className="flex justify-between items-center group hover:bg-white p-3 rounded-lg transition-all duration-200 border border-transparent hover:border-gray-200">
            <span className="text-sm text-gray-700 font-medium">{subsection.subsectionTitle}</span>
            <button onClick={() => onPreview({ ...subsection, bookTitle: book.bookTitle, chapterTitle: chapter.chapterTitle })} className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-700 text-xs font-semibold px-3 py-1.5 bg-blue-50 rounded-md hover:bg-blue-100 transition-all duration-200">Preview</button>
          </div>))}</div>
        </div>))}
      </div>
    </div>
  </div>
);

const TopBookResults = ({ rankedBooks, onBookSelect, selectedBook }: { rankedBooks: { bookTitle: string; coverImage: string; count: number }[]; onBookSelect: (bookTitle: string | null) => void; selectedBook: string | null; }) => (
  <div className="mb-8">
    <div className="flex justify-between items-center mb-4 px-6">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Top Matches</h3>
      {selectedBook && (<button onClick={() => onBookSelect(null)} className="text-xs text-blue-600 hover:text-blue-700 font-semibold px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all duration-200">Show all results</button>)}
    </div>
    <div className="flex gap-4 overflow-x-auto pb-6 px-6">
      {rankedBooks.map((book) => (<button key={book.bookTitle} onClick={() => onBookSelect(book.bookTitle)} className={`flex-shrink-0 w-36 text-center p-2 rounded-lg transition-all duration-300 hover:scale-105 ${selectedBook === book.bookTitle ? 'bg-blue-50 border-2 border-blue-200' : 'hover:bg-gray-100 border-2 border-transparent'}`}>
        <div className="relative mb-3"><img src={book.coverImage} alt={book.bookTitle} className="w-full h-auto object-cover aspect-[3/4] rounded-md border border-gray-200" /><span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">{book.count}</span></div>
        <p className="text-xs font-semibold text-gray-800 truncate">{book.bookTitle}</p>
      </button>))}
    </div>
    <div className="mx-6 h-px bg-gray-200"/>
  </div>
);

const ContentHubPanel = ({ editor, onClose, isExpanded, onToggleExpand }: { editor: Editor; onClose: () => void; isExpanded: boolean; onToggleExpand: () => void; }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [itemToPreview, setItemToPreview] = useState<Subsection & { bookTitle: string, chapterTitle: string } | null>(null);
  const [fuse, setFuse] = useState<Fuse<SearchResultItem> | null>(null);
  const [view, setView] = useState<'browse' | 'search' | 'detail'>('browse');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [filteredBookTitle, setFilteredBookTitle] = useState<string | null>(null);
  const { data: library = [], isLoading: isLoadingLibrary } = useQuery<Book[]>({ queryKey: ["oerLibrary"], queryFn: async () => { const response = await fetch('/api/oer-library'); if (!response.ok) throw new Error("Failed to fetch library"); return response.json(); }, });
  useEffect(() => {
    if (library.length > 0) {
      const allSubsections: SearchResultItem[] = [];
      library.forEach(book => { book.chapters.forEach(chapter => { chapter.subsections.forEach(subsection => { allSubsections.push({ ...subsection, bookTitle: book.bookTitle, coverImage: book.coverImage, chapterTitle: chapter.chapterTitle }); }); }); });
      setFuse(new Fuse(allSubsections, { keys: ["subsectionTitle", "content", "chapterTitle", "bookTitle"], includeScore: true, threshold: 0.4, minMatchCharLength: 3 }));
    }
  }, [library]);
  const searchResults = searchQuery.length >= 3 && fuse ? fuse.search(searchQuery) : [];
  const rankedAndGroupedResults = searchResults.reduce((acc, { item }) => {
    if (!acc[item.bookTitle]) { acc[item.bookTitle] = { bookTitle: item.bookTitle, coverImage: item.coverImage, sections: [], count: 0 }; }
    acc[item.bookTitle].sections.push(item);
    acc[item.bookTitle].count++;
    return acc;
  }, {} as { [key: string]: { bookTitle: string; coverImage: string; sections: SearchResultItem[]; count: number } });
  const topRankedBooks = Object.values(rankedAndGroupedResults).sort((a, b) => b.count - a.count);
  const booksToDisplay = filteredBookTitle ? topRankedBooks.filter(b => b.bookTitle === filteredBookTitle) : topRankedBooks;
  const handleImport = (htmlContent: string) => { if (editor) { editor.chain().focus().insertContent(htmlContent).run(); setItemToPreview(null); onClose(); } };
  useEffect(() => { if (searchQuery.length >= 3) { setView('search'); setFilteredBookTitle(null); } else { setView('browse'); } }, [searchQuery]);
  const handleBookClick = (book: Book) => { setSelectedBook(book); setView('detail'); };
  return (
    <>
      <div className={`bg-white border-l border-gray-100 flex flex-col h-full flex-shrink-0 transition-all duration-300 ${isExpanded ? 'w-full' : 'w-96'}`}>
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3"><div className="p-2 bg-blue-50 rounded-lg"><Library className="w-5 h-5 text-blue-600" /></div><h3 className="text-lg font-bold text-gray-900">Content Hub</h3></div>
            <div className="flex items-center space-x-2">
              <button onClick={onToggleExpand} className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95">{isExpanded ? <Minimize className="w-5 h-5 text-gray-600" /> : <Maximize className="w-5 h-5 text-gray-600" />}</button>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"><X className="w-5 h-5 text-gray-600" /></button>
            </div>
          </div>
        </div>
        {view !== 'detail' && (<div className="p-6"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="search" placeholder="Search OER library..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg focus:border-blue-400 focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-500 transition-all duration-200 bg-gray-50 hover:bg-white focus:bg-white" /></div></div>)}
        <div className="flex-1 overflow-y-auto">
          {isLoadingLibrary && (<div className="flex items-center justify-center p-8"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>)}
          {view === 'browse' && !isLoadingLibrary && (<div className={`grid gap-6 p-6 ${isExpanded ? 'grid-cols-6' : 'grid-cols-2'}`}>{library.map((book, index) => (<button key={index} onClick={() => handleBookClick(book)} className="text-left group hover:scale-105 transition-all duration-300"><div className="overflow-hidden rounded-lg border border-gray-100"><img src={book.coverImage} alt={book.bookTitle} className="w-full h-auto object-cover aspect-[3/4] group-hover:scale-110 transition-transform duration-500" /></div><p className="text-sm font-semibold text-gray-800 mt-3 truncate group-hover:text-blue-700 transition-colors duration-200">{book.bookTitle}</p></button>))}</div>)}
          {view === 'search' && !isLoadingLibrary && (topRankedBooks.length > 0 ? (<div><TopBookResults rankedBooks={topRankedBooks} onBookSelect={setFilteredBookTitle} selectedBook={filteredBookTitle} /><div className="p-6 pt-2 space-y-4">{booksToDisplay.map((group, index) => (<div key={index} className="border border-gray-200 rounded-lg overflow-hidden"><div className="p-4 bg-gray-50 flex items-center gap-4"><img src={group.coverImage} alt={group.bookTitle} className="w-12 h-16 object-cover rounded-md border border-gray-200" /><div><h4 className="font-bold text-gray-800 mb-1">{group.bookTitle}</h4><p className="text-xs text-gray-500 font-medium">{group.sections.length} relevant sections found</p></div></div><div className="p-4 space-y-3 bg-white">{group.sections.map((item, subIndex) => (<div key={subIndex} className="p-4 bg-gray-50/50 rounded-lg border border-gray-100"><p className="text-sm font-bold text-gray-800 mb-1">{item.subsectionTitle}</p><p className="text-xs text-gray-500 mb-3 font-medium">{item.chapterTitle}</p><button onClick={() => setItemToPreview(item)} className="w-full text-sm px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all duration-200 font-semibold hover:scale-105 active:scale-95">Preview & Import</button></div>))}</div></div>))}</div></div>) : (<div className="text-center py-12"><Search className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-sm text-gray-500 font-medium">No results found for "{searchQuery}"</p></div>))}
          {view === 'detail' && selectedBook && (<BookDetailView book={selectedBook} onBack={() => setView('browse')} onPreview={setItemToPreview} />)}
        </div>
      </div>
      {itemToPreview && (<PreviewModal item={itemToPreview} onImport={handleImport} onClose={() => setItemToPreview(null)} />)}
    </>
  );
};

const TableOfContentsPanel = ({ headings, onNavigate, onClose }: { headings: Heading[]; onNavigate: (pos: number) => void; onClose: () => void; }) => (
  <div className="w-72 bg-white border-r border-gray-100 flex flex-col h-full flex-shrink-0 animate-in slide-in-from-left duration-300">
    <div className="p-6 border-b border-gray-100 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3"><div className="p-2 bg-blue-50 rounded-lg"><ListTree className="w-5 h-5 text-blue-600" /></div><h3 className="text-lg font-bold text-gray-900">Outline</h3></div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"><X className="w-5 h-5 text-gray-600" /></button>
      </div>
    </div>
    <div className="flex-1 overflow-y-auto p-6">
      {headings.length > 0 ? (<ul className="space-y-2">{headings.map((heading, index) => (<li key={index} style={{ paddingLeft: `${(heading.level - 1) * 1}rem` }}><button onClick={() => onNavigate(heading.pos)} className="w-full text-left text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-md transition-colors duration-150">{heading.text}</button></li>))}</ul>) : (<div className="text-center py-12"><ListTree className="w-12 h-12 text-gray-300 mx-auto mb-4" /><p className="text-sm text-gray-500 font-medium">No headings found.</p><p className="text-xs text-gray-400 mt-1">Add headings to your document to create an outline.</p></div>)}
    </div>
  </div>
);

const ContentHubToggle = ({ isOpen, onClick }: { isOpen: boolean; onClick: () => void; }) => (
  <button onClick={onClick} className={`absolute top-28 z-30 flex items-center justify-center bg-white h-24 w-6 rounded-l-lg border-r-0 border-y border-l border-gray-200 shadow-md hover:bg-gray-50 transition-all duration-300`} style={{ right: isOpen ? '24rem' : '0rem' }} title={isOpen ? "Close Content Hub" : "Open Content Hub"}>{isOpen ? <ChevronRight className="w-5 h-5 text-gray-600" /> : <ChevronLeftIcon className="w-5 h-5 text-gray-600" />}</button>
);

const EditorComponent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isTableMenuOpen, setTableMenuOpen] = useState(false);
  const tableMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showStyleStudio, setShowStyleStudio] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showContentPanel, setShowContentPanel] = useState(false);
  const [showTocPanel, setShowTocPanel] = useState(false);
  const { setSidebarVisible } = useSidebar();
  const [isHubExpanded, setIsHubExpanded] = useState(false);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const bookTitle = searchParams.get('title') || "Untitled Book";
  const bookDescription = searchParams.get('description') || "";

  useEffect(() => {
    if (showAiPanel || showTocPanel || showStyleStudio) { setSidebarVisible(false); } else { setSidebarVisible(true); }
    return () => { setSidebarVisible(true); };
  }, [showAiPanel, showTocPanel, showStyleStudio, setSidebarVisible]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ document: false }),
      CustomDocument,
      Page.extend({ addNodeView() { return ReactNodeViewRenderer(PageView); } }),
      Underline, TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
      CustomImage, Highlight.configure({ multicolor: true }), TextStyle, FontFamily, FontSize,
      TabHandler,
      // --- STEP 2: Activate the new, robust pagination system ---
      PaginationExtension,
    ],
    content: `<page><h1>${bookTitle}</h1><p>${bookDescription}</p></page>`,
    editorProps: {
      attributes: { class: 'ProseMirror', tabindex: '0' },
      handleDrop: function(view, event, slice, moved) {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          event.preventDefault();
          const file = event.dataTransfer.files[0];
          handleImageUpload(file);
          return true;
        }
        return false;
      },
      handleKeyDown: (view, event) => {
        if (event.key === 'Tab') { event.preventDefault(); return false; }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      const newHeadings: Heading[] = [];
      editor.state.doc.forEach((node, pos) => { if (node.type.name === 'heading') { newHeadings.push({ level: node.attrs.level, text: node.textContent, pos: pos }); } });
      setHeadings(newHeadings);
    },
  });

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith("image/")) { toast({ title: "Invalid File Type", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = (e) => { const src = e.target?.result as string; if (src && editor) editor.chain().focus().setImage({ src }).run(); };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (tableMenuRef.current && !tableMenuRef.current.contains(event.target as Node)) setTableMenuOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleContentHub = () => { const isCurrentlyVisible = showContentPanel; setShowContentPanel(!isCurrentlyVisible); if (isCurrentlyVisible) setIsHubExpanded(false); };
  const handleNavigate = (pos: number) => { if (editor) { editor.commands.setTextSelection(pos); editor.commands.scrollIntoView(); } };
  const handleToggleAiPanel = () => { const newAiPanelState = !showAiPanel; setShowAiPanel(newAiPanelState); if (newAiPanelState) { setShowTocPanel(false); setShowStyleStudio(false); } };
  const handleToggleOutline = () => { const newOutlineState = !showTocPanel; setShowTocPanel(newOutlineState); if (newOutlineState) { setShowAiPanel(false); setShowStyleStudio(false); } };
  const handleToggleStyleStudio = () => { const newStyleStudioState = !showStyleStudio; setShowStyleStudio(newStyleStudioState); if (newStyleStudioState) { setShowAiPanel(false); setShowTocPanel(false); } };

  if (!editor) { return (<div className="h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" /><p className="text-gray-600 font-medium">Loading Editor...</p></div></div>); }

  const blockTypeOptions = [{ label: "Paragraph", value: "paragraph" }, { label: "Heading 1", value: "h1" }, { label: "Heading 2", value: "h2" }, { label: "Heading 3", value: "h3" }, { label: "Heading 4", value: "h4" }];
  const getCurrentBlockType = () => { if (editor.isActive('heading', { level: 1 })) return 'h1'; if (editor.isActive('heading', { level: 2 })) return 'h2'; if (editor.isActive('heading', { level: 3 })) return 'h3'; if (editor.isActive('heading', { level: 4 })) return 'h4'; return 'paragraph'; };
  const handleBlockTypeChange = (type: string) => { switch (type) { case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break; case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break; case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break; case 'h4': editor.chain().focus().toggleHeading({ level: 4 }).run(); break; default: editor.chain().focus().setParagraph().run(); } };
  const fontOptions = [{ label: "Inter", value: "Inter" }, { label: "Roboto", value: "Roboto" }, { label: "Lato", value: "Lato" }, { label: "Merriweather", value: "Merriweather" }, { label: "Inconsolata", value: "Inconsolata" }, { label: "Arial", value: "Arial" }, { label: "Georgia", value: "Georgia" }, { label: "Times New Roman", value: "Times New Roman" }];
  const currentFont = editor.getAttributes('textStyle').fontFamily || 'Inter';
  const fontSizeOptions = [{ label: "12pt", value: "12pt" }, { label: "14pt", value: "14pt" }, { label: "16pt", value: "16pt" }, { label: "18pt", value: "18pt" }, { label: "24pt", value: "24pt" }, { label: "30pt", value: "30pt" }, { label: "36pt", value: "36pt" }];
  const currentFontSize = editor.getAttributes('textStyle').fontSize || '16pt';

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex-shrink-0 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4"><button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"><ArrowLeft className="w-5 h-5 text-gray-600" /></button><div><h1 className="text-xl font-bold text-gray-900">{bookTitle}</h1></div></div>
          <div className="flex items-center gap-3">
            <button onClick={handleToggleAiPanel} className={`px-5 py-2 text-sm font-semibold rounded-lg flex items-center transition-all duration-200 hover:scale-105 active:scale-95 ${showAiPanel ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}><Sparkles className="w-4 h-4 mr-2" /> AI Assist</button>
            <div className="h-8 w-px bg-gray-200 mx-2"></div>
            <button className="px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg flex items-center border border-gray-200 transition-all duration-200 hover:scale-105 active:scale-95"><Save className="w-4 h-4 mr-2" /> Save Draft</button>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center font-semibold transition-all duration-200 hover:scale-105 active:scale-95">Publish</button>
          </div>
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden relative">
        {showTocPanel && <TableOfContentsPanel headings={headings} onNavigate={handleNavigate} onClose={() => setShowTocPanel(false)} />}
        {showAiPanel && <ChatAssistant isPanel={true} onClose={() => setShowAiPanel(false)} />}
        {showStyleStudio && editor && <StyleStudio editor={editor} onClose={handleToggleStyleStudio} />}
        {!isHubExpanded && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-shrink-0 w-full flex justify-center px-6 pt-4 bg-gray-50">
              <div className="w-full max-w-7xl">
                <div className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-lg p-3 sticky top-4 z-10 flex items-center flex-wrap gap-1">
                  <ToolbarButton onClick={handleToggleOutline} title="Outline" isActive={showTocPanel}><ListTree className="w-4 h-4" /></ToolbarButton>
                  <ToolbarButton onClick={handleToggleStyleStudio} title="Style Studio" isActive={showStyleStudio}><Palette className="w-4 h-4" /></ToolbarButton>
                  <div className="h-6 w-px bg-gray-200 mx-2"></div>
                  <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo" disabled={!editor.can().undo()}><Undo className="w-4 h-4" /></ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo" disabled={!editor.can().redo()}><Redo className="w-4 h-4" /></ToolbarButton>
                  <div className="h-6 w-px bg-gray-200 mx-2"></div>
                  <Dropdown options={blockTypeOptions} value={getCurrentBlockType()} onChange={handleBlockTypeChange} title="Block Type" widthClass="w-36" />
                  <div className="h-6 w-px bg-gray-200 mx-2"></div>
                  <Dropdown options={fontOptions} value={currentFont} onChange={(font: string) => editor.chain().focus().setFontFamily(font).run()} title="Font Family" />
                  <Dropdown options={fontSizeOptions} value={currentFontSize} onChange={(size: string) => editor.chain().focus().setFontSize(size).run()} title="Font Size" widthClass="w-24" />
                  <div className="h-6 w-px bg-gray-200 mx-2"></div>
                  <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} title="Bold" isActive={editor.isActive("bold")}><Bold className="w-4 h-4" /></ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic" isActive={editor.isActive("italic")}><Italic className="w-4 h-4" /></ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline" isActive={editor.isActive("underline")}><UnderlineIcon className="w-4 h-4" /></ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight({ color: '#FFF3A3' }).run()} title="Highlight" isActive={editor.isActive("highlight")}><Highlighter className="w-4 h-4" /></ToolbarButton>
                  <div className="h-6 w-px bg-gray-200 mx-2"></div>
                  <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align Left" isActive={editor.isActive({ textAlign: 'left' })}><AlignLeft className="w-4 h-4" /></ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align Center" isActive={editor.isActive({ textAlign: 'center' })}><AlignCenter className="w-4 h-4" /></ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align Right" isActive={editor.isActive({ textAlign: 'right' })}><AlignRight className="w-4 h-4" /></ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Align Justify" isActive={editor.isActive({ textAlign: 'justify' })}><AlignJustify className="w-4 h-4" /></ToolbarButton>
                  <div className="h-6 w-px bg-gray-200 mx-2"></div>
                  <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bulleted List" isActive={editor.isActive("bulletList")}><List className="w-4 h-4" /></ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List" isActive={editor.isActive("orderedList")}><ListOrdered className="w-4 h-4" /></ToolbarButton>
                  <div className="h-6 w-px bg-gray-200 mx-2"></div>
                  <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Add Image"><ImageIcon className="w-4 h-4" /></ToolbarButton>
                  <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])} className="hidden" accept="image/*" />
                  <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote" isActive={editor.isActive("blockquote")}><MessageSquareQuote className="w-4 h-4" /></ToolbarButton>
                  <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block" isActive={editor.isActive("codeBlock")}><Code className="w-4 h-4" /></ToolbarButton>
                  <div ref={tableMenuRef} className="relative"><ToolbarButton onClick={() => setTableMenuOpen(!isTableMenuOpen)} title="Insert Table"><TableIcon className="w-4 h-4" /></ToolbarButton>{isTableMenuOpen && <TableCreationGrid editor={editor} close={() => setTableMenuOpen(false)} />}</div>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pt-6 bg-gray-100">
              <div className="w-full max-w-7xl mx-auto px-6 pb-12">
                <EditorContent editor={editor} />
                <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} shouldShow={({ editor }) => !editor.state.selection.empty && !editor.isActive('image')} className="bg-gray-900/95 backdrop-blur-sm text-white p-2 rounded-lg flex gap-1 border border-gray-700">
                  <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded-md transition-all duration-200 ${editor.isActive('bold') ? 'bg-gray-700' : 'hover:bg-gray-800'}`}><Bold className="w-4 h-4" /></button>
                  <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded-md transition-all duration-200 ${editor.isActive('italic') ? 'bg-gray-700' : 'hover:bg-gray-800'}`}><Italic className="w-4 h-4" /></button>
                  <button onClick={() => editor.chain().focus().toggleHighlight({ color: '#FFF3A3' }).run()} className={`p-2 rounded-md transition-all duration-200 ${editor.isActive('highlight') ? 'bg-gray-700' : 'hover:bg-gray-800'}`}><Highlighter className="w-4 h-4" /></button>
                </BubbleMenu>
              </div>
            </div>
          </div> 
        )}
        <ContentHubToggle isOpen={showContentPanel} onClick={handleToggleContentHub} />
        {showContentPanel && (<ContentHubPanel editor={editor} onClose={handleToggleContentHub} isExpanded={isHubExpanded} onToggleExpand={() => setIsHubExpanded(!isHubExpanded)} />)}
      </div>
      {editor && <StatusBar editor={editor} />}
    </div>
  );
}

const EnhancedEditorPage = dynamic(() => Promise.resolve(EditorComponent), {
  ssr: false,
  loading: () => (<div className="flex items-center justify-center h-screen bg-gray-50"><div className="text-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" /><p className="text-gray-600 font-medium">Loading Editor...</p></div></div>),
});

export default EnhancedEditorPage;