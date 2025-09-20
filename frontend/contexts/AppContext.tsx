import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface AppContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
  lastEventCreated: Date | null;
  setLastEventCreated: (date: Date | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastEventCreated, setLastEventCreated] = useState<Date | null>(null);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => {
      const newValue = prev + 1;
      console.log('🔄 triggerRefresh wywołany! Nowa wartość:', newValue);
      return newValue;
    });
  }, []);

  const value: AppContextType = {
    refreshTrigger,
    triggerRefresh,
    lastEventCreated,
    setLastEventCreated
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};