// src/app/(app)/tools/page.tsx

"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Users, User, BarChart3, Brain, BookOpen, Check, ChevronDown } from "lucide-react";

// Import the components
import ClassAnalytics from "@/components/tools/class-analytics";
import StudentAnalytics from "@/components/tools/student-analytics";
import Gradebook from "@/components/tools/gradebook";
import StudentAIInsightsController from "@/components/tools/student-ai-insights-controller";

// Mock data for the class picker
const classes = [
  { id: "cl_1", name: "Physics 101 - Section A" },
  { id: "cl_2", name: "Advanced Calculus - Section B" },
  { id: "cl_3", name: "Intro to Computer Science" },
];

export default function ToolsPage() {
  const [selectedClass, setSelectedClass] = useState(classes[0].id);
  const [viewMode, setViewMode] = useState<"class" | "student">("class");
  const [activeTab, setActiveTab] = useState("analytics");

  // State and ref for the custom class picker dropdown
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || "Select a class...";

  // Effect to handle closing the dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [pickerRef]);

  const tabs = [
    { id: "analytics", label: "Performance Analytics", icon: BarChart3 },
    { id: "student-ai", label: "Student AI Insights", icon: Brain },
    { id: "gradebook", label: "Gradebook", icon: BookOpen },
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Advanced Tools</h1>
              <p className="mt-1 text-gray-600">
                Switch between class-level and individual student analytics.
              </p>
            </div>
          </div>
          
          {/* --- NEW Custom Class Picker UI --- */}
          <div ref={pickerRef} className="relative w-full sm:w-64">
            <button
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white text-black focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <span className="truncate">{selectedClassName}</span>
              <ChevronDown
                className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                  isPickerOpen ? "transform rotate-180" : ""
                }`}
              />
            </button>
            {isPickerOpen && (
              <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                <ul className="py-1">
                  {classes.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => {
                          setSelectedClass(c.id);
                          setIsPickerOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 flex items-center justify-between"
                      >
                        <span className={selectedClass === c.id ? 'font-semibold' : 'font-normal'}>
                          {c.name}
                        </span>
                        {selectedClass === c.id && <Check className="h-4 w-4 text-blue-600" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* View Mode Toggle (Class vs. Student) */}
      <div className="flex mb-6">
        <div className="flex p-1 bg-gray-200 rounded-lg">
          <button
            onClick={() => setViewMode("class")}
            className={`px-6 py-2 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors ${
              viewMode === "class" ? "bg-white text-blue-600 shadow" : "text-gray-600 hover:bg-gray-300"
            }`}
          >
            <Users className="h-5 w-5" /> Class View
          </button>
          <button
            onClick={() => setViewMode("student")}
            className={`px-6 py-2 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors ${
              viewMode === "student" ? "bg-white text-blue-600 shadow" : "text-gray-600 hover:bg-gray-300"
            }`}
          >
            <User className="h-5 w-5" /> Student View
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <tab.icon className="mr-2 h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === "analytics" && (
          viewMode === "class" ? <ClassAnalytics classId={selectedClass} /> : <StudentAnalytics classId={selectedClass} />
        )}
        
        {activeTab === "student-ai" && (
          <StudentAIInsightsController viewMode={viewMode} classId={selectedClass} />
        )}

        {activeTab === "gradebook" && (
          <Gradebook classId={selectedClass} />
        )}
      </div>
    </div>
  );
}