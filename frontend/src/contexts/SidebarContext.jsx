import { createContext, useContext, useState } from 'react';

const SidebarContext = createContext();

export const useSidebarContext = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    return { contextContent: null, setContextContent: () => {} };
  }
  return context;
};

export const SidebarProvider = ({ children }) => {
  const [contextContent, setContextContent] = useState(null);

  return (
    <SidebarContext.Provider value={{ contextContent, setContextContent }}>
      {children}
    </SidebarContext.Provider>
  );
};
