//src/app/(app)/edit/page.tsx

'use client';

import React from 'react';
import { PagedEditor } from '@/components/editor/PagedEditor';

export default function EditPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8">
        <PagedEditor />
      </div>
    </div>
  );
}