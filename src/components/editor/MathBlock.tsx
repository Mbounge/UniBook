"use client";

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { 
  Calculator, FunctionSquare, Sigma, Binary, ArrowRightLeft, 
  X, Check, Trash2, Sun, Moon, 
  Circle, Square, ArrowRight, Grid, Share2, Network, Cpu, Activity, 
  RefreshCw, AlertCircle, PenTool, Plus, Minus, Table,
  CornerUpRight, Type, Crosshair, Palette, Repeat, 
  GitCommit, GitMerge, Clock, Combine, Layout, List, Share,
  Box, Aperture, Anchor, Eye, Triangle, BarChart, PieChart, Orbit,
  AlertTriangle, Loader2
} from 'lucide-react';

// --- TYPES ---
interface MathBlockProps {
  initialTex: string;
  fontSize: number;
  onUpdate: (newTex: string) => void;
  onRemove: () => void;
}

type EditorTheme = 'dark' | 'light';
type BlockMode = 'math' | 'tikz';
type Category = 'basic' | 'algebra' | 'greek' | 'logic' | 'calculus' | 'essentials' | 'diagrams' | 'advanced';

interface SymbolItem {
  label: string;
  insert: string;
  display?: string; // For Math (KaTeX)
  icon?: React.ElementType; // For TikZ
  description?: string;
  offset?: number;
}

// --- CONFIGURATION ---

const MATH_CATEGORIES: { id: Category; icon: React.ElementType; label: string }[] = [
  { id: 'basic', icon: Calculator, label: 'Basic' },
  { id: 'algebra', icon: FunctionSquare, label: 'Algebra' },
  { id: 'calculus', icon: Sigma, label: 'Calculus' },
  { id: 'greek', icon: Binary, label: 'Greek' },
  { id: 'logic', icon: ArrowRightLeft, label: 'Logic' },
];

const TIKZ_CATEGORIES: { id: Category; icon: React.ElementType; label: string }[] = [
  { id: 'essentials', icon: Circle, label: 'Essentials' },
  { id: 'diagrams', icon: Share2, label: 'Diagrams' },
  { id: 'advanced', icon: Cpu, label: 'Advanced' },
];

const MATH_SYMBOLS: Record<string, SymbolItem[]> = {
  basic: [
    { label: 'Fraction', display: '\\frac{a}{b}', insert: '\\frac{}{}', offset: -3 },
    { label: 'Sqrt', display: '\\sqrt{x}', insert: '\\sqrt{}', offset: -1 },
    { label: 'Power', display: 'x^n', insert: '^{}', offset: -1 },
    { label: 'Sub', display: 'x_n', insert: '_{}', offset: -1 },
    { label: 'Times', display: '\\times', insert: '\\times ' },
    { label: 'Div', display: '\\div', insert: '\\div ' },
    { label: 'PM', display: '\\pm', insert: '\\pm ' },
    { label: 'Approx', display: '\\approx', insert: '\\approx ' },
    { label: 'Neq', display: '\\neq', insert: '\\neq ' },
    { label: 'Inf', display: '\\infty', insert: '\\infty ' },
  ],
  algebra: [
    { label: 'Parens', display: '(x)', insert: '()' },
    { label: 'Brackets', display: '[x]', insert: '[]', offset: -1 },
    { label: 'Braces', display: '\\{x\\}', insert: '\\{\\}', offset: -2 },
    { label: 'Sum', display: '\\sum', insert: '\\sum_{}^{}', offset: -4 },
    { label: 'Vector', display: '\\vec{x}', insert: '\\vec{}', offset: -1 },
    { label: 'Matrix', display: '\\begin{bmatrix}\\dots\\end{bmatrix}', insert: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
  ],
  calculus: [
    { label: 'Int', display: '\\int', insert: '\\int_{}^{}', offset: -4 },
    { label: 'Lim', display: '\\lim', insert: '\\lim_{x \\to }', offset: -1 },
    { label: 'd/dx', display: '\\frac{d}{dx}', insert: '\\frac{d}{dx}' },
    { label: 'Partial', display: '\\partial', insert: '\\partial ' },
    { label: 'Nabla', display: '\\nabla', insert: '\\nabla ' },
  ],
  greek: [
    { label: 'Alpha', display: '\\alpha', insert: '\\alpha ' },
    { label: 'Beta', display: '\\beta', insert: '\\beta ' },
    { label: 'Gamma', display: '\\gamma', insert: '\\gamma ' },
    { label: 'Delta', display: '\\Delta', insert: '\\Delta ' },
    { label: 'Theta', display: '\\theta', insert: '\\theta ' },
    { label: 'Pi', display: '\\pi', insert: '\\pi ' },
    { label: 'Sigma', display: '\\sigma', insert: '\\sigma ' },
    { label: 'Omega', display: '\\Omega', insert: '\\Omega ' },
    { label: 'Phi', display: '\\phi', insert: '\\phi ' },
  ],
  logic: [
    { label: 'Right', display: '\\rightarrow', insert: '\\rightarrow ' },
    { label: 'Left', display: '\\leftarrow', insert: '\\leftarrow ' },
    { label: 'Implies', display: '\\Rightarrow', insert: '\\Rightarrow ' },
    { label: 'For All', display: '\\forall', insert: '\\forall ' },
    { label: 'Exists', display: '\\exists', insert: '\\exists ' },
    { label: 'In', display: '\\in', insert: '\\in ' },
    { label: 'Therefore', display: '\\therefore', insert: '\\therefore ' },
  ],
};

const COMMON_PREAMBLE = `\\usetikzlibrary{arrows.meta,calc,positioning,shapes.geometric,patterns,intersections,backgrounds,fit,matrix}`;

const TIKZ_TEMPLATES: Record<string, SymbolItem[]> = {
  essentials: [
    { label: 'Line', icon: Minus, description: 'Basic line path', insert: `\\begin{tikzpicture}\n  \\draw (0,0) -- (2,1);\n  \\draw[red, thick] (0,1) -- (2,0);\n\\end{tikzpicture}` },
    { label: 'Circle', icon: Circle, description: 'Circle with radius', insert: `\\begin{tikzpicture}\n  \\draw[blue, fill=blue!10] (0,0) circle (1cm);\n  \\draw (0,0) -- (1,0) node[midway, above] {$r$};\n\\end{tikzpicture}` },
    { label: 'Rect', icon: Square, description: 'Rectangle box', insert: `\\begin{tikzpicture}\n  \\draw[thick, fill=green!10] (0,0) rectangle (3,2);\n  \\node at (1.5,1) {Box};\n\\end{tikzpicture}` },
    { label: 'Grid', icon: Grid, description: 'Coordinate grid', insert: `\\begin{tikzpicture}\n  \\draw[step=0.5cm, gray, very thin] (-1,-1) grid (1,1);\n  \\draw[->] (-1.2,0) -- (1.2,0) node[right] {$x$};\n  \\draw[->] (0,-1.2) -- (0,1.2) node[above] {$y$};\n\\end{tikzpicture}` },
    { label: 'Arc', icon: CornerUpRight, description: 'Curved path', insert: `\\begin{tikzpicture}\n  \\draw[thick] (0,0) arc (0:90:1.5cm);\n  \\draw[dashed] (0,0) -- (1.5,0);\n  \\draw[dashed] (0,0) -- (0,1.5);\n\\end{tikzpicture}` },
    { label: 'Node', icon: Type, description: 'Text label', insert: `\\begin{tikzpicture}\n  \\node[draw] (A) at (0,0) {Hello};\n  \\node[draw, circle] (B) at (2,0) {World};\n\\end{tikzpicture}` },
    { label: 'Coords', icon: Crosshair, description: 'Named coordinates', insert: `\\begin{tikzpicture}\n  \\coordinate (A) at (0,0);\n  \\coordinate (B) at (2,2);\n  \\draw[->] (A) -- (B);\n  \\fill (A) circle (2pt) node[below] {A};\n  \\fill (B) circle (2pt) node[above] {B};\n\\end{tikzpicture}` },
    { label: 'Style', icon: Palette, description: 'Custom styles', insert: `\\begin{tikzpicture}[mybox/.style={draw, fill=yellow!20, thick, rounded corners}]\n  \\node[mybox] {Styled Node};\n\\end{tikzpicture}` },
    { label: 'Arrow', icon: ArrowRight, description: 'Arrow tips', insert: `\\begin{tikzpicture}[>=Stealth]\n  \\draw[->] (0,0) -- (2,0);\n  \\draw[<->] (0,-0.5) -- (2,-0.5);\n  \\draw[|->] (0,-1) -- (2,-1);\n\\end{tikzpicture}` },
    { label: 'Loop', icon: Repeat, description: 'Foreach loop', insert: `\\begin{tikzpicture}\n  \\foreach \\x in {0,1,2,3}\n    \\draw[fill=red!\\x0] (\\x,0) circle (0.4);\n\\end{tikzpicture}` },
  ],
  diagrams: [
    { label: 'Flow', icon: Share2, description: 'Flowchart', insert: `${COMMON_PREAMBLE}\n\\begin{tikzpicture}[node distance=1.5cm, >={Stealth[round]}, thick]\n  \\node[draw, rounded corners] (start) {Start};\n  \\node[draw, rectangle, below=of start] (step1) {Step 1};\n  \\node[draw, diamond, aspect=2, below=of step1] (choice) {?};\n  \\draw[->] (start) -- (step1);\n  \\draw[->] (step1) -- (choice);\n\\end{tikzpicture}` },
    { label: 'Tree', icon: Network, description: 'Hierarchy tree', insert: `${COMMON_PREAMBLE}\n\\begin{tikzpicture}[level distance=1.5cm, sibling distance=1.5cm]\n  \\node {Root} child { node {L} } child { node {R} child { node {R1} } child { node {R2} } };\n\\end{tikzpicture}` },
    { label: 'Table', icon: Table, description: 'Matrix Table', insert: `\\usetikzlibrary{matrix}\n\\begin{tikzpicture}\n  \\matrix [matrix of nodes, nodes={draw, minimum height=0.8cm, minimum width=1.5cm, anchor=center}, column sep=-\\pgflinewidth, row sep=-\\pgflinewidth, row 1/.style={nodes={fill=gray!20, font=\\bfseries}}] {\n    ID & Val \\\\\n    1 & A \\\\\n    2 & B \\\\\n  };\n\\end{tikzpicture}` },
    { label: 'State', icon: GitCommit, description: 'State machine', insert: `\\begin{tikzpicture}[>=Stealth, node distance=2cm, thick]\n  \\node[draw, circle] (A) {A};\n  \\node[draw, circle, right=of A] (B) {B};\n  \\draw[->] (A) to[bend left] (B);\n  \\draw[->] (B) to[bend left] (A);\n  \\draw[->] (A) edge[loop above] (A);\n\\end{tikzpicture}` },
    { label: 'MindMap', icon: GitMerge, description: 'Central concept', insert: `\\begin{tikzpicture}\n  \\node[draw, circle, fill=blue!10, minimum size=1.5cm] (center) {Idea};\n  \\foreach \\angle/\\text in {0/A, 90/B, 180/C, 270/D}\n    \\node[draw, circle, fill=yellow!10] at (\\angle:2cm) {\\text} edge (center);\n\\end{tikzpicture}` },
    { label: 'Time', icon: Clock, description: 'Timeline', insert: `\\begin{tikzpicture}\n  \\draw[->, thick] (0,0) -- (5,0);\n  \\foreach \\x/\\label in {0/Start, 2/Mid, 4/End}\n    \\draw (\\x,0.1) -- (\\x,-0.1) node[below] {\\label};\n\\end{tikzpicture}` },
    { label: 'Venn', icon: Combine, description: 'Venn diagram', insert: `\\begin{tikzpicture}\n  \\draw[fill=red, opacity=0.3] (0,0) circle (1.2);\n  \\draw[fill=blue, opacity=0.3] (1.5,0) circle (1.2);\n  \\node at (0.75,0) {A $\\cap$ B};\n\\end{tikzpicture}` },
    { label: 'UML', icon: Layout, description: 'Class diagram', insert: `\\begin{tikzpicture}\n  \\node[draw, rectangle split, rectangle split parts=2] (class) {\n    \\textbf{User}\n    \\nodepart{second} name: String \\\\ age: Int\n  };\n\\end{tikzpicture}` },
    { label: 'Seq', icon: List, description: 'Sequence diagram', insert: `\\begin{tikzpicture}\n  \\draw (0,0) node[above]{A} -- (0,-3);\n  \\draw (3,0) node[above]{B} -- (3,-3);\n  \\draw[->] (0,-1) -- (3,-1) node[midway, above] {msg 1};\n  \\draw[->, dashed] (3,-2) -- (0,-2) node[midway, above] {reply};\n\\end{tikzpicture}` },
    { label: 'Graph', icon: Share, description: 'Network graph', insert: `\\begin{tikzpicture}[auto, node distance=2cm]\n  \\node[draw, circle] (1) {1};\n  \\node[draw, circle, below right=of 1] (2) {2};\n  \\node[draw, circle, below left=of 1] (3) {3};\n  \\draw (1) -- (2);\n  \\draw (1) -- (3);\n  \\draw (2) -- (3);\n\\end{tikzpicture}` },
  ],
  advanced: [
    { label: 'Plot', icon: Activity, description: 'Function plot', insert: `\\begin{tikzpicture}\n  \\draw[->] (-0.5,0) -- (3,0) node[right] {$x$};\n  \\draw[->] (0,-0.5) -- (0,3) node[above] {$y$};\n  \\draw[domain=0:2, smooth, variable=\\x, blue, thick] plot (\\x, {\\x*\\x});\n\\end{tikzpicture}` },
    { label: 'Circuit', icon: Cpu, description: 'Electrical circuit', insert: `\\begin{tikzpicture}[thick, scale=1.2]\n  \\draw (0,0) -- (0,2) -- (1,2);\n  \\draw (1,2) -- (1.2,2.2) -- (1.4,1.8) -- (1.6,2.2) -- (1.8,1.8) -- (2,2);\n  \\draw (2,2) -- (3,2) -- (3,0) -- (0,0);\n  \\draw (1.5, 2.5) node {$R$};\n  \\draw (-0.2, 0.8) -- (0.2, 0.8);\n  \\draw (-0.2, 1.2) -- (0.2, 1.2);\n  \\node at (-0.5, 1) {$V$};\n\\end{tikzpicture}` },
    { label: '3D Box', icon: Box, description: 'Isometric view', insert: `\\begin{tikzpicture}[x={(-0.5cm,-0.5cm)}, y={(1cm,0cm)}, z={(0cm,1cm)}]\n  \\draw[thick] (0,0,0) -- (2,0,0) -- (2,2,0) -- (0,2,0) -- cycle;\n  \\draw[thick] (0,0,2) -- (2,0,2) -- (2,2,2) -- (0,2,2) -- cycle;\n  \\draw[thick] (0,0,0) -- (0,0,2);\n  \\draw[thick] (2,0,0) -- (2,0,2);\n  \\draw[thick] (2,2,0) -- (2,2,2);\n  \\draw[thick] (0,2,0) -- (0,2,2);\n\\end{tikzpicture}` },
    { label: 'Polar', icon: Aperture, description: 'Polar coordinates', insert: `\\begin{tikzpicture}\n  \\draw[->] (-2,0) -- (2,0);\n  \\draw[->] (0,-2) -- (0,2);\n  \\draw[red, thick, domain=0:360, samples=100] plot ({cos(\\x)*1.5}, {sin(\\x)*1.5});\n\\end{tikzpicture}` },
    { label: 'Physics', icon: Anchor, description: 'Pendulum', insert: `\\begin{tikzpicture}\n  \\fill[pattern=north east lines] (-1,0) rectangle (1,0.2);\n  \\draw[thick] (-1,0) -- (1,0);\n  \\draw (0,0) -- (300:3cm) coordinate (bob);\n  \\fill (bob) circle (0.2);\n  \\draw[dashed] (0,0) -- (0,-3);\n  \\draw (0,-1) arc (270:300:1);\n  \\node at (0.3,-1.2) {$\\theta$};\n\\end{tikzpicture}` },
    { label: 'Optics', icon: Eye, description: 'Lens and rays', insert: `\\begin{tikzpicture}\n  \\draw[thick, <->] (0,-2) -- (0,2);\n  \\draw[dashed] (-3,0) -- (3,0);\n  \\draw[red] (-2,1) -- (0,1) -- (2,-1);\n  \\draw[red] (-2,1) -- (0,0) -- (2,-1);\n  \\draw[fill] (-2,1) circle (1pt) node[above] {Obj};\n  \\draw[fill] (2,-1) circle (1pt) node[below] {Img};\n\\end{tikzpicture}` },
    { label: 'Fractal', icon: Triangle, description: 'Sierpinski triangle', insert: `\\begin{tikzpicture}[scale=3]\n  \\draw (0,0) -- (1,0) -- (0.5,0.866) -- cycle;\n  \\foreach \\i in {0,1,2} {\n    \\begin{scope}[shift={(0,0)}, scale=0.5]\n       \\draw[fill=white] (0.5,0) -- (0.75,0.433) -- (0.25,0.433) -- cycle;\n    \\end{scope}\n  }\n\\end{tikzpicture}` },
    { label: 'Bar', icon: BarChart, description: 'Bar chart', insert: `\\begin{tikzpicture}\n  \\draw (0,0) -- (4,0);\n  \\draw (0,0) -- (0,3);\n  \\foreach \\x/\\h in {0.5/1, 1.5/2.5, 2.5/1.5, 3.5/0.5}\n    \\draw[fill=blue] (\\x-0.25,0) rectangle (\\x+0.25,\\h);\n\\end{tikzpicture}` },
    { label: 'Pie', icon: PieChart, description: 'Pie chart', insert: `\\begin{tikzpicture}\n  \\draw[fill=red!30] (0,0) -- (0:1.5) arc (0:120:1.5) -- cycle;\n  \\draw[fill=green!30] (0,0) -- (120:1.5) arc (120:200:1.5) -- cycle;\n  \\draw[fill=blue!30] (0,0) -- (200:1.5) arc (200:360:1.5) -- cycle;\n\\end{tikzpicture}` },
    { label: 'Orbit', icon: Orbit, description: 'Solar system', insert: `\\begin{tikzpicture}\n  \\draw[fill=yellow] (0,0) circle (0.5);\n  \\draw[dashed] (0,0) circle (1.5);\n  \\draw[dashed] (0,0) circle (2.5);\n  \\fill[blue] (45:1.5) circle (0.1) node[right] {Earth};\n  \\fill[red] (120:2.5) circle (0.15) node[above] {Mars};\n\\end{tikzpicture}` },
  ]
};

// --- HELPERS ---
let tikzLoadingPromise: Promise<void> | null = null;

const loadTikZJax = () => {
  if (typeof window === 'undefined') return Promise.resolve();
  if (tikzLoadingPromise) return tikzLoadingPromise;

  tikzLoadingPromise = new Promise<void>((resolve, reject) => {
    if (document.querySelector('script[src*="tikzjax"]')) {
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
    script.onload = () => setTimeout(() => resolve(), 500);
    script.onerror = (e) => {
      tikzLoadingPromise = null;
      reject(new Error('Failed to load TikZJax'));
    };
    document.head.appendChild(script);
  });
  return tikzLoadingPromise;
};

const highlightLaTeX = (code: string, theme: EditorTheme) => {
  if (!code) return '';
  
  const colors = theme === 'dark' ? {
    comment: 'text-gray-500 italic',
    structure: 'text-purple-400 font-bold',
    command: 'text-blue-400',
    primary: 'text-emerald-400 font-bold',
    property: 'text-sky-300',
    shape: 'text-amber-300',
    color: 'text-pink-400',
    number: 'text-orange-300',
    bracket: 'text-yellow-500',
    paren: 'text-yellow-300',
    operator: 'text-gray-400', 
    text: 'text-gray-300'
  } : {
    comment: 'text-gray-500 italic',
    structure: 'text-purple-700 font-bold',
    command: 'text-blue-700',
    primary: 'text-emerald-700 font-bold',
    property: 'text-sky-700',
    shape: 'text-amber-700',
    color: 'text-pink-600',
    number: 'text-orange-600',
    bracket: 'text-yellow-600',
    paren: 'text-yellow-600',
    operator: 'text-gray-500',
    text: 'text-gray-900'
  };

  const regex = /(%.*$)|(\\(?:usetikzlibrary|usepackage|documentclass|begin|end|newcommand|def|tikzset)\b)|(\\\[a-zA-Z@]+)|(\b(?:draw|fill|filldraw|path|node|coordinate|clip|scope|shade|shadedraw|matrix|grid|graph|plot|foreach)\b)|(\b(?:style|nodes|row|column|sep|minimum|height|width|anchor|align|inner|outer|scale|shift|rotate|x|y|z|opacity|line|thick|thin|ultra|very|semithick|dashed|dotted|solid|double|rounded|corners|sharp|arrow|arrows|shapes|decoration|postaction|preaction|pattern|samples|domain|variable|at|to|cycle|in|of|font|text)\b)|(\b(?:circle|rectangle|ellipse|arc|edge|child|level|sibling|sin|cos|tan|exp|ln|north|south|east|west|center|mid|base|left|right|above|below)\b)|(\b(?:red|green|blue|cyan|magenta|yellow|black|white|gray|orange|purple|brown|teal|violet|pink)\b)|(\d+(?:\.\d+)?)|([\{\}\[\]])|([\(\)])|(--|->|<-|\|-|-|\||\+|!|=|:|\.\.)|([^%\\\{\}\[\]\(\)\d\s-!]+)/gm;

  return code.replace(regex, (match, comment, structure, command, primary, property, shape, color, number, bracket, paren, operator, text) => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    if (comment) return `<span class="${colors.comment}">${esc(match)}</span>`;
    if (structure) return `<span class="${colors.structure}">${esc(match)}</span>`;
    if (command) return `<span class="${colors.command}">${esc(match)}</span>`;
    if (primary) return `<span class="${colors.primary}">${esc(match)}</span>`;
    if (property) return `<span class="${colors.property}">${esc(match)}</span>`;
    if (shape) return `<span class="${colors.shape}">${esc(match)}</span>`;
    if (color) return `<span class="${colors.color}">${esc(match)}</span>`;
    if (number) return `<span class="${colors.number}">${esc(match)}</span>`;
    if (bracket) return `<span class="${colors.bracket}">${esc(match)}</span>`;
    if (paren) return `<span class="${colors.paren}">${esc(match)}</span>`;
    if (operator) return `<span class="${colors.operator}">${esc(match)}</span>`;
    if (text) return `<span class="${colors.text}">${esc(match)}</span>`;
    return esc(match);
  });
};

// --- CODE EDITOR COMPONENT ---
const SHARED_STYLES: React.CSSProperties = {
  fontFamily: 'Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: '13px',
  lineHeight: '20px',
  letterSpacing: '0px',
  padding: '16px',
  margin: 0,
  border: 'none',
  outline: 'none',
  whiteSpace: 'pre', 
  overflow: 'auto',
  tabSize: 2,
  backgroundColor: 'transparent',
};

const CodeEditor = React.forwardRef<HTMLTextAreaElement, { value: string, onChange: (val: string) => void, onKeyDown?: React.KeyboardEventHandler, theme: EditorTheme }>(({ value, onChange, onKeyDown, theme }, ref) => {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (typeof ref === 'function') ref(internalRef.current);
    else if (ref) ref.current = internalRef.current;
  }, [ref]);

  const handleScroll = () => {
    if (internalRef.current && preRef.current && gutterRef.current) {
      const { scrollTop, scrollLeft } = internalRef.current;
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
      gutterRef.current.scrollTop = scrollTop;
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
      <style>{`
        .math-editor-textarea::selection { background-color: rgba(59, 130, 246, 0.3) !important; }
      `}</style>
      
      <div 
        ref={gutterRef} 
        className={`flex-shrink-0 w-10 ${gutterBgClass} ${gutterTextClass} text-right pr-2 select-none overflow-hidden border-r`} 
        style={{ 
          paddingTop: SHARED_STYLES.padding, 
          paddingBottom: SHARED_STYLES.padding,
          fontFamily: SHARED_STYLES.fontFamily,
          fontSize: SHARED_STYLES.fontSize,
          lineHeight: SHARED_STYLES.lineHeight
        }}
      >
        {lines.map(line => <div key={line}>{line}</div>)}
        <div className="h-full"></div>
      </div>

      <div className="relative flex-1 h-full min-w-0">
        <pre 
          ref={preRef} 
          aria-hidden="true" 
          className="absolute inset-0 pointer-events-none" 
          style={{ 
            ...SHARED_STYLES, 
            color: 'transparent',
            zIndex: 0
          }} 
          dangerouslySetInnerHTML={{ __html: highlightLaTeX(value, theme) + '<br>' }} 
        />
        
        <textarea
          ref={internalRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={handleScroll}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          spellCheck={false}
          className={`math-editor-textarea absolute inset-0 w-full h-full bg-transparent text-transparent ${caretClass} resize-none`}
          style={{ 
            ...SHARED_STYLES, 
            color: 'transparent',
            zIndex: 10
          }}
          placeholder="Type LaTeX..."
        />
      </div>
    </div>
  );
});
CodeEditor.displayName = 'CodeEditor';

const RibbonButton = ({ item, onClick, theme, mode }: { item: SymbolItem; onClick: () => void; theme: EditorTheme; mode: BlockMode }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === 'math' && ref.current && item.display) {
      try {
        katex.render(item.display, ref.current, { throwOnError: false, displayMode: false });
      } catch (e) {
        ref.current.innerText = item.label;
      }
    }
  }, [item, mode]);

  const btnClass = theme === 'dark' 
    ? 'bg-[#252526] border-[#333] hover:bg-[#2d2d2d] text-gray-300 hover:text-white' 
    : 'bg-white border-gray-200 hover:bg-blue-50 text-gray-700 hover:text-blue-700';

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      className={`flex-shrink-0 flex items-center gap-2 px-2 py-1.5 border rounded-md transition-all duration-200 group ${btnClass}`}
      type="button"
      title={item.description || item.label}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {mode === 'math' ? (
        <div ref={ref} className="pointer-events-none transform scale-90" />
      ) : (
        item.icon && <item.icon size={14} className="pointer-events-none" />
      )}
      <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
    </button>
  );
};

const MathEditorPopover = ({ 
  code, setCode, onSave, onRemove, onClose, initialMode, 
  currentFontSize, onFontSizeChange, anchorRef, resizeVersion 
}: { 
  code: string; setCode: (t: string) => void; onSave: () => void; onRemove: () => void; onClose: () => void; initialMode: BlockMode;
  currentFontSize: number; onFontSizeChange: (size: number) => void; anchorRef: React.RefObject<HTMLDivElement | null>;
  resizeVersion: number;
}) => {
  const [mode, setMode] = useState<BlockMode>(initialMode);
  const [activeCategory, setActiveCategory] = useState<Category>(mode === 'math' ? 'basic' : 'essentials');
  const [theme, setTheme] = useState<EditorTheme>('light');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (anchorRef.current) {
        const scrollParent = anchorRef.current.closest('.overflow-y-auto') as HTMLElement;
        setPortalContainer(scrollParent || document.body);
    }
  }, [anchorRef]);

  // Simplified Positioning Logic
  useLayoutEffect(() => {
    const updatePosition = () => {
      if (anchorRef.current && popoverRef.current && portalContainer) {
        const anchorRect = anchorRef.current.getBoundingClientRect();
        const containerRect = portalContainer.getBoundingClientRect();
        const popoverRect = popoverRef.current.getBoundingClientRect();
        
        // Center horizontally relative to anchor
        let left = anchorRect.left - containerRect.left + (anchorRect.width / 2) - (popoverRect.width / 2);
        
        // Clamp to container bounds
        const containerWidth = portalContainer.clientWidth;
        const padding = 20;
        if (left < padding) left = padding;
        if (left + popoverRect.width > containerWidth - padding) {
          left = containerWidth - popoverRect.width - padding;
        }

        // Position strictly below the anchor
        let top = anchorRect.bottom - containerRect.top + portalContainer.scrollTop + 10;

        setPosition({ top, left });
      }
    };
    
    updatePosition();
    
    // Only update on scroll/resize, but use requestAnimationFrame to throttle if needed
    // For now, standard listeners are fine as long as logic is simple
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [anchorRef, mounted, resizeVersion, portalContainer]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        popoverRef.current && 
        !popoverRef.current.contains(target) &&
        !target.closest('.math-toolbar') &&
        !target.closest('.math-resize-overlay')
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useLayoutEffect(() => {
    if (textareaRef.current) textareaRef.current.focus();
  }, []);

  useEffect(() => {
    setActiveCategory(mode === 'math' ? 'basic' : 'essentials');
  }, [mode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation(); 
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(); }
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  const insertSymbol = (item: SymbolItem) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    let insertText = item.insert;
    if (mode === 'tikz' && (code.trim() === '' || code.includes('\\begin{tikzpicture}'))) {
       setCode(insertText);
       setTimeout(() => textarea.focus(), 0);
       return;
    }

    const newCode = code.substring(0, start) + insertText + code.substring(end);
    setCode(newCode);
    const newCursorPos = start + insertText.length + (item.offset || 0);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const modalBgClass = theme === 'dark' ? 'bg-[#1e1e1e] border-[#333]' : 'bg-white border-gray-200';
  const headerBgClass = theme === 'dark' ? 'bg-[#252526] border-[#333]' : 'bg-white border-gray-100';
  const paletteBgClass = theme === 'dark' ? 'bg-[#1e1e1e] border-[#333]' : 'bg-gray-50/50 border-gray-100';
  const footerBgClass = theme === 'dark' ? 'bg-[#252526] border-[#333]' : 'bg-gray-50 border-gray-200';
  const subTextClass = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const buttonHoverClass = theme === 'dark' ? 'hover:bg-[#333]' : 'hover:bg-gray-50';

  const categories = mode === 'math' ? MATH_CATEGORIES : TIKZ_CATEGORIES;
  const items = mode === 'math' ? MATH_SYMBOLS[activeCategory] : TIKZ_TEMPLATES[activeCategory];

  if (!mounted || !portalContainer) return null;

  return createPortal(
    <div 
      ref={popoverRef}
      className="absolute z-[9999]"
      style={{ 
        top: position.top, 
        left: position.left,
        width: '800px', 
        maxWidth: '90vw', 
        cursor: 'default' 
      }}
      onMouseDown={(e) => e.stopPropagation()} 
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`rounded-xl shadow-2xl border overflow-hidden flex flex-col ${modalBgClass}`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between px-4 pt-3 pb-2 border-b ${headerBgClass}`}>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100/10 p-0.5 rounded-lg border border-gray-200/20">
              <button onClick={() => setMode('math')} className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${mode === 'math' ? 'bg-blue-600 text-white shadow-sm' : `${subTextClass} hover:text-gray-300`}`}>
                <Calculator size={12} /> Equation
              </button>
              <button onClick={() => setMode('tikz')} className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${mode === 'tikz' ? 'bg-blue-600 text-white shadow-sm' : `${subTextClass} hover:text-gray-300`}`}>
                <PenTool size={12} /> Diagram
              </button>
            </div>
            <div className={`h-4 w-px ${theme === 'dark' ? 'bg-[#444]' : 'bg-gray-200'}`}></div>
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`flex items-center gap-2 px-2 py-1 text-xs font-semibold rounded-lg transition-all ${activeCategory === cat.id ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' : `${subTextClass} ${buttonHoverClass}`}`}>
                    <Icon size={14} /> {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200/20">
             {/* Font Size Controls */}
             {mode === 'math' && (
               <div className="flex items-center gap-1 mr-2">
                 <button onClick={() => onFontSizeChange(currentFontSize - 2)} className={`p-1.5 ${subTextClass} ${buttonHoverClass} rounded-lg transition-colors`} title="Decrease Font Size">
                   <Minus size={14} />
                 </button>
                 <span className={`text-[10px] font-mono w-6 text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{Math.round(currentFontSize)}</span>
                 <button onClick={() => onFontSizeChange(currentFontSize + 2)} className={`p-1.5 ${subTextClass} ${buttonHoverClass} rounded-lg transition-colors`} title="Increase Font Size">
                   <Plus size={14} />
                 </button>
               </div>
             )}
             
             <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className={`p-1.5 ${subTextClass} ${buttonHoverClass} rounded-lg transition-colors`}>{theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}</button>
             <button onClick={onRemove} className={`p-1.5 ${subTextClass} hover:text-red-600 ${theme === 'dark' ? 'hover:bg-red-900/20' : 'hover:bg-red-50'} rounded-lg transition-colors`}><Trash2 size={14} /></button>
          </div>
        </div>

        {/* Palette (Horizontal Ribbon) */}
        <div className={`p-2 border-b ${paletteBgClass} overflow-x-auto no-scrollbar`}>
          <div className="flex gap-2 min-w-max">
            {items?.map((item, idx) => (
              <RibbonButton key={idx} item={item} onClick={() => insertSymbol(item)} theme={theme} mode={mode} />
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className={`h-48 ${theme === 'dark' ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
          <CodeEditor ref={textareaRef} value={code} onChange={setCode} onKeyDown={handleKeyDown} theme={theme} />
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-4 py-3 border-t ${footerBgClass}`}>
          <div className="flex flex-col gap-1">
            <div className={`text-[10px] ${subTextClass} flex items-center gap-1.5`}><span className={`font-mono border px-1.5 py-0.5 rounded text-[10px] shadow-sm min-w-[32px] text-center ${theme === 'dark' ? 'bg-[#333] border-[#444] text-gray-300' : 'bg-white border-gray-200 text-gray-500'}`}>Enter</span><span>to save</span></div>
          </div>
          <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all hover:shadow hover:-translate-y-0.5 active:translate-y-0"><Check size={14} /> Done</button>
        </div>
      </div>
    </div>,
    portalContainer
  );
};

// --- ISOLATED TIKZ RENDERER ---
const TikZRenderer = ({ code, isLoaded, onSuccess }: { code: string, isLoaded: boolean, onSuccess?: () => void }) => {
  const outputRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(true);

  useEffect(() => {
    if (!isLoaded || !outputRef.current) return;
    
    // Reset state
    setError(null);
    setIsCompiling(true);
    outputRef.current.innerHTML = '';

    // Safety timeout
    const timeoutId = setTimeout(() => {
      if (isCompiling) {
        setIsCompiling(false);
        setError("Rendering timed out. Check syntax.");
      }
    }, 5000);

    try {
      const script = document.createElement('script');
      script.type = 'text/tikz';
      script.textContent = code;
      outputRef.current.appendChild(script);

      // TikZJax replaces the script with an SVG. We watch for that.
      const observer = new MutationObserver((mutations) => {
        const svg = outputRef.current?.querySelector('svg');
        if (svg) {
          clearTimeout(timeoutId);
          
          // --- CLONE AND REPLACE STRATEGY ---
          // This isolates the SVG from TikZJax's internal state and allows us to style it freely.
          // CRITICAL FIX: Ensure viewBox is present and width/height are 100% to scale with container
          
          const width = svg.getAttribute('width');
          const height = svg.getAttribute('height');
          
          if (!svg.hasAttribute('viewBox') && width && height) {
             // Convert pt to numbers (approximate) or just use the string if it's unitless
             const w = parseFloat(width);
             const h = parseFloat(height);
             svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
          }
          
          svg.setAttribute('width', '100%');
          svg.setAttribute('height', '100%');
          svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          svg.style.display = 'block'; // Remove inline spacing
          
          const svgClone = svg.cloneNode(true) as SVGElement;
          
          // Clear the container (removes original SVG and script)
          outputRef.current!.innerHTML = '';
          outputRef.current!.appendChild(svgClone);

          setIsCompiling(false);
          observer.disconnect();
          
          if (onSuccess) onSuccess();
        }
      });
      
      observer.observe(outputRef.current, { childList: true, subtree: true });
      
      // Trigger TikZJax processing
      if (window.dispatchEvent) {
         window.dispatchEvent(new Event('load'));
      }

    } catch (err) {
      clearTimeout(timeoutId);
      setIsCompiling(false);
      setError("Internal rendering error.");
      console.error(err);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [code, isLoaded, onSuccess]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[100px] bg-red-50 text-red-600 text-xs p-4 rounded-lg border border-red-100">
        <AlertTriangle size={16} className="mr-2 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full"> {/* Removed min-h/min-w to allow full resizing */}
      {isCompiling && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm z-20 rounded-lg border border-gray-100">
          <div className="relative mb-3">
            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <PenTool size={14} className="text-blue-600 opacity-50" />
            </div>
          </div>
          <span className="text-xs font-medium text-gray-500 animate-pulse">Rendering Diagram...</span>
        </div>
      )}
      <div ref={outputRef} className="w-full h-full flex items-center justify-center" />
    </div>
  );
};

// --- ISOLATED KATEX RENDERER ---
const KaTeXRenderer = ({ code, fontSize }: { code: string, fontSize: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    setError(null);
    try {
      katex.render(code, containerRef.current, {
        throwOnError: true, // We catch it below
        displayMode: true,
        strict: false,
        trust: true
      });
    } catch (err: any) {
      // Friendly error UI instead of crash
      setError(err.message || "Invalid LaTeX syntax");
      containerRef.current.innerHTML = ''; 
    }
  }, [code]);

  if (error) {
    return (
      <div className="text-center py-2">
        <span className="inline-flex items-center px-2 py-1 rounded bg-red-50 text-red-600 text-xs border border-red-100">
          <AlertCircle size={12} className="mr-1" /> Invalid Equation
        </span>
        <div className="text-[10px] text-gray-400 mt-1 font-mono truncate max-w-xs mx-auto">{code}</div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      style={{ fontSize: `${fontSize}px` }}
      className="w-full flex justify-center items-center py-2"
    />
  );
};

// --- MAIN COMPONENT ---
export const MathBlock: React.FC<MathBlockProps> = ({ initialTex, fontSize, onUpdate, onRemove }) => {
  const [isEditing, setIsEditing] = useState(initialTex === '');
  const [code, setCode] = useState(initialTex);
  const [isTikZLoaded, setIsTikZLoaded] = useState(false);
  
  // Local state for font size
  const [currentFontSize, setCurrentFontSize] = useState(fontSize || 24); 
  const [resizeVersion, setResizeVersion] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load TikZ if needed (global check)
  useEffect(() => {
    loadTikZJax().then(() => setIsTikZLoaded(true)).catch(console.error);
  }, []);

  // --- PARSE MIXED CONTENT ---
  // Splits code into segments: Text/Math vs TikZ
  const segments = useMemo(() => {
    if (!code) return [];
    // Regex to find TikZ environments
    // FIX: Use [\s\S] instead of . with /s flag for compatibility
    const regex = /(\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\})/g;
    const parts = code.split(regex);
    return parts.map(part => {
      if (part.match(regex)) return { type: 'tikz', content: part };
      if (part.trim() === '') return null;
      return { type: 'math', content: part };
    }).filter(Boolean) as { type: 'tikz' | 'math', content: string }[];
  }, [code]);

  // Listen for external edit events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleEdit = () => setIsEditing(true);
    const handleDelete = () => onRemove();
    const handleUpdateFontSize = (e: CustomEvent<{ fontSize: number }>) => {
        setCurrentFontSize(e.detail.fontSize);
    };

    container.addEventListener('editMath', handleEdit);
    container.addEventListener('deleteMath', handleDelete);
    container.addEventListener('updateMath', handleUpdateFontSize as EventListener);

    const resizeObserver = new ResizeObserver(() => setResizeVersion(v => v + 1));
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('editMath', handleEdit);
      container.removeEventListener('deleteMath', handleDelete);
      container.removeEventListener('updateMath', handleUpdateFontSize as EventListener);
      resizeObserver.disconnect();
    };
  }, [onRemove]);

  // Sync font size to DOM so resizer can read it
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.dataset.fontSize = String(currentFontSize);
    }
  }, [currentFontSize]);

  // --- AUTO-RESIZE WRAPPER ON CONTENT CHANGE ---
  // This ensures the parent wrapper expands if the content (e.g., TikZ SVG) grows.
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const wrapper = containerRef.current?.closest('.math-wrapper') as HTMLElement;
        if (wrapper) {
          // If content is taller than wrapper, expand wrapper
          if (entry.contentRect.height > wrapper.clientHeight) {
             wrapper.style.height = 'auto';
          }
          // If content is wider than wrapper, expand wrapper (up to max)
          if (entry.contentRect.width > wrapper.clientWidth) {
             wrapper.style.width = `${Math.min(entry.contentRect.width, 800)}px`;
          }
        }
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleSave = () => {
    if (code.trim() === '') onRemove();
    else {
      onUpdate(code);
      setIsEditing(false);
    }
  };

  const handleFontSizeChange = (newSize: number) => {
    const size = Math.max(8, Math.min(72, newSize));
    setCurrentFontSize(size);
    if (containerRef.current) {
      containerRef.current.dataset.fontSize = String(size);
    }
  };

  // Determine initial mode for the editor popover
  const initialMode: BlockMode = useMemo(() => {
    return (code.includes('\\begin{tikzpicture') || code.includes('\\tikz')) ? 'tikz' : 'math';
  }, [code]);

  // --- WRAPPER RESIZING LOGIC ---
  const handleTikZSuccess = useCallback(() => {
    // Only resize if it's a pure TikZ block (single segment)
    if (segments.length === 1 && segments[0].type === 'tikz') {
      const wrapper = containerRef.current?.closest('.math-wrapper') as HTMLElement;
      if (wrapper) {
        // Check if it already has a custom size, if not, apply default
        if (!wrapper.style.width || wrapper.style.width === 'auto') {
           wrapper.style.width = '300px';
           wrapper.style.height = '200px';
           wrapper.style.margin = '12px auto';
           wrapper.dataset.float = 'center';
           wrapper.style.display = 'block';
        }
      }
    }
  }, [segments]);

  // --- FORCE DEFAULT DIMENSIONS & ALIGNMENT FOR TIKZ ---
  useEffect(() => {
    const wrapper = containerRef.current?.closest('.math-wrapper') as HTMLElement;
    if (wrapper) {
      // 1. Enforce Center Alignment Default
      // We check if float is missing OR if it is set to center, then force the CSS
      if (!wrapper.dataset.float || wrapper.dataset.float === 'center') {
        wrapper.dataset.float = 'center';
        wrapper.style.float = 'none';       // Critical: Explicitly remove float
        wrapper.style.margin = '12px auto'; // Critical: Force auto margins
        wrapper.style.display = 'block';    // Critical: Ensure block display
      }

      // 2. Enforce Default Dimensions for TikZ (only if it has no size yet)
      // This applies specifically when it's a pure drawing to give it a good starting size
      if (segments.length === 1 && segments[0].type === 'tikz') {
        if (!wrapper.style.width || wrapper.style.width === 'auto') {
          wrapper.style.width = '300px';
          wrapper.style.height = '200px';
        }
      }
    }
  }, [segments]);

  return (
    <div ref={containerRef} className="relative inline-block w-full h-full group math-block-container">
      
      {/* RENDER VIEW */}
      <div
        className={`math-rendered transition-all rounded-lg cursor-pointer flex flex-col items-center justify-center w-full h-full ${isEditing ? '' : 'hover:bg-blue-50/50 hover:ring-2 hover:ring-blue-100'}`}
        title="Click to edit"
        onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
        style={{ minHeight: '3rem' }}
      >
        {segments.length === 0 ? (
           <span className="text-gray-300 italic select-none">Empty Equation Block</span>
        ) : (
           segments.map((seg, idx) => (
             <React.Fragment key={idx}>
               {seg.type === 'tikz' ? (
                 <div 
                   className="w-full flex-1" 
                   style={{ 
                     // Use flex-basis to set a default height for mixed content,
                     // but allow it to shrink if the container is resized smaller.
                     flex: segments.length > 1 ? '1 1 200px' : '1 1 0%',
                     minHeight: '0' 
                   }}
                 >
                   <TikZRenderer code={seg.content} isLoaded={isTikZLoaded} onSuccess={handleTikZSuccess} />
                 </div>
               ) : (
                 <KaTeXRenderer code={seg.content} fontSize={currentFontSize} />
               )}
             </React.Fragment>
           ))
        )}
      </div>

      {/* EDITOR POPOVER */}
      {isEditing && (
        <MathEditorPopover 
          code={code}
          setCode={setCode}
          onSave={handleSave}
          onRemove={onRemove}
          onClose={() => setIsEditing(false)}
          initialMode={initialMode}
          currentFontSize={currentFontSize}
          onFontSizeChange={handleFontSizeChange}
          anchorRef={containerRef}
          resizeVersion={resizeVersion}
        />
      )}
    </div>
  );
};