//src/app/page.tsx

'use client'

import React, { useState } from 'react';
import { Search, MessageCircle, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Plus, Book, Sparkles, X, Send, ChevronRight, ChevronLeft, Star } from 'lucide-react';

const TextbookEditor = () => {
  const [showAIChat, setShowAIChat] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m here to help you create your custom textbook. I can search through OER materials, help with content organization, or answer questions about your course topics.' }
  ]);
  const [newMessage, setNewMessage] = useState('');

  const searchResults = [
    {
      title: "Introduction to Data Structures",
      source: "MIT OpenCourseWare - Computer Science",
      preview: "Arrays, linked lists, stacks, and queues form the foundation of computer science...",
      pages: "Pages 45-67"
    },
    {
      title: "Algorithm Complexity Analysis",
      source: "Stanford CS Online - Algorithms Course",
      preview: "Big O notation provides a mathematical framework for analyzing algorithm efficiency...",
      pages: "Chapter 3, Section 2"
    },
  ];

  // CHANGE 1: Added mock data for the new "Recommended by Faculty" section
  const recommendedResults = [
    {
      title: "Core Concepts of Recursion",
      source: "Harvard CS50",
      rating: 4.9
    },
    {
      title: "A Visual Guide to Hash Tables",
      source: "OER Commons",
      rating: 4.8
    }
  ];

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setChatMessages([...chatMessages, 
        { role: 'user', content: newMessage },
        { role: 'assistant', content: 'I found several relevant sections about data structures in our OER library. Would you like me to search for specific algorithms or help you organize these concepts into chapters?' }
      ]);
      setNewMessage('');
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Book className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Introduction To Programming</h1>
            </div>
            <div className="h-6 w-px bg-gray-300"></div>
            <span className="text-gray-600">CS 101: Data Structures & Algorithms</span>
          </div>
          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">
              Save Draft
            </button>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Publish
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-gray-200 p-4 transition-all duration-300 flex flex-col`}>
          <div className="space-y-4">
            <div className="flex justify-end mb-4">
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4 text-black" /> : <ChevronLeft className="w-4 h-4 text-black" />}
              </button>
            </div>
            <button 
              onClick={() => setShowSearch(!showSearch)}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} p-3 rounded-lg transition-colors ${showSearch ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
              title="Search OER Content"
            >
              <Search className={`${sidebarCollapsed ? 'w-9 h-9' : 'w-5 h-5'}`} />
              {!sidebarCollapsed && <span>Search OER</span>}
            </button>
            <button 
              onClick={() => setShowAIChat(!showAIChat)}
              className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} p-3 rounded-lg transition-colors ${showAIChat ? 'bg-purple-50 text-purple-700' : 'text-gray-700 hover:bg-gray-50'}`}
              title="AI Assistant"
            >
              <MessageCircle className={`${sidebarCollapsed ? 'w-9 h-9' : 'w-5 h-5'}`} />
              {!sidebarCollapsed && <span>AI Assist</span>}
            </button>
            {!sidebarCollapsed && (
              <div className="pt-4 border-t border-gray-200 flex-1 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Table of Contents</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2 text-blue-600">
                    <ChevronRight className="w-4 h-4" />
                    <span>Chapter 1: Introduction</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600 ml-6">
                    <span>1.1 Course Overview</span>
                  </div>
                  <div className="flex items-center space-x-2 text-blue-600">
                    <ChevronRight className="w-4 h-4" />
                    <span>Chapter 2: Data Structures</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600 ml-6">
                    <span>2.1 Arrays & Lists</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600 ml-6">
                    <span>2.2 Stacks & Queues</span>
                  </div>
                  {/* CHANGE 2: Added "Add Chapter" button */}
                  <button className="w-full flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 mt-4 p-2 rounded-lg hover:bg-blue-50">
                    <Plus className="w-4 h-4" />
                    <span>Add Chapter</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* CHANGE 3: AI Chat Panel is now on the LEFT of the editor */}
          {showAIChat && (
            <div className="w-96 bg-white border-r border-gray-200 flex flex-col animate-in slide-in-from-left duration-300 h-full">
              <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
                  </div>
                  <button onClick={() => setShowAIChat(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-black" /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {chatMessages.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex space-x-2">
                  <input type="text" placeholder="Ask me anything..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm text-black" />
                  <button onClick={handleSendMessage} className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"><Send className="w-4 h-4 text-white" /></button>
                </div>
              </div>
            </div>
          )}

          {/* Editor */}
          <div className="flex-1 flex flex-col">
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-center space-x-1">
                <div className="flex items-center space-x-1 border-r border-gray-300 pr-3 mr-3"><button className="p-2 hover:bg-gray-100 rounded"><Bold className="w-4 h-4 text-black" /></button><button className="p-2 hover:bg-gray-100 rounded"><Italic className="w-4 h-4 text-black" /></button><button className="p-2 hover:bg-gray-100 rounded"><Underline className="w-4 h-4 text-black" /></button></div>
                <div className="flex items-center space-x-1 border-r border-gray-300 pr-3 mr-3"><button className="p-2 hover:bg-gray-100 rounded"><AlignLeft className="w-4 h-4 text-black" /></button><button className="p-2 hover:bg-gray-100 rounded"><AlignCenter className="w-4 h-4 text-black" /></button><button className="p-2 hover:bg-gray-100 rounded"><AlignRight className="w-4 h-4 text-black" /></button></div>
                <div className="flex items-center space-x-1 border-r border-gray-300 pr-3 mr-3"><button className="p-2 hover:bg-gray-100 rounded"><List className="w-4 h-4 text-black" /></button><button className="p-2 hover:bg-gray-100 rounded"><ListOrdered className="w-4 h-4 text-black" /></button></div>
                <div><select className="px-3 py-1 border border-gray-300 rounded text-sm text-black"><option>Roboto</option><option>Arial</option><option>Times New Roman</option></select></div>
              </div>
            </div>
            <div className="flex-1 p-8 bg-white overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                <div className="mb-8"><h1 className="text-3xl font-bold text-gray-900 mb-2">Chapter 2: Data Structures</h1><p className="text-gray-600">Understanding the fundamental building blocks of computer science</p></div>
                <div className="prose prose-lg max-w-none"><h2 className="text-2xl font-semibold text-gray-800 mb-4">2.1 Introduction to Arrays</h2><p className="text-gray-700 leading-relaxed mb-4">Arrays are one of the most fundamental data structures in computer science. They provide a way to store multiple elements of the same type in a contiguous block of memory, allowing for efficient access and manipulation of data.</p><p className="text-gray-700 leading-relaxed mb-6">The key characteristics of arrays include:</p><ul className="list-disc pl-6 mb-6 text-gray-700"><li>Fixed size determined at creation time</li><li>Elements stored in consecutive memory locations</li><li>Constant-time access to elements by index</li><li>Homogeneous data types</li></ul><div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6"><p className="text-blue-800"><strong>Note:</strong> This content was assembled from MIT OpenCourseWare and Stanford CS materials, adapted for our specific curriculum needs.</p></div><h3 className="text-xl font-semibold text-gray-800 mb-3">Array Operations</h3><p className="text-gray-700 leading-relaxed">The most common operations performed on arrays include accessing elements, inserting new values, deleting existing values, and searching for specific elements. Each of these operations has different time complexities that we'll explore in detail...</p></div>
              </div>
            </div>
          </div>

          {/* Search Panel (remains on the right) */}
          {showSearch && (
            <div className="w-96 bg-white border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300 h-full">
              <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900">Search OER Content</h3><button onClick={() => setShowSearch(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4 text-black" /></button></div>
                <div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" /><input type="text" placeholder="Search for topics, concepts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black" /></div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {searchResults.map((result, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"><div className="flex items-start justify-between mb-2"><h4 className="font-semibold text-gray-900 text-sm">{result.title}</h4><button className="text-blue-600 hover:text-blue-800"><Plus className="w-4 h-4" /></button></div><p className="text-xs text-blue-600 mb-2">{result.source}</p><p className="text-sm text-gray-600 mb-2">{result.preview}</p><span className="text-xs text-gray-500">{result.pages}</span></div>
                  ))}
                </div>
                {/* CHANGE 4: Added "Recommended by Faculty" section */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">Recommended by Faculty</h4>
                  <div className="space-y-4">
                    {recommendedResults.map((result, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 text-sm">{result.title}</h4>
                          <div className="flex items-center space-x-1 text-sm font-medium text-yellow-600">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span>{result.rating}</span>
                          </div>
                        </div>
                        <p className="text-xs text-blue-600 mb-2">{result.source}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextbookEditor;



// src/app/page.tsx

//import { redirect } from "next/navigation";

/**
 * This is the root page of the application.
 *
 * In our new application structure, the main entry point for a user is the login page.
 * This component's sole responsibility is to redirect any traffic from the root URL ("/")
 * to the "/login" page.
 *
 * The actual textbook editor has been moved to a dynamic route at "/editor/[bookId]".
 */
//export default function HomePage() {
  //redirect("/login");

  // This component will never render anything, as the redirect happens on the server.
  // A return statement is still good practice.
  //return null;
//}

