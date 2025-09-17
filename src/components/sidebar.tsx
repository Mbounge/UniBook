//src/components/sidebar.tsx

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Library,
  FileText,
  Sparkles,
  Shield,
  BookOpen,
  LogOut,
  PanelLeft,
  Bot,
  Palette,
} from "lucide-react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/library", label: "OER Library", icon: Library },
  { href: "/documents", label: "My Documents", icon: FileText },
  { href: "/tools", label: "Advanced Tools", icon: Sparkles },
  { href: "/admin", label: "Admin Panel", icon: Shield },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onAiAssistantClick?: () => void;
  onTemplateGalleryClick?: () => void;
  isAiActive?: boolean;
  isTemplateActive?: boolean;
}

export default function Sidebar({ 
  isCollapsed, 
  onToggle, 
  onAiAssistantClick,
  onTemplateGalleryClick,
  isAiActive = false,
  isTemplateActive = false
}: SidebarProps) {
  const pathname = usePathname();
  const isInEditor = pathname.includes('/editor/');

  return (
    <aside
      className={`bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className={`flex items-center space-x-2 overflow-hidden ${isCollapsed ? 'w-0' : 'w-auto'}`}>
          <BookOpen className="w-8 h-8 text-blue-600 flex-shrink-0" />
          <span
            className={`text-xl font-bold text-gray-900 transition-opacity duration-200 whitespace-nowrap ${
              isCollapsed ? "opacity-0" : "opacity-100"
            }`}
          >
            UniBOOK
          </span>
        </div>
        <button
          onClick={onToggle}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          <PanelLeft
            className={`w-5 h-5 transition-transform duration-300 ${
              isCollapsed ? "rotate-180" : "rotate-0"
            }`}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-grow p-4 space-y-2">
        {navLinks.map((link) => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              title={isCollapsed ? link.label : undefined}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isCollapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <link.icon className="w-5 h-5 flex-shrink-0" />
              <span
                className={`whitespace-nowrap transition-opacity ${
                  isCollapsed ? "opacity-0 w-0" : "opacity-100"
                }`}
              >
                {link.label}
              </span>
            </Link>
          );
        })}

        {/* Editor Tools - Only show when in editor */}
        {isInEditor && (
          <>
            <div className="h-px bg-gray-200 my-4"></div>
            <div className={`text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 ${isCollapsed ? 'text-center' : 'px-3'}`}>
              {!isCollapsed && "Editor Tools"}
            </div>
            
            <button
              onClick={onAiAssistantClick}
              title={isCollapsed ? "AI Assistant" : undefined}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isCollapsed ? "justify-center" : ""
              } ${
                isAiActive
                  ? "bg-purple-50 text-purple-700 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Bot className="w-5 h-5 flex-shrink-0" />
              <span
                className={`whitespace-nowrap transition-opacity ${
                  isCollapsed ? "opacity-0 w-0" : "opacity-100"
                }`}
              >
                AI Assistant
              </span>
            </button>

            <button
              onClick={onTemplateGalleryClick}
              title={isCollapsed ? "Templates" : undefined}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isCollapsed ? "justify-center" : ""
              } ${
                isTemplateActive
                  ? "bg-purple-50 text-purple-700 font-semibold"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Palette className="w-5 h-5 flex-shrink-0" />
              <span
                className={`whitespace-nowrap transition-opacity ${
                  isCollapsed ? "opacity-0 w-0" : "opacity-100"
                }`}
              >
                Templates
              </span>
            </button>
          </>
        )}
      </nav>

      {/* Footer & User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div
          className={`flex items-center space-x-3 ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-semibold text-gray-600 flex-shrink-0">
            PA
          </div>
          <div
            className={`flex-grow overflow-hidden transition-opacity ${
              isCollapsed ? "opacity-0 w-0" : "opacity-100"
            }`}
          >
            <p className="font-semibold text-gray-900 truncate">Professor Ale</p>
            <button className="text-sm text-gray-500 hover:text-blue-600 flex items-center">
              <LogOut className="w-3 h-3 mr-1" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}