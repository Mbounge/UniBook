//src/app/(app)/edit/page.tsx

import React from 'react';
import { DocumentEditor } from '@/components/editor/DocumentEditor';

export default function EditPage() {
  return (
    <div className="w-full h-full">
      <DocumentEditor />
    </div>
  );
}