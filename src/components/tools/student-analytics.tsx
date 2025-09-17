// src/components/tools/student-analytics.tsx

"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from "recharts";
import { Clock, Brain, Target, TrendingUp, BookOpen, AlertTriangle } from "lucide-react";

// --- Mock Data ---
const mockStudentsByClass = {
  "cl_1": [{ id: "s_1", name: "Marco Bianchi", avatar: "MB" }, { id: "s_2", name: "Sofia Chen", avatar: "SC" }],
  "cl_2": [{ id: "s_3", name: "Luca Moretti", avatar: "LM" }, { id: "s_4", name: "Emma Ricci", avatar: "ER" }],
  "cl_3": [{ id: "s_5", name: "Aria Gupta", avatar: "AG" }],
};

const fetchStudentDetails = async (studentId: string | null) => {
  if (!studentId) return null;
  console.log("Fetching redesigned details for student:", studentId);
  await new Promise(res => setTimeout(res, 500));
  return {
    studyTime: 3.1,
    competence: 88,
    completionRate: 95,
    trend: "+7%",
    performanceTrend: [
      { name: "Week 1", performance: 75 }, { name: "Week 2", performance: 82 },
      { name: "Week 3", performance: 85 }, { name: "Week 4", performance: 88 },
    ],
    competenceMap: [
      { subject: "Kinetics", value: 95 }, { subject: "Thermo", value: 82 },
      { subject: "Quantum", value: 78 }, { subject: "Calculus", value: 91 },
    ],
    comfortZones: [{ id: "1", title: "Lab Simulations" }],
    areasOfGrowth: [{ id: "2", title: "Theoretical Problem Sets" }],
  };
};

// --- Main Component ---
export default function StudentAnalytics({ classId }: { classId: string }) {
  const studentsInClass = useMemo(() => mockStudentsByClass[classId as keyof typeof mockStudentsByClass] || [], [classId]);
  const [selectedStudent, setSelectedStudent] = useState(studentsInClass[0] || null);

  const { data: studentData, isLoading } = useQuery({
    queryKey: ["studentDetailsDashboard", selectedStudent?.id],
    queryFn: () => fetchStudentDetails(selectedStudent?.id),
    enabled: !!selectedStudent,
  });

  useEffect(() => {
    const newStudentList = mockStudentsByClass[classId as keyof typeof mockStudentsByClass] || [];
    setSelectedStudent(newStudentList[0] || null);
  }, [classId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Student List Sidebar */}
      <div className="lg:col-span-1 bg-white border border-gray-200 rounded-lg p-4 space-y-2 self-start">
        <h3 className="font-bold text-gray-900 px-2 mb-2">Students in Class</h3>
        {studentsInClass.map((student) => (
          <button
            key={student.id}
            onClick={() => setSelectedStudent(student)}
            className={`w-full p-2 rounded-lg border text-left transition-colors flex items-center gap-3 ${
              selectedStudent?.id === student.id
                ? "bg-blue-50 border-blue-300"
                : "bg-white border-transparent hover:bg-gray-50"
            }`}
          >
            <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center font-semibold text-gray-600 text-sm">
              {student.avatar}
            </div>
            <p className="font-semibold text-gray-900 text-sm">{student.name}</p>
          </button>
        ))}
      </div>

      {/* Main Student Dashboard Panel */}
      <div className="lg:col-span-3">
        {!selectedStudent ? (
          <div className="flex items-center justify-center h-full text-center text-gray-500 p-12 border-2 border-dashed rounded-lg">
            <p>Select a student to view their analytics dashboard.</p>
          </div>
        ) : isLoading ? (
          <StudentDashboardSkeleton />
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                {selectedStudent.avatar}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{selectedStudent.name}</h3>
                <p className="text-gray-600">Individual Performance Dashboard</p>
              </div>
            </div>
            
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard icon={Clock} title="Avg. Study Time" value={`${studentData?.studyTime}h`} />
              <StatCard icon={Brain} title="Competence" value={`${studentData?.competence}%`} />
              <StatCard icon={Target} title="Completion Rate" value={`${studentData?.completionRate}%`} />
              <StatCard icon={TrendingUp} title="Trend" value={studentData?.trend || 'N/A'} valueColor="text-green-600" />
            </div>

            {/* Main Grid: Charts and Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Trend</h3>
                <ResponsiveContainer width="100%" height={300}><LineChart data={studentData?.performanceTrend}><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} unit="%" /><Tooltip /><Line type="monotone" dataKey="performance" stroke="#3b82f6" /></LineChart></ResponsiveContainer>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Competence Map</h3>
                <ResponsiveContainer width="100%" height={300}><RadarChart data={studentData?.competenceMap}><PolarGrid /><PolarAngleAxis dataKey="subject" fontSize={12} /><Radar dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} /><Tooltip /></RadarChart></ResponsiveContainer>
              </div>
              <InsightList icon={BookOpen} title="Comfort Zones" items={studentData?.comfortZones} iconColor="text-blue-600" />
              <InsightList icon={AlertTriangle} title="Areas of Growth" items={studentData?.areasOfGrowth} iconColor="text-orange-500" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Helper Sub-components (Defined locally) ---
const StatCard = ({ icon: Icon, title, value, valueColor = "text-gray-900" }: { icon: React.ElementType, title: string, value: string, valueColor?: string }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-5"><div className="flex items-center justify-between"><h3 className="text-sm font-medium text-gray-600">{title}</h3><Icon className="h-5 w-5 text-gray-400" /></div><p className={`text-3xl font-bold mt-2 ${valueColor}`}>{value}</p></div>
);
const InsightList = ({ icon: Icon, title, items, iconColor }: { icon: React.ElementType, title: string, items?: {id: string, title: string}[], iconColor: string }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-6"><h3 className={`text-lg font-bold text-gray-900 mb-3 flex items-center`}><Icon className={`w-5 h-5 mr-2 ${iconColor}`} /> {title}</h3><ul className="space-y-2">{items?.map(item => (<li key={item.id} className="text-sm text-gray-800 bg-gray-50 p-2 rounded-md">{item.title}</li>))}</ul></div>
);
const StudentDashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse"><div className="h-28 bg-gray-200 rounded-lg"></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><div className="h-24 bg-gray-200 rounded-lg"></div><div className="h-24 bg-gray-200 rounded-lg"></div><div className="h-24 bg-gray-200 rounded-lg"></div><div className="h-24 bg-gray-200 rounded-lg"></div></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="h-80 bg-gray-200 rounded-lg"></div><div className="h-80 bg-gray-200 rounded-lg"></div></div></div>
);