import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AppContextType {
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  return (
    <AppContext.Provider value={{
      selectedProjectId,
      setSelectedProjectId
    }}>
      {children}
    </AppContext.Provider>
  );
};