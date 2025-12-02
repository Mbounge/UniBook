// src/components/editor/TikZBlock.tsx
"use client";

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Code, 
  Cpu, 
  Activity, 
  Share2, 
  Box, 
  Check, 
  Trash2, 
  RefreshCw,
  AlertCircle,
  Circle,
  Square,
  ArrowRight,
  Grid,
  Network,
  X,
  Maximize2,
  Sun,
  Moon
} from 'lucide-react';

// --- TYPES ---
interface TikZBlockProps {
  initialCode: string;
  onUpdate: (newCode: string) => void;
  onRemove: () => void;
}

type EditorTheme = 'dark' | 'light';

// --- COMMON LIBRARIES ---
const COMMON_PREAMBLE = `\\usetikzlibrary{
  arrows.meta,
  calc,
  positioning,
  shapes.geometric,
  patterns,
  intersections,
  backgrounds,
  fit
}`;

// --- TEMPLATES ---
const TIKZ_CATEGORIES = {
  Essentials: [
    {
      id: 'circle',
      label: 'Circle',
      icon: Circle,
      description: 'Basic filled circle',
      code: `\\begin{document}
\\begin{tikzpicture}[scale=1.5]
  % Draw a filled circle with a border
  \\draw[fill=blue!10, draw=blue, thick] (0,0) circle (1cm);
  
  % Add a label at the center
  \\node at (0,0) {Center};
\\end{tikzpicture}
\\end{document}`
    },
    {
      id: 'rectangle',
      label: 'Box',
      icon: Square,
      description: 'Rounded box',
      code: `\\begin{document}
\\begin{tikzpicture}[scale=1.5]
  % Draw a rectangle with rounded corners
  \\draw[fill=green!10, draw=green!60!black, thick, rounded corners=5pt] 
    (0,0) rectangle (3, 1.5);
    
  % Add text in the middle
  \\node at (1.5, 0.75) {Rectangle};
\\end{tikzpicture}
\\end{document}`
    },
    {
      id: 'vector',
      label: 'Vector',
      icon: ArrowRight,
      description: 'Arrow with tip',
      code: `\\begin{document}
\\begin{tikzpicture}[scale=1.5]
  % Draw a grid for reference
  \\draw[step=0.5, gray!20, very thin] (-0.5,-0.5) grid (2.5,2.5);

  % Draw vector from origin
  % Using standard arrow tip (no libraries required)
  \\draw[->, very thick, red] (0,0) -- (2,2) 
    node[midway, above left] {$\\vec{v}$};
    
  % Mark the origin
  \\fill (0,0) circle (1.5pt) node[below left] {$O$};
\\end{tikzpicture}
\\end{document}`
    },
    {
      id: 'grid',
      label: 'Grid',
      icon: Grid,
      description: 'Coordinate system',
      code: `\\begin{document}
\\begin{tikzpicture}[scale=1]
  % Grid
  \\draw[step=1cm, gray!30, very thin] (-2,-2) grid (2,2);
  
  % Axes
  \\draw[->] (-2.2,0) -- (2.2,0) node[right] {$x$};
  \\draw[->] (0,-2.2) -- (0,2.2) node[above] {$y$};
  
  % Ticks
  \\foreach \\x in {-2,-1,1,2}
    \\draw (\\x,2pt) -- (\\x,-2pt) node[below] {\\footnotesize \\x};
  \\foreach \\y in {-2,-1,1,2}
    \\draw (2pt,\\y) -- (-2pt,\\y) node[left] {\\footnotesize \\y};
\\end{tikzpicture}
\\end{document}`
    }
  ],
  Diagrams: [
    {
      id: 'flowchart',
      label: 'Flow',
      icon: Share2,
      description: 'Process nodes',
      code: `${COMMON_PREAMBLE}
\\begin{document}
\\begin{tikzpicture}[
  node distance=2cm,
  >={Stealth[round]},
  thick,
  % Styles
  startstop/.style = {draw, rounded corners, fill=red!10, minimum height=1cm, align=center},
  process/.style = {draw, rectangle, fill=blue!10, minimum height=1cm, minimum width=2cm, align=center},
  decision/.style = {draw, diamond, fill=green!10, aspect=2, align=center}
] 

  % Nodes
  \\node[startstop] (start) {Start};
  \\node[process, below=of start] (proc1) {Process A};
  \\node[decision, below=of proc1] (dec1) {Check?};
  \\node[process, right=of dec1, xshift=1cm] (proc2) {Fix};
  \\node[startstop, below=of dec1] (stop) {End};

  % Edges
  \\draw[->] (start) -- (proc1);
  \\draw[->] (proc1) -- (dec1);
  \\draw[->] (dec1) -- node[right] {Yes} (stop);
  \\draw[->] (dec1) -- node[above] {No} (proc2);
  \\draw[->] (proc2) |- (proc1);

\\end{tikzpicture}
\\end{document}`
    },
    {
      id: 'tree',
      label: 'Tree',
      icon: Network,
      description: 'Hierarchy',
      code: `${COMMON_PREAMBLE}
\\begin{document}
\\begin{tikzpicture}[
  level distance=1.5cm,
  sibling distance=2cm,
  every node/.style={circle, draw, fill=white, minimum size=8mm}
]

  \\node {Root}
    child { node {A} 
      child { node {A1} }
      child { node {A2} }
    }
    child { node {B}
      child { node {B1} }
    };

\\end{tikzpicture}
\\end{document}`
    }
  ],
  Advanced: [
    {
      id: 'circuit',
      label: 'Circuit',
      icon: Cpu,
      description: 'Resistor, Battery',
      code: `${COMMON_PREAMBLE}
\\begin{document}
\\begin{tikzpicture}[thick, scale=1.2]
  % --- CIRCUIT PRIMITIVES (Manual Drawing) ---
  
  % 1. Battery (Left Branch)
  \\draw (0,0) -- (0,1.8);
  \\draw (-0.2,1.8) -- (0.2,1.8); % Long bar
  \\draw (-0.1,2.0) -- (0.1,2.0); % Short bar
  \\draw (0,2.0) -- (0,4);
  
  % 2. Top Wire & Ammeter
  \\draw (0,4) -- (2,4);
  \\draw[fill=white] (2.5,4) circle (0.5) node {A};
  \\draw (3,4) -- (4,4);
  
  % 3. Resistor (Right Branch) - Manually drawn ZigZag
  \\draw (4,4) -- (4,3.2);
  \\draw (4,3.2) -- (4.2,3.0) -- (3.8,2.6) -- (4.2,2.2) 
         -- (3.8,1.8) -- (4.2,1.4) -- (3.8,1.0) -- (4,0.8);
  \\draw (4,0.8) -- (4,0);
  \\node[right] at (4.2, 2) {$R_1$};
  
  % 4. Bottom Wire
  \\draw (4,0) -- (0,0);
  
  % 5. Capacitor (Middle Branch)
  \\draw (2,4) -- (2,2.2);
  \\draw (1.7,2.2) -- (2.3,2.2); % Top plate
  \\draw (1.7,1.8) -- (2.3,1.8); % Bottom plate
  \\draw (2,1.8) -- (2,0);
  \\node[right] at (2.3, 2) {$C_1$};

\\end{tikzpicture}
\\end{document}`
    },
    {
      id: 'plot',
      label: 'Plot',
      icon: Activity,
      description: 'Parabola on axes',
      code: `${COMMON_PREAMBLE}
\\begin{document}
\\begin{tikzpicture}[scale=1.0, >=Stealth]

  % 1. Grid
  \\draw[step=0.5, gray!15, very thin] (-0.4,-2.4) grid (4.9,4.9);

  % 2. Axes
  \\draw[->] (-0.5,0) -- (5,0) node[right] {$x$};
  \\draw[->] (0,-2.5) -- (0,5) node[above] {$f(x)$};
  
  % 3. Ticks
  \\foreach \\x in {1,2,3,4}
    \\draw (\\x,1pt) -- (\\x,-1pt) node[anchor=north] {\\x};
  \\foreach \\y in {1,2,3,4}
    \\draw (1pt,\\y) -- (-1pt,\\y) node[anchor=east] {\\y};

  % 4. Parabola: y = x^2 - 2x
  \\draw[color=red, thick, domain=0:3.5, samples=50] 
    plot (\\x, {\\x*\\x - 2*\\x}) 
    node[right] {$x^2 - 2x$};

\\end{tikzpicture}
\\end{document}`
    }
  ]
};

// --- HELPER: LOAD SCRIPT ---
let tikzLoadingPromise: Promise<void> | null = null;

const loadTikZJax = () => {
  if (typeof window === 'undefined') return Promise.resolve();
  
  if (tikzLoadingPromise) return tikzLoadingPromise;

  console.log("[TikZ] Starting library load...");

  tikzLoadingPromise = new Promise<void>((resolve, reject) => {
    if (document.querySelector('script[src*="tikzjax"]')) {
      console.log("[TikZ] Library script already present.");
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://tikzjax.com/v1/fonts.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://tikzjax.com/v1/tikzjax.js';
    script.async = true;
    
    script.onload = () => {
      console.log("[TikZ] Library script loaded.");
      setTimeout(() => {
        resolve();
      }, 500); 
    };
    
    script.onerror = (e) => {
      console.error("[TikZ] Library load failed:", e);
      tikzLoadingPromise = null;
      reject(new Error('Failed to load TikZJax library'));
    };
    
    document.head.appendChild(script);
  });

  return tikzLoadingPromise;
};

// --- SYNTAX HIGHLIGHTING HELPER ---
const highlightLaTeX = (code: string, theme: EditorTheme) => {
  if (!code) return '';

  const colors = theme === 'dark' ? {
    comment: 'text-gray-500 italic',
    command: 'text-blue-400',
    keyword: 'text-purple-400 font-bold',
    number: 'text-emerald-400',
    bracket: 'text-yellow-500',
    paren: 'text-orange-400',
    symbol: 'text-pink-400',
    text: 'text-gray-300'
  } : {
    comment: 'text-gray-500 italic',
    command: 'text-blue-700',
    keyword: 'text-purple-700 font-bold',
    number: 'text-emerald-600',
    bracket: 'text-yellow-600',
    paren: 'text-orange-600',
    symbol: 'text-pink-600',
    text: 'text-gray-900'
  };

  const regex = /(%.*$)|(\\\[a-zA-Z@]+)|(\b(?:draw|fill|node|path|coordinate|clip|scope|at|to|cycle|foreach|in|begin|end|tikzpicture|document)\b)|(\d+(?:\.\d+)?)|([\{\}\[\]])|([\(\)])|(--|->|<-|\|-|-|\||\+|=)|([^%\\\{\}\[\]\(\)\d\s-]+)/gm;

  return code.replace(regex, (match, comment, command, keyword, number, bracket, paren, symbol, text) => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    if (comment) return `<span class="${colors.comment}">${esc(match)}</span>`;
    if (command) return `<span class="${colors.command}">${esc(match)}</span>`;
    if (keyword) return `<span class="${colors.keyword}">${esc(match)}</span>`;
    if (number) return `<span class="${colors.number}">${esc(match)}</span>`;
    if (bracket) return `<span class="${colors.bracket}">${esc(match)}</span>`;
    if (paren) return `<span class="${colors.paren}">${esc(match)}</span>`;
    if (symbol) return `<span class="${colors.symbol}">${esc(match)}</span>`;
    if (text) return `<span class="${colors.text}">${esc(match)}</span>`;
    
    return esc(match);
  });
};

// --- CODE EDITOR COMPONENT ---
const CodeEditor = ({ value, onChange, theme }: { value: string, onChange: (val: string) => void, theme: EditorTheme }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (textareaRef.current && preRef.current && gutterRef.current) {
      const scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollTop = scrollTop;
      gutterRef.current.scrollTop = scrollTop;
      
      const scrollLeft = textareaRef.current.scrollLeft;
      preRef.current.scrollLeft = scrollLeft;
    }
  };

  const lineCount = useMemo(() => value.split('\n').length, [value]);
  const lines = useMemo(() => Array.from({ length: lineCount }, (_, i) => i + 1), [lineCount]);

  const bgClass = theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-white';
  const gutterBgClass = theme === 'dark' ? 'bg-[#252526] border-[#333]' : 'bg-gray-50 border-gray-200';
  const gutterTextClass = theme === 'dark' ? 'text-gray-500' : 'text-gray-400';
  const caretClass = theme === 'dark' ? 'caret-white' : 'caret-black';

  return (
    <div className={`relative w-full h-full flex ${bgClass} overflow-hidden font-mono text-sm transition-colors duration-200`}>
      {/* Custom Selection Style Injection */}
      <style>
        {`
          .tikz-editor-textarea::selection {
            background-color: rgba(59, 130, 246, 0.3) !important; /* blue-500 with opacity */
          }
        `}
      </style>

      {/* Line Numbers Gutter */}
      <div 
        ref={gutterRef}
        className={`flex-shrink-0 w-12 ${gutterBgClass} ${gutterTextClass} text-right pr-3 pt-4 select-none overflow-hidden border-r`}
        style={{ lineHeight: '1.5rem' }}
      >
        {lines.map(line => (
          <div key={line}>{line}</div>
        ))}
        {/* Extra padding at bottom to match textarea scroll */}
        <div className="h-full"></div>
      </div>

      {/* Editor Area */}
      <div className="relative flex-1 h-full">
        {/* Syntax Highlighting Layer (Backdrop) */}
        <pre
          ref={preRef}
          aria-hidden="true"
          className="absolute inset-0 m-0 p-4 pointer-events-none whitespace-pre overflow-hidden"
          style={{ 
            lineHeight: '1.5rem', 
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            color: 'transparent' // Ensure base text is transparent so spans show
          }}
          dangerouslySetInnerHTML={{ __html: highlightLaTeX(value, theme) + '<br>' }}
        />

        {/* Input Layer (Foreground) */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          spellCheck={false}
          className={`tikz-editor-textarea absolute inset-0 w-full h-full p-4 bg-transparent text-transparent ${caretClass} resize-none outline-none whitespace-pre overflow-auto custom-scrollbar`}
          style={{ 
            lineHeight: '1.5rem', 
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            color: 'transparent' // Text is transparent to show backdrop
          }}
        />
      </div>
    </div>
  );
};

export const TikZBlock: React.FC<TikZBlockProps> = ({
  initialCode,
  onUpdate,
  onRemove
}) => {
  const [code, setCode] = useState(initialCode || TIKZ_CATEGORIES.Essentials[0].code);
  const [isEditing, setIsEditing] = useState(initialCode === '');
  const [isLoading, setIsLoading] = useState(false);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<keyof typeof TIKZ_CATEGORIES>('Essentials');
  const [theme, setTheme] = useState<EditorTheme>('dark');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Load Library on Mount
  useEffect(() => {
    loadTikZJax()
      .then(() => {
        setIsLibraryLoaded(true);
      })
      .catch((err) => {
        console.error("[TikZ] Load error:", err);
        setError(err.message);
      });
  }, []);

  // 2. Handle Rendering
  useEffect(() => {
    if (isEditing) return;
    if (!isLibraryLoaded) return;

    console.log("[TikZ] Rendering triggered.");
    let timeoutId: NodeJS.Timeout;

    const render = async () => {
      setIsLoading(true);
      setError(null);

      if (outputRef.current) {
        outputRef.current.innerHTML = '';
      }

      const script = document.createElement('script');
      script.type = 'text/tikz';
      script.textContent = code;
      script.setAttribute('data-show-console', 'true');
      
      if (outputRef.current) {
        outputRef.current.appendChild(script);
        
        // Trigger processing manually
        setTimeout(() => {
            window.dispatchEvent(new Event('load'));
        }, 50);
      }

      timeoutId = setTimeout(() => {
        if (outputRef.current) {
          const svg = outputRef.current.querySelector('svg');
          const stillHasScript = outputRef.current.querySelector('script[type="text/tikz"]');
          const innerText = outputRef.current.innerText;
          
          if (svg) {
             setIsLoading(false);
          } else if (stillHasScript) {
             console.error("[TikZ] Timeout: Script not processed.");
             // Try one last force trigger
             window.dispatchEvent(new Event('load'));
             
             setTimeout(() => {
                 if (!outputRef.current?.querySelector('svg')) {
                     setIsLoading(false);
                     setError("Rendering timed out. Ensure you are using standard TikZ commands.");
                 }
             }, 1000);
          } else if (innerText && innerText.trim().length > 0) {
             setIsLoading(false);
             setError(`Error: ${innerText}`);
          } else {
             setIsLoading(false);
             setError("Rendering failed silently.");
          }
        }
      }, 15000); 
    };

    render();

    return () => clearTimeout(timeoutId);
  }, [code, isEditing, isLibraryLoaded, renderTrigger]);

  // 3. Listen for DOM mutations & Fix Layout
  useEffect(() => {
    if (!outputRef.current) return;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
            // Check for SVG in added nodes or descendants
            const svg = outputRef.current?.querySelector('svg');
            
            if (svg) {
                console.log("[TikZ] SVG detected!");
                setIsLoading(false);
                
                if (!svg.hasAttribute('data-processed')) {
                    svg.setAttribute('data-processed', 'true');

                    // 1. Ensure Aspect Ratio is preserved so it scales nicely
                    if (!svg.hasAttribute('preserveAspectRatio')) {
                        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                    }
                    
                    // 2. Remove fixed dimensions from the SVG itself
                    svg.removeAttribute('width');
                    svg.removeAttribute('height');
                    
                    // 3. Clone the SVG to get a clean copy
                    const svgClone = svg.cloneNode(true) as SVGElement;
                    
                    // 4. Apply styles to make the SVG itself responsive
                    svgClone.style.width = '100%';
                    svgClone.style.height = '100%';
                    svgClone.style.display = 'block';
                    
                    // 5. CRITICAL: Clear the container (removing TikZJax's fixed-width wrappers)
                    // and inject ONLY the clean SVG.
                    outputRef.current!.innerHTML = ''; 
                    outputRef.current!.appendChild(svgClone);
                    
                    // 6. Set default dimensions on the wrapper if not present
                    const wrapper = containerRef.current?.closest('.tikz-wrapper') as HTMLElement;
                    if (wrapper) {
                        const hasExplicitHeight = wrapper.style.height && wrapper.style.height !== 'auto' && wrapper.style.height !== '0px';
                        if (!hasExplicitHeight) {
                            console.log("[TikZ] Setting default dimensions.");
                            wrapper.style.width = wrapper.style.width || '500px';
                            wrapper.style.height = '300px';
                        }
                    }

                    console.log("[TikZ] SVG cleaned and mounted directly");
                }
            }

            // Error handling logic
            const hasText = Array.from(mutation.addedNodes).some(node => node.nodeType === Node.TEXT_NODE);
            if (hasText && !svg && !outputRef.current?.querySelector('script')) {
                 const text = outputRef.current?.innerText;
                 if (text && (text.includes("Error") || text.includes("tikz"))) {
                     setIsLoading(false);
                     setError(text);
                 }
            }
        }
      }
    });

    observer.observe(outputRef.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const handleSave = () => {
    onUpdate(code);
    setIsEditing(false);
    setRenderTrigger(prev => prev + 1);
  };

  const handleRetry = () => {
      tikzLoadingPromise = null;
      const oldScript = document.querySelector('script[src*="tikzjax"]');
      if (oldScript) oldScript.remove();
      const oldLink = document.querySelector('link[href*="tikzjax"]');
      if (oldLink) oldLink.remove();
      
      setIsLibraryLoaded(false);
      loadTikZJax().then(() => {
          setIsLibraryLoaded(true);
          setRenderTrigger(p => p + 1);
      });
  };

  // Listen for edit event from Resizer
  useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      
      const handleEditEvent = () => {
          setIsEditing(true);
      };
      
      container.addEventListener('editTikZ', handleEditEvent);
      return () => container.removeEventListener('editTikZ', handleEditEvent);
  }, []);

  const modalBgClass = theme === 'dark' ? 'bg-[#1e1e1e] border-[#333]' : 'bg-white border-gray-200';
  const headerBgClass = theme === 'dark' ? 'bg-[#252526] border-[#333]' : 'bg-white border-gray-200';
  const textClass = theme === 'dark' ? 'text-gray-200' : 'text-gray-800';
  const subTextClass = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const buttonHoverClass = theme === 'dark' ? 'hover:bg-[#333]' : 'hover:bg-gray-100';
  const ribbonBgClass = theme === 'dark' ? 'bg-[#1e1e1e] border-[#333]' : 'bg-gray-50 border-gray-200';
  const ribbonBtnClass = theme === 'dark' ? 'bg-[#252526] border-[#333] hover:bg-[#2d2d2d]' : 'bg-white border-gray-200 hover:bg-blue-50';
  const footerBgClass = theme === 'dark' ? 'bg-[#252526] border-[#333]' : 'bg-gray-50 border-gray-200';
  const statusBarBgClass = theme === 'dark' ? 'bg-[#007acc] text-white' : 'bg-blue-600 text-white';

  return (
    <div 
      ref={containerRef}
      className="tikz-block-content w-full h-full relative group"
      contentEditable={false}
    >
      {/* --- RENDERED VIEW --- */}
      <div 
        className={`relative w-full h-full transition-all ${isEditing ? 'hidden' : 'block'} ${(isLoading || error) ? 'min-h-[12rem]' : ''}`}
      >
        <div 
          ref={outputRef} 
          className="w-full h-full flex justify-center items-center bg-white cursor-default overflow-hidden relative"
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10 backdrop-blur-sm">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-2" />
            <span className="text-sm font-medium text-gray-600">Compiling...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50/95 z-10 p-4 text-center border border-red-100">
            <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
            <p className="text-sm font-medium text-red-800 mb-3 max-w-md break-words">{error}</p>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-white border border-red-200 text-red-700 text-xs font-medium rounded hover:bg-red-50"
              >
                Edit Code
              </button>
              <button 
                onClick={handleRetry}
                className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Hover Actions (Only visible when not loading/error) */}
        {!isLoading && !error && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white shadow-sm border border-gray-200 rounded-md p-1 z-20">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Edit Code"
            >
              <Code size={14} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
              title="Remove"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* --- EDITOR VIEW (PORTAL) --- */}
      {isEditing && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/30 backdrop-blur-sm"
          onClick={() => setIsEditing(false)}
        >
          <div 
            className={`w-full max-w-5xl h-[85vh] flex flex-col rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border ${modalBgClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex-shrink-0 flex items-center justify-between px-5 py-3 border-b ${headerBgClass}`}>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold ${textClass}`}>TikZ Editor</span>
                <div className={`h-4 w-px ${theme === 'dark' ? 'bg-[#333]' : 'bg-gray-200'}`}></div>
                <div className="flex gap-1">
                  {Object.keys(TIKZ_CATEGORIES).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat as keyof typeof TIKZ_CATEGORIES)}
                      className={`
                        px-3 py-1.5 text-xs font-medium rounded-md transition-all
                        ${activeCategory === cat 
                          ? 'bg-blue-600 text-white' 
                          : `${subTextClass} ${buttonHoverClass}`
                        }
                      `}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`p-2 ${subTextClass} ${buttonHoverClass} rounded-lg transition-colors`}
                  title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <div className={`h-4 w-px ${theme === 'dark' ? 'bg-[#333]' : 'bg-gray-200'} mx-1`}></div>
                <button 
                  onClick={onRemove}
                  className={`p-2 ${subTextClass} hover:text-red-500 ${theme === 'dark' ? 'hover:bg-red-900/20' : 'hover:bg-red-50'} rounded-lg transition-colors`}
                  title="Delete Block"
                >
                  <Trash2 size={16} />
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  className={`p-2 ${subTextClass} ${buttonHoverClass} rounded-lg transition-colors`}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Template Ribbon (Horizontal) */}
            <div className={`flex-shrink-0 border-b px-5 py-3 overflow-x-auto ${ribbonBgClass}`}>
              <div className="flex gap-2 min-w-max">
                {TIKZ_CATEGORIES[activeCategory].map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setCode(tpl.code)}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-all group ${ribbonBtnClass}`}
                    title={tpl.description}
                  >
                    <tpl.icon size={16} className={`${subTextClass} group-hover:text-blue-500 transition-colors`} />
                    <span className={`text-xs font-medium ${textClass} group-hover:text-blue-500 whitespace-nowrap`}>
                      {tpl.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content Area: Code Editor */}
            <div className="flex-1 min-h-0">
              <CodeEditor value={code} onChange={setCode} theme={theme} />
            </div>
            
            {/* Status Bar */}
            <div className={`flex-shrink-0 px-5 py-2 flex justify-between items-center text-[10px] font-mono ${statusBarBgClass}`}>
              <div className="flex items-center gap-4">
                <span>LaTeX / TikZ Environment</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  Ready
                </span>
              </div>
              <span>Standard Libraries Pre-loaded</span>
            </div>

            {/* Footer Actions */}
            <div className={`flex-shrink-0 flex items-center justify-between px-6 py-4 border-t ${footerBgClass}`}>
              <div className={`flex items-center gap-2 text-xs ${subTextClass}`}>
                <AlertCircle size={14} className="text-blue-500" />
                <span>Compiles locally via WebAssembly (TikZJax)</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className={`px-4 py-2 text-sm font-medium ${textClass} ${buttonHoverClass} rounded-lg transition-colors`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-500 transition-all shadow-sm hover:shadow hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Check size={16} />
                  Render Diagram
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};