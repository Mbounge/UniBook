//src/components/editor/TemplateGallery.tsx

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { X, Maximize, Minimize, Search, Sparkles, Target, CheckCircle, BarChart3, FileText, MessageSquare, ImageIcon, Play, BookOpen, Lightbulb, Clock, Users } from 'lucide-react';

const templateCategories = [
  { id: 'learning', name: 'Learning Elements', icon: Target, color: 'blue' },
  { id: 'assessment', name: 'Assessment', icon: CheckCircle, color: 'green' },
  { id: 'visual', name: 'Visual Organizers', icon: BarChart3, color: 'purple' },
  { id: 'content', name: 'Content Blocks', icon: FileText, color: 'orange' },
  { id: 'interactive', name: 'Interactive', icon: MessageSquare, color: 'pink' },
  { id: 'media', name: 'Media Layouts', icon: ImageIcon, color: 'indigo' },
];
const LearningObjectivesPreview = ({ variant = 'blue' }: { variant?: 'blue' | 'green' }) => ( <div className={`w-full h-full p-3 ${variant === 'blue' ? 'bg-gradient-to-br from-blue-50 to-blue-100' : 'bg-gradient-to-br from-green-50 to-green-100'} rounded-lg border-l-4 ${variant === 'blue' ? 'border-blue-500' : 'border-green-500'}`}> <div className="flex items-center mb-2"><div className={`w-4 h-4 ${variant === 'blue' ? 'bg-blue-500' : 'bg-green-500'} rounded mr-2 flex items-center justify-center`}><span className="text-white text-xs">{variant === 'blue' ? '🎯' : '🌱'}</span></div><div className={`h-2 w-16 ${variant === 'blue' ? 'bg-blue-600' : 'bg-green-600'} rounded`}></div></div> <div className="space-y-1"><div className="flex items-center"><div className={`w-2 h-2 ${variant === 'blue' ? 'bg-blue-500' : 'bg-green-500'} rounded-full mr-2`}></div><div className={`h-1 w-20 ${variant === 'blue' ? 'bg-blue-400' : 'bg-green-400'} rounded`}></div></div><div className="flex items-center"><div className={`w-2 h-2 ${variant === 'blue' ? 'bg-blue-500' : 'bg-green-500'} rounded-full mr-2`}></div><div className={`h-1 w-16 ${variant === 'blue' ? 'bg-blue-400' : 'bg-green-400'} rounded`}></div></div><div className="flex items-center"><div className={`w-2 h-2 ${variant === 'blue' ? 'bg-blue-500' : 'bg-green-500'} rounded-full mr-2`}></div><div className={`h-1 w-18 ${variant === 'blue' ? 'bg-blue-400' : 'bg-green-400'} rounded`}></div></div></div></div> );
const KeyConceptPreview = () => ( <div className="w-full h-full p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border-2 border-purple-300 relative overflow-hidden"> <div className="absolute top-0 right-0 w-8 h-8 bg-purple-200 rounded-full opacity-50"></div><div className="flex items-center mb-2"><span className="text-lg mr-2">💡</span><div className="h-2 w-12 bg-purple-600 rounded"></div></div> <div className="space-y-1"><div className="h-1 w-full bg-purple-400 rounded"></div><div className="h-1 w-20 bg-purple-400 rounded"></div><div className="h-1 w-16 bg-purple-400 rounded"></div></div> </div> );
const QuizBoxPreview = () => ( <div className="w-full h-full p-3 bg-gray-50 rounded-lg border-2 border-blue-400 relative"> <div className="absolute -top-1 left-2 bg-blue-500 text-white px-2 py-0.5 rounded text-xs font-bold">Quiz</div><div className="mt-2 mb-2"><div className="h-2 w-16 bg-blue-600 rounded mb-1"></div></div> <div className="bg-white p-2 rounded border"><div className="h-1 w-full bg-gray-400 rounded mb-2"></div><div className="space-y-1"><div className="flex items-center"><div className="w-2 h-2 border border-gray-400 rounded-full mr-2"></div><div className="h-1 w-12 bg-gray-300 rounded"></div></div><div className="flex items-center"><div className="w-2 h-2 border border-gray-400 rounded-full mr-2"></div><div className="h-1 w-10 bg-gray-300 rounded"></div></div><div className="flex items-center"><div className="w-2 h-2 border border-gray-400 rounded-full mr-2"></div><div className="h-1 w-14 bg-gray-300 rounded"></div></div></div></div> </div> );
const ReflectionPromptPreview = () => ( <div className="w-full h-full p-3 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg border-l-4 border-yellow-500"> <div className="flex items-center mb-2"><span className="text-lg mr-2">🤔</span><div className="h-2 w-14 bg-yellow-700 rounded"></div></div><div className="space-y-1 mb-2"><div className="h-1 w-full bg-yellow-600 rounded"></div><div className="h-1 w-16 bg-yellow-600 rounded"></div></div> <div className="bg-yellow-50 p-2 rounded border border-dashed border-yellow-500"><div className="space-y-1"><div className="h-1 w-full bg-yellow-500 rounded"></div><div className="h-1 w-12 bg-yellow-500 rounded"></div><div className="h-1 w-18 bg-yellow-500 rounded"></div></div></div> </div> );
const TimelinePreview = () => ( <div className="w-full h-full p-3 bg-gray-50 rounded-lg"> <div className="h-2 w-12 bg-gray-700 rounded mx-auto mb-3"></div><div className="relative"><div className="absolute top-2 left-0 right-0 h-0.5 bg-gray-300"></div><div className="flex justify-between relative"><div className="flex flex-col items-center"><div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div><div className="mt-1 space-y-0.5"><div className="h-1 w-8 bg-gray-600 rounded"></div><div className="h-0.5 w-6 bg-gray-400 rounded"></div></div></div><div className="flex flex-col items-center"><div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div><div className="mt-1 space-y-0.5"><div className="h-1 w-8 bg-gray-600 rounded"></div><div className="h-0.5 w-6 bg-gray-400 rounded"></div></div></div><div className="flex flex-col items-center"><div className="w-3 h-3 bg-yellow-500 rounded-full border-2 border-white"></div><div className="mt-1 space-y-0.5"><div className="h-1 w-8 bg-gray-600 rounded"></div><div className="h-0.5 w-6 bg-gray-400 rounded"></div></div></div></div></div> </div> );
const ComparisonTablePreview = () => ( <div className="w-full h-full p-3 bg-white rounded-lg border"> <div className="h-2 w-16 bg-gray-700 rounded mx-auto mb-2"></div><div className="grid grid-cols-2 gap-0.5 border rounded overflow-hidden"><div className="bg-blue-500 h-3"></div><div className="bg-green-500 h-3"></div><div className="bg-blue-50 p-1 space-y-0.5"><div className="h-0.5 w-full bg-gray-600 rounded"></div><div className="h-0.5 w-4 bg-gray-400 rounded"></div><div className="h-0.5 w-6 bg-gray-400 rounded"></div></div><div className="bg-green-50 p-1 space-y-0.5"><div className="h-0.5 w-full bg-gray-600 rounded"></div><div className="h-0.5 w-4 bg-gray-400 rounded"></div><div className="h-0.5 w-6 bg-gray-400 rounded"></div></div><div className="bg-red-50 p-1 space-y-0.5"><div className="h-0.5 w-full bg-gray-600 rounded"></div><div className="h-0.5 w-3 bg-gray-400 rounded"></div></div><div className="bg-red-50 p-1 space-y-0.5"><div className="h-0.5 w-full bg-gray-600 rounded"></div><div className="h-0.5 w-3 bg-gray-400 rounded"></div></div></div> </div> );
const CaseStudyPreview = () => ( <div className="w-full h-full p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-300 relative"> <div className="absolute -top-1 left-2 bg-blue-500 text-white px-2 py-0.5 rounded text-xs font-bold">Case</div><div className="mt-2 mb-2"><div className="h-2 w-20 bg-blue-700 rounded"></div></div><div className="bg-white/80 p-2 rounded mb-2"><div className="space-y-1"><div className="h-1 w-full bg-gray-500 rounded"></div><div className="h-1 w-16 bg-gray-400 rounded"></div><div className="h-1 w-12 bg-gray-400 rounded"></div></div></div><div className="bg-blue-600 p-1 rounded"><div className="h-1 w-14 bg-white rounded"></div></div> </div> );
const DefinitionBoxPreview = () => ( <div className="w-full h-full p-3 bg-green-50 rounded-lg border-l-4 border-green-500"> <div className="flex items-center mb-2"><span className="text-sm mr-1">📖</span><div className="h-2 w-12 bg-green-700 rounded"></div></div><div className="bg-white p-2 rounded border border-green-200"><div className="h-1.5 w-16 bg-green-700 rounded mb-1"></div><div className="space-y-0.5"><div className="h-1 w-full bg-green-600 rounded"></div><div className="h-1 w-14 bg-green-500 rounded"></div><div className="h-1 w-18 bg-green-500 rounded"></div></div></div> </div> );
const DiscussionPromptPreview = () => ( <div className="w-full h-full p-3 bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg border-2 border-pink-400"> <div className="flex items-center mb-2"><span className="text-lg mr-2">💬</span><div className="h-2 w-14 bg-pink-700 rounded"></div></div><div className="bg-white/80 p-2 rounded mb-2"><div className="h-1.5 w-full bg-pink-600 rounded mb-1"></div><div className="h-1 w-16 bg-pink-500 rounded"></div></div><div className="space-y-1"><div className="h-1 w-20 bg-pink-600 rounded"></div><div className="h-1 w-16 bg-pink-600 rounded"></div><div className="h-1 w-12 bg-pink-600 rounded"></div></div> </div> );
const ActivityBoxPreview = () => ( <div className="w-full h-full p-3 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg border-2 border-dashed border-cyan-400"> <div className="flex items-center mb-2"><span className="text-lg mr-2">🎯</span><div className="h-2 w-16 bg-cyan-700 rounded"></div></div><div className="bg-white p-2 rounded border border-cyan-300 mb-2"><div className="h-1 w-full bg-cyan-600 rounded mb-1"></div><div className="space-y-0.5"><div className="flex items-center"><div className="w-1.5 h-1.5 bg-cyan-600 rounded-full mr-1"></div><div className="h-0.5 w-8 bg-cyan-500 rounded"></div></div><div className="flex items-center"><div className="w-1.5 h-1.5 bg-cyan-600 rounded-full mr-1"></div><div className="h-0.5 w-6 bg-cyan-500 rounded"></div></div><div className="flex items-center"><div className="w-1.5 h-1.5 bg-cyan-600 rounded-full mr-1"></div><div className="h-0.5 w-10 bg-cyan-500 rounded"></div></div></div></div><div className="bg-cyan-500 p-1 rounded text-center"><div className="h-1 w-12 bg-white rounded mx-auto"></div></div> </div> );
const VideoEmbedPreview = () => ( <div className="w-full h-full p-3 bg-gray-800 rounded-lg"> <div className="bg-gray-700 border-2 border-dashed border-gray-600 rounded p-2 h-full flex flex-col items-center justify-center"><div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center mb-2"><span className="text-white text-xs">▶️</span></div><div className="h-1 w-12 bg-gray-400 rounded mb-1"></div><div className="h-0.5 w-8 bg-gray-500 rounded mb-2"></div><div className="bg-gray-600 px-2 py-0.5 rounded"><div className="h-0.5 w-8 bg-white rounded"></div></div></div> </div> );
const ImageGalleryPreview = () => ( <div className="w-full h-full p-3 bg-gray-50 rounded-lg border"> <div className="h-1.5 w-16 bg-gray-700 rounded mx-auto mb-2"></div><div className="grid grid-cols-3 gap-1 mb-2"><div className="aspect-square bg-gray-200 rounded border-2 border-dashed border-gray-400 flex items-center justify-center"><span className="text-xs">🖼️</span></div><div className="aspect-square bg-gray-200 rounded border-2 border-dashed border-gray-400 flex items-center justify-center"><span className="text-xs">🖼️</span></div><div className="aspect-square bg-gray-200 rounded border-2 border-dashed border-gray-400 flex items-center justify-center"><span className="text-xs">🖼️</span></div></div><div className="h-0.5 w-full bg-gray-400 rounded"></div> </div> );

export const templates = { learning: [ { id: 'learning-objectives-blue', name: 'Learning Objectives - Blue', category: 'learning', preview: <LearningObjectivesPreview variant="blue" />, html: `<div class="template-block" data-template-type="learning-objectives" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-left: 6px solid #3b82f6; padding: 24px; margin: 20px 0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"><div style="display: flex; align-items: center; margin-bottom: 16px;"><div style="width: 32px; height: 32px; background: #3b82f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px;"><span style="color: white; font-size: 16px;">🎯</span></div><h3 style="margin: 0; font-size: 1.5rem; font-weight: bold; color: #1e40af;">Learning Objectives</h3></div><ul style="margin: 0; padding-left: 20px; list-style: none; color: #1e40af;"><li style="margin-bottom: 8px; position: relative; padding-left: 24px;"><span style="position: absolute; left: 0; top: 2px; color: #3b82f6;">✓</span>Understand the fundamental concepts of the topic</li><li style="margin-bottom: 8px; position: relative; padding-left: 24px;"><span style="position: absolute; left: 0; top: 2px; color: #3b82f6;">✓</span>Apply knowledge to real-world scenarios</li><li style="margin-bottom: 8px; position: relative; padding-left: 24px;"><span style="position: absolute; left: 0; top: 2px; color: #3b82f6;">✓</span>Analyze and evaluate different approaches</li></ul></div>` }, { id: 'learning-objectives-green', name: 'Learning Objectives - Green', category: 'learning', preview: <LearningObjectivesPreview variant="green" />, html: `<div class="template-block" data-template-type="learning-objectives" style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-left: 6px solid #10b981; padding: 24px; margin: 20px 0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"><div style="display: flex; align-items: center; margin-bottom: 16px;"><div style="width: 32px; height: 32px; background: #10b981; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px;"><span style="color: white; font-size: 16px;">🌱</span></div><h3 style="margin: 0; font-size: 1.5rem; font-weight: bold; color: #065f46;">Learning Goals</h3></div><ul style="margin: 0; padding-left: 20px; list-style: none; color: #065f46;"><li style="margin-bottom: 8px; position: relative; padding-left: 24px;"><span style="position: absolute; left: 0; top: 2px; color: #10b981;">→</span>Master the core principles and theories</li><li style="margin-bottom: 8px; position: relative; padding-left: 24px;"><span style="position: absolute; left: 0; top: 2px; color: #10b981;">→</span>Develop practical skills and competencies</li><li style="margin-bottom: 8px; position: relative; padding-left: 24px;"><span style="position: absolute; left: 0; top: 2px; color: #10b981;">→</span>Create innovative solutions to problems</li></ul></div>` }, { id: 'key-concept-purple', name: 'Key Concept - Purple', category: 'learning', preview: <KeyConceptPreview />, html: `<div class="template-block" data-template-type="key-concept" style="background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); border: 2px solid #a855f7; padding: 20px; margin: 20px 0; border-radius: 16px; position: relative; overflow: hidden;"><div style="position: absolute; top: -10px; right: -10px; width: 60px; height: 60px; background: rgba(168, 85, 247, 0.1); border-radius: 50%;"></div><div style="display: flex; align-items: center; margin-bottom: 12px;"><span style="font-size: 24px; margin-right: 12px;">💡</span><h3 style="margin: 0; font-size: 1.25rem; font-weight: bold; color: #7c3aed;">Key Concept</h3></div><p style="margin: 0; color: #6b21a8; font-size: 1rem; line-height: 1.6;">This is an important concept that students should understand and remember. It forms the foundation for more advanced topics.</p></div>` } ], assessment: [ { id: 'quiz-box-blue', name: 'Quiz Box - Blue', category: 'assessment', preview: <QuizBoxPreview />, html: `<div class="template-block" data-template-type="quiz-box" style="background: #f8fafc; border: 2px solid #3b82f6; padding: 24px; margin: 20px 0; border-radius: 12px; position: relative;"><div style="position: absolute; top: -12px; left: 20px; background: #3b82f6; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">Quick Check</div><div style="margin-top: 8px;"><h4 style="margin: 0 0 16px 0; color: #1e40af; font-size: 1.1rem; font-weight: bold;">Test Your Understanding</h4><div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 12px;"><p style="margin: 0 0 12px 0; color: #374151; font-weight: 500;">Which of the following best describes the main concept?</p><div style="space-y: 8px;"><label style="display: flex; align-items: center; color: #4b5563; cursor: pointer; padding: 8px; border-radius: 6px; transition: background 0.2s;"><input type="radio" name="quiz-option" style="margin-right: 8px;">Option A: First possible answer</label><label style="display: flex; align-items: center; color: #4b5563; cursor: pointer; padding: 8px; border-radius: 6px;"><input type="radio" name="quiz-option" style="margin-right: 8px;">Option B: Second possible answer</label><label style="display: flex; align-items: center; color: #4b5563; cursor: pointer; padding: 8px; border-radius: 6px;"><input type="radio" name="quiz-option" style="margin-right: 8px;">Option C: Third possible answer</label></div></div></div></div>` }, { id: 'reflection-prompt', name: 'Reflection Prompt', category: 'assessment', preview: <ReflectionPromptPreview />, html: `<div class="template-block" data-template-type="reflection" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 12px;"><div style="display: flex; align-items: center; margin-bottom: 16px;"><span style="font-size: 24px; margin-right: 12px;">🤔</span><h3 style="margin: 0; font-size: 1.25rem; font-weight: bold; color: #92400e;">Reflection</h3></div><p style="margin: 0 0 16px 0; color: #92400e; font-style: italic;">Take a moment to think about what you've learned:</p><div style="background: rgba(255, 255, 255, 0.7); padding: 16px; border-radius: 8px; border: 1px dashed #f59e0b;"><p style="margin: 0; color: #92400e;">• How does this concept relate to your previous knowledge?<br>• What questions do you still have?<br>• How might you apply this in practice?</p></div></div>` } ], visual: [ { id: 'timeline-horizontal', name: 'Timeline - Horizontal', category: 'visual', preview: <TimelinePreview />, html: `<div class="template-block" data-template-type="timeline" style="background: #f9fafb; padding: 24px; margin: 20px 0; border-radius: 12px; border: 1px solid #e5e7eb;"><h3 style="text-align: center; margin: 0 0 24px 0; color: #374151; font-size: 1.25rem; font-weight: bold;">Timeline</h3><div style="display: flex; align-items: center; justify-content: space-between; position: relative;"><div style="position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: #d1d5db; z-index: 1;"></div><div style="background: white; border: 3px solid #3b82f6; border-radius: 50%; width: 16px; height: 16px; z-index: 2; position: relative;"><div style="position: absolute; top: 24px; left: 50%; transform: translateX(-50%); text-align: center; white-space: nowrap;"><div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">Step 1</div><div style="color: #6b7280; font-size: 14px;">First phase</div></div></div><div style="background: white; border: 3px solid #10b981; border-radius: 50%; width: 16px; height: 16px; z-index: 2; position: relative;"><div style="position: absolute; top: 24px; left: 50%; transform: translateX(-50%); text-align: center; white-space: nowrap;"><div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">Step 2</div><div style="color: #6b7280; font-size: 14px;">Second phase</div></div></div><div style="background: white; border: 3px solid #f59e0b; border-radius: 50%; width: 16px; height: 16px; z-index: 2; position: relative;"><div style="position: absolute; top: 24px; left: 50%; transform: translateX(-50%); text-align: center; white-space: nowrap;"><div style="font-weight: bold; color: #1f2937; margin-bottom: 4px;">Step 3</div><div style="color: #6b7280; font-size: 14px;">Final phase</div></div></div></div></div>` }, { id: 'comparison-table', name: 'Comparison Table', category: 'visual', preview: <ComparisonTablePreview />, html: `<div class="template-block" data-template-type="comparison" style="background: white; padding: 24px; margin: 20px 0; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);"><h3 style="text-align: center; margin: 0 0 20px 0; color: #374151; font-size: 1.25rem; font-weight: bold;">Comparison</h3><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px; border-radius: 8px; overflow: hidden; border: 1px solid #d1d5db;"><div style="background: #3b82f6; color: white; padding: 12px; font-weight: bold; text-align: center;">Option A</div><div style="background: #10b981; color: white; padding: 12px; font-weight: bold; text-align: center;">Option B</div><div style="background: #f8fafc; padding: 12px; border-right: 1px solid #e2e8f0;"><strong>Advantages:</strong><br>• Point 1<br>• Point 2<br>• Point 3</div><div style="background: #f8fafc; padding: 12px;"><strong>Advantages:</strong><br>• Point 1<br>• Point 2<br>• Point 3</div><div style="background: #fef2f2; padding: 12px; border-right: 1px solid #e2e8f0;"><strong>Disadvantages:</strong><br>• Point 1<br>• Point 2</div><div style="background: #fef2f2; padding: 12px;"><strong>Disadvantages:</strong><br>• Point 1<br>• Point 2</div></div></div>` } ], content: [ { id: 'case-study-blue', name: 'Case Study - Blue', category: 'content', preview: <CaseStudyPreview />, html: `<div class="template-block" data-template-type="case-study" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #3b82f6; padding: 24px; margin: 20px 0; border-radius: 12px; position: relative;"><div style="position: absolute; top: -12px; left: 24px; background: #3b82f6; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Case Study</div><div style="margin-top: 8px;"><h3 style="margin: 0 0 16px 0; color: #1e40af; font-size: 1.3rem; font-weight: bold;">Real-World Application</h3><div style="background: rgba(255, 255, 255, 0.8); padding: 16px; border-radius: 8px; margin-bottom: 16px;"><p style="margin: 0 0 12px 0; color: #374151; line-height: 1.6;"><strong>Situation:</strong> Describe the real-world scenario or problem that illustrates the concept being taught.</p><p style="margin: 0 0 12px 0; color: #374151; line-height: 1.6;"><strong>Challenge:</strong> What specific challenges or decisions were involved?</p><p style="margin: 0; color: #374151; line-height: 1.6;"><strong>Outcome:</strong> How was the situation resolved and what can we learn from it?</p></div><div style="background: #1e40af; color: white; padding: 12px; border-radius: 8px; font-size: 14px;"><strong>💡 Key Takeaway:</strong> The main lesson or insight from this case study.</div></div></div>` }, { id: 'definition-box', name: 'Definition Box', category: 'content', preview: <DefinitionBoxPreview />, html: `<div class="template-block" data-template-type="definition" style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 8px;"><div style="display: flex; align-items: center; margin-bottom: 12px;"><span style="font-size: 20px; margin-right: 8px;">📖</span><h4 style="margin: 0; color: #15803d; font-size: 1.1rem; font-weight: bold;">Definition</h4></div><div style="background: white; padding: 16px; border-radius: 6px; border: 1px solid #bbf7d0;"><p style="margin: 0 0 8px 0; color: #15803d; font-weight: bold; font-size: 1.1rem;">Term or Concept</p><p style="margin: 0; color: #166534; line-height: 1.5;">A clear, concise explanation of the term or concept, including its key characteristics and how it relates to the broader topic.</p></div></div>` } ], interactive: [ { id: 'discussion-prompt', name: 'Discussion Prompt', category: 'interactive', preview: <DiscussionPromptPreview />, html: `<div class="template-block" data-template-type="discussion" style="background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); border: 2px solid #ec4899; padding: 24px; margin: 20px 0; border-radius: 12px;"><div style="display: flex; align-items: center; margin-bottom: 16px;"><span style="font-size: 24px; margin-right: 12px;">💬</span><h3 style="margin: 0; color: #be185d; font-size: 1.25rem; font-weight: bold;">Discussion</h3></div><div style="background: rgba(255, 255, 255, 0.8); padding: 16px; border-radius: 8px; margin-bottom: 16px;"><p style="margin: 0 0 12px 0; color: #831843; font-size: 1.1rem; font-weight: 500;">What are your thoughts on this topic?</p><p style="margin: 0; color: #9d174d; line-height: 1.5;">Consider the following points as you formulate your response:</p></div><ul style="margin: 0; padding-left: 20px; color: #be185d;"><li style="margin-bottom: 8px;">How does this relate to your personal experience?</li><li style="margin-bottom: 8px;">What alternative perspectives might exist?</li><li>What questions does this raise for you?</li></ul></div>` }, { id: 'activity-box', name: 'Activity Box', category: 'interactive', preview: <ActivityBoxPreview />, html: `<div class="template-block" data-template-type="activity" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 2px dashed #0ea5e9; padding: 24px; margin: 20px 0; border-radius: 12px;"><div style="display: flex; align-items: center; margin-bottom: 16px;"><span style="font-size: 24px; margin-right: 12px;">🎯</span><h3 style="margin: 0; color: #0c4a6e; font-size: 1.25rem; font-weight: bold;">Try It Yourself</h3></div><div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #7dd3fc; margin-bottom: 16px;"><p style="margin: 0 0 12px 0; color: #0c4a6e; font-weight: 500;"><strong>Activity:</strong> Practice applying what you've learned</p><p style="margin: 0 0 12px 0; color: #075985; line-height: 1.5;">Follow these steps to complete the activity:</p><ol style="margin: 0; padding-left: 20px; color: #075985;"><li style="margin-bottom: 4px;">Step one of the activity</li><li style="margin-bottom: 4px;">Step two of the activity</li><li>Step three of the activity</li></ol></div><div style="background: #0ea5e9; color: white; padding: 12px; border-radius: 8px; text-align: center;"><strong>⏱️ Estimated time: 10-15 minutes</strong></div></div>` } ], media: [ { id: 'video-embed', name: 'Video Embed', category: 'media', preview: <VideoEmbedPreview />, html: `<div class="template-block" data-template-type="video" style="background: #1f2937; padding: 24px; margin: 20px 0; border-radius: 12px; text-align: center;"><div style="background: #374151; border: 2px dashed #6b7280; border-radius: 8px; padding: 40px; position: relative;"><div style="color: #9ca3af; margin-bottom: 16px;"><div style="width: 64px; height: 64px; background: #4b5563; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;"><span style="font-size: 24px;">▶️</span></div><h4 style="margin: 0 0 8px 0; color: #f9fafb; font-size: 1.1rem;">Video Content</h4><p style="margin: 0; font-size: 14px;">Click to embed a video or replace with your content</p></div><div style="background: #4b5563; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-size: 12px; font-weight: bold;">00:00 / 00:00</div></div><p style="margin: 16px 0 0 0; color: #d1d5db; font-size: 14px; text-align: center;">Add a caption or description for your video content</p></div>` }, { id: 'image-gallery', name: 'Image Gallery', category: 'media', preview: <ImageGalleryPreview />, html: `<div class="template-block" data-template-type="gallery" style="background: #f8fafc; padding: 24px; margin: 20px 0; border-radius: 12px; border: 1px solid #e2e8f0;"><h3 style="text-align: center; margin: 0 0 20px 0; color: #374151; font-size: 1.25rem; font-weight: bold;">Image Gallery</h3><div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;"><div style="aspect-ratio: 1; background: #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2px dashed #cbd5e1;"><span style="color: #64748b; font-size: 24px;">🖼️</span></div><div style="aspect-ratio: 1; background: #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2px dashed #cbd5e1;"><span style="color: #64748b; font-size: 24px;">🖼️</span></div><div style="aspect-ratio: 1; background: #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2px dashed #cbd5e1;"><span style="color: #64748b; font-size: 24px;">🖼️</span></div></div><p style="text-align: center; margin: 16px 0 0 0; color: #6b7280; font-size: 14px;">Click on each placeholder to add your images</p></div>` } ] };

type Template = typeof templates.learning[0];

interface TemplateGalleryProps {
  onClose: () => void;
  onInsert: (html: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onClose, onInsert, isExpanded, onToggleExpand }) => {
  const [activeCategory, setActiveCategory] = useState('learning');
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedTemplate, setDraggedTemplate] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const filteredTemplates = templates[activeCategory as keyof typeof templates]?.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  useEffect(() => {
    if (isExpanded && filteredTemplates.length > 0) {
      if (!selectedTemplate || !filteredTemplates.find(t => t.id === selectedTemplate.id)) {
        setSelectedTemplate(filteredTemplates[0]);
      }
    } else if (!isExpanded) {
      setSelectedTemplate(null);
    }
  }, [isExpanded, filteredTemplates, selectedTemplate]);

  const handleTemplateInteraction = (template: Template) => {
    if (isExpanded) {
      setSelectedTemplate(template);
    } else {
      onInsert(template.html);
    }
  };

  // --- MODIFICATION START ---
  const handleDragStart = useCallback((e: React.DragEvent, template: Template) => {
    setDraggedTemplate(template.id);
    // Add the unique signature for gallery items
    e.dataTransfer.setData('application/gallery-template-item', 'true');
    e.dataTransfer.setData('text/html', template.html);
    e.dataTransfer.effectAllowed = 'copy';
    
    const dragImage = document.createElement('div');
    dragImage.className = 'bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 text-sm font-medium text-purple-700 shadow-lg flex items-center gap-2 border border-gray-200';
    dragImage.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2Z"/><path d="M15 2v20"/><path d="M8 7h4"/><path d="M8 12h4"/><path d="M8 17h4"/></svg> ${template.name}`;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 20, 20);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  }, []);
  // --- MODIFICATION END ---

  const handleDragEnd = useCallback(() => {
    setDraggedTemplate(null);
  }, []);

  return (
    <div className={`bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0 shadow-lg animate-in slide-in-from-left duration-300 transition-all`}>
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Template Gallery</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={onToggleExpand} className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200" title={isExpanded ? "Collapse" : "Expand"}>
              {isExpanded ? <Minimize className="w-5 h-5 text-gray-600" /> : <Maximize className="w-5 h-5 text-gray-600" />}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className={`flex flex-col flex-shrink-0 transition-all duration-300 ${isExpanded ? 'w-96 border-r border-gray-200' : 'w-full'}`}>
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search templates..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-100 focus:border-purple-300 transition-all duration-200" />
            </div>
          </div>
          <div className="p-4 border-b border-gray-100">
            <div className={`grid gap-2 ${isExpanded ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {templateCategories.map((category) => {
                const IconComponent = category.icon;
                const isActive = activeCategory === category.id;
                return (
                  <button key={category.id} onClick={() => setActiveCategory(category.id)} className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium transition-all duration-200 ${ isActive ? `bg-${category.color}-50 text-${category.color}-700 border border-${category.color}-200` : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-transparent'}`}>
                    <IconComponent className="w-4 h-4" />
                    <span className="truncate">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className={`grid gap-4 ${isExpanded ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, template)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleTemplateInteraction(template)}
                  className={`group relative bg-white rounded-xl border-2 transition-all duration-300 cursor-pointer overflow-hidden ${
                    draggedTemplate === template.id ? 'opacity-50 scale-95' : 'hover:scale-105'
                  } ${
                    isExpanded && selectedTemplate?.id === template.id ? 'border-purple-400 shadow-md' : 'border-gray-200 hover:border-purple-300 hover:shadow-lg'
                  }`}
                >
                  <div className="h-32 relative overflow-hidden bg-gray-50 pointer-events-none">
                    {template.preview}
                  </div>
                  <div className="p-3">
                    <h4 className={`font-semibold text-gray-900 text-sm truncate transition-colors duration-200 ${isExpanded && selectedTemplate?.id === template.id ? 'text-purple-700' : 'group-hover:text-purple-700'}`}>
                      {template.name}
                    </h4>
                  </div>
                  
                  {!isExpanded && (
                    <div className="absolute inset-0 bg-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-medium text-purple-700 shadow-lg">
                        Click or drag to insert
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {filteredTemplates.length === 0 && (
              <div className="text-center py-12 px-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-600">Try adjusting your search or browse a different category.</p>
              </div>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
            {selectedTemplate ? (
              <>
                <div className="p-6 border-b border-gray-200 flex-shrink-0">
                  <h3 className="text-lg font-bold text-gray-900">{selectedTemplate.name}</h3>
                  <p className="text-sm text-gray-600 mt-1 capitalize">{templateCategories.find(c => c.id === selectedTemplate.category)?.name}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="bg-white p-4 rounded-lg shadow-sm ring-1 ring-gray-200 prose max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: selectedTemplate.html }} />
                  </div>
                </div>
                <div className="p-6 bg-white/80 backdrop-blur-sm border-t border-gray-200">
                  <button 
                    onClick={() => onInsert(selectedTemplate.html)}
                    className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    Insert Template
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-center p-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Template Selected</h3>
                  <p className="text-gray-600">Select a template from the list to see a detailed preview.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};