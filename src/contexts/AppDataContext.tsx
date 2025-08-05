import React, { createContext, useContext, useState, useCallback } from 'react';

interface DataContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
  formStates: { [key: string]: any };
  saveFormState: (key: string, data: any) => void;
  getFormState: (key: string) => any;
  clientSettings: any;
  setClientSettings: (settings: any) => void;
}

const AppDataContext = createContext<DataContextType | null>(null);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [formStates, setFormStates] = useState<{ [key: string]: any }>({});
  const [clientSettings, setClientSettings] = useState<any>(null);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const saveFormState = useCallback((key: string, data: any) => {
    setFormStates(prev => ({ ...prev, [key]: data }));
  }, []);

  const getFormState = useCallback((key: string) => {
    return formStates[key] || {};
  }, [formStates]);

  return (
    <AppDataContext.Provider value={{
      refreshTrigger,
      triggerRefresh,
      formStates,
      saveFormState,
      getFormState,
      clientSettings,
      setClientSettings
    }}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used within AppDataProvider');
  return context;
};