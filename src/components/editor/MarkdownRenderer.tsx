//src/components/editor/MarkdownRenderer.tsx

import React from 'react';
import { marked } from 'marked';
import { BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css'; // Import KaTeX CSS

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Split the content by LaTeX blocks ($$...$$)
  const parts = content.split(/(\$\$[\s\S]*?\$\$)/g);

  return (
    <div className="prose prose-lg max-w-none">
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          // This is a LaTeX block, render it with KaTeX
          const math = part.substring(2, part.length - 2);
          return <BlockMath key={index} math={math} />;
        } else {
          // This is a regular Markdown part, render it as HTML
          const html = marked.parse(part) as string;
          return <div key={index} dangerouslySetInnerHTML={{ __html: html }} />;
        }
      })}
    </div>
  );
};

export default MarkdownRenderer;