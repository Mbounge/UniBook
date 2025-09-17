// src/components/tools/behavior-prediction-ai.tsx

"use client";

import React, { useState } from "react";
import { Brain, TrendingUp, TrendingDown, Activity, Lightbulb, Award, AlertTriangle } from "lucide-react";

interface StudentBehaviorProfile {
  id: string;
  name: string;
  avatar: string;
  risk: "low" | "medium" | "high";
  trend: "improving" | "stable" | "declining";
  predictions: { performance: number; dropout: number; };
  recommendations: string[];
  strengths: string[];
  challenges: string[];
}

const mockProfiles: StudentBehaviorProfile[] = [
  { id: "1", name: "Marco Bianchi", avatar: "MB", risk: "high", trend: "declining", predictions: { performance: 45, dropout: 72 }, recommendations: ["Schedule immediate 1-on-1 counseling session."], strengths: ["Visual learning"], challenges: ["Time management"] },
  { id: "2", name: "Sofia Chen", avatar: "SC", risk: "low", trend: "improving", predictions: { performance: 95, dropout: 5 }, recommendations: ["Consider advanced placement or enrichment activities."], strengths: ["Self-regulation"], challenges: ["May become bored"] },
];

export default function BehaviorPredictionAI() {
  const [selectedStudent, setSelectedStudent] = useState<StudentBehaviorProfile | null>(mockProfiles[0]);
  const [activeTab, setActiveTab] = useState("predictions");

  const getRiskColor = (risk: string) => {
    if (risk === "high") return "bg-red-100 text-red-800";
    if (risk === "medium") return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "improving") return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === "declining") return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 flex items-center">
          <Brain className="w-5 h-5 mr-2 text-blue-600" />
          AI Behavior Prediction Engine
        </h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student List */}
          <div className="lg:col-span-1 space-y-2">
            {mockProfiles.map((student) => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={`w-full p-3 rounded-lg border text-left transition-colors flex items-center gap-3 ${
                  selectedStudent?.id === student.id
                    ? "bg-blue-50 border-blue-300"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-semibold text-gray-600">
                  {student.avatar}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{student.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getTrendIcon(student.trend)}
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getRiskColor(student.risk)}`}>
                      {student.risk} risk
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Analysis Panel */}
          <div className="lg:col-span-2">
            {selectedStudent ? (
              <div>
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-6">
                    <button onClick={() => setActiveTab("predictions")} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === "predictions" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                      Predictions
                    </button>
                    <button onClick={() => setActiveTab("profile")} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === "profile" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                      Profile
                    </button>
                    <button onClick={() => setActiveTab("actions")} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === "actions" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                      Actions
                    </button>
                  </nav>
                </div>
                <div className="mt-6">
                  {activeTab === "predictions" && (
                    <div className="space-y-4">
                      <h3 className="font-bold text-gray-900">AI Performance Predictions</h3>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-gray-600">Next Week Performance</p>
                        <p className="text-2xl font-bold text-gray-900">{selectedStudent.predictions.performance}%</p>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-red-600">Dropout Risk</p>
                        <p className="text-2xl font-bold text-red-600">{selectedStudent.predictions.dropout}%</p>
                      </div>
                    </div>
                  )}
                  {activeTab === "profile" && (
                    <div className="space-y-4">
                       <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 flex items-center mb-2"><Award className="w-5 h-5 mr-2 text-green-500" />Strengths</h4>
                          <p className="text-sm text-gray-700">{selectedStudent.strengths.join(', ')}</p>
                       </div>
                       <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 flex items-center mb-2"><AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />Challenges</h4>
                          <p className="text-sm text-gray-700">{selectedStudent.challenges.join(', ')}</p>
                       </div>
                    </div>
                  )}
                  {activeTab === "actions" && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                      <h4 className="font-semibold text-gray-900 flex items-center mb-2"><Lightbulb className="w-5 h-5 mr-2 text-blue-600" />AI-Recommended Interventions</h4>
                      <ul className="space-y-2 text-sm text-gray-700 list-disc pl-5">
                        {selectedStudent.recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center text-gray-500 p-12 border-2 border-dashed rounded-lg">
                <p>Select a student to view their predictive analysis.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}