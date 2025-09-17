// src/components/admin/library-upload.tsx

"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, Link, Database, Plus, CheckCircle, Loader2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock API function
const uploadResource = async (data: any) => {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  console.log("Uploading resource:", data);
  return { success: true };
};

export default function LibraryUpload({ onUploadSuccess }: { onUploadSuccess?: () => void; }) {
  const [uploadMethod, setUploadMethod] = useState<"manual" | "url" | "file">("manual");
  const [formData, setFormData] = useState({ title: "", description: "", author: "" });
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: uploadResource,
    onSuccess: () => {
      toast({ title: "Resource Added", description: "The new resource is now in the OER library." });
      onUploadSuccess?.();
    },
    onError: (error: any) => {
      toast({ title: "Upload Failed", description: "An error occurred.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast({ title: "Title is required.", variant: "destructive" });
      return;
    }
    uploadMutation.mutate({ ...formData, file: file?.name });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
          Add New OER Resource
        </h2>
      </div>
      <div className="p-6">
        {/* Upload Method Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div
            onClick={() => setUploadMethod("manual")}
            className={`p-4 text-center border-2 rounded-lg cursor-pointer transition-colors ${uploadMethod === "manual" ? "border-blue-600 bg-blue-50" : "border-gray-300 hover:border-blue-400"}`}
          >
            <Database className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Manual Entry</h3>
          </div>
          <div
            onClick={() => setUploadMethod("url")}
            className={`p-4 text-center border-2 rounded-lg cursor-pointer transition-colors ${uploadMethod === "url" ? "border-blue-600 bg-blue-50" : "border-gray-300 hover:border-blue-400"}`}
          >
            <Link className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-semibold text-gray-900">External Link</h3>
          </div>
          <div
            onClick={() => setUploadMethod("file")}
            className={`p-4 text-center border-2 rounded-lg cursor-pointer transition-colors ${uploadMethod === "file" ? "border-blue-600 bg-blue-50" : "border-gray-300 hover:border-blue-400"}`}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-semibold text-gray-900">File Upload</h3>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {uploadMethod === "file" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select File</label>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              {file && <p className="mt-2 text-sm text-green-600 flex items-center"><CheckCircle className="w-4 h-4 mr-1" />{file.name}</p>}
            </div>
          )}
          {uploadMethod === "url" && (
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">Resource URL</label>
              <input type="url" id="url" placeholder="https://example.com/resource" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black" />
            </div>
          )}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input type="text" id="title" value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black" required />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea id="description" value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black" />
          </div>
          <div className="pt-4 border-t border-gray-200 flex justify-end">
            <button type="submit" disabled={uploadMutation.isPending} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:bg-blue-400">
              {uploadMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {uploadMutation.isPending ? "Adding..." : "Add to Library"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}