import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ModelContextType {
  selectedModelName: string;
  setSelectedModelName: (name: string) => void;
  selectedZohoviewId: string;
  setSelectedZohoviewId: (id: string) => void;
}



const defaultValue: ModelContextType = {
  selectedModelName: '',
  setSelectedModelName: () => {}, // Provide a no-op function as a placeholder
  selectedZohoviewId: '',
  setSelectedZohoviewId: () => {}, // No-op function as a placeholder
};

// Created the context with the default value
const ModelContext = createContext<ModelContextType>(defaultValue);

// Custom hook to use the ModelContext
export const useModel = () => useContext(ModelContext);

// Provider component
interface ModelProviderProps {
  children: ReactNode;
}

export const ModelProvider: React.FC<ModelProviderProps> = ({ children }) => {
  const [selectedModelName, setSelectedModelName] = useState('');
    // State to manage selected Zoho view ID
    const [selectedZohoviewId, setSelectedZohoviewId] = useState('');

  return (
    <ModelContext.Provider value={{ selectedModelName, setSelectedModelName ,selectedZohoviewId, setSelectedZohoviewId}}>
      {children}
    </ModelContext.Provider>
  );
};