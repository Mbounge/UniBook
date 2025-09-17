//src/components/editor/templates/LearningObjectives.tsx

import React from 'react';

// This object defines a static, reusable template.
// The HTML uses inline styles for portability, ensuring it looks correct when inserted.
export const LearningObjectivesTemplate = {
  name: 'Learning Objectives',
  description: 'A styled box to list the key goals of a chapter or section.',
  icon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  html: `
    <div style="background-color: #f3f4f6; border-left: 4px solid #3b82f6; padding: 20px; margin: 16px 0; border-radius: 8px;">
      <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 1.25rem; font-weight: bold; color: #1f2937;">Learning Objectives</h3>
      <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
        <li>Describe the purpose of accounting.</li>
        <li>Identify key roles in the accounting profession.</li>
        <li>Explain the importance of financial reporting.</li>
      </ul>
    </div>
    <p><br></p>
  `,
};