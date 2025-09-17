// src/app/(app)/documents/page.tsx

"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Upload, FileText, File, Image, Video, Archive, Download, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// --- TypeScript Interface for Data Shape ---
interface Document {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

// --- Mock Data & API ---
const mockDocuments: Document[] = [
  { id: "doc-1", name: "Chapter 1 Draft.pdf", mimeType: "application/pdf", size: 2.5 * 1024 * 1024, createdAt: new Date() },
  { id: "doc-2", name: "Molecule Diagram.png", mimeType: "image/png", size: 512 * 1024, createdAt: new Date() },
  { id: "doc-3", name: "Lab Experiment.mp4", mimeType: "video/mp4", size: 15 * 1024 * 1024, createdAt: new Date() },
];
const fetchDocuments = async (): Promise<Document[]> => {
  await new Promise(res => setTimeout(res, 1000));
  return mockDocuments;
};

export default function DocumentsPage() {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const { data: documents = [], isLoading } = useQuery<Document[]>({ queryKey: ["documents"], queryFn: fetchDocuments });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      await new Promise(res => setTimeout(res, 1500));
      return { success: true };
    },
    onSuccess: () => {
      setShowUploadDialog(false);
      setSelectedFile(null);
      toast({ title: "File Uploaded Successfully" });
    },
    onError: () => {
      toast({ title: "Upload Failed", variant: "destructive" });
    },
  });

  const handleUpload = () => {
    if (!selectedFile) {
      toast({ title: "No file selected.", variant: "destructive" });
      return;
    }
    uploadMutation.mutate(selectedFile);
  };

  const getFileIcon = (mimeType: string) => {
    const props = { className: "h-6 w-6 flex-shrink-0" };
    if (mimeType.startsWith("image/")) return <Image {...props} color="#10b981" />;
    if (mimeType.startsWith("video/")) return <Video {...props} color="#ef4444" />;
    if (mimeType.includes("pdf")) return <FileText {...props} color="#3b82f6" />;
    return <File {...props} color="#6b7280" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="p-8">
      {/* Page Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Documents</h1>
          <p className="mt-1 text-gray-600">Manage your personal files and uploaded materials.</p>
        </div>
        <button onClick={() => setShowUploadDialog(true)} className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Upload className="mr-2 h-4 w-4" />
          Upload File
        </button>
      </header>

      {/* Document List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900">All Files</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse flex items-center gap-4">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                <div className="flex-grow space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  {getFileIcon(doc.mimeType)}
                  <div>
                    <p className="font-semibold text-gray-900">{doc.name}</p>
                    <p className="text-sm text-gray-600">
                      {formatFileSize(doc.size)} • Uploaded on {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 flex items-center">
                    <Download className="h-4 w-4 mr-2" /> Download
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg m-4">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Upload New File</h2>
              <button onClick={() => setShowUploadDialog(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <label htmlFor="file-upload" className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-500 cursor-pointer">
                  <span>Select a file</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                </label>
                <p className="mt-1 text-xs text-gray-500">PNG, JPG, PDF, MP4 up to 50MB</p>
              </div>
              {selectedFile && <p className="mt-4 text-sm text-center text-gray-700">Selected: {selectedFile.name}</p>}
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowUploadDialog(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100">
                Cancel
              </button>
              <button onClick={handleUpload} disabled={uploadMutation.isPending || !selectedFile} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center disabled:bg-blue-400">
                {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}