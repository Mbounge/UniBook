//src/components/editor/templates/CalloutTemplates.tsx

import React from 'react';
import { Lightbulb, AlertTriangle, BookOpen, User } from 'lucide-react';

export const CalloutTemplates = [
  {
    name: 'Key Takeaway',
    description: 'A blue box to highlight essential summary points.',
    icon: Lightbulb,
    html: `
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 16px 0; border-radius: 8px;">
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 1.25rem; font-weight: bold; color: #1e3a8a;">Key Takeaway</h3>
        <p style="margin: 0; color: #1e40af;">Type your key summary points here. This is a great way to conclude a section.</p>
      </div>
      <p><br></p>
    `,
  },
  {
    name: 'Warning',
    description: 'A red box for critical warnings or common misconceptions.',
    icon: AlertTriangle,
    html: `
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 16px 0; border-radius: 8px;">
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 1.25rem; font-weight: bold; color: #991b1b;">Warning</h3>
        <p style="margin: 0; color: #b91c1c;">Use this space to alert students to important information or potential pitfalls.</p>
      </div>
      <p><br></p>
    `,
  },
  {
    name: 'Definition',
    description: 'A simple, clean box for defining key terms.',
    icon: BookOpen,
    html: `
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; margin: 16px 0; border-radius: 8px;">
        <h4 style="margin-top: 0; margin-bottom: 8px; font-size: 1.1rem; font-weight: bold; color: #111827;">Term Name</h4>
        <p style="margin: 0; color: #374151;">Write the definition of the term here.</p>
      </div>
      <p><br></p>
    `,
  },
  {
    name: 'Author\'s Note',
    description: 'A personal, italicized note from the author.',
    icon: User,
    html: `
      <div style="background-color: #fafafa; border-left: 4px solid #a3a3a3; padding: 20px; margin: 16px 0; border-radius: 8px; font-style: italic; color: #525252;">
        <p style="margin: 0;">Type your personal note, anecdote, or additional context here.</p>
      </div>
      <p><br></p>
    `,
  },
];