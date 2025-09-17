// src/app/(app)/dashboard/page.tsx

"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Edit, Eye, Plus, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
// --- MODIFIED: Import the Book type definition ---
import { fetchBooks, createBook, Book } from "@/lib/mock-data";

export default function DashboardPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBook, setNewBook] = useState({ title: "", description: "" });
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ["books"],
    queryFn: fetchBooks
  });

  const createBookMutation = useMutation({
    mutationFn: createBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books"] });
      setShowCreateDialog(false);
      setNewBook({ title: "", description: "" });
      toast({ title: "Textbook Created", description: "Your new textbook is ready." });
    },
    onError: () => {
      toast({ title: "Creation Failed", variant: "destructive" });
    }
  });

  const handleCreateBook = () => {
    if (!newBook.title.trim()) {
      toast({ title: "Title Required", variant: "destructive" });
      return;
    }
    createBookMutation.mutate(newBook);
  };

  // --- MODIFIED: Simplified the navigation function ---
  // The editor now fetches its own data, so we only need to pass the book's ID.
  const openEditor = (book: Book) => {
    router.push(`/editor/${book.id}`);
  };

  return (
    <div className="p-8">
      {/* Header and Stat Cards */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">Manage your custom textbook projects.</p>
        </div>
        <button onClick={() => setShowCreateDialog(true)} className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><Plus className="mr-2 h-4 w-4" />New Textbook</button>
      </div>
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6"><div className="flex items-center justify-between"><h3 className="text-sm font-medium text-gray-600">Total Books</h3><BookOpen className="h-5 w-5 text-gray-400" /></div><p className="text-3xl font-bold text-gray-900 mt-2">{books.length}</p></div>
        <div className="bg-white border border-gray-200 rounded-lg p-6"><div className="flex items-center justify-between"><h3 className="text-sm font-medium text-gray-600">Published</h3><Eye className="h-5 w-5 text-gray-400" /></div><p className="text-3xl font-bold text-gray-900 mt-2">{books.filter(b => b.isPublished).length}</p></div>
        <div className="bg-white border border-gray-200 rounded-lg p-6"><div className="flex items-center justify-between"><h3 className="text-sm font-medium text-gray-600">Drafts</h3><Edit className="h-5 w-5 text-gray-400" /></div><p className="text-3xl font-bold text-gray-900 mt-2">{books.filter(b => !b.isPublished).length}</p></div>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse"><div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div><div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div><div className="h-10 bg-gray-200 rounded w-full"></div></div>
          ))
        ) : (
          books.map((book) => (
            <div key={book.id} className="bg-white border border-gray-200 rounded-lg flex flex-col hover:shadow-md transition-shadow">
              <div className="p-6 flex-grow">
                <div className="flex justify-between items-start mb-2"><h2 className="text-lg font-bold text-gray-900">{book.title}</h2><span className={`px-2 py-0.5 text-xs font-medium rounded-full ${book.isPublished ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{book.isPublished ? "Published" : "Draft"}</span></div>
                <p className="text-sm text-gray-600">{book.description}</p>
              </div>
              <div className="p-6 bg-gray-50/50 border-t border-gray-200">
                <button onClick={() => openEditor(book)} className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"><Edit className="mr-2 h-4 w-4" />Open Editor</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Book Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"><div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4"><div className="p-6 border-b border-gray-200 flex justify-between items-center"><h2 className="text-lg font-bold text-gray-900">Create New Textbook</h2><button onClick={() => setShowCreateDialog(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-600" /></button></div><div className="p-6 space-y-4"><div><label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label><input type="text" id="title" value={newBook.title} onChange={(e) => setNewBook(p => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black" /></div><div><label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea id="description" value={newBook.description} onChange={(e) => setNewBook(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black" /></div></div><div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end"><button onClick={handleCreateBook} disabled={createBookMutation.isPending} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">{createBookMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Textbook</button></div></div></div>
      )}
    </div>
  );
}