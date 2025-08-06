import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

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

// SessionStorage key for caching
const DASHBOARD_CACHE_KEY = 'pitchcraft-dashboard-cache';

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [formStates, setFormStates] = useState<{ [key: string]: any }>({});
  const [clientSettings, setClientSettings] = useState<any>(null);
  
  // Initialize with data from sessionStorage
  const [dashboardDataCache, setDashboardDataCache] = useState<DashboardData>(() => {
    try {
      const saved = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('🔄 Loaded dashboard cache from sessionStorage:', Object.keys(parsed));
        return parsed;
      }
    } catch (error) {
      console.error('Error loading dashboard cache from sessionStorage:', error);
    }
    return {};
  });

  // Save to sessionStorage whenever cache changes
  useEffect(() => {
    try {
      sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(dashboardDataCache));
      if (Object.keys(dashboardDataCache).length > 0) {
        console.log('💾 Saved dashboard cache to sessionStorage:', Object.keys(dashboardDataCache));
      }
    } catch (error) {
      console.error('Error saving dashboard cache to sessionStorage:', error);
      // Handle quota exceeded
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('SessionStorage quota exceeded, clearing cache');
        sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
        setDashboardDataCache({});
      }
    }
  }, [dashboardDataCache]);

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
    const cacheData = {
      ...data,
      lastFetched: Date.now()
    };
    
    console.log(`✅ Saving dashboard data for view ${viewId}:`, {
      events: cacheData.allEventData.length,
      emails: cacheData.allEmailLogs.length,
      user: cacheData.effectiveUserId
    });
    
    setDashboardDataCache(prev => ({
      ...prev,
      [viewId]: cacheData
    }));
  }, []);

  const getDashboardData = useCallback((viewId: string, effectiveUserId: string): DashboardDataCache | null => {
    // First check React state
    let cached = dashboardDataCache[viewId];
    
    // If not in React state, try sessionStorage directly
    if (!cached) {
      try {
        const saved = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
        if (saved) {
          const allData = JSON.parse(saved);
          cached = allData[viewId];
        }
      } catch (error) {
        console.error('Error reading from sessionStorage:', error);
      }
    }
    
    if (cached && cached.effectiveUserId === effectiveUserId) {
      const cacheExpiryTime = 30 * 60 * 1000; // 30 minutes
      const isExpired = Date.now() - cached.lastFetched > cacheExpiryTime;
      
      if (!isExpired) {
        console.log(`✅ Found cached data for view ${viewId} (${Math.round((Date.now() - cached.lastFetched) / 1000 / 60)} minutes old)`);
        return cached;
      } else {
        console.log(`⏰ Cache expired for view ${viewId}, removing`);
        // Remove expired cache
        setDashboardDataCache(prev => {
          const updated = { ...prev };
          delete updated[viewId];
          return updated;
        });
      }
    } else if (cached) {
      console.log(`❌ Cache user mismatch for view ${viewId}: expected ${effectiveUserId}, got ${cached.effectiveUserId}`);
    } else {
      console.log(`❌ No cached data found for view ${viewId}`);
    }
    
    return null;
  }, [dashboardDataCache]);

  const clearDashboardCache = useCallback(() => {
    console.log('🗑️ Clearing all dashboard cache');
    setDashboardDataCache({});
    try {
      sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
    } catch (error) {
      console.error('Error clearing sessionStorage:', error);
    }
  }, []);

  const clearDashboardCacheForUser = useCallback((effectiveUserId: string) => {
    console.log(`🗑️ Clearing dashboard cache for user: ${effectiveUserId}`);
    setDashboardDataCache(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(viewId => {
        if (updated[viewId].effectiveUserId === effectiveUserId) {
          console.log(`  - Removing cache for view ${viewId}`);
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