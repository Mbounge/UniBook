// src/components/tools/class-analytics.tsx

"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Brain, Target, Users, Award, BookOpen, AlertTriangle } from "lucide-react";

// --- Mock API Function ---
const fetchClassAnalytics = async (classId: string) => {
  console.log("Fetching redesigned analytics for class:", classId);
  await new Promise(res => setTimeout(res, 800));
  return {
    avgCompetence: 82,
    completionRate: 89,
    activeStudents: 142,
    reviews: 4.7,
    competencePerChapter: [
      { name: "Ch 1", "Competence (%)": 92 }, { name: "Ch 2", "Competence (%)": 88 },
      { name: "Ch 3", "Competence (%)": 76 }, { name: "Ch 4", "Competence (%)": 81 },
    ],
    weeklyPerformance: [
      { name: "Mon", engagement: 85, completion: 78 }, { name: "Tue", engagement: 92, completion: 85 },
      { name: "Wed", engagement: 78, completion: 82 }, { name: "Thu", engagement: 95, completion: 90 },
      { name: "Fri", engagement: 88, completion: 87 },
    ],
    studentDistribution: [
      { name: "Excellent", value: 35, color: "#10B981" }, { name: "Good", value: 45, color: "#3B82F6" },
      { name: "Sufficient", value: 15, color: "#F59E0B" }, { name: "At Risk", value: 5, color: "#EF4444" },
    ],
    comfortZones: [{ id: "1", title: "Interactive Simulation: Gravity" }, { id: "2", title: "Basic Kinematics"}],
    areasOfGrowth: [{ id: "2", title: "Advanced Calculus Problems" }, { id: "3", title: "Quantum Mechanics Concepts"}],
  };
};

// --- Main Component ---
export default function ClassAnalytics({ classId }: { classId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["classAnalyticsDashboard", classId],
    queryFn: () => fetchClassAnalytics(classId),
  });

  const [activeChart, setActiveChart] = useState<"competence" | "engagement">("competence");

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Key Performance Indicator (KPI) Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Brain} title="Avg. Competence" value={`${data?.avgCompetence}%`} />
        <StatCard icon={Target} title="Completion Rate" value={`${data?.completionRate}%`} />
        <StatCard icon={Users} title="Active Students" value={data?.activeStudents.toString() || '0'} />
        <StatCard icon={Award} title="Reviews" value={`${data?.reviews}/5`} />
      </div>

      {/* Section 2: Main Dashboard Grid (Chart + Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content: Tabbed Chart View */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Performance Trends</h3>
            <div className="flex p-1 bg-gray-100 rounded-md">
              <button onClick={() => setActiveChart("competence")} className={`px-3 py-1 text-sm font-semibold rounded ${activeChart === 'competence' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>Competence</button>
              <button onClick={() => setActiveChart("engagement")} className={`px-3 py-1 text-sm font-semibold rounded ${activeChart === 'engagement' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600'}`}>Engagement</button>
            </div>
          </div>
          
          {activeChart === 'competence' && (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data?.competencePerChapter} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} unit="%" />
                <Tooltip wrapperClassName="!border-gray-300 !bg-white !rounded-lg shadow-lg" />
                <Line type="monotone" dataKey="Competence (%)" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}

          {activeChart === 'engagement' && (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data?.weeklyPerformance} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} unit="%" />
                <Tooltip wrapperClassName="!border-gray-300 !bg-white !rounded-lg shadow-lg" />
                <Line type="monotone" dataKey="engagement" name="Engagement" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                {/* --- THIS IS THE CORRECTED LINE WITH A HIGH-CONTRAST ORANGE COLOR --- */}
                <Line type="monotone" dataKey="completion" name="Completion" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sidebar: Distribution and Insights */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Student Performance Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data?.studentDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {data?.studentDistribution?.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center flex-wrap gap-x-4 gap-y-2 mt-4">
              {data?.studentDistribution?.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} /><span className="text-sm text-gray-600">{entry.name}</span></div>
              ))}
            </div>
          </div>
          <InsightList icon={BookOpen} title="Comfort Zones" items={data?.comfortZones} iconColor="text-blue-600" />
          <InsightList icon={AlertTriangle} title="Areas of Growth" items={data?.areasOfGrowth} iconColor="text-orange-500" />
        </div>
      </div>
    </div>
  );
}

// --- Helper Sub-components ---
const StatCard = ({ icon: Icon, title, value }: { icon: React.ElementType, title: string, value: string }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-5"><div className="flex items-center justify-between"><h3 className="text-sm font-medium text-gray-600">{title}</h3><Icon className="h-5 w-5 text-gray-400" /></div><p className="text-3xl font-bold text-gray-900 mt-2">{value}</p></div>
);
const InsightList = ({ icon: Icon, title, items, iconColor }: { icon: React.ElementType, title: string, items?: {id: string, title: string}[], iconColor: string }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-6"><h3 className={`text-lg font-bold text-gray-900 mb-3 flex items-center`}><Icon className={`w-5 h-5 mr-2 ${iconColor}`} /> {title}</h3><ul className="space-y-2">{items?.map(item => (<li key={item.id} className="text-sm text-gray-800 bg-gray-50 p-2 rounded-md">{item.title}</li>))}</ul></div>
);
const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><div className="h-28 bg-gray-200 rounded-lg"></div><div className="h-28 bg-gray-200 rounded-lg"></div><div className="h-28 bg-gray-200 rounded-lg"></div><div className="h-28 bg-gray-200 rounded-lg"></div></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 h-96 bg-gray-200 rounded-lg"></div><div className="lg:col-span-1 space-y-6"><div className="h-64 bg-gray-200 rounded-lg"></div><div className="h-32 bg-gray-200 rounded-lg"></div><div className="h-32 bg-gray-200 rounded-lg"></div></div></div></div>
);