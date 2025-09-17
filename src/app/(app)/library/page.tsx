// src/app/(app)/library/page.tsx

"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, BookOpen, FileText, Video, Star, User, Globe, Calendar, Plus, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// --- TypeScript Interface for Data Shape ---
interface OerResource {
  id: string;
  title: string;
  author: string;
  source: string;
  type: "book" | "chapter" | "video";
  rating: number;
  year: number;
  subject: string; // CORRECTED: Added missing property
}

// --- Mock Data & API ---
const mockOerData: OerResource[] = [
  { id: "1", title: "Calcolo Differenziale e Integrale", author: "Prof. Marco Rossi", source: "MIT OpenCourseWare", type: "book", rating: 4.8, year: 2023, subject: "Mathematics" },
  { id: "2", title: "Fisica Quantistica", author: "Prof. Elena Bianchi", source: "OpenStax", type: "chapter", rating: 4.6, year: 2022, subject: "Physics" },
  { id: "3", title: "Algoritmi e Strutture Dati", author: "Dr. Giovanni Verdi", source: "Khan Academy", type: "video", rating: 4.9, year: 2023, subject: "Computer Science" },
];
const fetchOerResources = async (): Promise<OerResource[]> => {
  await new Promise(res => setTimeout(res, 1000));
  return mockOerData;
};

export default function LibraryPage() {
  const { data: resources = [], isLoading } = useQuery<OerResource[]>({ queryKey: ["oer-resources"], queryFn: fetchOerResources });
  const { toast } = useToast();

  const getTypeIcon = (type: string) => {
    const props = { className: "h-5 w-5 text-gray-500" };
    if (type === "book") return <BookOpen {...props} />;
    if (type === "chapter") return <FileText {...props} />;
    if (type === "video") return <Video {...props} />;
    return null;
  };

  return (
    <div className="p-8">
      {/* Page Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">OER Library</h1>
        <p className="mt-1 text-gray-600">Explore open educational resources to enrich your content.</p>
      </header>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search for topics, authors..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black" />
          </div>
          <div>
            <label htmlFor="subject" className="sr-only">Subject</label>
            <select id="subject" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white">
              <option>All Subjects</option>
              <option>Mathematics</option>
              <option>Physics</option>
            </select>
          </div>
          <div>
            <label htmlFor="type" className="sr-only">Content Type</label>
            <select id="type" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black bg-white">
              <option>All Types</option>
              <option>Book</option>
              <option>Chapter</option>
              <option>Video</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-6">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))
        ) : (
          resources.map((resource) => (
            <div key={resource.id} className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                      {getTypeIcon(resource.type)}
                      <h2 className="text-lg font-bold text-gray-900">{resource.title}</h2>
                    </div>
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                      <span className="flex items-center"><User className="h-4 w-4 mr-1.5" />{resource.author}</span>
                      <span className="flex items-center"><Globe className="h-4 w-4 mr-1.5" />{resource.source}</span>
                      <span className="flex items-center"><Calendar className="h-4 w-4 mr-1.5" />{resource.year}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-6 text-right">
                    <div className="flex items-center justify-end">
                      <Star className="h-5 w-5 text-yellow-400 fill-current" />
                      <span className="ml-1 text-md font-bold text-gray-900">{resource.rating}</span>
                    </div>
                    <span className="text-xs text-gray-500">Rating</span>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50/70 border-t border-gray-200 flex justify-between items-center">
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">{resource.subject}</span>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 flex items-center">
                    <Eye className="h-4 w-4 mr-2" /> Preview
                  </button>
                  <button onClick={() => toast({ title: "Content Added!" })} className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold flex items-center">
                    <Plus className="h-4 w-4 mr-2" /> Add to Editor
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}