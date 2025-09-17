// src/components/tools/future-vision.tsx

"use client";

import React, { useState } from "react";
import { Rocket, Brain, Eye, Zap, Calendar } from "lucide-react";

const futureFeatures = {
  "2025": [
    { category: "ai", title: "Personalized AI Tutors", progress: 75, status: "In Development" },
    { category: "ar_vr", title: "Immersive Virtual Labs", progress: 60, status: "Prototype" },
    { category: "neural", title: "Cognitive Biofeedback", progress: 40, status: "Research" },
  ],
  "2030": [
    { category: "ai", title: "Sentient AI Professors", progress: 30, status: "Concept" },
    { category: "ar_vr", title: "Full Metaverse University", progress: 25, status: "Vision" },
    { category: "neural", title: "Direct Knowledge Transfer", progress: 15, status: "Research" },
  ],
  "2040": [
    { category: "ai", title: "Educational Superintelligence", progress: 5, status: "Theoretical" },
    { category: "ar_vr", title: "Indistinguishable Reality", progress: 8, status: "Speculative" },
    { category: "neural", title: "Mental Upload", progress: 2, status: "Speculative" },
  ],
};

export default function FutureVision() {
  const [selectedYear, setSelectedYear] = useState<"2025" | "2030" | "2040">("2025");

  const getCategoryIcon = (category: string) => {
    const props = { className: "h-5 w-5 text-blue-600" };
    switch (category) {
      case "ai": return <Brain {...props} />;
      case "ar_vr": return <Eye {...props} />;
      case "neural": return <Zap {...props} />;
      default: return null;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 flex items-center">
          <Rocket className="w-5 h-5 mr-2 text-blue-600" />
          Future Vision (2025-2040)
        </h2>
      </div>
      <div className="p-6">
        <div className="flex gap-2 mb-6">
          {(["2025", "2030", "2040"] as const).map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center transition-colors ${
                selectedYear === year
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Calendar className="h-4 w-4 mr-2" />
              {year}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {futureFeatures[selectedYear].map((feature) => (
            <div key={feature.title} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                {getCategoryIcon(feature.category)}
                <h3 className="ml-2 text-md font-bold text-gray-900">{feature.title}</h3>
              </div>
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${feature.progress}%` }}></div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-gray-600">{feature.status}</span>
                  <span className="font-bold text-blue-600">{feature.progress}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}