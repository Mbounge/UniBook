// src/app/(app)/admin/page.tsx

"use client";

import React, { useState } from "react";
import {
  Shield,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  Upload,
  FileText,
  Eye,
  Trash2,
  Plus,
} from "lucide-react";

// Import the final, restyled child components
import LibraryUpload from "@/components/admin/library-upload";
import AnalyticsDashboard from "@/components/tools/analytics-dashboard";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: Shield },
    { id: "content", label: "Content", icon: BookOpen },
    { id: "upload", label: "Upload OER", icon: Upload },
    { id: "users", label: "Users", icon: Users },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="p-8">
      {/* Page Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
        </div>
        <p className="mt-1 text-gray-600">Manage platform content, users, and settings.</p>
      </header>

      {/* Custom Tab Navigation */}
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
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-600">Total OER</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">2,486</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-600">Active Users</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">1,429</p>
            </div>
          </div>
        )}
        {activeTab === "content" && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900">Content Management</h2>
              <div className="mt-4 flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-4">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Introduction to Linear Algebra</h4>
                    <p className="text-sm text-gray-600">PDF • 2.4 MB</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg"><Eye className="h-5 w-5 text-gray-600" /></button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg"><Trash2 className="h-5 w-5 text-red-600" /></button>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "upload" && <LibraryUpload onUploadSuccess={() => setActiveTab("content")} />}
        {activeTab === "users" && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">User Management</h2>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center">
                  <Plus className="h-4 w-4 mr-2" /> New User
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === "analytics" && <AnalyticsDashboard />}
        {activeTab === "settings" && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900">System Settings</h2>
          </div>
        )}
      </div>
    </div>
  );
}