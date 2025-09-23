//src/app/(app)editor/[bookid]/page.tsx

"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, ChevronRight, ChevronLeft as ChevronLeftIcon } from "lucide-react";
import { useSidebar } from "../../layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { DocumentEditor } from "@/components/editor/DocumentEditor";
import ChatAssistant from "@/components/ai/ChatAssistant";
import { TableOfContentsPanel } from "@/components/editor/TableOfContentsPanel";
import { TemplateGallery } from "@/components/editor/TemplateGallery";
import ContentHubPanel from "@/components/editor/ContentHubPanel";
import { useEditor } from "@/components/editor/hooks/useEditor";
import { fetchBookById, updateBook, Book as BookData } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { GraphData } from "@/components/editor/GraphBlock";

// --- ContentHubToggle (unchanged) ---
const ContentHubToggle = ({ isOpen, isExpanded, onClick }: { isOpen: boolean; isExpanded: boolean; onClick: () => void; }) => (
  <button
    onClick={onClick}
    className={`absolute top-28 z-30 flex items-center justify-center bg-white h-20 w-6 rounded-l-lg border-r-0 border-y border-l border-gray-200 shadow-lg hover:bg-gray-50 transition-all duration-300 hover:shadow-xl cursor-pointer`}
    style={{ right: isOpen ? (isExpanded ? '100%' : '24rem') : '0rem' }}
    title={isOpen ? "Close Content Hub" : "Open Content Hub"}
  >
    {isOpen ? (
      <ChevronRight className="w-4 h-4 text-gray-600" />
    ) : (
      <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
    )}
  </button>
);

// --- Main EditorComponent ---
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
  
  const pageContainerRef = useRef<HTMLDivElement | null>(null);
  
  const { 
    undo, redo, canUndo, canRedo, saveToHistory, 
    insertImage, insertContent, insertTemplate, 
    insertMath, rehydrateMathBlocks,
    insertGraph, rehydrateGraphBlocks,
    resetHistory,
    scheduleReflow,
    immediateReflow
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
      rehydrateMathBlocks(pageContainerRef.current);
      rehydrateGraphBlocks(pageContainerRef.current);
      setTimeout(() => {
        saveToHistory(true);
        immediateReflow(); // Trigger initial reflow after content is loaded
      }, 100);
      setIsContentLoaded(true);
    }
  }, [bookData, pageContainerRef, isContentLoaded, saveToHistory, rehydrateMathBlocks, rehydrateGraphBlocks, immediateReflow]);

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

  const handleImport = (htmlBlocks: string[], createChapters: boolean) => { 
    insertContent(htmlBlocks, createChapters); 
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
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel */}
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
        
        {/* Main Editor */}
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
            insertTemplate={insertTemplate}
            resetHistory={resetHistory}
            scheduleReflow={scheduleReflow}
            immediateReflow={immediateReflow}
          />
        </div>

        {/* Content Hub */}
        {!isLeftPanelExpanded && (
          <>
            <ContentHubToggle 
              isOpen={showContentPanel} 
              isExpanded={isHubExpanded} 
              onClick={handleToggleContentHub} 
            />
            {showContentPanel && (
              <ContentHubPanel 
                onImport={handleImport} 
                onClose={handleToggleContentHub} 
                isExpanded={isHubExpanded} 
                onToggleExpand={() => setIsHubExpanded(!isHubExpanded)}
                hasLeftPanel={hasLeftPanel}
                isSidebarCollapsed={isSidebarCollapsed}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default EditorComponent;