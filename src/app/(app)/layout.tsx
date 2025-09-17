//src/app/(app)/layout.tsx

"use client";

import React, { useState, createContext, useContext } from "react";
import Sidebar from "@/components/sidebar";

interface SidebarContextType {
  isSidebarVisible: boolean;
  setSidebarVisible: (isVisible: boolean) => void;
  leftPanelContent: 'ai' | 'templates' | null;
  setLeftPanelContent: (content: 'ai' | 'templates' | null) => void;
  isSidebarCollapsed: boolean;
}

export const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const [leftPanelContent, setLeftPanelContent] = useState<'ai' | 'templates' | null>(null);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <SidebarContext.Provider value={{ 
      isSidebarVisible, 
      setSidebarVisible, 
      leftPanelContent, 
      setLeftPanelContent,
      isSidebarCollapsed 
    }}>
      <div className="h-screen w-full flex bg-gray-50">
        {isSidebarVisible && (
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggle={toggleSidebarCollapse}
            onAiAssistantClick={() => setLeftPanelContent(leftPanelContent === 'ai' ? null : 'ai')}
            onTemplateGalleryClick={() => setLeftPanelContent(leftPanelContent === 'templates' ? null : 'templates')}
            isAiActive={leftPanelContent === 'ai'}
            isTemplateActive={leftPanelContent === 'templates'}
          />
        )}

        <main className="flex-1 h-screen overflow-y-auto">
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  );
}