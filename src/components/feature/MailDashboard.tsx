import React, { useState, useEffect } from "react";
import axios from "axios";
import type { EventItem, EmailLog } from "../../contexts/AppDataContext";
import DynamicContactsTable from "./DynamicContactsTable";


import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import ContactsTable from "./ContactsTable";
import API_BASE_URL from "../../config";
import { useAppData } from "../../contexts/AppDataContext";

// Interfaces
interface DailyStats {
  date: string;
  sent: number;
  opens: number;
  clicks: number;
}


interface EmailContact {
  id: number;
  contactId: number;
  full_name: string;
  email: string;
  company: string;
  jobTitle: string;
  location: string;
  linkedin_URL?: string;
  website?: string;
  timestamp: string;
  eventType: "Open" | "Click";
  targetUrl?: string;
  hasOpened?: boolean;
  hasClicked?: boolean;
}

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  width?: string;
}

interface MailDashboardProps {
  effectiveUserId: string | null;
  token: string | null;
  isVisible: boolean;
  // Add these new optional props
  externalData?: {
    allEventData: EventItem[];
    allEmailLogs: any[];
    emailLogs: EmailLog[];
    selectedView: string;
    loading: boolean;
    dataFetched: boolean;
  };
  onDataChange?: (data: any) => void;
}

const MailDashboard: React.FC<MailDashboardProps> = ({
  effectiveUserId,
  token,
  isVisible,
}) => {
  // Update your useAppData call
  const { 
    saveFormState, 
    getFormState, 
    saveDashboardData, 
    getDashboardData, 
    clearDashboardCacheForUser 
  } = useAppData();
  // =================== ALL HOOKS MUST BE HERE - NO EXCEPTIONS ===================
  const FORM_STATE_KEY = 'mail-dashboard';

  // All useState hooks
  const [selectedView, setSelectedView] = useState<string>("");
  const [availableViews, setAvailableViews] = useState<{ id: number; name: string }[]>([]);
  const [dashboardTab, setDashboardTab] = useState("Overview");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [allEventData, setAllEventData] = useState<EventItem[]>([]);
  const [allEmailLogs, setAllEmailLogs] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [filteredEventData, setFilteredEventData] = useState<EventItem[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [totalStats, setTotalStats] = useState({ sent: 0, opens: 0, clicks: 0 });
  const [requestCount, setRequestCount] = useState(0);
  const [emailFilterType, setEmailFilterType] = useState<"all" | "opens" | "clicks" | "opens-no-clicks" | "opens-and-clicks" | "email-logs">("all");
  const [detailSelectedContacts, setDetailSelectedContacts] = useState<Set<string>>(new Set());
  const [selectedEmailLogs, setSelectedEmailLogs] = useState<Set<string>>(new Set());
  const [detailSearchQuery, setDetailSearchQuery] = useState("");
  const [emailLogsSearch, setEmailLogsSearch] = useState("");
  const [emailLogsCurrentPage, setEmailLogsCurrentPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSaveSegmentModal, setShowSaveSegmentModal] = useState(false);
  const [segmentName, setSegmentName] = useState("");
  const [segmentDescription, setSegmentDescription] = useState("");
  const [savingSegment, setSavingSegment] = useState(false);
  const [dataFetchedForView, setDataFetchedForView] = useState<string>("");

  const [emailColumns, setEmailColumns] = useState<ColumnConfig[]>([
    { key: "checkbox", label: "", visible: true, width: "40px" },
    { key: "full_name", label: "Full name", visible: true },
    { key: "email", label: "Email address", visible: true },
    { key: "company", label: "Company", visible: true },
    { key: "jobTitle", label: "Job title", visible: true },
    { key: "location", label: "Location", visible: true },
    { key: "eventType", label: "Event type", visible: true },
    { key: "timestamp", label: "Timestamp", visible: true },
    { key: "targetUrl", label: "Target URL", visible: false },
    { key: "linkedin_URL", label: "LinkedIn", visible: false },
    { key: "website", label: "Website", visible: false },
    { key: "hasOpened", label: "Opened", visible: true },
    { key: "hasClicked", label: "Clicked", visible: true },
  ]);
  const [emailLogsColumns, setEmailLogsColumns] = useState([
    { key: "checkbox", label: "", visible: true, width: "40px" },
    { key: "name", label: "Full Name", visible: true },
    { key: "toEmail", label: "Email Address", visible: true },
    { key: "company", label: "Company", visible: true },
    { key: "jobTitle", label: "Job Title", visible: true },
    { key: "address", label: "Location", visible: true },
    { key: "subject", label: "Subject", visible: true },
    { key: "isSuccess", label: "Status", visible: true },
    { key: "sentAt", label: "Sent At", visible: true },
    { key: "process_name", label: "Process", visible: true },
    { key: "linkedIn", label: "LinkedIn", visible: true },
    { key: "website", label: "Website", visible: true },
    { key: "errorMessage", label: "Error Message", visible: false },
  ]);

 

// =================== ALL useEffect hooks ===================

// 1. Initialize component - restore state and load cached data together
useEffect(() => {
  if (!effectiveUserId || !isVisible) return;

  const initializeComponent = async () => {
    console.log('🔄 Initializing MailDashboard component');
    
    // Step 1: Restore saved state first
    const savedState = getFormState(FORM_STATE_KEY);
    let viewToLoad = selectedView;
    
    if (savedState && savedState.effectiveUserId === effectiveUserId) {
      console.log('📥 Restoring saved state:', savedState);
      
      // CRITICAL: Only restore selectedView if it's not empty
      if (savedState.selectedView && savedState.selectedView !== '') {
        setSelectedView(savedState.selectedView);
        viewToLoad = savedState.selectedView;
        console.log('✅ Restored selectedView:', savedState.selectedView);
      } else {
        console.log('⚠️ Saved selectedView is empty, keeping current:', selectedView);
      }
      
      if (savedState.dashboardTab && savedState.dashboardTab !== dashboardTab) {
        setDashboardTab(savedState.dashboardTab);
      }
      if (savedState.startDate && savedState.startDate !== startDate) {
        setStartDate(savedState.startDate);
      }
      if (savedState.endDate && savedState.endDate !== endDate) {
        setEndDate(savedState.endDate);
      }
      if (savedState.emailFilterType && savedState.emailFilterType !== emailFilterType) {
        setEmailFilterType(savedState.emailFilterType);
      }
      
      // Give React a moment to update state
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 2: Try to load cached data for the view
    if (viewToLoad) {
      const cachedData = getDashboardData(viewToLoad, effectiveUserId);
      
      if (cachedData) {
        console.log('✅ Using cached data during initialization:', viewToLoad);
        console.log('📦 Initial cached data:', {
          events: cachedData.allEventData.length,
          emails: cachedData.allEmailLogs.length
        });
        
        setAllEventData(cachedData.allEventData);
        setAllEmailLogs(cachedData.allEmailLogs);
        setEmailLogs(cachedData.emailLogs);
        setDataFetchedForView(viewToLoad);
        
        // Process data immediately
        processDataWithDateFilter(cachedData.allEventData, cachedData.allEmailLogs, startDate, endDate);
        
        console.log('✅ Initialization complete with cached data');
      } else {
        console.log('❌ No cached data found for view:', viewToLoad);
      }
    } else {
      console.log('⚠️ No viewToLoad available');
    }
  };

  initializeComponent();
}, [effectiveUserId, isVisible]);

// 2. Load available views
useEffect(() => {
  if (!effectiveUserId || !isVisible) return;

  const loadAvailableViews = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/crm/datafile-byclientid?clientId=${effectiveUserId}`,
        { headers: { ...(token && { Authorization: `Bearer ${token}` }) } }
      );
      setAvailableViews(response.data);
    } catch (error) {
      console.error("Dashboard: Error loading views:", error);
      setAvailableViews([]);
    }
  };

  loadAvailableViews();
}, [effectiveUserId, token, isVisible]);

// 3. Fetch data when selectedView changes (and not already cached/fetched)
useEffect(() => {
  if (!isVisible || !effectiveUserId || !selectedView) return;
  
  // Skip if we already have data for this view
  if (dataFetchedForView === selectedView || loading) return;
  
  // Try cache first
  const cachedData = getDashboardData(selectedView, effectiveUserId);
  
  if (cachedData) {
    console.log('✅ Using cached data for view change:', selectedView);
    console.log('📦 Cached data details:', {
      events: cachedData.allEventData.length,
      emails: cachedData.allEmailLogs.length,
      emailLogs: cachedData.emailLogs.length
    });
    
    // ✅ CRITICAL: Set ALL the state properly
    setAllEventData(cachedData.allEventData);
    setAllEmailLogs(cachedData.allEmailLogs);
    setEmailLogs(cachedData.emailLogs);
    setDataFetchedForView(selectedView);
    
    // ✅ CRITICAL: Process the data to update stats and UI
    processDataWithDateFilter(cachedData.allEventData, cachedData.allEmailLogs, startDate, endDate);
    
    console.log('✅ State updated with cached data');
    
  } else {
    console.log('❌ No cache found, fetching data for view:', selectedView);
    fetchLogsByClientAndView(Number(effectiveUserId), selectedView);
  }
}, [selectedView, isVisible, effectiveUserId, dataFetchedForView, loading, getDashboardData]);



// 4. Debug logging
useEffect(() => {
  console.log('📊 Dashboard state changed:');
  console.log('- Selected view:', selectedView);
  console.log('- Dashboard tab:', dashboardTab);
  console.log('- Event data length:', allEventData.length);
  console.log('- Email logs length:', allEmailLogs.length);
  console.log('- Data fetched for view:', dataFetchedForView);
  console.log('- isVisible:', isVisible);
}, [selectedView, dashboardTab, allEventData.length, allEmailLogs.length, dataFetchedForView, isVisible]);

// 5. Process data when date filters change
useEffect(() => {
  if ((allEventData.length > 0 || allEmailLogs.length > 0) && isVisible) {
    processDataWithDateFilter(allEventData, allEmailLogs, startDate, endDate);
  }
}, [startDate, endDate, allEventData, allEmailLogs, isVisible]);

// 6. Load email logs for email-logs filter type
useEffect(() => {
  if (!isVisible) return;
  
  if (selectedView && emailFilterType === "email-logs" && effectiveUserId) {
    const loadEmailLogs = async () => {
      try {
        const dataFileId = Number(selectedView);
        const clientId = Number(effectiveUserId);
        const logs = await fetchEmailLogs(clientId, dataFileId);
        setEmailLogs(logs);
      } catch (error) {
        console.error('Error loading email logs:', error);
        setEmailLogs([]);
      }
    };
    loadEmailLogs();
  }
}, [selectedView, emailFilterType, effectiveUserId, isVisible]);

// 7. Clear cache when user changes (optional)
useEffect(() => {
  if (effectiveUserId) {
    // Reset data fetched state when user changes
    setDataFetchedForView("");
    // You could also clear cache here if needed:
    // clearDashboardCacheForUser(effectiveUserId);
  }
}, [effectiveUserId]);

// Add this useEffect after your existing ones:
useEffect(() => {
  // Save state whenever selectedView changes (and it's not empty)
  if (selectedView && effectiveUserId) {
    console.log('💾 Auto-saving state for selectedView:', selectedView);
    saveCurrentState();
  }
}, [selectedView]);

  // =================== NOW AFTER ALL HOOKS - EARLY RETURN ===================
  if (!effectiveUserId || !isVisible) {
    return null;
  }

  // =================== ALL FUNCTIONS AFTER EARLY RETURN ===================
 const saveCurrentState = () => {
  // Only save if we have a valid selectedView
  if (!selectedView) {
    console.log('⚠️ Skipping state save - no selectedView');
    return;
  }
  
  const stateToSave = {
    selectedView,
    dashboardTab,
    startDate,
    endDate,
    emailFilterType,
    effectiveUserId,
  };
  
  console.log('💾 Saving current state:', stateToSave);
  saveFormState(FORM_STATE_KEY, stateToSave);
};
  const fetchEmailLogs = async (effectiveUserId: number, dataFileId: number) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/getlogs?clientId=${effectiveUserId}&dataFileId=${dataFileId}`
      );
      
      if (response.ok) {
        const logs = await response.json();
        return logs;
      } else {
        console.error('Failed to fetch email logs');
        return [];
      }
    } catch (error) {
      console.error('Error fetching email logs:', error);
      return [];
    }
  };

  const fetchLogsByClientAndView = async (clientId: number, viewId: string) => {
  try {
    setLoading(true);
    const dataFileId = Number(viewId);

    const trackingResponse = await axios.get(
      `${API_BASE_URL}/api/Crm/gettrackinglogs`,
      {
        params: { clientId, dataFileId },
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      }
    );

    const emailLogsData = await fetchEmailLogs(clientId, dataFileId);
    const allTrackingData: EventItem[] = trackingResponse.data || [];
    const allEmailLogsData = emailLogsData || [];

    // Set state
    setAllEventData(allTrackingData);
    setAllEmailLogs(allEmailLogsData);
    setEmailLogs(allEmailLogsData);
    
    // ✅ ALWAYS cache the data immediately after fetching - regardless of tab
    saveDashboardData(viewId, {
      allEventData: allTrackingData,
      allEmailLogs: allEmailLogsData,
      emailLogs: allEmailLogsData,
      effectiveUserId: effectiveUserId!
    });
    
    setDataFetchedForView(viewId);
    
    // Process data for current view
    processDataWithDateFilter(allTrackingData, allEmailLogsData, startDate, endDate);
    
    console.log(`✅ Data cached for view ${viewId} - ${allTrackingData.length} events, ${allEmailLogsData.length} email logs`);
    
  } catch (error) {
    console.error("Dashboard: Error fetching logs:", error);
    setAllEventData([]);
    setAllEmailLogs([]);
    setEmailLogs([]);
    setFilteredEventData([]);
    setRequestCount(0);
    setDailyStats([]);
    setTotalStats({ sent: 0, opens: 0, clicks: 0 });
    setDataFetchedForView(viewId);
  } finally {
    setLoading(false);
  }
};



  // Process data with date filtering
  const processDataWithDateFilter = (
    trackingData: EventItem[],
    emailLogs: any[],
    startDate?: string,
    endDate?: string
  ) => {
    // Apply date filtering
    let filteredTrackingData = trackingData;
    let filteredEmailLogs = emailLogs;

    if (startDate || endDate) {
      filteredTrackingData = trackingData.filter((item) => {
        const itemDate = item.timestamp.split("T")[0];
        const isAfterStart = !startDate || itemDate >= startDate;
        const isBeforeEnd = !endDate || itemDate <= endDate;
        return isAfterStart && isBeforeEnd;
      });

      filteredEmailLogs = emailLogs.filter((log: any) => {
        const sentDate = log.sentAt.split("T")[0];
        const isAfterStart = !startDate || sentDate >= startDate;
        const isBeforeEnd = !endDate || sentDate <= endDate;
        return isAfterStart && isBeforeEnd;
      });
    }

    // Track unique opens and clicks per day
    const dailyTracking: Record<string, {
      uniqueOpens: Set<string>;
      uniqueClicks: Set<string>;
      sentCount: number;
    }> = {};

    filteredEmailLogs.forEach((log: any) => {
      if (log.isSuccess) {
        const date = log.sentAt.split("T")[0];
        if (!dailyTracking[date]) {
          dailyTracking[date] = {
            uniqueOpens: new Set(),
            uniqueClicks: new Set(),
            sentCount: 0,
          };
        }
        dailyTracking[date].sentCount++;
      }
    });

    // Global unique tracking
    const uniqueOpensInDateRange = new Set<string>();
    const uniqueClicksInDateRange = new Set<string>();

    // Process opens and clicks
    filteredTrackingData.forEach((item) => {
      const date = item.timestamp.split("T")[0];
      if (!dailyTracking[date]) {
        dailyTracking[date] = {
          uniqueOpens: new Set(),
          uniqueClicks: new Set(),
          sentCount: 0,
        };
      }

      if (item.eventType === "Open") {
        dailyTracking[date].uniqueOpens.add(item.email);
        uniqueOpensInDateRange.add(item.email);
      } else if (item.eventType === "Click") {
        dailyTracking[date].uniqueClicks.add(item.email);
        uniqueClicksInDateRange.add(item.email);
      }
    });

    // Create stats for graph
    const statsMap: Record<string, DailyStats> = {};
    Object.keys(dailyTracking).forEach((date) => {
      statsMap[date] = {
        date,
        sent: dailyTracking[date].sentCount,
        opens: dailyTracking[date].uniqueOpens.size,
        clicks: dailyTracking[date].uniqueClicks.size,
      };
    });

    const sortedStats = Object.values(statsMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    setDailyStats(sortedStats);

    // Calculate totals
    const totalSentCount = filteredEmailLogs.filter((log: any) => log.isSuccess).length;
    setRequestCount(totalSentCount);
    setTotalStats({
      sent: totalSentCount,
      opens: uniqueOpensInDateRange.size,
      clicks: uniqueClicksInDateRange.size,
    });

    // Update filtered event data
    setFilteredEventData(filteredTrackingData);
  };





  // Event Handlers
  const handleViewChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
  const newViewId = e.target.value;
  const previousView = selectedView;
  
  console.log('🔄 View changing from', previousView, 'to', newViewId);
  
  setSelectedView(newViewId);
  
  // Save state immediately after setting new view
  if (newViewId) {
    const stateToSave = {
      selectedView: newViewId, // Use the new value directly
      dashboardTab,
      startDate,
      endDate,
      emailFilterType,
      effectiveUserId,
    };
    console.log('💾 Saving state on view change:', stateToSave);
    saveFormState(FORM_STATE_KEY, stateToSave);
    
    // Reset dataFetchedForView if changing to different view
    if (previousView !== newViewId) {
      setDataFetchedForView("");
    }
  } else {
    // Clear data if no view selected
    setAllEventData([]);
    setEmailLogs([]);
    setDailyStats([]);
    setTotalStats({ sent: 0, opens: 0, clicks: 0 });
    setRequestCount(0);
    setDataFetchedForView("");
  }
};


  const handleDashboardTabChange = (tabName: string) => {
    setDashboardTab(tabName);
    saveCurrentState();
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
    saveCurrentState();
  };

  const handleEmailFilterTypeChange = (filterType: string) => {
    setEmailFilterType(filterType as any);
    saveCurrentState();
  };

  const handleRefresh = async () => {
    if (!selectedView) return;
    
    setIsRefreshing(true);
    setDataFetchedForView(""); // Reset flag to allow refetch
    
    try {
      // Force fetch by bypassing cache
      await fetchLogsByClientAndView(Number(effectiveUserId), selectedView);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper Functions
  const formatMailTimestamp = (input: string): string => {
    if (!input) return "";

    try {
      const date = new Date(input);
      if (isNaN(date.getTime())) return "Invalid date";

      const day = date.getDate().toString().padStart(2, "0");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();

      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;

      return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return "Invalid date";
    }
  };

  // Transform event data for table
  const transformEventDataForTable = (eventData: EventItem[]): EmailContact[] => {
    const contacts: EmailContact[] = eventData
      .filter((item) => item.eventType === "Open" || item.eventType === "Click")
      .map((item) => ({
        id: item.id,
        contactId: item.contactId,
        full_name: item.full_Name || "-",
        email: item.email,
        company: item.company || "-",
        jobTitle: item.jobTitle || "-",
        location: item.location || "-",
        linkedin_URL: item.linkedin_URL,
        website: item.website,
        timestamp: item.timestamp,
        eventType: item.eventType as "Open" | "Click",
        targetUrl: item.targetUrl || undefined,
        hasOpened: false,
        hasClicked: false,
      }));

    // Calculate hasOpened and hasClicked for each unique email
    const emailStats = new Map<string, { hasOpened: boolean; hasClicked: boolean }>();

    eventData.forEach((item) => {
      const stats = emailStats.get(item.email) || { hasOpened: false, hasClicked: false };
      if (item.eventType === "Open") stats.hasOpened = true;
      if (item.eventType === "Click") stats.hasClicked = true;
      emailStats.set(item.email, stats);
    });

    return contacts.map((contact) => ({
      ...contact,
      hasOpened: emailStats.get(contact.email)?.hasOpened || false,
      hasClicked: emailStats.get(contact.email)?.hasClicked || false,
    }));
  };

  // Get filtered email contacts
  const getFilteredEmailContacts = (): EmailContact[] => {
    let filteredEventData = allEventData;

    // Apply date filters first
    if (startDate || endDate) {
      filteredEventData = allEventData.filter((item) => {
        if (!item.timestamp) return false;
        const itemDate = new Date(item.timestamp);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate + "T23:59:59") : null;
        if (start && itemDate < start) return false;
        if (end && itemDate > end) return false;
        return true;
      });
    }

    const transformedData = transformEventDataForTable(filteredEventData);

    switch (emailFilterType) {
      case "opens":
        return transformedData.filter((c) => c.eventType === "Open");
      case "clicks":
        return transformedData.filter((c) => c.eventType === "Click");
      case "opens-no-clicks":
        const emailsWithOpensOnly = new Set<string>();
        const emailsWithClicks = new Set<string>();
        filteredEventData.forEach((item) => {
          if (item.eventType === "Click") emailsWithClicks.add(item.email);
          if (item.eventType === "Open") emailsWithOpensOnly.add(item.email);
        });
        const opensOnlyEmails = Array.from(emailsWithOpensOnly).filter(
          (email) => !emailsWithClicks.has(email)
        );
        return transformedData.filter(
          (c) => opensOnlyEmails.includes(c.email) && c.eventType === "Open"
        );
      case "opens-and-clicks":
        const emailsWithBoth = new Map<string, { hasOpened: boolean; hasClicked: boolean }>();
        filteredEventData.forEach((item) => {
          const stats = emailsWithBoth.get(item.email) || { hasOpened: false, hasClicked: false };
          if (item.eventType === "Open") stats.hasOpened = true;
          if (item.eventType === "Click") stats.hasClicked = true;
          emailsWithBoth.set(item.email, stats);
        });
        const bothEmails = Array.from(emailsWithBoth.entries())
          .filter(([_, stats]) => stats.hasOpened && stats.hasClicked)
          .map(([email]) => email);
        return transformedData.filter((c) => bothEmails.includes(c.email));
      case "email-logs":
        return [];
      default:
        return transformedData;
    }
  };

  // Transform email logs for table
  const transformEmailLogsForTable = (logs: EmailLog[]): any[] => {
    return logs.map((log: EmailLog) => ({
      id: log.id,
      contactId: log.contactId,
      name: log.name || "-",
      toEmail: log.toEmail || "-",
      company: log.company || "-",
      jobTitle: log.jobTitle || "-",
      address: log.address || "-",
      subject: log.subject && log.subject.length > 50
        ? log.subject.substring(0, 50) + "..."
        : log.subject || "-",
      fullSubject: log.subject || "-",
      isSuccess: log.isSuccess ? "✅ Sent" : "❌ Failed",
      statusColor: log.isSuccess ? "#28a745" : "#dc3545",
      sentAt: log.sentAt || "-",
      process_name: log.process_name || "-",
      errorMessage: log.errorMessage || "-",
      website: log.website || "-",
      linkedIn: log.linkedIn || "-",
    }));
  };

  // Get filtered email logs
  const getFilteredEmailLogs = () => {
    let filteredLogs = emailLogs;

    // Filter to show complete records first
    const completeRecords = filteredLogs.filter(log => 
      log.name && log.company && log.jobTitle && log.contactId
    );
    const incompleteRecords = filteredLogs.filter(log => 
      !log.name || !log.company || !log.jobTitle || !log.contactId
    );
    filteredLogs = [...completeRecords, ...incompleteRecords];

    // Apply search filter
    if (emailLogsSearch) {
      const searchLower = emailLogsSearch.toLowerCase();
      filteredLogs = filteredLogs.filter((log) =>
        log.name?.toLowerCase().includes(searchLower) ||
        log.toEmail?.toLowerCase().includes(searchLower) ||
        log.company?.toLowerCase().includes(searchLower) ||
        log.jobTitle?.toLowerCase().includes(searchLower) ||
        log.subject?.toLowerCase().includes(searchLower) ||
        log.process_name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply date filters
    if (startDate || endDate) {
      filteredLogs = filteredLogs.filter((log) => {
        if (!log.sentAt) return false;
        const logDate = new Date(log.sentAt);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate + "T23:59:59") : null;
        if (start && logDate < start) return false;
        if (end && logDate > end) return false;
        return true;
      });
    }

    return filteredLogs;
  };

  // Value getters for tables
  const getEmailContactValue = (contact: EmailContact, key: string): any => {
    if (key === "timestamp") {
      return formatMailTimestamp(contact.timestamp);
    }
    if (key === "hasOpened" || key === "hasClicked") {
      return contact[key] ? "✓" : "-";
    }
    if (key === "full_name" && contact.contactId === 0) {
      return `${contact.full_name} ⚠️`;
    }

    // Make LinkedIn URL clickable
    if (key === "linkedin_URL" && contact.linkedin_URL) {
      return (
        <a
          href={contact.linkedin_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#0066cc", textDecoration: "underline" }}
          onClick={(e) => e.stopPropagation()}
        >
          LinkedIn Profile
        </a>
      );
    }

    // Make Target URL clickable
    if (key === "targetUrl" && contact.targetUrl) {
      return (
        <a
          href={contact.targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#0066cc", textDecoration: "underline" }}
          onClick={(e) => e.stopPropagation()}
          title={contact.targetUrl}
        >
          {contact.targetUrl.length > 50
            ? contact.targetUrl.substring(0, 50) + "..."
            : contact.targetUrl}
        </a>
      );
    }

    // Make website clickable
    if (key === "website" && contact.website) {
      return (
        <a
          href={contact.website}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#0066cc", textDecoration: "underline" }}
          onClick={(e) => e.stopPropagation()}
        >
          Website
        </a>
      );
    }

    return (contact as any)[key] || "-";
  };

   const getEmailLogValue = (log: any, key: string): any => {
    switch (key) {
      case "full_name":
      case "name":
        return log.name || log.full_name || "-";
      case "email":
      case "toEmail":
        return log.toEmail || log.email || "-";
      case "company_name":
      case "company":
        return log.company || log.company_name || "-";
      case "job_title":
      case "jobTitle":
        return log.jobTitle || log.job_title || "-";
      case "country_or_address":
      case "address":
      case "location":
        return log.address || log.location || log.country_or_address || "-";
      case "sentAt":
        return log.sentAt && log.sentAt !== "-" ? formatMailTimestamp(log.sentAt) : "-";
      case "isSuccess":
        return (
          <span style={{ 
            color: log.statusColor || (log.isSuccess === "✅ Sent" ? "#28a745" : "#dc3545"), 
            fontWeight: 500 
          }}>
            {log.isSuccess || "-"}
          </span>
        );
      case "subject":
        const subject = log.subject || "-";
        const fullSubject = log.fullSubject || log.subject || "-";
        return subject !== "-" ? (
          <span title={fullSubject}>{subject}</span>
        ) : "-";
      case "website":
        if (log.website && log.website !== "-") {
          return (
            <a 
              href={log.website.startsWith('http') ? log.website : `https://${log.website}`} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: "#0066cc", textDecoration: "underline" }}
              onClick={(e) => e.stopPropagation()}
            >
              Website
            </a>
          );
        }
        return "-";
      case "linkedIn":
      case "linkedin_URL":
        if (log.linkedIn && log.linkedIn !== "-") {
          return (
            <a 
              href={log.linkedIn} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: "#0066cc", textDecoration: "underline" }}
              onClick={(e) => e.stopPropagation()}
            >
              LinkedIn Profile
            </a>
          );
        }
        if (log.linkedin_URL && log.linkedin_URL !== "-") {
          return (
            <a 
              href={log.linkedin_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: "#0066cc", textDecoration: "underline" }}
              onClick={(e) => e.stopPropagation()}
            >
              LinkedIn Profile
            </a>
          );
        }
        return "-";
      default:
        const value = log[key];
        return (value !== null && value !== undefined && value !== "" && value !== "-") ? value : "-";
    }
  };

  // Selection Handlers
const handleSelectEmailLog = (logId: string) => {
  setSelectedEmailLogs(prev => {
    const newSelection = new Set(prev);
    if (newSelection.has(logId)) {
      newSelection.delete(logId);
    } else {
      newSelection.add(logId);
    }
    return newSelection;
  });
};


const handleSelectAllEmailLogs = () => {
  const currentPageLogs = transformEmailLogsForTable(getFilteredEmailLogs()).slice(
    (emailLogsCurrentPage - 1) * 20,
    emailLogsCurrentPage * 20
  );
  
  setSelectedEmailLogs(prev => {
    const newSelection = new Set(prev);
    if (prev.size === currentPageLogs.length && currentPageLogs.length > 0) {
      // Clear all
      return new Set();
    } else {
      // Select all on current page
      currentPageLogs.forEach(log => {
        newSelection.add(log.id.toString());
      });
      return newSelection;
    }
  });
};

  // Segment Creation
  const handleSaveEmailSegment = async () => {
    if (!segmentName.trim()) {
      alert("Please enter a segment name");
      return;
    }

    if (!selectedView) {
      alert("Please select a data file first");
      return;
    }

    setSavingSegment(true);
    
    try {
      let contactIds: number[] = [];

      if (emailFilterType === "email-logs") {
        const selectedLogs = getFilteredEmailLogs().filter(log => 
          selectedEmailLogs.has(log.id.toString())
        );
        
        contactIds = selectedLogs
          .map(log => log.contactId)
          .filter((id): id is number => id !== null && id !== undefined);
        
        if (contactIds.length === 0) {
          alert("No valid contacts selected. Please select contacts with valid contact IDs.");
          setSavingSegment(false);
          return;
        }
      } else {
        const selectedContacts = getFilteredEmailContacts().filter(contact => 
          detailSelectedContacts.has(contact.id.toString())
        );
        
        contactIds = selectedContacts
          .map(contact => contact.contactId)
          .filter((id): id is number => id !== null && id !== undefined && id > 0);
        
        if (contactIds.length === 0) {
          alert("No valid contacts selected. Please select contacts with valid contact IDs.");
          setSavingSegment(false);
          return;
        }
      }

      const uniqueContactIds = Array.from(new Set(contactIds));

      const segmentData = {
        name: segmentName,
        description: segmentDescription || "",
        dataFileId: parseInt(selectedView),
        contactIds: uniqueContactIds
      };

      const response = await fetch(
        `${API_BASE_URL}/api/Crm/Creat-Segments?ClientId=${effectiveUserId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(segmentData),
        }
      );

      if (response.ok) {
        alert(`Segment "${segmentName}" created successfully with ${uniqueContactIds.length} contacts!`);
        
        setShowSaveSegmentModal(false);
        setSegmentName("");
        setSegmentDescription("");
        
        if (emailFilterType === "email-logs") {
          setSelectedEmailLogs(new Set());
        } else {
          setDetailSelectedContacts(new Set());
        }
      } else {
        const errorData = await response.text();
        alert(`Failed to create segment: ${errorData}`);
      }
    } catch (error) {
      console.error("Error creating segment:", error);
      alert("Error creating segment. Please try again.");
    } finally {
      setSavingSegment(false);
    }
  };

  // Helper function for invalid contacts count
  const getInvalidContactsCount = (): number => {
    return Array.from(detailSelectedContacts).filter((id) => {
      const contact = getFilteredEmailContacts().find((c) => c.id.toString() === id);
      return contact?.contactId === 0;
    }).length;
  };

  // Header Components
  const getEmailLogsHeader = () => {
    if (selectedEmailLogs.size === 0) return null;
    
    return (
      <div
        style={{
          marginBottom: 16,
          padding: "12px 16px",
          background: "#f0f7ff",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span style={{ fontWeight: 500 }}>
          {selectedEmailLogs.size} email log{selectedEmailLogs.size > 1 ? "s" : ""} selected
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            className="button secondary"
            onClick={() => setSelectedEmailLogs(new Set())}
          >
            Clear Selection
          </button>
          <button
            className="button primary"
            onClick={() => setShowSaveSegmentModal(true)}
          >
            Create Segment
          </button>
        </div>
      </div>
    );
  };

  const getEngagementHeader = () => {
    if (detailSelectedContacts.size === 0) return null;
    
    const invalidCount = getInvalidContactsCount();
    
    return (
      <div
        style={{
          marginBottom: 16,
          padding: "12px 16px",
          background: "#f0f7ff",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span style={{ fontWeight: 500 }}>
          {detailSelectedContacts.size} contact{detailSelectedContacts.size > 1 ? "s" : ""} selected
          {invalidCount > 0 && (
            <span style={{ color: "#ff9800", marginLeft: 8 }}>
              ({invalidCount} without valid ID)
            </span>
          )}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            className="button secondary"
            onClick={() => setDetailSelectedContacts(new Set())}
          >
            Clear Selection
          </button>
          <button
            className="button primary"
            onClick={() => setShowSaveSegmentModal(true)}
          >
            Create Segment
          </button>
        </div>
      </div>
    );
  };

  // Calculate rates
  const openRate = requestCount > 0 ? ((totalStats.opens / requestCount) * 100).toFixed(1) : "0.0";
  const clickRate = requestCount > 0 ? ((totalStats.clicks / requestCount) * 100).toFixed(1) : "0.0";

  // Filter stats for chart
  const filteredStats = dailyStats.filter((stat) => {
    const statDate = new Date(stat.date);
    return (
      (!startDate || new Date(startDate) <= statDate) &&
      (!endDate || statDate <= new Date(endDate))
    );
  });

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }



  return (
    <div 
      className="dashboard-section" 
      style={{ display: isVisible ? 'block' : 'none' }}
    >      {/* Dashboard Sub-tabs */}
      <div className="dashboard-tabs">
        <button
          className={dashboardTab === "Overview" ? "active" : ""}
          onClick={() => handleDashboardTabChange("Overview")}
        >
          Overview
        </button>
        <button
          className={dashboardTab === "Details" ? "active" : ""}
          onClick={() => handleDashboardTabChange("Details")}
        >
          Details
        </button>
      </div>

      {/* View Selection and Date Filters */}
      <div className="form-controls">
        <div className="form-group">
          <label>List <span style={{ color: "red" }}>*</span></label>
          <select
            value={selectedView}
            onChange={handleViewChange}
            className={!selectedView ? "error" : ""}
          >
            <option value="">Select a list</option>
            {availableViews.map((view) => (
              <option key={view.id} value={view.id}>
                {view.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Start date:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange('start', e.target.value)}
            max={endDate || undefined}
          />
        </div>

        <div className="form-group">
          <label>End date:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange('end', e.target.value)}
            min={startDate || undefined}
          />
        </div>

        {(startDate || endDate) && (
          <button
            className="btn-clear"
            onClick={() => {
              setStartDate("");
              setEndDate("");
              saveCurrentState();
            }}
          >
            Clear dates
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stats-card">
          <h3>Sent</h3>
          {loading ? (
            <p className="value">Loading...</p>
          ) : !selectedView ? (
            <p className="value">-</p>
          ) : (
            <p className="value">{requestCount}</p>
          )}
        </div>

        <div className="stats-card orange">
          <h3>Unique opens</h3>
          {loading ? (
            <p className="value">Loading...</p>
          ) : !selectedView ? (
            <p className="value">-</p>
          ) : (
            <>
              <p className="value">{totalStats.opens}</p>
              <p className="percentage">({openRate}%)</p>
            </>
          )}
        </div>

        <div className="stats-card blue">
          <h3>Unique clicks</h3>
          {loading ? (
            <p className="value">Loading...</p>
          ) : !selectedView ? (
            <p className="value">-</p>
          ) : (
            <>
              <p className="value">{totalStats.clicks}</p>
              <p className="percentage">({clickRate}%)</p>
            </>
          )}
        </div>
      </div>

      {/* Overview Tab Content */}
      {dashboardTab === "Overview" && (
        <div className="chart-container">
          <h2>Statistics overview</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={
                filteredStats.length
                  ? filteredStats
                  : [{ date: "", sent: 0, opens: 0, clicks: 0 }]
              }
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend verticalAlign="top" height={36} />
              <Line
                type="monotone"
                dataKey="sent"
                stroke="#00C49F"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="opens"
                stroke="#FF8042"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#8884d8"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Details Tab Content */}
      {dashboardTab === "Details" && (
        <>
          <div className="event-buttons" style={{ marginBottom: 16 }}>
            <button
              onClick={() => handleEmailFilterTypeChange("opens")}
              className={`btn-open ${emailFilterType === "opens" ? "active" : ""}`}
            >
              Opens
            </button>
            <button
              onClick={() => handleEmailFilterTypeChange("clicks")}
              className={`btn-click ${emailFilterType === "clicks" ? "active" : ""}`}
            >
              Clicks
            </button>
            <button
              onClick={() => handleEmailFilterTypeChange("opens-no-clicks")}
              className={`btn-filter ${emailFilterType === "opens-no-clicks" ? "active" : ""}`}
              style={{
                background: emailFilterType === "opens-no-clicks" ? "#ff9800" : undefined,
              }}
            >
              Opens not clicked
            </button>
            <button
              onClick={() => handleEmailFilterTypeChange("all")}
              className={`btn-filter ${emailFilterType === "all" ? "active" : ""}`}
            >
              All
            </button>
            <button
              onClick={() => handleEmailFilterTypeChange("email-logs")}
              className={`btn-filter ${emailFilterType === "email-logs" ? "active" : ""}`}
              style={{
                background: emailFilterType === "email-logs" ? "#28a745" : undefined,
              }}
            >
              Sent
            </button>
            <button
              onClick={handleRefresh}
              className="btn-refresh"
              disabled={isRefreshing}
              style={{ marginLeft: "auto" }}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* ContactsTable Component */}
<DynamicContactsTable
  data={
    emailFilterType === "email-logs"
      ? transformEmailLogsForTable(getFilteredEmailLogs())
      : getFilteredEmailContacts()
  }
  isLoading={isRefreshing || loading}
  search={
    emailFilterType === "email-logs"
      ? emailLogsSearch
      : detailSearchQuery
  }
  setSearch={
    emailFilterType === "email-logs"
      ? setEmailLogsSearch
      : setDetailSearchQuery
  }
  showCheckboxes={true}
  paginated={true}
  currentPage={
    emailFilterType === "email-logs"
      ? emailLogsCurrentPage
      : currentPage
  }
  pageSize={20}
  onPageChange={
    emailFilterType === "email-logs"
      ? setEmailLogsCurrentPage
      : setCurrentPage
  }
    selectedItems={
    emailFilterType === "email-logs"
      ? selectedEmailLogs
      : detailSelectedContacts
  }
  onSelectItem={
    emailFilterType === "email-logs"
      ? handleSelectEmailLog  // This already uses functional updates after our change above
      : (id: string) => {
          setDetailSelectedContacts(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(id)) {
              newSelection.delete(id);
            } else {
              newSelection.add(id);
            }
            return newSelection;
          });
        }
  }
  totalItems={
    emailFilterType === "email-logs"
      ? getFilteredEmailLogs().length
      : getFilteredEmailContacts().length
  }
  
  // Remove the onSelectAll prop completely - let DynamicContactsTable handle it internally
  // The internal handleSelectAll in DynamicContactsTable will call onSelectItem for each item
  
  // Configuration settings
  autoGenerateColumns={false}
  customColumns={
    emailFilterType === "email-logs"
      ? emailLogsColumns
      : emailColumns
  }
  customFormatters={{
    // Date formatting
    timestamp: (value: any) => formatMailTimestamp(value),
    sentAt: (value: any) => formatMailTimestamp(value),
    
    // Status formatting
    isSuccess: (value: any) => {
      if (typeof value === 'string' && (value.includes('✅') || value.includes('❌'))) {
        return (
          <span style={{ 
            color: value.includes('✅') ? "#28a745" : "#dc3545", 
            fontWeight: 500 
          }}>
            {value}
          </span>
        );
      }
      return value ? "✅ Sent" : "❌ Failed";
    },
    
    // Event type formatting
    eventType: (value: any) => (
      <span style={{
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 500,
        background: value === 'Open' ? '#e3f2fd' : '#f3e5f5',
        color: value === 'Open' ? '#1976d2' : '#7b1fa2'
      }}>
        {value}
      </span>
    ),
    
    // Subject formatting
    subject: (value: any) => {
      if (!value || value === '-') return '-';
      const truncated = value.length > 50 ? value.substring(0, 50) + "..." : value;
      return <span title={value}>{truncated}</span>;
    },
    
    // Boolean formatting
    hasOpened: (value: any) => value ? "✅" : "-",
    hasClicked: (value: any) => value ? "✅" : "-",
    
    // Name formatting with warning
     full_name: (value: any, item: any) => {
      if (item.contactId === 0) {
        return `${value} ⚠️`;
      }
      return value || '-';
    },
    name: (value: any, item: any) => {
      if (item.contactId === 0) {
        return `${value} ⚠️`;
      }
      return value || '-';
    },
    
    // URL formatting
    linkedin_URL: (value: any) => {
      if (!value || value === '-') return '-';
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#0066cc", textDecoration: "underline" }}
          onClick={(e) => e.stopPropagation()}
        >
          LinkedIn Profile
        </a>
      );
    },
    linkedIn: (value: any) => {
      if (!value || value === '-') return '-';
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#0066cc", textDecoration: "underline" }}
          onClick={(e) => e.stopPropagation()}
        >
          LinkedIn Profile
        </a>
      );
    },
    website: (value: any) => {
      if (!value || value === '-') return '-';
      const url = value.startsWith('http') ? value : `https://${value}`;
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#0066cc", textDecoration: "underline" }}
          onClick={(e) => e.stopPropagation()}
        >
          Website
        </a>
      );
    },
      targetUrl: (value: any) => {
      if (!value || value === '-') return '-';
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#0066cc", textDecoration: "underline" }}
          onClick={(e) => e.stopPropagation()}
          title={value}
        >
          {value.length > 50 ? value.substring(0, 50) + "..." : value}
        </a>
      );
    },
    
    // Email formatting
    email: (value: any) => {
      if (!value || value === '-') return '-';
      return (
        <a
          href={`mailto:${value}`}
          style={{ color: "#0066cc", textDecoration: "underline" }}
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      );
    },
    toEmail: (value: any) => {
      if (!value || value === '-') return '-';
      return (
        <a
          href={`mailto:${value}`}
          style={{ color: "#0066cc", textDecoration: "underline" }}
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      );
    }
  }}
  
  searchFields={
    emailFilterType === "email-logs" 
      ? ['name', 'toEmail', 'company', 'jobTitle', 'subject', 'process_name', 'address']
      : ['full_name', 'email', 'company', 'jobTitle', 'location']
  }
  primaryKey="id"
  viewMode="table"
  customHeader={
    emailFilterType === "email-logs"
      ? getEmailLogsHeader()
      : getEngagementHeader()
  }
  onColumnsChange={
    emailFilterType === "email-logs"
      ? setEmailLogsColumns
      : setEmailColumns
  }
/>
          {/* Email Logs Summary */}
          {emailFilterType === "email-logs" && (
            <div className="email-summary" style={{ marginTop: 20 }}>
              <div className="stats-cards">
                <div className="stats-card">
                  <h3>Total emails</h3>
                  <p className="value">{getFilteredEmailLogs().length}</p>
                </div>
                <div className="stats-card" style={{ background: "#d4edda" }}>
                  <h3>Successfully sent</h3>
                  <p className="value">
                    {getFilteredEmailLogs().filter((log) => log.isSuccess).length}
                  </p>
                </div>
                <div className="stats-card" style={{ background: "#f8d7da" }}>
                  <h3>Failed</h3>
                  <p className="value">
                    {getFilteredEmailLogs().filter((log) => !log.isSuccess).length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Segment Save Modal */}
          {showSaveSegmentModal && (
            <div
              style={{
                position: "fixed",
                zIndex: 99999,
                inset: 0,
                background: "rgba(0,0,0,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  background: "#fff",
                  padding: 40,
                  borderRadius: 12,
                  minWidth: 400,
                  maxWidth: 500,
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                }}
              >
                <h2 style={{ marginTop: 0 }}>Create Segment</h2>
                
                <div style={{ marginBottom: 16, padding: 12, background: "#f8f9fa", borderRadius: 6 }}>
                  <p style={{ margin: 0, fontSize: 14, color: "#666" }}>
                    <strong>Source:</strong> {emailFilterType === "email-logs" ? "Email Logs" : "Engagement Data"}
                  </p>
                  <p style={{ margin: 0, fontSize: 14, color: "#666" }}>
                    <strong>Selected:</strong> {
                      emailFilterType === "email-logs" 
                        ? selectedEmailLogs.size 
                        : detailSelectedContacts.size
                    } contact{(emailFilterType === "email-logs" ? selectedEmailLogs.size : detailSelectedContacts.size) > 1 ? "s" : ""}
                  </p>
                  <p style={{ margin: 0, fontSize: 14, color: "#666" }}>
                    <strong>Data File:</strong> {availableViews.find(v => v.id.toString() === selectedView)?.name || "Unknown"}
                  </p>
                </div>

                <div className="form-group">
                  <label>Segment Name <span style={{ color: "red" }}>*</span></label>
                  <input
                    type="text"
                    placeholder="Enter segment name"
                    value={segmentName}
                    onChange={(e) => setSegmentName(e.target.value)}
                    autoFocus
                    style={{ width: "100%", marginBottom: 10 }}
                  />
                </div>

                <div className="form-group">
                  <label>Description (optional)</label>
                  <textarea
                    placeholder="Enter segment description"
                    value={segmentDescription}
                    onChange={(e) => setSegmentDescription(e.target.value)}
                    style={{ width: "100%", minHeight: 80, resize: "vertical" }}
                    rows={3}
                  />
                </div>

                <div
                  style={{
                    marginTop: 24,
                    display: "flex",
                    gap: 12,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={() => {
                      setShowSaveSegmentModal(false);
                      setSegmentName("");
                      setSegmentDescription("");
                    }}
                    className="button secondary"
                    disabled={savingSegment}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEmailSegment}
                    className="button primary"
                    disabled={
                      !segmentName.trim() ||
                      savingSegment ||
                      !selectedView ||
                      (emailFilterType === "email-logs" ? selectedEmailLogs.size === 0 : detailSelectedContacts.size === 0)
                    }
                  >
                    {savingSegment ? "Creating..." : "Create Segment"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MailDashboard;