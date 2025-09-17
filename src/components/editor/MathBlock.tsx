//src/components/editor/MathBlock.tsx

"use client";

import React, { useState, useRef, useEffect } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathBlockProps {
  initialTex: string;
  isInline?: boolean;
  onUpdate: (newTex: string) => void;
  onRemove: () => void;
}

// Global flag to track mhchem loading
let mhchemInitialized = false;

const initializeMhchem = () => {
  if (mhchemInitialized) return Promise.resolve();
  
  return new Promise<void>((resolve) => {
    // Try to load mhchem extension
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/mhchem.min.js';
    script.onload = () => {
      mhchemInitialized = true;
      resolve();
    };
    script.onerror = () => {
      // Fallback: try to import locally
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
  isInline = false,
  onUpdate,
  onRemove
}) => {
  const [isEditing, setIsEditing] = useState(initialTex === '');
  const [tex, setTex] = useState(initialTex);
  const containerRef = useRef<HTMLSpanElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mhchemReady, setMhchemReady] = useState(mhchemInitialized);

  useEffect(() => {
    if (!mhchemInitialized) {
      initializeMhchem().then(() => {
        setMhchemReady(true);
      });
    }
  }, []);

  const renderMath = () => {
    if (containerRef.current) {
      try {
        // Clear the container first
        containerRef.current.innerHTML = '';
        
        katex.render(tex, containerRef.current, {
          throwOnError: false,
          displayMode: !isInline,
          strict: false,
          trust: true, // Allow all trusted functions including chemistry
          macros: {
            // Add fallback macros in case mhchem isn't loaded
            "\\ce": "\\mathrm{#1}",
            "\\pu": "\\mathrm{#1}"
          }
        });
      } catch (error: any) {
        // Fallback rendering for chemistry formulas
        console.warn('KaTeX rendering failed:', error);
        
        if (tex.includes('\\ce{') || tex.includes('\\pu{')) {
          // Manual chemistry formula parsing as fallback
          let displayTex = tex;
          
          // Simple replacements for common chemistry notation
          displayTex = displayTex.replace(/\\ce\{([^}]+)\}/g, (match, content) => {
            return content
              .replace(/->/g, ' → ')
              .replace(/<->/g, ' ⇌ ')
              .replace(/\+/g, ' + ')
              .replace(/_(\d+)/g, '₋$1')
              .replace(/\^(\d+)/g, '⁺$1')
              .replace(/\^(\+)/g, '⁺')
              .replace(/\^(-)/g, '⁻');
          });
          
          containerRef.current.innerHTML = `<span style="font-family: 'Times New Roman', serif;">${displayTex}</span>`;
        } else {
          containerRef.current.innerText = `Error: ${error.message}`;
          containerRef.current.style.color = 'red';
        }
      }
    }
  };

  useEffect(() => {
    if (!isEditing && mhchemReady) {
      renderMath();
    } else if (!isEditing && !mhchemReady) {
      // Render with fallback while waiting for mhchem
      setTimeout(renderMath, 100);
    } else if (isEditing) {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
      }
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

  if (isEditing) {
    return (
      <span 
        className={`math-editor ${isInline ? 'inline' : 'block'}`}
        contentEditable={false}
      >
        <textarea
          ref={textareaRef}
          value={tex}
          onChange={(e) => setTex(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="math-textarea"
          aria-label="LaTeX formula input"
          placeholder="Enter LaTeX..."
          style={{
            fontFamily: 'monospace',
            fontSize: isInline ? '0.9em' : '1em',
            padding: isInline ? '2px 4px' : '8px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            backgroundColor: '#f8fafc',
            resize: 'none',
            width: '100%',
            minHeight: isInline ? 'auto' : '50px',
            boxSizing: 'border-box',
            color: '#334155',
          }}
        />
      </span>
    );
  }

  return (
    <span
      ref={containerRef}
      contentEditable={false}
      onClick={() => setIsEditing(true)}
      className={`math-rendered ${isInline ? 'inline' : 'block'}`}
      title="Click to edit formula"
      style={{
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '4px',
        transition: 'background-color 0.2s',
        display: isInline ? 'inline-block' : 'block',
        textAlign: isInline ? 'inherit' : 'center',
        minHeight: '1.2em',
      }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#eff6ff'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
    />
  );
};