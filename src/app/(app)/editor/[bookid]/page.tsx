// src/app/(app)/editor/[bookid]/page.tsx

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, ChevronRight, ChevronLeft as ChevronLeftIcon, Trash2 } from "lucide-react";
import { useSidebar } from "../../layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { DocumentEditor } from "@/components/editor/DocumentEditor";
import ChatAssistant from "@/components/ai/ChatAssistant";
import { TableOfContentsPanel } from "@/components/editor/TableOfContentsPanel";
import { TemplateGallery } from "@/components/editor/TemplateGallery";
import ContentHubPanel, { StagingModal } from "@/components/editor/ContentHubPanel";
import { ContentHubProvider, useContentHub } from "@/components/editor/ContentHubContext";
import { useEditor } from "@/components/editor/hooks/useEditor";
import { fetchBookById, updateBook, Book as BookData } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { GraphData } from "@/components/editor/GraphBlock";

const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-[100] animate-in fade-in duration-300">
    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
    <p className="text-lg font-semibold text-gray-700">Importing content...</p>
    <p className="text-gray-500">Please wait while we paginate your document.</p>
  </div>
);

const ContentHubToggle = ({ isOpen, onClick }: { isOpen: boolean; onClick: () => void; }) => (
  <button
    onClick={onClick}
    className={`absolute top-28 z-40 flex items-center justify-center bg-white h-20 w-6 rounded-l-lg border-r-0 border-y border-l border-gray-200 shadow-lg hover:bg-gray-50 transition-all duration-300 hover:shadow-xl cursor-pointer left-0 -translate-x-full`}
    title={isOpen ? "Close Content Hub" : "Open Content Hub"}
  >
    {isOpen ? (
      <ChevronRight className="w-4 h-4 text-gray-600" />
    ) : (
      <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
    )}
  </button>
);

const StagingModalRenderer = ({ onImport }: { onImport: (htmlBlocks: string[], createNewPages: boolean) => void }) => {
  const { hubState, setHubState } = useContentHub();
  const { isStagingModalOpen } = hubState;

  if (!isStagingModalOpen) return null;

  return (
    <StagingModal
      onImport={onImport}
      onClose={() => setHubState(prev => ({ ...prev, isStagingModalOpen: false }))}
    />
  );
};

const ComposeBarRenderer = () => {
  const { hubState, setHubState } = useContentHub();
  const { selectedItems } = hubState;

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 flex items-center justify-between animate-in slide-in-from-bottom shadow-lg z-40">
      <p className="text-sm font-semibold text-gray-900">
        <span className="bg-blue-600 text-white rounded-full px-3 py-1.5 mr-3 text-xs font-bold">
          {selectedItems.length}
        </span>
        Item(s) selected
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setHubState(prev => ({ ...prev, selectedItems: [] }))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 cursor-pointer"
          title="Clear selection"
        >
          <Trash2 className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={() => setHubState(prev => ({ ...prev, isStagingModalOpen: true }))}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors duration-200 cursor-pointer"
        >
          Compose & Import
        </button>
      </div>
    </div>
  );
};

const EditorComponent = () => {
  const router = useRouter();
  const { setSidebarVisible, setLeftPanelContent, leftPanelContent, isSidebarCollapsed } = useSidebar();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams<{ bookid: string }>();

  const [showTocPanel, setShowTocPanel] = useState(false);
  const [showContentPanel, setShowContentPanel] = useState(false);
  const [isHubExpanded, setIsHubExpanded] = useState(false);
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const [isLeftPanelExpanded, setIsLeftPanelExpanded] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  
  const { 
    undo, redo, canUndo, canRedo, saveToHistory, 
    insertImage, insertContent, insertTemplate, 
    insertMath, rehydrateMathBlocks,
    insertGraph, rehydrateGraphBlocks,
    rehydratePageNumbers,
    addNewPage,
    resetHistory,
    scheduleReflow,
    immediateReflow,
    isReflowing,
    reflowPage,
    reflowBackwardFromPage,
    reflowSplitParagraph,
    customSelection,
    highlightRects,
    isSelecting,
    isMultiPageSelection,
    selectedPages,
    selectedText,
    clearSelection,
    forceRecalculateRects,
    startTextSelection,
    fullDocumentReflow,
    reflowSplitTable,
    reflowSplitList
  } = useEditor(pageContainerRef);

  const { data: bookData, isLoading: isBookLoading, isError } = useQuery({
    queryKey: ['book', params.bookid],
    queryFn: () => fetchBookById(params.bookid),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => updateBook(id, content),
    onSuccess: () => {
      toast({ title: "Draft Saved", description: "Your changes have been saved successfully." });
      queryClient.invalidateQueries({ queryKey: ['book', params.bookid] });
    },
    onError: () => {
      toast({ title: "Save Failed", description: "Could not save your changes.", variant: "destructive" });
    }
  });

  useEffect(() => {
    if (bookData && pageContainerRef.current && !isContentLoaded) {
      pageContainerRef.current.innerHTML = bookData.content;

      // --- FIX: Defer DOM manipulation and hydration to prevent race conditions ---
      setTimeout(() => {
        if (!pageContainerRef.current) return;

        const pages = pageContainerRef.current.querySelectorAll('.page');
        pages.forEach(page => {
          if (!page.querySelector('.page-header')) {
            const headerDiv = document.createElement("div");
            headerDiv.className = "page-header";
            headerDiv.setAttribute("data-hf", "header");
            page.insertBefore(headerDiv, page.firstChild);
          }
          if (!page.querySelector('.page-footer')) {
            const footerDiv = document.createElement("div");
            footerDiv.className = "page-footer";
            footerDiv.setAttribute("data-hf", "footer");
            // Find the page-content to insert before, otherwise append
            const content = page.querySelector('.page-content');
            if (content) {
              page.insertBefore(footerDiv, content);
            } else {
              page.appendChild(footerDiv);
            }
          }
          if (!page.querySelector('.page-number-container')) {
            const pageNumberContainer = document.createElement("div");
            pageNumberContainer.className = "page-number-container";
            pageNumberContainer.innerHTML = '<span class="page-number-placeholder" contenteditable="false">#</span>';
            // Find the page-content to insert before, otherwise append
            const content = page.querySelector('.page-content');
            if (content) {
              page.insertBefore(pageNumberContainer, content);
            } else {
              page.appendChild(pageNumberContainer);
            }
          }
        });

        rehydrateMathBlocks(pageContainerRef.current);
        rehydrateGraphBlocks(pageContainerRef.current);
        rehydratePageNumbers(pageContainerRef.current);
        
        fullDocumentReflow();
        saveToHistory(true);
      }, 50); // A small delay is enough for the browser to complete its initial layout pass.

      setIsContentLoaded(true);
    }
  }, [bookData, pageContainerRef, isContentLoaded, saveToHistory, rehydrateMathBlocks, rehydrateGraphBlocks, rehydratePageNumbers, fullDocumentReflow]);

  useEffect(() => {
    if (showTocPanel || leftPanelContent) {
      setSidebarVisible(false);
    } else {
      setSidebarVisible(true);
    }
    if (!leftPanelContent) {
      setIsLeftPanelExpanded(false);
    }
    return () => setSidebarVisible(true);
  }, [showTocPanel, leftPanelContent, setSidebarVisible]);

  const handleToggleAiPanel = () => { 
    if (leftPanelContent === 'ai') {
      setLeftPanelContent(null);
    } else {
      setLeftPanelContent('ai');
      setShowTocPanel(false);
    }
  };

  const handleToggleOutline = () => { 
    setShowTocPanel(!showTocPanel); 
    setLeftPanelContent(null);
  };

  const handleToggleTemplateGallery = () => { 
    if (leftPanelContent === 'templates') {
      setLeftPanelContent(null);
    } else {
      setLeftPanelContent('templates');
      setShowTocPanel(false);
    }
  };

  const handleToggleContentHub = () => {
    setShowContentPanel(!showContentPanel); 
    if (showContentPanel) setIsHubExpanded(false); 
  };

  const handleToggleLeftPanelExpand = () => {
    setIsLeftPanelExpanded(!isLeftPanelExpanded);
  };
  
  const handleInsertTemplateAndClose = (html: string) => {
    insertTemplate(html);
    setLeftPanelContent(null);
  };

  const handleImport = (htmlBlocks: string[], createNewPages: boolean) => { 
    setIsImporting(true);
    
    setTimeout(() => {
      try {
        insertContent(htmlBlocks, createNewPages, true);
      } catch (error) {
        console.error("Error during content import:", error);
        toast({ title: "Import Failed", description: "An error occurred while importing content.", variant: "destructive" });
      } finally {
        setIsImporting(false); 
        setShowContentPanel(false);
      }
    }, 50);
  };

  const handleSaveDraft = () => {
    if (!pageContainerRef.current) {
      toast({ title: "Error", description: "Editor not ready.", variant: "destructive" });
      return;
    }
    const currentHtml = pageContainerRef.current.innerHTML;
    updateMutation.mutate({ id: params.bookid, content: currentHtml });
  };

  if (isBookLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading your book...</p>
        </div>
      </div>
    );
  }

  if (isError || !bookData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Book Not Found</h2>
          <p className="text-gray-600 mb-6">The requested book could not be loaded.</p>
          <button 
            onClick={() => router.push('/dashboard')} 
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors duration-200 cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const getLeftPanelWidth = () => {
    if (isLeftPanelExpanded) {
      return 'w-full';
    }
    if (leftPanelContent === 'templates') return 'w-96';
    if (leftPanelContent === 'ai') return 'w-[480px]';
    if (showTocPanel) return 'w-80';
    return 'w-0';
  };
  const leftPanelWidth = getLeftPanelWidth();
  const hasLeftPanel = !!(showTocPanel || leftPanelContent);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {isImporting && <LoadingOverlay />}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-4 flex-shrink-0 z-20 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard')} 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{bookData.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            <button 
              onClick={handleSaveDraft} 
              disabled={updateMutation.isPending} 
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg flex items-center border border-gray-300 transition-colors duration-200 disabled:opacity-50 cursor-pointer"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Draft
            </button>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center font-medium transition-colors duration-200 cursor-pointer">
              Publish
            </button>
          </div>
        </div>
      </header>
      
      <ContentHubProvider>
        <div className="flex-1 flex overflow-hidden relative">
          {hasLeftPanel && (
            <div className={`flex-shrink-0 ${leftPanelWidth} transition-all duration-300`}>
              {showTocPanel && (
                <TableOfContentsPanel 
                  pageContainerRef={pageContainerRef} 
                  onClose={handleToggleOutline} 
                />
              )}
              {leftPanelContent === 'templates' && (
                <TemplateGallery 
                  onClose={handleToggleTemplateGallery} 
                  onInsert={handleInsertTemplateAndClose}
                  isExpanded={isLeftPanelExpanded}
                  onToggleExpand={handleToggleLeftPanelExpand}
                />
              )}
              {leftPanelContent === 'ai' && (
                <ChatAssistant 
                  isPanel={true} 
                  onClose={handleToggleAiPanel} 
                  onInsertContent={(html) => insertContent([html], false)}
                  onInsertTemplate={(html) => {
                    insertTemplate(html);
                  }}
                  onInsertGraph={(graphData: GraphData) => {
                    insertGraph(graphData);
                  }}
                />
              )}
            </div>
          )}
          
          <div className={`flex-1 flex flex-col min-w-0 ${isLeftPanelExpanded ? 'hidden' : ''}`}>
            <DocumentEditor 
              pageContainerRef={pageContainerRef}
              onToggleOutline={handleToggleOutline}
              onToggleTemplateGallery={handleToggleTemplateGallery}
              onToggleAiPanel={handleToggleAiPanel}
              isTocOpen={showTocPanel}
              isTemplateGalleryOpen={leftPanelContent === 'templates'}
              isAiPanelOpen={leftPanelContent === 'ai'}
              undo={undo}
              redo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              saveToHistory={saveToHistory}
              insertImage={insertImage}
              isContentHubOpen={showContentPanel}
              isHubExpanded={isHubExpanded}
              onGalleryTemplateDrop={() => setLeftPanelContent(null)}
              insertMath={insertMath}
              insertGraph={insertGraph}
              rehydrateMathBlocks={rehydrateMathBlocks}
              rehydrateGraphBlocks={rehydrateGraphBlocks}
              rehydratePageNumbers={rehydratePageNumbers}
              insertTemplate={insertTemplate}
              resetHistory={resetHistory}
              scheduleReflow={scheduleReflow}
              immediateReflow={immediateReflow}
              isReflowing={isReflowing}
              reflowPage={reflowPage}
              reflowBackwardFromPage={reflowBackwardFromPage}
              reflowSplitParagraph={reflowSplitParagraph}
              fullDocumentReflow={fullDocumentReflow}
              reflowSplitTable={reflowSplitTable}
              reflowSplitList={reflowSplitList}
              customSelection={customSelection}
              highlightRects={highlightRects}
              isSelecting={isSelecting}
              isMultiPageSelection={isMultiPageSelection}
              selectedPages={selectedPages}
              selectedText={selectedText}
              clearSelection={clearSelection}
              forceRecalculateRects={forceRecalculateRects}
              startTextSelection={startTextSelection}
              insertContent={insertContent}
              addNewPage={addNewPage}
            />
          </div>

          {!isLeftPanelExpanded && (
            <div
              className="fixed top-0 bottom-0 right-0 z-30 transition-transform duration-300 ease-in-out"
              style={{
                transform: showContentPanel ? 'translateX(0%)' : 'translateX(100%)',
              }}
            >
              <ContentHubToggle 
                isOpen={showContentPanel} 
                onClick={handleToggleContentHub} 
              />
              <ContentHubPanel 
                onImport={handleImport} 
                onClose={handleToggleContentHub} 
                isExpanded={isHubExpanded} 
                onToggleExpand={() => setIsHubExpanded(!isHubExpanded)}
                hasLeftPanel={hasLeftPanel}
                isSidebarCollapsed={isSidebarCollapsed}
              />
            </div>
          )}
        </div>
        
        <ComposeBarRenderer />
        <StagingModalRenderer onImport={handleImport} />
      </ContentHubProvider>
    </div>
  );
}

export default EditorComponent;