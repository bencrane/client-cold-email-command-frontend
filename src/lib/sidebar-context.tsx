"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface SidebarContextValue {
  content: ReactNode | null;
  setContent: (content: ReactNode | null) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode | null>(null);

  return (
    <SidebarContext.Provider value={{ content, setContent }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used within SidebarProvider");
  }
  return context;
}

/**
 * Hook for pages to inject content into the sidebar.
 * Content is automatically cleared when the component unmounts.
 */
export function useSidebarContent(content: ReactNode) {
  const { setContent } = useSidebarContext();

  // Set content on mount, clear on unmount
  useState(() => {
    setContent(content);
  });

  // Update when content changes
  const updateContent = useCallback(
    (newContent: ReactNode) => {
      setContent(newContent);
    },
    [setContent]
  );

  return { updateContent };
}
