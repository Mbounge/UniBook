'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the shape of the data we need to persist
interface ContentHubState {
  searchQuery: string;
  activeFilter: string;
  viewStack: string[];
  selectedBook: any | null; // Using 'any' for BookOverview for simplicity here
  filteredBookTitle: string | null;
  selectedItems: any[]; // Using 'any' for SearchResultItem
  isStagingModalOpen: boolean;
}

// Define what the context will provide: the state and its setters
interface ContentHubContextType {
  hubState: ContentHubState;
  setHubState: React.Dispatch<React.SetStateAction<ContentHubState>>;
}

const ContentHubContext = createContext<ContentHubContextType | undefined>(undefined);

// The Provider component will wrap our editor and hold the state
export const ContentHubProvider = ({ children }: { children: ReactNode }) => {
  const [hubState, setHubState] = useState<ContentHubState>({
    searchQuery: "",
    activeFilter: "oer",
    viewStack: ["browse"],
    selectedBook: null,
    filteredBookTitle: null,
    selectedItems: [],
    isStagingModalOpen: false,
  });

  return (
    <ContentHubContext.Provider value={{ hubState, setHubState }}>
      {children}
    </ContentHubContext.Provider>
  );
};

// The custom hook makes it easy for components to access the state
export const useContentHub = () => {
  const context = useContext(ContentHubContext);
  if (context === undefined) {
    throw new Error('useContentHub must be used within a ContentHubProvider');
  }
  return context;
};