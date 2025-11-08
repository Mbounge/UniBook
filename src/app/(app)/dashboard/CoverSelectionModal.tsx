// src/app/(app)/dashboard/CoverSelectionModal.tsx

"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, UploadCloud, Image as ImageIcon, Loader2, CheckCircle } from "lucide-react";
import { Book } from "@/lib/mock-data";

// Mock function to fetch images from a gallery (e.g., Unsplash)
const fetchGalleryImages = async (): Promise<string[]> => {
  await new Promise(res => setTimeout(res, 700));
  return [
    "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80",
    "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&q=80",
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80",
    "https://images.unsplash.com/photo-1589998059171-988d887df646?w=400&q=80",
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80",
    "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=80",
    "https://images.unsplash.com/photo-1543002588-b9b656e99c49?w=400&q=80",
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80",
  ];
};

interface CoverSelectionModalProps {
  book: Book;
  onClose: () => void;
  onSave: (coverImage: string) => void;
  isSaving: boolean;
}

export const CoverSelectionModal: React.FC<CoverSelectionModalProps> = ({ book, onClose, onSave, isSaving }) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'upload'>('gallery');
  const [selectedCover, setSelectedCover] = useState<string>(book.coverImage || '');

  const { data: galleryImages = [], isLoading: isGalleryLoading } = useQuery({
    queryKey: ['galleryImages'],
    queryFn: fetchGalleryImages,
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          setSelectedCover(e.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const isSaveDisabled = isSaving || selectedCover === book.coverImage;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col h-[80vh]">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Change Cover for "{book.title}"</h2>
            <p className="text-sm text-gray-500">Choose a new cover from the gallery or upload your own.</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-600" /></button>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="w-1/3 bg-gray-50 border-r border-gray-200 p-6 flex flex-col">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Preview</h3>
            <div className="aspect-[4/5] w-full bg-gray-200 rounded-lg overflow-hidden shadow-md">
              {selectedCover ? (
                <img src={selectedCover} alt="Selected cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon className="w-10 h-10" /></div>
              )}
            </div>
            <div className="mt-auto flex-shrink-0">
              <button 
                onClick={() => onSave(selectedCover)} 
                disabled={isSaveDisabled}
                className="w-full px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="w-2/3 flex flex-col">
            <div className="p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex gap-2">
                <button onClick={() => setActiveTab('gallery')} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'gallery' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>Gallery</button>
                <button onClick={() => setActiveTab('upload')} className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'upload' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>Upload</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'gallery' && (
                isGalleryLoading ? (
                  <div className="grid grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />)}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {galleryImages.map((imgUrl) => (
                      <button key={imgUrl} onClick={() => setSelectedCover(imgUrl)} className="relative aspect-square rounded-lg overflow-hidden group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                        <img src={imgUrl} alt="Gallery cover option" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        {selectedCover === imgUrl && (
                          <div className="absolute inset-0 bg-blue-600/70 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )
              )}
              {activeTab === 'upload' && (
                <div className="h-full flex items-center justify-center">
                  <label className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <UploadCloud className="w-10 h-10 text-gray-400 mb-2" />
                    <span className="font-semibold text-blue-600">Click to upload</span>
                    <span className="text-sm text-gray-500">or drag and drop</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};