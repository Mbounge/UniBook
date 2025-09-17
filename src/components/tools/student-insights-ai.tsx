// src/components/tools/student-insights-ai.tsx

"use client";

import React, { useState } from "react";
import { Brain, AlertTriangle, CheckCircle, Lightbulb, Eye, MessageSquare, Zap, BookOpen } from "lucide-react";

interface StudentProfile {
  id: string;
  name: string;
  avatar: string;
  learningStyle: "visual" | "auditory" | "kinesthetic" | "reading";
  comprehension: number;
  struggling: string[];
  strengths: string[];
  recommendations: string[];
}

const mockStudents: StudentProfile[] = [
  { id: "1", name: "Marco Rossi", avatar: "MR", learningStyle: "visual", comprehension: 78, struggling: ["Linear Algebra"], strengths: ["Calculus"], recommendations: ["Use visual diagrams for algebra concepts."] },
  { id: "2", name: "Sofia Chen", avatar: "SC", learningStyle: "auditory", comprehension: 92, struggling: ["Group Theory"], strengths: ["Analysis"], recommendations: ["Provide audio lectures for group theory."] },
  { id: "3", name: "A. Bianchi", avatar: "AB", learningStyle: "kinesthetic", comprehension: 65, struggling: ["Abstract Physics"], strengths: ["Lab Work"], recommendations: ["Provide hands-on experiments."] },
];

export default function StudentInsightsAI() {
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(mockStudents[0]);

  const getLearningStyleIcon = (style: string) => {
    const props = { className: "h-4 w-4 text-gray-500" };
    switch (style) {
      case "visual": return <Eye {...props} />;
      case "auditory": return <MessageSquare {...props} />;
      case "kinesthetic": return <Zap {...props} />;
      case "reading": return <BookOpen {...props} />;
      default: return <Brain {...props} />;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 flex items-center">
          <Brain className="w-5 h-5 mr-2 text-blue-600" />
          AI Student Insights
        </h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student List */}
          <div className="lg:col-span-1 space-y-2">
            {mockStudents.map((student) => (
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
                  <p className="text-xs text-gray-500">Comprehension: {student.comprehension}%</p>
                </div>
              </button>
            ))}
          </div>

          {/* Individual Analysis Panel */}
          <div className="lg:col-span-2">
            {selectedStudent ? (
              <div className="space-y-6">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                    {selectedStudent.avatar}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{selectedStudent.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getLearningStyleIcon(selectedStudent.learningStyle)}
                      <span className="text-sm text-gray-600 capitalize">{selectedStudent.learningStyle} Learner</span>
                    </div>
                  </div>
                </div>

                {/* Strengths and Weaknesses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 flex items-center mb-2">
                      <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
                      Struggling Areas
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedStudent.struggling.map((topic) => (
                        <span key={topic} className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">{topic}</span>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 flex items-center mb-2">
                      <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                      Strengths
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedStudent.strengths.map((strength) => (
                        <span key={strength} className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">{strength}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Recommendations */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                  <h4 className="font-semibold text-gray-900 flex items-center mb-2">
                    <Lightbulb className="w-5 h-5 mr-2 text-blue-600" />
                    AI Recommendations
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-700 list-disc pl-5">
                    {selectedStudent.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center text-gray-500 p-12 border-2 border-dashed rounded-lg">
                <p>Select a student to view their insights.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}