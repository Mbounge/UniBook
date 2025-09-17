// src/components/tools/student-ai-insights-controller.tsx

"use client";

import React from "react";
import BehaviorPredictionAI from "@/components/tools/behavior-prediction-ai";
import StudentInsightsAI from "@/components/tools/student-insights-ai";

interface StudentAIInsightsControllerProps {
  viewMode: "class" | "student";
  classId: string;
}

export default function StudentAIInsightsController({ viewMode, classId }: StudentAIInsightsControllerProps) {
  if (viewMode === "class") {
    // The Behavior Prediction component gives a great class-level overview of AI insights.
    return <BehaviorPredictionAI />;
  }

  if (viewMode === "student") {
    // The original Student Insights component is perfect for the student-level drill-down.
    return <StudentInsightsAI />;
  }

  return null;
}