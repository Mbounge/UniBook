// src/components/editor/ThemedEditor.tsx

"use client";

import React from 'react';
import { EditorContent, Editor } from '@tiptap/react';
import { useThemeStore } from '@/hooks/useTheme';

interface ThemedEditorProps {
  editor: Editor | null;
}

export const ThemedEditor = ({ editor }: ThemedEditorProps) => {
  const { theme } = useThemeStore();

  // Create a style object for the CSS variables AND the background color
  const editorStyle = {
    '--color-primary': theme.colors.primary,
    '--color-secondary': theme.colors.secondary,
    '--color-accent': theme.colors.accent,
    '--font-heading': theme.typography.heading,
    '--font-body': theme.typography.body,
    // --- THE FIX IS HERE ---
    // We apply the background color directly instead of relying on a Tailwind class.
    backgroundColor: theme.colors.background,
  } as React.CSSProperties;

  return (
    <div 
      // --- UPDATED: Removed the `bg-[--color-background]` class ---
      className="themed-editor-wrapper min-h-full rounded-lg border border-gray-200/50 p-16"
      style={editorStyle}
    >
      <EditorContent editor={editor} />
    </div>
  );
};