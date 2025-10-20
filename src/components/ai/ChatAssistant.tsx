"use client";

import React, {
  useState,
  FormEvent,
  ChangeEvent,
  useEffect,
  useRef,
  KeyboardEvent,
  DragEvent,
  JSX,
  useCallback,
} from "react";
import {
  X,
  Sparkles,
  SendHorizonal,
  Loader2,
  Paperclip,
  Trash2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Book,
  FileText,
  Plus,
  Check,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import { marked } from "marked";
import { templates as allTemplates } from "../editor/TemplateGallery";
import { useChatStore } from "@/hooks/useChatStore";
import { Message, StagedItem } from "@/types/chat";

import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { GraphData } from '../editor/GraphBlock';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// --- Interfaces (unchanged) ---
interface Template {
  id: string;
  name: string;
  category: string;
  preview: React.ReactNode;
  html: string;
}
interface BookResult {
  bookTitle: string;
  coverImage: string;
  chapters?: ChapterResult[];
  chapterCount?: number;
  year?: number;
  license?: string;
  source?: string;
}
interface ChapterResult {
  chapterTitle: string;
  subsections: SubsectionResult[];
}
interface SubsectionResult {
  subsectionTitle: string;
  content: string;
}
interface DraggableContent {
  type: "book" | "chapter" | "subsection";
  bookTitle: string;
  coverImage: string;
  chapterTitle?: string;
  subsectionTitle?: string;
  content?: string;
}

// --- Loading Skeletons (unchanged) ---
const BookDiscoveryLoadingSkeleton = () => (
  <div className="bg-white rounded-lg mt-2 mb-1 border border-gray-200 shadow-sm overflow-hidden max-w-full animate-pulse">
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
        <div className="h-3 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-14 bg-gray-200 rounded flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
const ContentCreationLoadingSkeleton = () => (
  <div className="bg-white rounded-lg mt-2 mb-1 border border-gray-200 shadow-sm max-w-full overflow-hidden animate-pulse">
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-gray-200 rounded w-40"></div>
        <div className="h-6 bg-gray-200 rounded w-16"></div>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/5"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
      <div className="h-10 bg-gray-200 rounded w-full"></div>
    </div>
  </div>
);

const GraphPreviewComponent = ({
  graphData,
  onInsert,
}: {
  graphData: GraphData;
  onInsert: (graphData: GraphData) => void;
}) => {
  const renderChart = () => {
    const responsiveOptions = {
      ...graphData.options,
      responsive: true,
      maintainAspectRatio: false,
    };
    switch (graphData.type) {
      case 'bar':
        return <Bar options={responsiveOptions as ChartOptions<'bar'>} data={graphData.data} />;
      case 'line':
        return <Line options={responsiveOptions as ChartOptions<'line'>} data={graphData.data} />;
      default:
        return <p className="text-red-500 text-center">Unsupported chart type requested.</p>;
    }
  };

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/ai-graph-item', JSON.stringify(graphData));

    const dragImage = document.createElement('div');
    dragImage.className = 'bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 text-sm font-medium text-blue-700 shadow-lg flex items-center gap-2 border border-gray-200';
    dragImage.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bar-chart-3"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg> AI Generated Graph`;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 20, 20);

    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  return (
    <div 
      className="bg-white rounded-lg mt-2 mb-1 border border-gray-200 shadow-sm max-w-full overflow-hidden flex items-center gap-3 p-4"
    >
      <div 
        draggable={true} 
        onDragStart={handleDragStart} 
        className="cursor-grab"
      >
        <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 text-sm mb-3">Generated Graph</h4>
        <div className="bg-gray-50 p-2 rounded-lg mb-4 h-64">
          {renderChart()}
        </div>
        <button
          onClick={() => onInsert(graphData)}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Insert Graph into Editor
        </button>
      </div>
    </div>
  );
};

const AIMessage = ({
  content,
  onInsert,
  onInsertTemplate,
  onInsertGraph,
  messageId,
  componentState,
  onComponentStateUpdate,
  onAddToStaging,
  isStreaming,
}: {
  content: string;
  onInsert: (html: string) => void;
  onInsertTemplate?: (html: string) => void;
  onInsertGraph?: (graphData: GraphData) => void;
  messageId: string;
  componentState?: any;
  onComponentStateUpdate: (messageId: string, newState: any) => void;
  onAddToStaging: (item: any) => void;
  isStreaming?: boolean;
}): JSX.Element => {
  const [processedContent, setProcessedContent] = useState("");
  const [isComponentLoading, setIsComponentLoading] = useState(false);

  useEffect(() => {
    let workingContent = content;
    if (isStreaming) {
      const incompleteJsonMatch = content.match(/(```json\s*[\s\S]*?)$/);
      if (incompleteJsonMatch && !incompleteJsonMatch[0].endsWith("```")) {
        workingContent = content.replace(incompleteJsonMatch[1], "");
        setIsComponentLoading(true);
      } else {
        setIsComponentLoading(false);
      }
    } else {
      setIsComponentLoading(false);
    }
    setProcessedContent(workingContent);
  }, [content, isStreaming]);

  const handleComponentStateUpdate = useCallback(
    (componentType: string, newState: any) => {
      onComponentStateUpdate(messageId, {
        ...(componentState || {}),
        [componentType]: newState,
      });
    },
    [messageId, componentState, onComponentStateUpdate]
  );

  const jsonBlockRegex = /(```json\s*[\s\S]*?```)/g;
  const parts = processedContent.split(jsonBlockRegex);

  return (
    <div className="max-w-full overflow-hidden">
      {parts.map((part, index) => {
        if (jsonBlockRegex.test(part)) {
          try {
            const jsonString = part.replace(/^```json\s*|```$/g, "");
            const block = JSON.parse(jsonString);
            switch (block.type) {
              case "bookDiscovery":
                return (
                  <BookDiscoveryComponent
                    key={index}
                    block={block}
                    onAddToStaging={onAddToStaging}
                  />
                );
              case "contentCreation":
                return (
                  <ContentCreationComponent
                    key={index}
                    block={block}
                    onInsert={onInsert}
                    onInsertTemplate={onInsertTemplate}
                    componentState={componentState?.contentCreation || {}}
                    onStateUpdate={(newState) =>
                      handleComponentStateUpdate("contentCreation", newState)
                    }
                  />
                );
              case "graphCreation":
                return (
                  <GraphPreviewComponent
                    key={index}
                    graphData={block.graphData}
                    onInsert={onInsertGraph!}
                  />
                );
              default:
                return null;
            }
          } catch (error) {
            return (
              <pre
                key={index}
                className="text-xs bg-red-50 text-red-700 p-2 rounded max-w-full overflow-x-auto"
              >
                Error parsing JSON: {part}
              </pre>
            );
          }
        } else if (part.trim()) {
          return (
            <div
              key={index}
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: marked.parse(part) }}
            />
          );
        }
        return null;
      })}
      {isComponentLoading && <ContentCreationLoadingSkeleton />}
    </div>
  );
};

const ContentCreationComponent = ({
  block,
  onInsert,
  onInsertTemplate,
  componentState,
  onStateUpdate,
}: {
  block: any;
  onInsert: (html: string) => void;
  onInsertTemplate?: (html: string) => void;
  componentState: any;
  onStateUpdate: (newState: any) => void;
}) => {
  const [editedContent, setEditedContent] = useState(
    componentState?.editedContent || block.content || ""
  );

  useEffect(() => {
    setEditedContent(componentState?.editedContent || block.content || "");
  }, [block.content, componentState?.editedContent]);

  const updateComponentState = useCallback(
    (newState: any) => {
      onStateUpdate(newState);
    },
    [onStateUpdate]
  );
  useEffect(() => {
    const newState = { editedContent };
    if (JSON.stringify(newState) !== JSON.stringify(componentState || {})) {
      updateComponentState(newState);
    }
  }, [editedContent, updateComponentState, componentState]);

  const handleInsert = async () => {
    if (block.isTemplate && onInsertTemplate) {
      onInsertTemplate(editedContent);
    } else if (block.contentType === "template" && block.templateId) {
      const templateDef = (
        Object.values(allTemplates).flat() as Template[]
      ).find((t) => t.id === block.templateId);
      if (templateDef && onInsertTemplate) onInsertTemplate(templateDef.html);
    } else if (block.contentType === "html") {
      onInsert(editedContent);
    } else {
      const htmlContent = await marked.parse(editedContent);
      onInsert(htmlContent);
    }
  };

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/ai-template-item', 'true');
    e.dataTransfer.setData('text/html', editedContent);

    const dragImage = document.createElement('div');
    dragImage.className = 'bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 text-sm font-medium text-purple-700 shadow-lg flex items-center gap-2 border border-gray-200';
    dragImage.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles"><path d="m12 3-1.9 3.9-3.9 1.9 3.9 1.9 1.9 3.9 1.9-3.9 3.9-1.9-3.9-1.9Z"/><path d="M5 12s2.5-4 5-4 5 4 5 4"/><path d="M12 17v.9"/></svg> AI Generated Block`;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 20, 20);

    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  return (
    <div 
      className="bg-white rounded-lg mt-2 mb-1 border border-gray-200 shadow-sm max-w-full overflow-hidden flex items-center gap-3 p-4"
    >
      <div 
        draggable={true} 
        onDragStart={handleDragStart} 
        className="cursor-grab"
      >
        <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 text-sm">
            {block.isTemplate ? "Generated Template" : "Generated Content"}
          </h4>
        </div>
        
        <div className="mb-4">
          <div
            className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300"
            contentEditable={true}
            suppressContentEditableWarning={true}
            dangerouslySetInnerHTML={{ __html: editedContent }}
            onBlur={(e) => setEditedContent(e.currentTarget.innerHTML)}
          />
        </div>
        
        <button
          onClick={handleInsert}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Insert into Editor
        </button>
      </div>
    </div>
  );
};

const ErrorMessage = ({
  content,
  onRetry,
  isRetryable,
}: {
  content: string;
  onRetry?: () => void;
  isRetryable?: boolean;
}): JSX.Element => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-2 max-w-full">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-800">{content}</p>
        {isRetryable && onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded-md hover:bg-red-200 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try Again
          </button>
        )}
      </div>
    </div>
  </div>
);
const StagedContentItem = ({
  item,
  onRemove,
}: {
  item: StagedItem;
  onRemove: () => void;
}) => {
  const getTitle = () => {
    switch (item.type) {
      case "book":
        return item.bookTitle;
      case "chapter":
        return item.chapterTitle;
      case "subsection":
        return item.subsectionTitle;
      default:
        return "Unknown Item";
    }
  };
  const getSubtitle = () => {
    switch (item.type) {
      case "book":
        return (
          <>
            <Book className="w-3 h-3 mr-1" />
            Book
          </>
        );
      case "chapter":
        return item.bookTitle;
      case "subsection":
        return `${item.bookTitle} / ${item.chapterTitle}`;
      default:
        return "";
    }
  };
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center gap-3 animate-in fade-in duration-200">
      <img
        src={item.coverImage}
        alt={item.bookTitle}
        className="w-8 h-10 object-cover rounded flex-shrink-0"
      />
      <div className="flex-1 overflow-hidden min-w-0">
        <p className="text-xs font-bold text-blue-800 truncate">
          {getTitle()}
        </p>
        <p className="text-xs text-blue-600 truncate flex items-center">
          {getSubtitle()}
        </p>
      </div>
      <button
        onClick={onRemove}
        className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-full flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
const BookDiscoveryComponent = ({
  block,
  onAddToStaging,
}: {
  block: any;
  onAddToStaging: (item: any) => void;
}) => {
  const books = Array.isArray(block.books) ? block.books : [];
  const [expandedBooks, setExpandedBooks] = useState<{
    [key: string]: boolean;
  }>({});
  useEffect(() => {
    setExpandedBooks({});
  }, [block.books]);
  const handleToggleExpand = (bookTitle: string) => {
    setExpandedBooks((prev) => ({ ...prev, [bookTitle]: !prev[bookTitle] }));
  };
  return (
    <div className="bg-white rounded-lg mt-2 mb-1 border border-gray-200 shadow-sm overflow-hidden max-w-full">
      <div className="p-3 border-b border-gray-200 bg-gray-50/50">
        <h4 className="font-semibold text-gray-900 text-sm">
          {block.searchQuery
            ? `Search Results for "${block.searchQuery}"`
            : "Book Discovery"}
        </h4>
        <p className="text-xs text-gray-500 mt-1">
          {books.length} book(s) with relevant content found
        </p>
      </div>
      <div className="max-h-[28rem] overflow-y-auto">
        <div className="divide-y divide-gray-100">
          {books.length > 0 ? (
            books.map((book: BookResult, index: number) => {
              const isExpanded = expandedBooks[book.bookTitle];
              return (
                <div key={index} className="p-3">
                  <button
                    onClick={() => handleToggleExpand(book.bookTitle)}
                    className="w-full flex items-center gap-3 text-left group"
                  >
                    <img
                      src={book.coverImage}
                      alt={book.bookTitle}
                      className="w-10 h-14 object-cover rounded-md border border-gray-200 shadow-sm flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-sm text-gray-900 group-hover:text-blue-700 transition-colors duration-200 line-clamp-2">
                        {book.bookTitle}
                      </h5>
                      <p className="text-xs text-gray-500 mt-1">
                        {book.chapters?.length} relevant chapter(s)
                      </p>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isExpanded && (
                    <div className="mt-3 pl-4 animate-in fade-in duration-300">
                      <div className="space-y-3">
                        {book.chapters?.map((chapter, chapIndex) => (
                          <div key={chapIndex}>
                            <h6 className="font-semibold text-xs text-gray-700 mb-2 pl-1">
                              {chapter.chapterTitle}
                            </h6>
                            <div className="space-y-1">
                              {chapter.subsections.map(
                                (subsection, subIndex) => (
                                  <div
                                    key={subIndex}
                                    className="flex items-center gap-2 group bg-gray-50/70 hover:bg-white rounded-lg p-2.5 border border-transparent hover:border-gray-200 hover:shadow-sm transition-all duration-200"
                                  >
                                    <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-800 truncate">
                                        {subsection.subsectionTitle}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() =>
                                        onAddToStaging({
                                          type: "subsection",
                                          bookTitle: book.bookTitle,
                                          chapterTitle: chapter.chapterTitle,
                                          subsectionTitle:
                                            subsection.subsectionTitle,
                                          content: subsection.content,
                                          coverImage: book.coverImage,
                                        })
                                      }
                                      className="text-xs font-medium px-2 py-1 rounded-md transition-all duration-200 flex items-center gap-1 cursor-pointer flex-shrink-0 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    >
                                      <Plus className="w-3 h-3" /> Add
                                    </button>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Book className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No relevant content found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ChatAssistantProps {
  isPanel: boolean;
  onClose: () => void;
  onInsertContent: (html: string) => void;
  onInsertTemplate?: (html: string) => void;
  onInsertGraph?: (graphData: GraphData) => void;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({
  isPanel,
  onClose,
  onInsertContent,
  onInsertTemplate,
  onInsertGraph,
}) => {
  const {
    messages,
    stagedContent,
    isLoading,
    sendMessage,
    resetConversation,
    handleAddToStaging,
    setStagedContent,
    updateComponentState,
  } = useChatStore();
  const [input, setInput] = useState("");
  const [isDropZoneActive, setIsDropZoneActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && (input.trim() || stagedContent.length > 0)) {
        formRef.current?.requestSubmit();
      }
    }
  };
  
  const handleDragOver = (e: DragEvent) => {
    if (e.dataTransfer.types.includes("application/oer-content-item")) {
      e.preventDefault();
      e.stopPropagation();
      setIsDropZoneActive(true);
    }
  };
  const handleDragEnter = (e: DragEvent) => {
    if (e.dataTransfer.types.includes("application/oer-content-item")) {
      e.preventDefault();
      e.stopPropagation();
      setIsDropZoneActive(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    if (e.dataTransfer.types.includes("application/oer-content-item")) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (
      dropZoneRef.current &&
      !dropZoneRef.current.contains(e.relatedTarget as Node)
    ) {
      setIsDropZoneActive(false);
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropZoneActive(false);
    const data = e.dataTransfer.getData("application/oer-content-item");
    if (data) {
      try {
        const draggedItem: DraggableContent = JSON.parse(data);
        let itemToStage: Omit<StagedItem, "id">;
        if (draggedItem.type === "subsection" && draggedItem.content) {
          itemToStage = {
            type: draggedItem.type,
            bookTitle: draggedItem.bookTitle,
            coverImage: draggedItem.coverImage,
            chapterTitle: draggedItem.chapterTitle,
            subsectionTitle: draggedItem.subsectionTitle,
            content: draggedItem.content,
          };
        } else if (
          draggedItem.type === "book" ||
          draggedItem.type === "chapter"
        ) {
          const response = await fetch(
            `/api/oer-library?bookTitle=${encodeURIComponent(
              draggedItem.bookTitle
            )}`
          );
          if (!response.ok) throw new Error("Failed to fetch book details");
          const book = (await response.json())[0];
          if (book) {
            let fullContent = "";
            const chaptersToProcess =
              draggedItem.type === "book"
                ? book.chapters
                : book.chapters.filter(
                    (c: any) => c.chapterTitle === draggedItem.chapterTitle
                  );
            for (const chapter of chaptersToProcess) {
              fullContent += `\n\n## ${chapter.chapterTitle}\n\n`;
              for (const subsection of chapter.subsections) {
                fullContent += `### ${subsection.subsectionTitle}\n\n${subsection.content}\n\n`;
              }
            }
            itemToStage = {
              type: draggedItem.type,
              bookTitle: draggedItem.bookTitle,
              coverImage: draggedItem.coverImage,
              chapterTitle: draggedItem.chapterTitle,
              subsectionTitle:
                draggedItem.type === "book"
                  ? undefined
                  : draggedItem.chapterTitle,
              content: fullContent.trim(),
            };
          } else {
            throw new Error("Book not found");
          }
        } else {
          itemToStage = {
            ...draggedItem,
            content:
              draggedItem.content || `[Content from ${draggedItem.bookTitle}]`,
          };
        }
        handleAddToStaging(itemToStage);
      } catch (error) {
        console.error(
          "Failed to parse or process dropped content item:",
          error
        );
      }
    }
  };
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading || (!input.trim() && stagedContent.length === 0)) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      stagedContent: stagedContent,
    };
    setInput("");
    setStagedContent([]);
    await sendMessage(userMessage);
  };
  const handleRetry = () => {
    const lastUserMessage = messages.findLast((m) => m.role === "user");
    if (lastUserMessage && !isLoading) {
      sendMessage(lastUserMessage);
    }
  };

  const handleInsertAndClose = (html: string) => {
    onInsertContent(html);
    onClose();
  };

  const handleInsertTemplateAndClose = (html: string) => {
    if (onInsertTemplate) {
      onInsertTemplate(html);
    } else {
      onInsertContent(html);
      onClose();
    }
  };

  return (
    <div
      className="chat-assistant-panel bg-white border-l border-gray-200 flex flex-col h-full w-[480px] flex-shrink-0 shadow-lg animate-in slide-in-from-right duration-300 relative"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* --- MODIFICATION: Using system highlight colors --- */}
      <style jsx global>{`
        .chat-assistant-panel ::selection {
          background-color: Highlight;
          color: HighlightText;
        }
      `}</style>

      <div
        ref={dropZoneRef}
        className={`absolute inset-0 z-50 transition-all duration-200 ${
          isDropZoneActive
            ? "opacity-100 pointer-events-auto bg-blue-500/10 backdrop-blur-sm"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="w-full h-full border-4 border-dashed border-blue-400 rounded-lg flex items-center justify-center">
          <div className="text-center p-8">
            <Paperclip className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <p className="font-bold text-blue-600 text-lg mb-2">
              Drop content here
            </p>
            <p className="text-blue-500 text-sm">
              Add books, chapters, or sections to your conversation context
            </p>
          </div>
        </div>
      </div>
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">AI Assistant</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={resetConversation}
              title="Reset Conversation"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
          >
            {(m.role === "assistant" || m.role === "error") && (
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  m.role === "error" ? "bg-red-100" : "bg-purple-100"
                }`}
              >
                {m.role === "error" ? (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <Sparkles className="w-5 h-5 text-purple-600" />
                )}
              </div>
            )}
            <div
              className={`rounded-2xl max-w-full min-w-0 ${
                m.role === "user"
                  ? "bg-blue-600 text-white rounded-br-none p-4 max-w-sm"
                  : m.role === "error"
                  ? "bg-red-50 rounded-bl-none max-w-md"
                  : "bg-gray-100 text-gray-800 rounded-bl-none p-4 flex-1"
              }`}
            >
              {m.role === "user" ? (
                <>
                  {m.stagedContent && m.stagedContent.length > 0 && (
                    <div className="border-b border-blue-400 pb-2 mb-2">
                      <p className="text-xs font-semibold text-blue-200 mb-2">
                        Attached Content:
                      </p>
                      <div className="space-y-1">
                        {m.stagedContent.map((item, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-blue-500/20 rounded px-2 py-1 flex items-center gap-2"
                          >
                            <img
                              src={item.coverImage}
                              alt=""
                              className="w-4 h-5 object-cover rounded flex-shrink-0"
                            />
                            <span className="truncate">
                              {item.type === "book" && item.bookTitle}
                              {item.type === "chapter" &&
                                `${item.bookTitle} - ${item.chapterTitle}`}
                              {item.type === "subsection" &&
                                `${item.subsectionTitle}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div
                    className="prose prose-sm max-w-none text-white"
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(m.content),
                    }}
                  />
                </>
              ) : m.role === "error" ? (
                <ErrorMessage
                  content={m.content}
                  onRetry={handleRetry}
                  isRetryable={m.isRetryable}
                />
              ) : (
                <AIMessage
                  content={m.content}
                  onInsert={handleInsertAndClose}
                  onInsertTemplate={handleInsertTemplateAndClose}
                  onInsertGraph={onInsertGraph}
                  messageId={m.id}
                  componentState={m.componentState}
                  onComponentStateUpdate={updateComponentState}
                  onAddToStaging={handleAddToStaging}
                  isStreaming={m.isStreaming}
                />
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-none p-4 flex items-center">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-white border-t border-gray-200 relative">
        <form ref={formRef} onSubmit={handleSubmit} className="relative z-10">
          {stagedContent.length > 0 && (
            <div className="p-3 bg-blue-50/50 border-b border-blue-200 rounded-t-lg">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" /> {stagedContent.length}
                  Item(s) Staged
                </p>
                <button
                  type="button"
                  onClick={() => setStagedContent([])}
                  className="text-xs font-semibold text-blue-600 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {stagedContent.map((item) => (
                  <StagedContentItem
                    key={item.id}
                    item={item}
                    onRemove={() =>
                      setStagedContent(
                        stagedContent.filter((i) => i.id !== item.id)
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}
          <div className="relative">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                stagedContent.length > 0
                  ? "Describe how to use the content above..."
                  : "Ask me to write, summarize, or search..."
              }
              rows={3}
              className="w-full p-3 pr-12 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={
                isLoading || (!input.trim() && stagedContent.length === 0)
              }
              className="absolute bottom-3 right-3 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <SendHorizonal className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatAssistant;