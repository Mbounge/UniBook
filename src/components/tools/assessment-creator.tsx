// src/components/tools/assessment-creator.tsx

"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Target, Plus, X, Zap, CheckCircle, Loader2 } from "lucide-react";

interface AssessmentQuestion {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
}

// Mock API functions
const createAssessment = async (data: any) => {
  await new Promise(res => setTimeout(res, 1000));
  console.log("Creating assessment:", data);
  return { success: true };
};
const generateAIQuestions = async (): Promise<AssessmentQuestion[]> => {
  await new Promise(res => setTimeout(res, 1500));
  return [
    { id: `q_${Date.now()}`, type: "multiple_choice", question: "AI: What is the capital of France?", options: ["Berlin", "Madrid", "Paris", "Rome"], correctAnswer: "Paris", points: 1 },
    { id: `q_${Date.now() + 1}`, type: "true_false", question: "AI: The Earth is flat.", correctAnswer: "False", points: 1 },
  ];
};

export default function AssessmentCreator() {
  const [activeTab, setActiveTab] = useState("settings");
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<AssessmentQuestion>>({
    type: "multiple_choice", question: "", options: ["", "", "", ""], correctAnswer: "", points: 1,
  });
  const { toast } = useToast();

  const createMutation = useMutation({ mutationFn: createAssessment, onSuccess: () => toast({ title: "Assessment Created!" }) });
  const generateAIMutation = useMutation({ mutationFn: generateAIQuestions, onSuccess: (data) => {
    setQuestions(prev => [...prev, ...data]);
    toast({ title: "AI Questions Added!" });
  }});

  const addQuestion = () => {
    if (!currentQuestion.question?.trim()) {
      toast({ title: "Question text is required.", variant: "destructive" });
      return;
    }
    setQuestions(prev => [...prev, { ...currentQuestion, id: `q_${Date.now()}` } as AssessmentQuestion]);
    setCurrentQuestion({ type: "multiple_choice", question: "", options: ["", "", "", ""], correctAnswer: "", points: 1 });
  };

  const removeQuestion = (id: string) => setQuestions(prev => prev.filter(q => q.id !== id));
  const handleSave = () => {
    if (!title || questions.length === 0) {
      toast({ title: "Title and at least one question are required.", variant: "destructive" });
      return;
    }
    createMutation.mutate({ title, questions });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg mt-6">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900 flex items-center">
          <Target className="w-5 h-5 mr-2 text-blue-600" />
          Assessment Creator
        </h2>
        <button onClick={() => generateAIMutation.mutate()} disabled={generateAIMutation.isPending} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-semibold flex items-center disabled:bg-gray-200">
          {generateAIMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
          Generate with AI
        </button>
      </div>
      <div className="p-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6">
            <button onClick={() => setActiveTab("settings")} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === "settings" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>Settings</button>
            <button onClick={() => setActiveTab("questions")} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === "questions" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>Questions ({questions.length})</button>
            <button onClick={() => setActiveTab("preview")} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === "preview" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>Preview & Save</button>
          </nav>
        </div>
        <div className="mt-6">
          {activeTab === "settings" && (
            <div className="max-w-lg">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Assessment Title</label>
              <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black" />
            </div>
          )}
          {activeTab === "questions" && (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-900">Add New Question</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                  <textarea value={currentQuestion.question} onChange={(e) => setCurrentQuestion(p => ({ ...p, question: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Options (Click to mark correct)</label>
                  <div className="space-y-2">
                    {currentQuestion.options?.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="text" value={opt} onChange={(e) => {
                          const newOptions = [...(currentQuestion.options || [])];
                          newOptions[i] = e.target.value;
                          setCurrentQuestion(p => ({ ...p, options: newOptions }));
                        }} className="flex-grow px-3 py-2 border border-gray-300 rounded-lg text-black" />
                        <button onClick={() => setCurrentQuestion(p => ({ ...p, correctAnswer: opt }))} className={`p-2 rounded-lg ${currentQuestion.correctAnswer === opt ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={addQuestion} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold flex items-center">
                  <Plus className="h-4 w-4 mr-2" /> Add Question
                </button>
              </div>
              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div key={q.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <p className="text-sm text-gray-800"><strong>Q{i + 1}:</strong> {q.question}</p>
                      <button onClick={() => removeQuestion(q.id)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-4 h-4 text-gray-500" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === "preview" && (
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900">{title || "Assessment Title"}</h3>
              <p className="text-gray-600 mt-2">{questions.length} Questions</p>
              <button onClick={handleSave} disabled={createMutation.isPending} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center mx-auto disabled:bg-blue-400">
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Assessment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}