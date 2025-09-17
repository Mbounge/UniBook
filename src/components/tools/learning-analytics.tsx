// src/components/tools/learning-analytics.tsx

"use client";

import React, { useState } from "react";
import { BarChart3, Clock, Zap } from "lucide-react";

const learningMetrics = {
  cognitiveLoad: 68,
  attentionSpan: 78,
  retentionRate: 85,
};

const behaviorInsights = {
  studyTime: 145, // minutes/day
  peakTime: "9:00-11:00 AM",
  strugglingAreas: ["Abstract concepts", "Complex problem solving"],
};

export default function LearningAnalytics() {
  const [activeTab, setActiveTab] = useState("cognitive");

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
          Advanced Learning Analytics
        </h2>
      </div>
      <div className="p-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6">
            <button
              onClick={() => setActiveTab("cognitive")}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === "cognitive" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Cognitive Metrics
            </button>
            <button
              onClick={() => setActiveTab("behavior")}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === "behavior" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Behavior Analysis
            </button>
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === "cognitive" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-600">Cognitive Load</h4>
                <p className="text-2xl font-bold text-gray-900 mt-1">{learningMetrics.cognitiveLoad}%</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-600">Attention Span</h4>
                <p className="text-2xl font-bold text-gray-900 mt-1">{learningMetrics.attentionSpan}%</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-600">Retention Rate</h4>
                <p className="text-2xl font-bold text-gray-900 mt-1">{learningMetrics.retentionRate}%</p>
              </div>
            </div>
          )}
          {activeTab === "behavior" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Study Behavior</h4>
                    <p className="text-sm text-gray-600">Avg. {behaviorInsights.studyTime} min/day</p>
                    <p className="text-sm text-gray-600">Peak Time: {behaviorInsights.peakTime}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Learning Style</h4>
                    <p className="text-sm text-gray-600">Primarily Visual & Auditory</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {behaviorInsights.strugglingAreas.map((area) => (
                        <span key={area} className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">{area}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}