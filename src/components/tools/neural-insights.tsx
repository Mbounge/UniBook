// src/components/tools/neural-insights.tsx

"use client";

import React, { useState } from "react";
import { Brain, Lightbulb } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";

const cognitiveMetrics = [
  { subject: "Attention", value: 85 },
  { subject: "Memory", value: 78 },
  { subject: "Comprehension", value: 92 },
  { subject: "Problem Solving", value: 88 },
];

const learningPatterns = [
  { time: "09:00", focus: 85, retention: 78 },
  { time: "10:00", focus: 92, retention: 85 },
  { time: "11:00", focus: 88, retention: 82 },
];

const neuralInsights = [
  { title: "Optimal Learning Time", description: "Concentration is highest between 10:00 and 11:00 AM." },
  { title: "Preferred Learning Style", description: "Visual learning with audio support is most effective." },
];

export default function NeuralInsights() {
  const [activeTab, setActiveTab] = useState("cognitive");

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 flex items-center">
          <Brain className="w-5 h-5 mr-2 text-blue-600" />
          Neural Insights (Predictive AI)
        </h2>
      </div>
      <div className="p-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6">
            <button
              onClick={() => setActiveTab("cognitive")}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === "cognitive" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Cognitive Profile
            </button>
            <button
              onClick={() => setActiveTab("patterns")}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === "patterns" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Learning Patterns
            </button>
            <button
              onClick={() => setActiveTab("insights")}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === "insights" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              AI Insights
            </button>
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === "cognitive" && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-md font-bold text-gray-900 mb-4">Cognitive Map</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={cognitiveMetrics}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" fontSize={12} />
                  <Radar name="Cognitive Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
          {activeTab === "patterns" && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-md font-bold text-gray-900 mb-4">Daily Learning Patterns</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={learningPatterns}>
                  <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip wrapperClassName="!border-gray-300 !bg-white !rounded-lg" />
                  <Line type="monotone" dataKey="focus" name="Focus" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="retention" name="Retention" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {activeTab === "insights" && (
            <div className="space-y-4">
              {neuralInsights.map((insight, index) => (
                <div key={index} className="bg-blue-50 border-l-4 border-blue-500 p-4">
                  <div className="flex items-start">
                    <Lightbulb className="h-5 w-5 mr-3 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                      <p className="text-sm text-gray-700">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}