// src/components/tools/performance-tracker.tsx

"use client";

import React, { useState } from "react";
import { TrendingUp, Users, Target, Award } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// ... (performanceData and studentDistribution constants remain the same) ...
const performanceData = [
  { name: "Mon", engagement: 85, completion: 78 },
  { name: "Tue", engagement: 92, completion: 85 },
  { name: "Wed", engagement: 78, completion: 82 },
  { name: "Thu", engagement: 95, completion: 90 },
  { name: "Fri", engagement: 88, completion: 87 },
];

const studentDistribution = [
  { name: "Excellent", value: 23, color: "#10B981" },
  { name: "Good", value: 45, color: "#3B82F6" },
  { name: "Sufficient", value: 28, color: "#F59E0B" },
  { name: "At Risk", value: 4, color: "#EF4444" },
];


interface PerformanceTrackerProps {
  hideAvgStudyTime?: boolean;
  satisfactionLabel?: string;
}

export default function PerformanceTracker({ hideAvgStudyTime = false, satisfactionLabel = "Satisfaction" }: PerformanceTrackerProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
          Class Performance Tracker
        </h2>
      </div>
      <div className="p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between"><h3 className="text-sm font-medium text-gray-600">Active Students</h3><Users className="h-5 w-5 text-gray-400" /></div>
            <p className="text-2xl font-bold text-gray-900 mt-2">1,247</p>
          </div>
          
          {/* Conditionally rendered Avg. Study Time */}
          {!hideAvgStudyTime && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between"><h3 className="text-sm font-medium text-gray-600">Avg. Study Time</h3><Users className="h-5 w-5 text-gray-400" /></div>
              <p className="text-2xl font-bold text-gray-900 mt-2">2.4h</p>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between"><h3 className="text-sm font-medium text-gray-600">Completion Rate</h3><Target className="h-5 w-5 text-gray-400" /></div>
            <p className="text-2xl font-bold text-gray-900 mt-2">87%</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between"><h3 className="text-sm font-medium text-gray-600">{satisfactionLabel}</h3><Award className="h-5 w-5 text-gray-400" /></div>
            <p className="text-2xl font-bold text-gray-900 mt-2">4.6/5</p>
          </div>
        </div>

        {/* Tabs and Charts (remain the same) */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6">
            <button onClick={() => setActiveTab("overview")} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === "overview" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>Overview</button>
            <button onClick={() => setActiveTab("distribution")} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === "distribution" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>Distribution</button>
          </nav>
        </div>
        <div className="mt-6">
          {activeTab === "overview" && (
            <div>
              <h3 className="text-md font-bold text-gray-900 mb-4">Weekly Performance Trends</h3>
              <ResponsiveContainer width="100%" height={300}><LineChart data={performanceData}><XAxis dataKey="name" stroke="#6b7280" fontSize={12} /><YAxis stroke="#6b7280" fontSize={12} /><Tooltip wrapperClassName="!border-gray-300 !bg-white !rounded-lg" /><Line type="monotone" dataKey="engagement" name="Engagement" stroke="#3b82f6" strokeWidth={2} /><Line type="monotone" dataKey="completion" name="Completion" stroke="#10b981" strokeWidth={2} /></LineChart></ResponsiveContainer>
            </div>
          )}
          {activeTab === "distribution" && (
            <div>
              <h3 className="text-md font-bold text-gray-900 mb-4">Student Performance Distribution</h3>
              <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={studentDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100}>{studentDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip wrapperClassName="!border-gray-300 !bg-white !rounded-lg" /></PieChart></ResponsiveContainer>
              <div className="flex justify-center flex-wrap gap-4 mt-4">{studentDistribution.map((entry) => (<div key={entry.name} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} /><span className="text-sm text-gray-600">{entry.name}: {entry.value}%</span></div>))}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}