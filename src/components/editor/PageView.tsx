// src/components/editor/PageView.tsx

"use client";

import React from 'react';
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import { useThemeStore, Theme } from '@/hooks/useTheme';
import { deepmerge } from 'deepmerge-ts';

/**
 * PageView Component
 *
 * This component is now a "dumb" renderer. Its only jobs are:
 * 1. To provide the main `div` container for a page.
 * 2. To apply the correct CSS class (`page-view`) and theme-based styles.
 * 3. To provide a `NodeViewContent` element where Tiptap can render the page's actual content.
 *
 * All complex pagination, overflow detection, and reflow logic has been moved into the
 * dedicated `ReflowPlugin` for a more robust, reliable, and maintainable architecture.
 */
const PageView = (props: NodeViewProps) => {
  const { node } = props;
  const { theme: globalTheme } = useThemeStore();
  const pageThemeOverride = node.attrs.theme || {};
  const finalTheme: Theme = deepmerge(globalTheme, pageThemeOverride);

  const pageStyle = {
    '--color-primary': finalTheme.colors.primary,
    '--color-secondary': finalTheme.colors.secondary,
    '--color-accent': finalTheme.colors.accent,
    '--font-heading': finalTheme.typography.heading,
    '--font-body': finalTheme.typography.body,
    backgroundColor: finalTheme.colors.background,
  } as React.CSSProperties;

  return (
    <NodeViewWrapper 
      className="page-view"
      style={pageStyle}
    >
      <NodeViewContent className="page-content-view" />
    </NodeViewWrapper>
  );
};

export default PageView;