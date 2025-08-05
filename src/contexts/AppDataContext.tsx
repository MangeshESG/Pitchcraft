import React, { createContext, useContext, useState, useCallback } from 'react';


// Add these interfaces for dashboard data
interface EventItem {
  id: number;
  contactId: number;
  trackingId: string;
  email: string;
  eventType: string;
  timestamp: string;
  clientId: number;
  targetUrl: string | null;
  zohoViewName: string;
  dataFileId: number;
  full_Name: string;
  location: string;
  company: string;
  jobTitle: string;
  linkedin_URL: string;
  website: string;
  userAgent?: string;
  isBot?: boolean;
  ipAddress?: string;
  browser?: string;
}

interface EmailLog {
  id: number;
  contactId: number | null;
  clientId: number;
  dataFileId: number;
  subject: string | null;
  body: string;
  sentAt: string;
  isSuccess: boolean;
  errorMessage: string | null;
  toEmail: string;
  process_name: string;
  name: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  company: string | null;
  jobTitle: string | null;
  linkedIn: string | null;
}

interface DashboardDataCache {
  allEventData: EventItem[];
  allEmailLogs: any[];
  emailLogs: EmailLog[];
  lastFetched: number;
  effectiveUserId: string;
}

interface DashboardData {
  [viewId: string]: DashboardDataCache;
}

interface DataContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
  formStates: { [key: string]: any };
  saveFormState: (key: string, data: any) => void;
  getFormState: (key: string) => any;
  clientSettings: any;
  setClientSettings: (settings: any) => void;
  // Dashboard data functions
  saveDashboardData: (viewId: string, data: {
    allEventData: EventItem[];
    allEmailLogs: any[];
    emailLogs: EmailLog[];
    effectiveUserId: string;
  }) => void;
  getDashboardData: (viewId: string, effectiveUserId: string) => DashboardDataCache | null;
  clearDashboardCache: () => void;
  clearDashboardCacheForUser: (effectiveUserId: string) => void;
}

const AppDataContext = createContext<DataContextType | null>(null);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [formStates, setFormStates] = useState<{ [key: string]: any }>({});
  const [clientSettings, setClientSettings] = useState<any>(null);
  const [dashboardDataCache, setDashboardDataCache] = useState<DashboardData>({});

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const saveFormState = useCallback((key: string, data: any) => {
    setFormStates(prev => ({ ...prev, [key]: data }));
  }, []);

  const getFormState = useCallback((key: string) => {
    return formStates[key] || {};
  }, [formStates]);

  // Dashboard data functions
  const saveDashboardData = useCallback((viewId: string, data: {
    allEventData: EventItem[];
    allEmailLogs: any[];
    emailLogs: EmailLog[];
    effectiveUserId: string;
  }) => {
    setDashboardDataCache(prev => ({
      ...prev,
      [viewId]: {
        ...data,
        lastFetched: Date.now()
      }
    }));
  }, []);

  const getDashboardData = useCallback((viewId: string, effectiveUserId: string): DashboardDataCache | null => {
    const cached = dashboardDataCache[viewId];
    if (cached && cached.effectiveUserId === effectiveUserId) {
      // Return cached data if it's less than 5 minutes old (configurable)
      const cacheExpiryTime = 5 * 60 * 1000; // 5 minutes
      if (Date.now() - cached.lastFetched < cacheExpiryTime) {
        return cached;
      }
    }
    return null;
  }, [dashboardDataCache]);

  const clearDashboardCache = useCallback(() => {
    setDashboardDataCache({});
  }, []);

  const clearDashboardCacheForUser = useCallback((effectiveUserId: string) => {
    setDashboardDataCache(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(viewId => {
        if (updated[viewId].effectiveUserId === effectiveUserId) {
          delete updated[viewId];
        }
      });
      return updated;
    });
  }, []);

  return (
    <AppDataContext.Provider value={{
      refreshTrigger,
      triggerRefresh,
      formStates,
      saveFormState,
      getFormState,
      clientSettings,
      setClientSettings,
      saveDashboardData,
      getDashboardData,
      clearDashboardCache,
      clearDashboardCacheForUser
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

// Export types for use in other components
export type { EventItem, EmailLog, DashboardDataCache };