"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeftToLine, Sparkles, Library } from 'lucide-react';

interface GlobalToolbarProps {
  onToggleAiPanel: () => void;
  onToggleResourcePanel: () => void;
  isAiPanelOpen: boolean;
  isResourcePanelOpen: boolean;
}

const ToolbarButton = ({
  onClick,
  title,
  isActive,
  children,
  href,
}: {
  onClick?: () => void;
  title: string;
  isActive?: boolean;
  children: React.ReactNode;
  href?: string;
}) => {
  const commonClasses = `
    w-12 h-12 flex items-center justify-center rounded-lg transition-all duration-200 
    hover:bg-gray-100 hover:text-gray-900
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
  `;

  const activeClasses = isActive
    ? 'bg-blue-50 text-blue-700'
    : 'text-gray-600';

  const content = (
    <div className={`${commonClasses} ${activeClasses}`}>
      {children}
    </div>
  );

  if (href) {
    return (
      <Link href={href} title={title}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} title={title}>
      {content}
    </button>
  );
};

export const GlobalToolbar: React.FC<GlobalToolbarProps> = ({
  onToggleAiPanel,
  onToggleResourcePanel,
  isAiPanelOpen,
  isResourcePanelOpen,
}) => {
  return (
    <div className="h-screen bg-white border-r border-gray-200 flex flex-col items-center justify-between py-4 z-40">
      <div className="flex flex-col items-center space-y-3">
        <ToolbarButton href="/dashboard" title="Back to Dashboard">
          <ArrowLeftToLine className="w-6 h-6" />
        </ToolbarButton>
        <div className="w-8 h-px bg-gray-200 my-2"></div>
        <ToolbarButton
          onClick={onToggleAiPanel}
          title={isAiPanelOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
          isActive={isAiPanelOpen}
        >
          <Sparkles className="w-6 h-6" />
        </ToolbarButton>
        <ToolbarButton
          onClick={onToggleResourcePanel}
          title={isResourcePanelOpen ? 'Close Resource Panel' : 'Open Resource Panel'}
          isActive={isResourcePanelOpen}
        >
          <Library className="w-6 h-6" />
        </ToolbarButton>
      </div>
      
      {/* Placeholder for future items like settings or user profile */}
      <div>
        {/* Example: <UserButton /> */}
      </div>
    </div>
  );
};