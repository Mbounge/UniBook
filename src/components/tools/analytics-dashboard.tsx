// src/components/tools/analytics-dashboard.tsx

"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Clock, Brain, Target, TrendingUp, BookOpen, AlertTriangle } from "lucide-react";

// --- TypeScript Interfaces for API Data ---
interface ChapterEngagement {
  title: string;
  timeSpent: number;
  comprehension: number;
}

interface EngagementData {
  totalTimeSpent: number;
  comprehensionScore: number;
  completionRate: number;
  chapterEngagement: ChapterEngagement[];
}

interface ContentAnalytics {
  mostEngaged: { id: string; title: string }[];
  mostDifficult: { id: string; title: string }[];
}

// --- Mock API Functions ---
const fetchEngagementData = async (): Promise<EngagementData> => {
  await new Promise(res => setTimeout(res, 1000));
  return {
    totalTimeSpent: 72000,
    comprehensionScore: 0.88,
    completionRate: 0.92,
    chapterEngagement: [
      { title: "Ch 1", timeSpent: 10800, comprehension: 95 },
      { title: "Ch 2", timeSpent: 14400, comprehension: 91 },
      { title: "Ch 3", timeSpent: 18000, comprehension: 85 },
    ],
  };
};

const fetchContentAnalytics = async (): Promise<ContentAnalytics> => {
  await new Promise(res => setTimeout(res, 1000));
  return {
    mostEngaged: [{ id: "1", title: "Interactive Simulation: Gravity" }],
    mostDifficult: [{ id: "2", title: "Advanced Calculus Problems" }],
  };
};

export default function AnalyticsDashboard() {
  const { data: engagementData, isLoading: engagementLoading } = useQuery<EngagementData>({
    queryKey: ["analyticsEngagement"],
    queryFn: fetchEngagementData,
  });

  const { data: contentAnalytics, isLoading: contentLoading } = useQuery<ContentAnalytics>({
    queryKey: ["analyticsContent"],
    queryFn: fetchContentAnalytics, // CORRECTED: Was incorrectly referencing itself
  });

  const chartData = engagementData?.chapterEngagement?.map(c => ({
    name: c.title,
    "Time (min)": Math.round(c.timeSpent / 60),
    "Comprehension (%)": c.comprehension,
  })) || [];

  if (engagementLoading || contentLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-lg"></div>)}
        </div>
        <div className="h-96 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600">Total Study Time</h3>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {Math.round((engagementData?.totalTimeSpent || 0) / 3600)}h
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600">Avg. Comprehension</h3>
            <Brain className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {Math.round((engagementData?.comprehensionScore || 0) * 100)}%
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600">Completion Rate</h3>
            <Target className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {Math.round((engagementData?.completionRate || 0) * 100)}%
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600">Engagement Trend</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-green-600 mt-2">+15%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Time Spent per Chapter</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip wrapperClassName="!border-gray-300 !bg-white !rounded-lg" />
              <Bar dataKey="Time (min)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Comprehension per Chapter</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip wrapperClassName="!border-gray-300 !bg-white !rounded-lg" />
              <Line type="monotone" dataKey="Comprehension (%)" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Content Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-blue-600" /> Most Engaging Content
          </h3>
          <ul className="space-y-2">
            {contentAnalytics?.mostEngaged?.map(item => (
              <li key={item.id} className="text-sm text-gray-800">{item.title}</li>
            ))}
          </ul>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" /> Most Difficult Content
          </h3>
          <ul className="space-y-2">
            {contentAnalytics?.mostDifficult?.map(item => (
              <li key={item.id} className="text-sm text-gray-800">{item.title}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}