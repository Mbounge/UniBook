'use client';

// --- FIX: Changed to a named import, which is the correct way for Zustand ---
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  typography: {
    heading: string;
    body: string;
  };
}

const defaultTheme: Theme = {
  colors: {
    primary: '#1a1a1a',    // Default text color
    secondary: '#6b7280',  // Muted text color
    accent: '#3b82f6',     // Blue for links/highlights
    background: '#ffffff', // White page background
  },
  typography: {
    heading: 'Georgia',
    body: 'Inter',
  },
};

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: defaultTheme,
      // --- FIX: Added explicit type for the 'theme' parameter ---
      setTheme: (theme: Theme) => set({ theme }),
    }),
    {
      name: 'editor-theme-storage', // name of the item in the storage (must be unique)
    }
  )
);