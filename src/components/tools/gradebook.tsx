// src/components/tools/gradebook.tsx

"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, TrendingUp, TrendingDown } from "lucide-react";

// --- TypeScript Interfaces ---
interface Assignment {
  id: string;
  name: string;
  maxPoints: number;
}

interface Student {
  id: string;
  name: string;
  // This index signature is the key. It allows any string to be used as an index.
  assignments: { [key: string]: number | null };
  finalGrade: number;
  trend: "up" | "down" | "stable";
}

interface GradebookProps {
  classId: string;
}

// NEW INTERFACE to define the shape of our data for each class
interface ClassGradeData {
  assignments: Assignment[];
  students: Student[];
}

// --- Mock Data (now explicitly typed to resolve the error) ---
const mockData: Record<string, ClassGradeData> = {
  cl_1: { // Physics 101
    assignments: [
      { id: "a1", name: "Quiz 1", maxPoints: 20 },
      { id: "a2", name: "Homework 1", maxPoints: 50 },
      { id: "a3", name: "Midterm Exam", maxPoints: 100 },
    ],
    students: [
      { id: "s1", name: "Sofia Chen", assignments: { a1: 18, a2: 45, a3: 85 }, finalGrade: 87, trend: "up" },
      { id: "s2", name: "Luca Moretti", assignments: { a1: 16, a2: 40, a3: 78 }, finalGrade: 82, trend: "stable" },
    ],
  },
  cl_2: { // Advanced Calculus
    assignments: [
      { id: "a4", name: "Proof Set 1", maxPoints: 100 },
      { id: "a5", name: "Derivative Quiz", maxPoints: 50 },
    ],
    students: [
      { id: "s3", name: "Emma Ricci", assignments: { a4: 88, a5: 42 }, finalGrade: 85, trend: "stable" },
    ],
  },
  cl_3: { // Intro to CS
     assignments: [
      { id: "a6", name: "Lab 1: Variables", maxPoints: 10 },
      { id: "a7", name: "Lab 2: Loops", maxPoints: 10 },
    ],
    students: [
       { id: "s4", name: "Aria Gupta", assignments: { a6: 10, a7: 9 }, finalGrade: 95, trend: "up" },
       { id: "s5", name: "Marco Bianchi", assignments: { a6: 7, a7: 8 }, finalGrade: 75, trend: "down" },
    ],
  }
};

export default function Gradebook({ classId }: GradebookProps) {
  const [activeTab, setActiveTab] = useState("grades");

  const { assignments, students } = mockData[classId] || { assignments: [], students: [] };

  useEffect(() => {
    console.log("Loading gradebook for class:", classId);
  }, [classId]);

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return "bg-green-100 text-green-800";
    if (grade >= 80) return "bg-blue-100 text-blue-800";
    if (grade >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="h-5 w-5 text-green-600" />;
      case "down": return <TrendingDown className="h-5 w-5 text-red-600" />;
      default: return <div className="h-5 w-5" />;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
          Digital Gradebook
        </h2>
      </div>
      <div className="p-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6">
            <button
              onClick={() => setActiveTab("grades")}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === "grades" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Grades
            </button>
            <button
              onClick={() => setActiveTab("assignments")}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === "assignments" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Assignments
            </button>
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === "grades" && (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    {assignments.map(a => (
                      <th key={a.id} className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{a.name}</th>
                    ))}
                    <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Final Grade</th>
                    <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map(student => (
                    <tr key={student.id}>
                      <td className="py-4 px-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                      {assignments.map(a => (
                        // This line now works without an error
                        <td key={a.id} className="py-4 px-4 whitespace-nowrap text-sm text-gray-500 text-center">{student.assignments[a.id] ?? "-"}</td>
                      ))}
                      <td className="py-4 px-4 whitespace-nowrap text-sm text-center">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getGradeColor(student.finalGrade)}`}>
                          {student.finalGrade}%
                        </span>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-sm text-center flex justify-center">{getTrendIcon(student.trend)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === "assignments" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {assignments.map(a => (
                <div key={a.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900">{a.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">Max Points: {a.maxPoints}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}