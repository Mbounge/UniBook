"use client";

import React, { useState, useRef, useEffect } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathBlockProps {
  initialTex: string;
  fontSize: number;
  onUpdate: (newTex: string) => void;
  onRemove: () => void;
}

// Global flag to track mhchem loading
let mhchemInitialized = false;

const initializeMhchem = () => {
  if (mhchemInitialized) return Promise.resolve();
  
  return new Promise<void>((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/mhchem.min.js';
    script.onload = () => {
      mhchemInitialized = true;
      resolve();
    };
    script.onerror = () => {
      try {
        require('katex/dist/contrib/mhchem.js');
        mhchemInitialized = true;
      } catch (e) {
        console.warn('Could not load mhchem extension:', e);
      }
      resolve();
    };
    document.head.appendChild(script);
  });
};

export const MathBlock: React.FC<MathBlockProps> = ({
  initialTex,
  fontSize,
  onUpdate,
  onRemove
}) => {
  const [isEditing, setIsEditing] = useState(initialTex === '');
  const [tex, setTex] = useState(initialTex);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mhchemReady, setMhchemReady] = useState(mhchemInitialized);
  const isPastingRef = useRef(false);

  useEffect(() => {
    if (!mhchemInitialized) {
      initializeMhchem().then(() => setMhchemReady(true));
    }
  }, []);

  useEffect(() => {
    const currentRef = isEditing ? textareaRef.current?.parentElement : containerRef.current;
    if (!currentRef) return;

    const handleEdit = () => setIsEditing(true);
    const handleUpdateFontSize = (e: CustomEvent<{ fontSize: number }>) => {
      if (containerRef.current) {
        containerRef.current.style.fontSize = `${e.detail.fontSize}px`;
      }
    };

    currentRef.addEventListener('editMath', handleEdit);
    currentRef.addEventListener('updateMath', handleUpdateFontSize as EventListener);

    return () => {
      currentRef.removeEventListener('editMath', handleEdit);
      currentRef.removeEventListener('updateMath', handleUpdateFontSize as EventListener);
    };
  }, [isEditing]);

  const renderMath = () => {
    if (containerRef.current) {
      try {
        containerRef.current.innerHTML = '';
        katex.render(tex, containerRef.current, {
          throwOnError: false,
          displayMode: true,
          strict: false,
          trust: true,
          macros: { "\\ce": "\\mathrm{#1}", "\\pu": "\\mathrm{#1}" }
        });
      } catch (error: any) {
        containerRef.current.innerText = `Error: ${error.message}`;
        containerRef.current.style.color = 'red';
      }
    }
  };

  useEffect(() => {
    if (!isEditing && mhchemReady) {
      renderMath();
    } else if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      if (initialTex) {
        textarea.select();
      }
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [isEditing, tex, mhchemReady]);

  const handleBlur = () => {
    if (tex.trim() === '') {
      onRemove();
    } else {
      onUpdate(tex);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handleBlur();
    }
  };
  
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isPastingRef.current) {
      isPastingRef.current = false;
      return;
    }
    setTex(e.target.value);
    const textarea = e.currentTarget;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    isPastingRef.current = true;
    const pastedText = e.clipboardData.getData('text/plain');
    const sanitizedText = pastedText.trim();
    setTex(sanitizedText);
  };

  if (isEditing) {
    return (
      <div 
        ref={containerRef}
        className="math-editor"
        contentEditable={false}
      >
        {/* --- MODIFICATION: Inject a style tag to fix highlighting --- */}
        <style>
          {`.math-textarea::selection { background-color: #ACCEF7; }`}
        </style>
        <textarea
          ref={textareaRef}
          value={tex}
          onChange={handleTextareaInput}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          className="math-textarea"
          aria-label="LaTeX formula input"
          placeholder="Enter LaTeX..."
          style={{
            fontFamily: 'monospace',
            fontSize: '16px',
            padding: '8px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            backgroundColor: '#f8fafc',
            resize: 'none',
            width: '100%',
            minHeight: '50px',
            boxSizing: 'border-box',
            color: '#334155',
            overflow: 'hidden',
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      contentEditable={false}
      className="math-rendered"
      title="Click to select, then click the edit icon"
      style={{
        fontSize: `${fontSize}px`,
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '4px',
        transition: 'background-color 0.2s',
        display: 'block',
        textAlign: 'center',
        minHeight: '1.2em',
      }}
    />
  );
};