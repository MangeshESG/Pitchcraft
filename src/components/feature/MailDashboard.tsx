import React, { useState, useEffect } from "react";
import axios from "axios";
import type { EventItem, EmailLog } from "../../contexts/AppDataContext";
import DynamicContactsTable from "./DynamicContactsTable";
import AppModal from "../common/AppModal";
import { useAppModal } from "../../hooks/useAppModal";
import SegmentModal from "../common/SegmentModal";
import LoadingSpinner from "../common/LoadingSpinner";

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
import { Tooltip as ReactTooltip } from "react-tooltip";
import ContactDetailView from "./contacts/ContactDetailView";

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
  sentAt?: string;
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

// Add Campaign interface
interface Campaign {
  id: number;
  campaignName: string;
  promptId: number;
  zohoViewId: string | null;
  segmentId: number | null;
  clientId: number;
  segmentName: string | null;
  dataSource: "DataFile" | "Segment";
}

interface MailDashboardProps {
  effectiveUserId: string | null;
  token: string | null;
  isVisible: boolean;
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
  const {
    saveFormState,
    getFormState,
    saveDashboardData,
    getDashboardData,
    clearDashboardCacheForUser,
  } = useAppData();

  const FORM_STATE_KEY = "mail-dashboard";

  // All useState hooks - Changed selectedView to selectedCampaign
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [dashboardTab, setDashboardTab] = useState("Overview");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [allEventData, setAllEventData] = useState<EventItem[]>([]);
  const [allEmailLogs, setAllEmailLogs] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [missingLogs, setMissingLogs] = useState<any[]>([]);
  const [filteredEventData, setFilteredEventData] = useState<EventItem[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  //for fullname in contacts
  const [viewMode, setViewMode] = useState<"table" | "detail">("table");
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "history">("profile");

  const [totalStats, setTotalStats] = useState({
    sent: 0,
    opens: 0,
    clicks: 0,
    totalClicks: 0,
    errors: 0,
  });
  const [requestCount, setRequestCount] = useState(0);
  const [emailFilterType, setEmailFilterType] = useState<
    | "all"
    | "opens"
    | "clicks"
    | "opens-no-clicks"
    | "opens-and-clicks"
    | "email-logs"
    | "missing-logs"
  >("all");
  const [detailSelectedContacts, setDetailSelectedContacts] = useState<
    Set<string>
  >(new Set());
  const [selectedEmailLogs, setSelectedEmailLogs] = useState<Set<string>>(
    new Set()
  );
  const [selectedMissingLogs, setSelectedMissingLogs] = useState<Set<string>>(
    new Set()
  );
  const [detailSearchQuery, setDetailSearchQuery] = useState("");
  const [emailLogsSearch, setEmailLogsSearch] = useState("");
  const [missingLogsSearch, setMissingLogsSearch] = useState("");
  const [emailLogsCurrentPage, setEmailLogsCurrentPage] = useState(1);
  const [missingLogsCurrentPage, setMissingLogsCurrentPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSaveSegmentModal, setShowSaveSegmentModal] = useState(false);
  const [dataFetchedForCampaign, setDataFetchedForCampaign] =
    useState<string>("");
  const [deletingContacts, setDeletingContacts] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [contactsToDelete, setContactsToDelete] = useState<number[]>([]);

  const [emailColumns, setEmailColumns] = useState<ColumnConfig[]>([
    { key: "checkbox", label: "", visible: true, width: "40px" },
    { key: "full_name", label: "Full name", visible: true },
    { key: "email", label: "Email address", visible: true },
    { key: "company", label: "Company", visible: true },
    { key: "jobTitle", label: "Job title", visible: true },
    { key: "location", label: "Location", visible: true },
    { key: "eventType", label: "Event type", visible: true },
    { key: "timestamp", label: "Timestamp", visible: true },
    { key: "sentAt", label: "Sent At", visible: true },
    { key: "targetUrl", label: "Target URL", visible: false },
    { key: "linkedin_URL", label: "LinkedIn", visible: false },
    { key: "website", label: "Website", visible: false },
    { key: "hasOpened", label: "Opened", visible: true },
    { key: "hasClicked", label: "Clicked", visible: true },
    { key: "ipAddress", label: "IP Address", visible: true },
  ]);

  const [emailLogsColumns, setEmailLogsColumns] = useState([
    { key: "checkbox", label: "", visible: true, width: "40px" },
    { key: "name", label: "Full Name", visible: true },
    { key: "toEmail", label: "Email Address", visible: true },
    { key: "company", label: "Company", visible: true },
    { key: "jobTitle", label: "Job title", visible: true },
    { key: "address", label: "Location", visible: true },
    { key: "subject", label: "Subject", visible: true },
    { key: "isSuccess", label: "Status", visible: true },
    { key: "sentAt", label: "Sent At", visible: true },
    { key: "process_name", label: "Process", visible: true },
    { key: "linkedIn", label: "LinkedIn", visible: true },
    { key: "website", label: "Website", visible: true },
    { key: "errorMessage", label: "Error Message", visible: false },
  ]);

  const [missingLogsColumns, setMissingLogsColumns] = useState([
    { key: "checkbox", label: "", visible: true, width: "40px" },
    { key: "full_name", label: "Full Name", visible: true },
    { key: "email", label: "Email Address", visible: true },
    { key: "company_name", label: "Company", visible: true },
    { key: "job_title", label: "Job Title", visible: true },
    { key: "country_or_address", label: "Location", visible: true },
    { key: "email_subject", label: "Subject", visible: true },
    { key: "linkedin_url", label: "LinkedIn", visible: true },
    { key: "website", label: "Website", visible: true },
  ]);

  const appModal = useAppModal();

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading...");
  const withLoader = async (message: string, operation: () => Promise<void>) => {
    setLoadingMessage(message);
    setIsLoading(true);
    try {
      await operation();
    } finally {
      setIsLoading(false);
    }
  };
  // =================== ALL useEffect hooks ===================

  // 1. Initialize component - Updated to use selectedCampaign
  useEffect(() => {
    if (!effectiveUserId || !isVisible) return;

    const initializeComponent = async () => {
      console.log("🔄 Initializing MailDashboard component");

      const savedState = getFormState(FORM_STATE_KEY);
      let campaignToLoad = selectedCampaign;

      if (savedState && savedState.effectiveUserId === effectiveUserId) {
        console.log("📥 Restoring saved state:", savedState);

        if (savedState.selectedCampaign && savedState.selectedCampaign !== "") {
          setSelectedCampaign(savedState.selectedCampaign);
          campaignToLoad = savedState.selectedCampaign;
          console.log(
            "✅ Restored selectedCampaign:",
            savedState.selectedCampaign
          );
        }

        if (
          savedState.dashboardTab &&
          savedState.dashboardTab !== dashboardTab
        ) {
          setDashboardTab(savedState.dashboardTab);
        }
        if (savedState.startDate && savedState.startDate !== startDate) {
          setStartDate(savedState.startDate);
        }
        if (savedState.endDate && savedState.endDate !== endDate) {
          setEndDate(savedState.endDate);
        }
        if (
          savedState.emailFilterType &&
          savedState.emailFilterType !== emailFilterType
        ) {
          setEmailFilterType(savedState.emailFilterType);
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (campaignToLoad) {
        const cachedData = getDashboardData(campaignToLoad, effectiveUserId);

        if (cachedData) {
          console.log(
            "✅ Using cached data during initialization:",
            campaignToLoad
          );
          console.log("📦 Initial cached data:", {
            events: cachedData.allEventData.length,
            emails: cachedData.allEmailLogs.length,
          });

          setAllEventData(cachedData.allEventData);
          setAllEmailLogs(cachedData.allEmailLogs);
          setEmailLogs(cachedData.emailLogs);
          setDataFetchedForCampaign(campaignToLoad);

          processDataWithDateFilter(
            cachedData.allEventData,
            cachedData.allEmailLogs,
            startDate,
            endDate
          );

          console.log("✅ Initialization complete with cached data");
        } else {
          console.log("❌ No cached data found for campaign:", campaignToLoad);
        }
      } else {
        console.log("⚠️ No campaignToLoad available");
      }
    };

    initializeComponent();
  }, [effectiveUserId, isVisible]);

  // 2. Load available campaigns - Updated API endpoint
  useEffect(() => {
    if (!effectiveUserId || !isVisible) return;

    const loadAvailableCampaigns = async () => {
      await withLoader("Loading campaigns...", async () => {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/api/auth/campaigns/client/${effectiveUserId}`,
            { headers: { ...(token && { Authorization: `Bearer ${token}` }) } }
          );
          setAvailableCampaigns(response.data);
        } catch (error) {
          console.error("Dashboard: Error loading campaigns:", error);
          setAvailableCampaigns([]);
        }
      });
    };

    loadAvailableCampaigns();
  }, [effectiveUserId, token, isVisible]);

  // 3. Fetch data when selectedCampaign changes
  useEffect(() => {
    if (!isVisible || !effectiveUserId || !selectedCampaign) return;

    if (dataFetchedForCampaign === selectedCampaign || loading) return;

    const cachedData = getDashboardData(selectedCampaign, effectiveUserId);

    if (cachedData) {
      console.log(
        "✅ Using cached data for campaign change:",
        selectedCampaign
      );
      console.log("📦 Cached data details:", {
        events: cachedData.allEventData.length,
        emails: cachedData.allEmailLogs.length,
        emailLogs: cachedData.emailLogs.length,
      });

      setAllEventData(cachedData.allEventData);
      setAllEmailLogs(cachedData.allEmailLogs);
      setEmailLogs(cachedData.emailLogs);
      setDataFetchedForCampaign(selectedCampaign);

      processDataWithDateFilter(
        cachedData.allEventData,
        cachedData.allEmailLogs,
        startDate,
        endDate
      );

      console.log("✅ State updated with cached data");
    } else {
      console.log(
        "❌ No cache found, fetching data for campaign:",
        selectedCampaign
      );
      fetchLogsByCampaign(selectedCampaign);
    }
  }, [
    selectedCampaign,
    isVisible,
    effectiveUserId,
    dataFetchedForCampaign,
    loading,
    getDashboardData,
  ]);



  // 5. Process data when date filters change
  useEffect(() => {
    if ((allEventData.length > 0 || allEmailLogs.length > 0) && isVisible) {
      processDataWithDateFilter(allEventData, allEmailLogs, startDate, endDate);
    }
  }, [startDate, endDate, allEventData, allEmailLogs, isVisible]);

  // 6. Load email logs for email-logs filter type - Updated for campaigns
  useEffect(() => {
    if (!isVisible) return;

    if (
      selectedCampaign &&
      emailFilterType === "email-logs" &&
      effectiveUserId
    ) {
      const loadEmailLogs = async () => {
        await withLoader("Loading email logs...", async () => {
          try {
            const campaign = availableCampaigns.find(
              (c) => c.id.toString() === selectedCampaign
            );

            if (campaign?.dataSource === "DataFile" && campaign.zohoViewId) {
              const dataFileId = Number(campaign.zohoViewId);
              const clientId = Number(effectiveUserId);
              const logs = await fetchEmailLogs(clientId, dataFileId);
              setEmailLogs(logs);

            } else if (campaign?.dataSource === "Segment" && campaign.segmentId) {
              console.log("Loading email logs for segment:", campaign.segmentId);
              try {
                // Use the new segment email logs API
                const response = await axios.get(
                  `${API_BASE_URL}/api/Crm/getlogs-by-segment`,
                  {
                    params: {
                      clientId: Number(effectiveUserId),
                      segmentId: campaign.segmentId,
                    },
                    headers: {
                      ...(token && { Authorization: `Bearer ${token}` }),
                    },
                  }
                );
                setEmailLogs(response.data || []);
              } catch (error) {
                console.error("Error loading segment email logs:", error);
                setEmailLogs([]);
              }
            }
          } catch (error) {
            console.error("Error loading email logs:", error);
            setEmailLogs([]);
          }
        });
      };
      loadEmailLogs();
    }

    // Load missing logs
    if (
      selectedCampaign &&
      emailFilterType === "missing-logs" &&
      effectiveUserId &&
      startDate &&
      endDate
    ) {
      const loadMissingLogs = async () => {
        await withLoader("Loading missing logs...", async () => {
          try {
            const campaign = availableCampaigns.find(
              (c) => c.id.toString() === selectedCampaign
            );

            if (campaign?.dataSource === "DataFile" && campaign.zohoViewId) {
              const dataFileId = Number(campaign.zohoViewId);
              const response = await axios.get(
                `${API_BASE_URL}/track/missing-log-contacts`,
                {
                  params: {
                    startDate,
                    endDate,
                    dataFileId,
                  },
                  headers: {
                    ...(token && { Authorization: `Bearer ${token}` }),
                  },
                }
              );
              
              console.log('Missing logs API response:', response.data);
              
              // Handle different response structures
              let missingContactsData = [];
              if (response.data.missingContacts) {
                missingContactsData = response.data.missingContacts;
              } else if (Array.isArray(response.data)) {
                missingContactsData = response.data;
              } else {
                console.warn('Unexpected API response structure:', response.data);
                missingContactsData = [];
              }
              
              const transformedData = missingContactsData.map((contact: any, index: number) => ({
                id: contact.contactId || index + 1,
                contactId: contact.contactId,
                full_name: contact.full_name || contact.fullName || contact.name || "-",
                email: contact.email || contact.emailAddress || "-",
                company_name: contact.company_name || contact.companyName || contact.company || "-",
                job_title: contact.job_title || contact.jobTitle || contact.title || "-",
                country_or_address: contact.country_or_address || contact.address || contact.location || "-",
                email_subject: contact.email_subject || contact.subject || "-",
                linkedin_url: contact.linkedin_url || contact.linkedinUrl || contact.linkedin || "-",
                website: contact.website || contact.websiteUrl || "-"
              }));
              
              console.log('Transformed missing logs data:', transformedData);
              setMissingLogs(transformedData);
            } else {
              setMissingLogs([]);
            }
          } catch (error) {
            console.error("Error loading missing logs:", error);
            setMissingLogs([]);
          }
        });
      };
      loadMissingLogs();
    }
  }, [
    selectedCampaign,
    emailFilterType,
    effectiveUserId,
    isVisible,
    availableCampaigns,
    startDate,
    endDate,
  ]);

  // 7. Clear cache when user changes
  useEffect(() => {
    if (effectiveUserId) {
      setDataFetchedForCampaign("");
    }
  }, [effectiveUserId]);



  // Auto-save state when selectedCampaign changes
  useEffect(() => {
    if (selectedCampaign && effectiveUserId) {
      console.log(
        "💾 Auto-saving state for selectedCampaign:",
        selectedCampaign
      );
      saveCurrentState();
    }
  }, [
    selectedCampaign,
    effectiveUserId,
    dashboardTab,
    startDate,
    endDate,
    emailFilterType,
  ]);

  // =================== NOW AFTER ALL HOOKS - EARLY RETURN ===================
  if (!effectiveUserId || !isVisible) {
    return null;
  }

  // =================== ALL FUNCTIONS AFTER EARLY RETURN ===================
  const saveCurrentState = () => {
    if (!selectedCampaign) {
      console.log("⚠️ Skipping state save - no selectedCampaign");
      return;
    }

    const stateToSave = {
      selectedCampaign,
      dashboardTab,
      startDate,
      endDate,
      emailFilterType,
      effectiveUserId,
    };

    console.log("💾 Saving current state:", stateToSave);
    saveFormState(FORM_STATE_KEY, stateToSave);
  };

  const fetchEmailLogs = async (
    effectiveUserId: number,
    dataFileId: number
  ) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/Crm/getlogs?clientId=${effectiveUserId}&dataFileId=${dataFileId}`
      );

      if (response.ok) {
        const logs = await response.json();
        console.log("COntacts",logs);
        return logs;
      } else {
        console.error("Failed to fetch email logs");
        return [];
      }
    } catch (error) {
      console.error("Error fetching email logs:", error);
      return [];
    }
  };
  // Updated fetchLogsByCampaign function
  const fetchLogsByCampaign = async (campaignId: string) => {
    await withLoader("Loading campaign data...", async () => {
      try {
        setLoading(true);

        const campaign = availableCampaigns.find(
          (c) => c.id.toString() === campaignId
        );
        if (!campaign) {
          return;
        }

        const clientId = Number(effectiveUserId);
        let allTrackingData: EventItem[] = [];
        let allEmailLogsData: any[] = [];

        if (campaign.dataSource === "DataFile" && campaign.zohoViewId) {
          const dataFileId = Number(campaign.zohoViewId);

          const trackingResponse = await axios.get(
            `${API_BASE_URL}/api/Crm/gettrackinglogs`,
            {
              params: { clientId, dataFileId },
              headers: { ...(token && { Authorization: `Bearer ${token}` }) },
            }
          );

          allTrackingData = trackingResponse.data || [];
          allEmailLogsData = await fetchEmailLogs(clientId, dataFileId);

        } else if (campaign.dataSource === "Segment" && campaign.segmentId) {
          try {
            // Use the new segment tracking logs API
            const segmentTrackingResponse = await axios.get(
              `${API_BASE_URL}/api/Crm/gettrackinglogs-by-segment`,
              {
                params: {
                  clientId: clientId,
                  segmentId: campaign.segmentId,
                },
                headers: { ...(token && { Authorization: `Bearer ${token}` }) },
              }
            );

            allTrackingData = segmentTrackingResponse.data || [];

            // Use the new segment email logs API
            try {
              const segmentEmailLogsResponse = await axios.get(
                `${API_BASE_URL}/api/Crm/getlogs-by-segment`,
                {
                  params: {
                    clientId: clientId,
                    segmentId: campaign.segmentId,
                  },
                  headers: { ...(token && { Authorization: `Bearer ${token}` }) },
                }
              );
              allEmailLogsData = segmentEmailLogsResponse.data || [];
            } catch (emailLogError) {
              console.log(
                "No email logs found for segment, continuing with empty array"
              );
              allEmailLogsData = [];
            }
          } catch (segmentError: any) {
            if (segmentError.response?.status === 404) {
              console.error("No data found for segment:", campaign.segmentId);
            } else {
              throw segmentError;
            }
          }
        } else {
          console.error("Campaign has neither valid dataFileId nor segmentId");
          return;
        }

        setAllEventData(allTrackingData);
        setAllEmailLogs(allEmailLogsData);
        setEmailLogs(allEmailLogsData);

        saveDashboardData(campaignId, {
          allEventData: allTrackingData,
          allEmailLogs: allEmailLogsData,
          emailLogs: allEmailLogsData,
          effectiveUserId: effectiveUserId!,
        });

        setDataFetchedForCampaign(campaignId);

        processDataWithDateFilter(
          allTrackingData,
          allEmailLogsData,
          startDate,
          endDate
        );

        console.log(
          `✅ Data cached for campaign ${campaignId} - ${allTrackingData.length} events, ${allEmailLogsData.length} email logs`
        );
      } catch (error) {
        console.error("Dashboard: Error fetching logs:", error);
        setAllEventData([]);
        setAllEmailLogs([]);
        setEmailLogs([]);
        setFilteredEventData([]);
        setRequestCount(0);
        setDailyStats([]);
        setTotalStats({ sent: 0, opens: 0, clicks: 0, totalClicks: 0, errors: 0 });
        setDataFetchedForCampaign(campaignId);
      } finally {
        setLoading(false);
      }
    });
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
    const dailyTracking: Record<
      string,
      {
        uniqueOpens: Set<string>;
        uniqueClicks: Set<string>;
        sentCount: number;
      }
    > = {};

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
    const totalSentCount = filteredEmailLogs.filter(
      (log: any) => log.isSuccess
    ).length;
    const totalClickCount = filteredTrackingData.filter(item => item.eventType === 'Click').length;
    const errorCount = filteredEmailLogs.filter((log: any) => !log.isSuccess).length;
    
    setRequestCount(totalSentCount);
    setTotalStats({
      sent: totalSentCount,
      opens: uniqueOpensInDateRange.size,
      clicks: uniqueClicksInDateRange.size,
      totalClicks: totalClickCount,
      errors: errorCount,
    });

    // Update filtered event data
    setFilteredEventData(filteredTrackingData);
  };

  // Event Handlers - Updated for campaigns
  const handleCampaignChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newCampaignId = e.target.value;
    const previousCampaign = selectedCampaign;

    console.log(
      "🔄 Campaign changing from",
      previousCampaign,
      "to",
      newCampaignId
    );

    setSelectedCampaign(newCampaignId);

    // Save state immediately after setting new campaign
    if (newCampaignId) {
      const stateToSave = {
        selectedCampaign: newCampaignId,
        dashboardTab,
        startDate,
        endDate,
        emailFilterType,
        effectiveUserId,
      };
      console.log("💾 Saving state on campaign change:", stateToSave);
      saveFormState(FORM_STATE_KEY, stateToSave);

      // Reset dataFetchedForCampaign if changing to different campaign
      if (previousCampaign !== newCampaignId) {
        setDataFetchedForCampaign("");
      }
    } else {
      // Clear data if no campaign selected
      setAllEventData([]);
      setEmailLogs([]);
      setDailyStats([]);
      setTotalStats({ sent: 0, opens: 0, clicks: 0, totalClicks: 0, errors: 0 });
      setRequestCount(0);
      setDataFetchedForCampaign("");
    }
  };

  const handleDashboardTabChange = (tabName: string) => {
    setDashboardTab(tabName);
    saveCurrentState();
  };

  const handleDateChange = (type: "start" | "end", value: string) => {
    if (type === "start") {
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


  // Helper Functions
  const formatMailTimestamp = (input: string): string => {
    if (!input) return "";

    try {
      const date = new Date(input);
      if (isNaN(date.getTime())) return "Invalid date";

      const day = date.getDate().toString().padStart(2, "0");
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
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
  // Transform event data for table
  const transformEventDataForTable = (
    eventData: EventItem[]
  ): EmailContact[] => {
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
        sentAt: (item as any).sentAt || undefined,
        eventType: item.eventType as "Open" | "Click",
        targetUrl: item.targetUrl || undefined,
        hasOpened: false,
        hasClicked: false,
        ipAddress: (item as any).ipAddress || "-",
      }));

    // Calculate hasOpened and hasClicked for each unique email
    const emailStats = new Map<
      string,
      { hasOpened: boolean; hasClicked: boolean }
    >();

    eventData.forEach((item) => {
      const stats = emailStats.get(item.email) || {
        hasOpened: false,
        hasClicked: false,
      };
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
        const emailsWithBoth = new Map<
          string,
          { hasOpened: boolean; hasClicked: boolean }
        >();
        filteredEventData.forEach((item) => {
          const stats = emailsWithBoth.get(item.email) || {
            hasOpened: false,
            hasClicked: false,
          };
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
      subject:
        log.subject && log.subject.length > 50
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

  // Get filtered missing logs
  const getFilteredMissingLogs = () => {
    let filteredLogs = missingLogs;

    // Apply search filter
    if (missingLogsSearch) {
      const searchLower = missingLogsSearch.toLowerCase();
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.full_name?.toLowerCase().includes(searchLower) ||
          log.email?.toLowerCase().includes(searchLower) ||
          log.company_name?.toLowerCase().includes(searchLower) ||
          log.job_title?.toLowerCase().includes(searchLower) ||
          log.email_subject?.toLowerCase().includes(searchLower)
      );
    }

    return filteredLogs;
  };

  // Get filtered email logs
  const getFilteredEmailLogs = () => {
    let filteredLogs = emailLogs;

    // Filter to show complete records first
    const completeRecords = filteredLogs.filter(
      (log) => log.name && log.company && log.jobTitle && log.contactId
    );
    const incompleteRecords = filteredLogs.filter(
      (log) => !log.name || !log.company || !log.jobTitle || !log.contactId
    );
    filteredLogs = [...completeRecords, ...incompleteRecords];

    // Apply search filter
    if (emailLogsSearch) {
      const searchLower = emailLogsSearch.toLowerCase();
      filteredLogs = filteredLogs.filter(
        (log) =>
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
          style={{ color: "#3f9f42", textDecoration: "underline" }}
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
          style={{ color: "#3f9f42", textDecoration: "underline" }}
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
          style={{ color: "#3f9f42", textDecoration: "underline" }}
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
        return log.sentAt && log.sentAt !== "-"
          ? formatMailTimestamp(log.sentAt)
          : "-";
      case "isSuccess":
        return (
          <span
            style={{
              color:
                log.statusColor ||
                (log.isSuccess === "✅ Sent" ? "#28a745" : "#dc3545"),
              fontWeight: 500,
            }}
          >
            {log.isSuccess || "-"}
          </span>
        );
      case "subject":
        const subject = log.subject || "-";
        const fullSubject = log.fullSubject || log.subject || "-";
        return subject !== "-" ? (
          <span title={fullSubject}>{subject}</span>
        ) : (
          "-"
        );
      case "website":
        if (log.website && log.website !== "-") {
          return (
            <a
              href={
                log.website.startsWith("http")
                  ? log.website
                  : `https://${log.website}`
              }
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#3f9f42", textDecoration: "underline" }}
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
              style={{ color: "#3f9f42", textDecoration: "underline" }}
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
              style={{ color: "#3f9f42", textDecoration: "underline" }}
              onClick={(e) => e.stopPropagation()}
            >
              LinkedIn Profile
            </a>
          );
        }
        return "-";
      default:
        const value = log[key];
        return value !== null &&
          value !== undefined &&
          value !== "" &&
          value !== "-"
          ? value
          : "-";
    }
  };

  // Selection Handlers
  const handleSelectEmailLog = (logId: string) => {
    setSelectedEmailLogs((prev) => {
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
    const currentPageLogs = transformEmailLogsForTable(
      getFilteredEmailLogs()
    ).slice((emailLogsCurrentPage - 1) * 20, emailLogsCurrentPage * 20);

    setSelectedEmailLogs((prev) => {
      const newSelection = new Set(prev);
      if (prev.size === currentPageLogs.length && currentPageLogs.length > 0) {
        // Clear all
        return new Set();
      } else {
        // Select all on current page
        currentPageLogs.forEach((log) => {
          newSelection.add(log.id.toString());
        });
        return newSelection;
      }
    });
  };

  const handleSelectMissingLog = (logId: string) => {
    setSelectedMissingLogs((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(logId)) {
        newSelection.delete(logId);
      } else {
        newSelection.add(logId);
      }
      return newSelection;
    });
  };

  const handleSelectAllMissingLogs = () => {
    const currentPageLogs = getFilteredMissingLogs().slice(
      (missingLogsCurrentPage - 1) * 20,
      missingLogsCurrentPage * 20
    );

    setSelectedMissingLogs((prev) => {
      const newSelection = new Set(prev);
      if (prev.size === currentPageLogs.length && currentPageLogs.length > 0) {
        return new Set();
      } else {
        currentPageLogs.forEach((log) => {
          newSelection.add(log.id.toString());
        });
        return newSelection;
      }
    });
  };

  // Helper function to get contact IDs based on filter type
  const getSegmentContactIds = (): number[] => {
    let contactIds: number[] = [];

    if (emailFilterType === "email-logs") {
      const selectedLogs = getFilteredEmailLogs().filter((log) =>
        selectedEmailLogs.has(log.id.toString())
      );
      contactIds = selectedLogs
        .map((log) => log.contactId)
        .filter((id): id is number => id !== null && id !== undefined);
    } else if (emailFilterType === "missing-logs") {
      const selectedLogs = getFilteredMissingLogs().filter((log) =>
        selectedMissingLogs.has(log.id.toString())
      );
      contactIds = selectedLogs
        .map((log) => log.contactId)
        .filter((id): id is number => id !== null && id !== undefined && id > 0);
    } else {
      const selectedContacts = getFilteredEmailContacts().filter((contact) =>
        detailSelectedContacts.has(contact.id.toString())
      );
      contactIds = selectedContacts
        .map((contact) => contact.contactId)
        .filter(
          (id): id is number => id !== null && id !== undefined && id > 0
        );
    }

    return Array.from(new Set(contactIds));
  };

  // Clear selections after segment operation
  const clearSegmentSelections = () => {
    if (emailFilterType === "email-logs") {
      setSelectedEmailLogs(new Set());
    } else if (emailFilterType === "missing-logs") {
      setSelectedMissingLogs(new Set());
    } else {
      setDetailSelectedContacts(new Set());
    }
  };

  // Get dataFileId for segment creation
  const getDataFileId = (): number | null => {
    const campaign = availableCampaigns.find(
      (c) => c.id.toString() === selectedCampaign
    );

    if (campaign?.dataSource === "DataFile" && campaign.zohoViewId) {
      return parseInt(campaign.zohoViewId);
    }
    return null;
  };

  // Helper function for invalid contacts count
  const getInvalidContactsCount = (): number => {
    return Array.from(detailSelectedContacts).filter((id) => {
      const contact = getFilteredEmailContacts().find(
        (c) => c.id.toString() === id
      );
      return contact?.contactId === 0;
    }).length;
  };

  // Delete contacts function
  const handleDeleteContacts = async () => {
    if (detailSelectedContacts.size === 0) {
      appModal.showWarning("Please select contacts to delete");
      return;
    }

    const selectedContacts = getFilteredEmailContacts().filter((contact) =>
      detailSelectedContacts.has(contact.id.toString())
    );

    const validContactIds = selectedContacts
      .map((contact) => contact.contactId)
      .filter((id): id is number => id !== null && id !== undefined && id > 0);

    if (validContactIds.length === 0) {
      appModal.showWarning("No valid contacts selected for deletion");
      return;
    }

    setContactsToDelete(validContactIds);
    setShowDeleteConfirmModal(true);
  };

  const performDelete = async (validContactIds: number[]) => {
    await withLoader("Deleting contacts...", async () => {
      setDeletingContacts(true);
      let successCount = 0;
      let errorCount = 0;

      try {
        for (const contactId of validContactIds) {
          try {
            const response = await axios.post(
              `${API_BASE_URL}/track/delete-tracking-contact?contactId=${contactId}`,
              {},
              {
                headers: {
                  'accept': '*/*',
                  ...(token && { Authorization: `Bearer ${token}` }),
                },
              }
            );
            
            if (response.status === 200) {
              successCount++;
            } else {
              errorCount++;
            }
          } catch (error) {
            console.error(`Error deleting contact ${contactId}:`, error);
            errorCount++;
          }
        }

        if (successCount > 0) {
          appModal.showSuccess(
            `Successfully deleted ${successCount} contact${successCount > 1 ? 's' : ''}${errorCount > 0 ? `. ${errorCount} failed.` : ''}`,
            "Contacts Deleted"
          );
          
          // Clear selection and refresh data
          setDetailSelectedContacts(new Set());
          if (selectedCampaign) {
            setDataFetchedForCampaign("");
            await fetchLogsByCampaign(selectedCampaign);
          }
        } else {
          appModal.showError("Failed to delete contacts. Please try again.");
        }
      } catch (error) {
        console.error("Error in delete operation:", error);
        appModal.showError("Error deleting contacts. Please try again.");
      } finally {
        setDeletingContacts(false);
      }
    });
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
          {selectedEmailLogs.size} email log
          {selectedEmailLogs.size > 1 ? "s" : ""} selected
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

  const getMissingLogsHeader = () => {
    if (selectedMissingLogs.size === 0) return null;

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
          {selectedMissingLogs.size} contact
          {selectedMissingLogs.size > 1 ? "s" : ""} selected
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            className="button secondary"
            onClick={() => setSelectedMissingLogs(new Set())}
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
          {detailSelectedContacts.size} contact
          {detailSelectedContacts.size > 1 ? "s" : ""} selected
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
          <button
            className="button"
            onClick={handleDeleteContacts}
            disabled={deletingContacts}
            style={{
              backgroundColor: "#dc3545",
              color: "white",
              border: "1px solid #dc3545"
            }}
          >
            {deletingContacts ? "Deleting..." : "Delete Contact"}
          </button>
        </div>
      </div>
    );
  };

  // Calculate rates
  const openRate =
    requestCount > 0
      ? ((totalStats.opens / requestCount) * 100).toFixed(1)
      : "0.0";
  const clickRate =
    requestCount > 0
      ? ((totalStats.clicks / requestCount) * 100).toFixed(1)
      : "0.0";

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

  // Add this helper function to clean LinkedIn URLs
  const cleanLinkedInUrl = (url: string | undefined): string => {
    if (!url || url === "-" || url === "N/A") return "-";

    // Remove various URL-encoded separators that might be appended
    return url
      .replace(/%7C%7C$/, "") // Remove %7C%7C (||)
      .replace(/\|\|$/, "") // Remove ||
      .replace(/%7C$/, "") // Remove single %7C (|)
      .replace(/\|$/, "") // Remove single |
      .trim();
  };


  const handleRefresh = async () => {
    if (!selectedCampaign) return;

    await withLoader("Refreshing data...", async () => {
      setIsRefreshing(true);
      setDataFetchedForCampaign("");
      try {
        await fetchLogsByCampaign(selectedCampaign);
      } catch (error) {
        console.error("Error refreshing data:", error);
      } finally {
        setIsRefreshing(false);
      }
    });
  };

  return (
    <div
      className="dashboard-section"
      style={{ display: isVisible ? "block" : "none",marginTop:"-60px" }}
    >
      {/* Dashboard Sub-tabs */}
      <div className="dashboard-tabs">
        <button
          className={dashboardTab === "Overview" ? "active !pt-0" : "!pt-0"}
          onClick={() => handleDashboardTabChange("Overview")}
        >
          Overview
        </button>
        <button
          className={dashboardTab === "Details" ? "active !pt-0" : "!pt-0"}
          onClick={() => handleDashboardTabChange("Details")}
        >
          Details
        </button>
      </div>
{/* Dynamic Description */}
  <p style={{marginBottom:'20px'}}>
    {dashboardTab === "Overview"
      ? "The Overview section displays key email campaign metrics—sent, unique opens, and unique clicks—within a selected date range for performance analysis."
      : "The Details section provides in-depth analytics, including recipient-level engagement data and comprehensive campaign performance insights."}
  </p>
      {/* Campaign Selection and Date Filters - Updated */}
      <div className="form-controls">
        <div className="form-group">
          <label>
            Campaign <span style={{ color: "red" }}>*</span>
          </label>
          <select
            value={selectedCampaign}
            onChange={handleCampaignChange}
            className={!selectedCampaign ? "error" : ""}
          >
            <option value="">Campaign</option>
            {availableCampaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.campaignName}
                {campaign.dataSource === "Segment" &&
                  campaign.segmentName &&
                  ` (Segment: ${campaign.segmentName})`}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Start date:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange("start", e.target.value)}
            max={endDate || undefined}
          />
        </div>

        <div className="form-group">
          <label>End date:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange("end", e.target.value)}
            min={startDate || undefined}
          />
        </div>
        <div className="form-group flex items-start">
          <ReactTooltip
            anchorSelect="#mail-dashboard-refresh-analytics"
            place="top"
          >
            Refresh the dashboard analytics
          </ReactTooltip>
          <span
            className="cursor-pointer -ml-[5px]"
            id="mail-dashboard-refresh-analytics"
            onClick={handleRefresh}  // Add this onClick handler
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="41px"
              height="41px"
              viewBox="0 0 30 30"
              fill="none"
            >
              <g fill="#3f9f42" style={{ transform: "translateY(5px)" }}>
                <path d="M8 1.5A6.5 6.5 0 001.5 8 .75.75 0 010 8a8 8 0 0113.5-5.81v-.94a.75.75 0 011.5 0v3a.75.75 0 01-.75.75h-3a.75.75 0 010-1.5h1.44A6.479 6.479 0 008 1.5zM15.25 7.25A.75.75 0 0116 8a8 8 0 01-13.5 5.81v.94a.75.75 0 01-1.5 0v-3a.75.75 0 01.75-.75h3a.75.75 0 010 1.5H3.31A6.5 6.5 0 0014.5 8a.75.75 0 01.75-.75z"></path>
              </g>
            </svg>
          </span>
        </div>

        {(startDate || endDate) && (
          <div className="form-group flex items-start">
            <button
              className="save-button button auto-width small d-flex justify-between align-center -ml-[20px]"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                saveCurrentState();
              }}
            >
              Clear dates
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stats-card">
          <h3>Sent</h3>
          {loading ? (
            <p className="value">Loading...</p>
          ) : !selectedCampaign ? (
            <p className="value">-</p>
          ) : (
            <p className="value">{requestCount}</p>
          )}
        </div>

        <div className="stats-card orange">
          <h3>Unique opens</h3>
          {loading ? (
            <p className="value">Loading...</p>
          ) : !selectedCampaign ? (
            <p className="value">-</p>
          ) : (
            <>
              <p className="value">{totalStats.opens}</p>
              <p className="percentage">({openRate}%)</p>
            </>
          )}
        </div>

        <div className="stats-card purple">
          <h3>Clicks</h3>
          {loading ? (
            <p className="value">Loading...</p>
          ) : !selectedCampaign ? (
            <p className="value">-</p>
          ) : (
            <p className="value">{totalStats.totalClicks}</p>
          )}
        </div>

        <div className="stats-card blue">
          <h3>Unique clicks</h3>
          {loading ? (
            <p className="value">Loading...</p>
          ) : !selectedCampaign ? (
            <p className="value">-</p>
          ) : (
            <>
              <p className="value">{totalStats.clicks}</p>
              <p className="percentage">({clickRate}%)</p>
            </>
          )}
        </div>

        <div className="stats-card red">
          <h3>Errors</h3>
          {loading ? (
            <p className="value">Loading...</p>
          ) : !selectedCampaign ? (
            <p className="value">-</p>
          ) : (
            <>
              <p className="value">{totalStats.errors}</p>
              <p className="percentage">({requestCount > 0 ? ((totalStats.errors / (requestCount + totalStats.errors)) * 100).toFixed(1) : '0.0'}%)</p>
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
              className={`btn-open ${emailFilterType === "opens" ? "active" : ""
                }`}
            >
              Opens
            </button>
            <button
              onClick={() => handleEmailFilterTypeChange("clicks")}
              className={`btn-click ${emailFilterType === "clicks" ? "active" : ""
                }`}
            >
              Clicks
            </button>
            <button
              onClick={() => handleEmailFilterTypeChange("opens-no-clicks")}
              className={`btn-filter ${emailFilterType === "opens-no-clicks" ? "active" : ""
                }`}
              style={{
                background:
                  emailFilterType === "opens-no-clicks" ? "#ff9800" : undefined,
              }}
            >
              Opens not clicked
            </button>
            <button
              onClick={() => handleEmailFilterTypeChange("all")}
              className={`btn-filter ${emailFilterType === "all" ? "active" : ""
                }`}
            >
              All
            </button>
            <button
              onClick={() => handleEmailFilterTypeChange("email-logs")}
              className={`btn-filter ${emailFilterType === "email-logs" ? "active" : ""
                }`}
              style={{
                background:
                  emailFilterType === "email-logs" ? "#28a745" : undefined,
              }}
            >
              Sent
            </button>
            <button
              onClick={() => handleEmailFilterTypeChange("missing-logs")}
              className={`btn-filter ${emailFilterType === "missing-logs" ? "active" : ""}`}
              style={{
                background:
                  emailFilterType === "missing-logs" ? "#dc3545" : undefined,
              }}
            >
              Not Sent
            </button>
            {/* <button
              onClick={handleRefresh}
              className="btn-refresh"
              disabled={isRefreshing}
              style={{ marginLeft: "auto" }}
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button> */}
          </div>

          {/* Missing Logs Date Warning */}
          {emailFilterType === "missing-logs" && (!startDate || !endDate) && (
            <div style={{
              padding: "12px 16px",
              background: "#fff3e0",
              border: "1px solid #ff9800",
              borderRadius: 6,
              marginBottom: 16,
              color: "#e65100"
            }}>
              <strong>Date Range Required:</strong> Please select both start and end dates to view missing logs.
            </div>
          )}

          {/* ContactsTable Component */}          
          <DynamicContactsTable
            data={
              emailFilterType === "email-logs"
                ? transformEmailLogsForTable(getFilteredEmailLogs())
                : emailFilterType === "missing-logs"
                ? getFilteredMissingLogs()
                : getFilteredEmailContacts()
            }
            isLoading={isRefreshing || loading}
            search={
              emailFilterType === "email-logs"
                ? emailLogsSearch
                : emailFilterType === "missing-logs"
                ? missingLogsSearch
                : detailSearchQuery
            }
            setSearch={
              emailFilterType === "email-logs"
                ? setEmailLogsSearch
                : emailFilterType === "missing-logs"
                ? setMissingLogsSearch
                : setDetailSearchQuery
            }
            showCheckboxes={true}
            paginated={true}
            currentPage={
              emailFilterType === "email-logs"
                ? emailLogsCurrentPage
                : emailFilterType === "missing-logs"
                ? missingLogsCurrentPage
                : currentPage
            }
           // pageSize={20}
            onPageChange={
              emailFilterType === "email-logs"
                ? setEmailLogsCurrentPage
                : emailFilterType === "missing-logs"
                ? setMissingLogsCurrentPage
                : setCurrentPage
            }
            selectedItems={
              emailFilterType === "email-logs"
                ? selectedEmailLogs
                : emailFilterType === "missing-logs"
                ? selectedMissingLogs
                : detailSelectedContacts
            }
            onSelectItem={
              emailFilterType === "email-logs"
                ? handleSelectEmailLog
                : emailFilterType === "missing-logs"
                ? handleSelectMissingLog
                : (id: string) => {
                  setDetailSelectedContacts((prev) => {
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
                : emailFilterType === "missing-logs"
                ? getFilteredMissingLogs().length
                : getFilteredEmailContacts().length
            }
            // Configuration settings
            autoGenerateColumns={false}
            customColumns={
              emailFilterType === "email-logs" 
                ? emailLogsColumns 
                : emailFilterType === "missing-logs"
                ? missingLogsColumns
                : emailColumns
            }
            customFormatters={{
              // Date formatting
              timestamp: (value: any) => formatMailTimestamp(value),
              sentAt: (value: any) => formatMailTimestamp(value),

              // Status formatting
              isSuccess: (value: any) => {
                if (
                  typeof value === "string" &&
                  (value.includes("✅") || value.includes("❌"))
                ) {
                  return (
                    <span
                      style={{
                        color: value.includes("✅") ? "#28a745" : "#dc3545",
                        fontWeight: 500,
                      }}
                    >
                      {value}
                    </span>
                  );
                }
                return value ? "✅ Sent" : "❌ Failed";
              },

              // Event type formatting
              eventType: (value: any) => (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: 500,
                    background: value === "Open" ? "#e3f2fd" : "#f3e5f5",
                    color: value === "Open" ? "#1976d2" : "#7b1fa2",
                  }}
                >
                  {value}
                </span>
              ),

              // Subject formatting
              subject: (value: any) => {
                if (!value || value === "-") return "-";
                const truncated =
                  value.length > 50 ? value.substring(0, 50) + "..." : value;
                return <span title={value}>{truncated}</span>;
              },

              // Boolean formatting
              hasOpened: (value: any) => (value ? "✅" : "-"),
              hasClicked: (value: any) => (value ? "✅" : "-"),

              // Name formatting with warning
              // full_name: (value: any, item: any) => {
              //   if (item.contactId === 0) {
              //     return `${value} ⚠️`;
              //   }
              //   return value || "-";
              // },
              full_name: (value: any, item: any) => {
              if (!value) return "-";
 
              const label =
              item.contactId === 0 ? `${value} ⚠️` : value;
              return (
              <span
              style={{
              color: "#186bf3",
              cursor: "pointer",
              fontWeight: 500,
              textDecoration: "underline",
              }}
              onClick={(e) => {
              e.stopPropagation();
              const campaign = availableCampaigns.find(
               (c) => c.id.toString() === selectedCampaign
              );
              const dataFileId = campaign?.zohoViewId || "";
              const contactId = item.id || item.contactId;
              console.log("[v0] Opening contact - id:", contactId, "dataFileId:", dataFileId, "item:", item);
              // 👇 OPEN IN NEW TAB
              window.open(
                `${window.location.origin}/#/contact-details/${item.contactId}?dataFileId=${dataFileId}`,
                "_blank"
              )

              }}
              >
              {label}
             </span>
             );
             },

              // name: (value: any, item: any) => {
              //   if (item.contactId === 0) {
              //     return `${value} ⚠️`;
              //   }
              //   return value || "-";
              // },
              name: (value: any, item: any) => {
              if (!value) return "-";
              const label =
              item.contactId === 0 ? `${value} ⚠️` : value;
              return (
              <span
              style={{
                   color: "#3f9f42",
                   cursor: "pointer",
                   fontWeight: 500,
                   textDecoration: "underline",
                  }}
              onClick={(e) => {
              e.stopPropagation();
              const campaign = availableCampaigns.find(
              (c) => c.id.toString() === selectedCampaign
              );
              const dataFileId = campaign?.zohoViewId || "";
              const contactId = item.id || item.contactId;
              console.log("[v0] Opening contact from name - id:", contactId, "dataFileId:", dataFileId);
              window.open(
                `${window.location.origin}/#/contact-details/${item.contactId}?dataFileId=${dataFileId}`,
                "_blank"
              )

              }}
              >
            {label}
            </span>
            );
            },

              // URL formatting
              linkedin_URL: (value: any) => {
                if (!value || value === "-") return "-";
                const cleanUrl = cleanLinkedInUrl(value);
                if (cleanUrl === "-") return "-";

                return (
                  <a
                    href={cleanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#3f9f42", textDecoration: "underline" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    LinkedIn Profile
                  </a>
                );
              },
              linkedin_url: (value: any) => {
                if (!value || value === "-") return "-";
                const url = value.startsWith("http") ? value : `https://${value}`;
                return (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#3f9f42", textDecoration: "underline" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    LinkedIn Profile
                  </a>
                );
              },
              linkedIn: (value: any) => {
                if (!value || value === "-") return "-";
                const cleanUrl = cleanLinkedInUrl(value);
                if (cleanUrl === "-") return "-";

                return (
                  <a
                    href={cleanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#3f9f42", textDecoration: "underline" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    LinkedIn Profile
                  </a>
                );
              },
              website: (value: any) => {
                if (!value || value === "-") return "-";
                const url = value.startsWith("http")
                  ? value
                  : `https://${value}`;
                return (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#3f9f42", textDecoration: "underline" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Website
                  </a>
                );
              },
              targetUrl: (value: any) => {
                if (!value || value === "-") return "-";
                return (
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#3f9f42", textDecoration: "underline" }}
                    onClick={(e) => e.stopPropagation()}
                    title={value}
                  >
                    {value.length > 50 ? value.substring(0, 50) + "..." : value}
                  </a>
                );
              },

              // Email formatting
              email: (value: any) => {
                if (!value || value === "-") return "-";
                return (
                  <a
                    href={`mailto:${value}`}
                    style={{ color: "#3f9f42", textDecoration: "underline" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {value}
                  </a>
                );
              },
              toEmail: (value: any) => {
                if (!value || value === "-") return "-";
                return (
                  <a
                    href={`mailto:${value}`}
                    style={{ color: "#3f9f42", textDecoration: "underline" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {value}
                  </a>
                );
              },
            }}
            searchFields={
              emailFilterType === "email-logs"
                ? [
                  "name",
                  "toEmail",
                  "company",
                  "jobTitle",
                  "subject",
                  "process_name",
                  "address",
                ]
                : emailFilterType === "missing-logs"
                ? [
                  "full_name",
                  "email",
                  "company_name",
                  "job_title",
                  "country_or_address",
                  "email_subject",
                ]
                : ["full_name", "email", "company", "jobTitle", "location", "ipAddress"]
            }
            primaryKey="id"
            viewMode="table"
            customHeader={
              emailFilterType === "email-logs"
                ? getEmailLogsHeader()
                : emailFilterType === "missing-logs"
                ? getMissingLogsHeader()
                : getEngagementHeader()
            }
            onColumnsChange={
              emailFilterType === "email-logs"
                ? setEmailLogsColumns
                : emailFilterType === "missing-logs"
                ? setMissingLogsColumns
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
                    {
                      getFilteredEmailLogs().filter((log) => log.isSuccess)
                        .length
                    }
                  </p>
                </div>
                <div className="stats-card" style={{ background: "#f8d7da" }}>
                  <h3>Failed</h3>
                  <p className="value">
                    {
                      getFilteredEmailLogs().filter((log) => !log.isSuccess)
                        .length
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Segment Save Modal */}
          <SegmentModal
            isOpen={showSaveSegmentModal}
            onClose={() => setShowSaveSegmentModal(false)}
            selectedContactsCount={
              emailFilterType === "email-logs"
                ? selectedEmailLogs.size
                : emailFilterType === "missing-logs"
                ? selectedMissingLogs.size
                : detailSelectedContacts.size
            }
            effectiveUserId={effectiveUserId!}
            token={token}
            dataFileId={getDataFileId()}
            onSuccess={(message) => appModal.showSuccess(message)}
            onError={(message) => appModal.showError(message)}
            onContactsCleared={clearSegmentSelections}
            getContactIds={getSegmentContactIds}
          />

          {/* Delete Confirmation Modal */}
          {showDeleteConfirmModal && (
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
                <h2 style={{ marginTop: 0, color: "#dc3545" }}>Warning</h2>
                <p style={{ marginBottom: 24, fontSize: 16 }}>
                  Deleting this contact will also remove it from all contact lists and segments. This action cannot be undone. Do you want to proceed?
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={() => {
                      setShowDeleteConfirmModal(false);
                      setContactsToDelete([]);
                    }}
                    className="button secondary"
                    disabled={deletingContacts}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setShowDeleteConfirmModal(false);
                      await performDelete(contactsToDelete);
                      setContactsToDelete([]);
                    }}
                    className="button"
                    disabled={deletingContacts}
                    style={{
                      backgroundColor: "#dc3545",
                      color: "white",
                      border: "1px solid #dc3545"
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <AppModal
        isOpen={appModal.isOpen}
        onClose={appModal.hideModal}
        {...appModal.config}
      />
      {(isLoading || loading || isRefreshing) && (
        <LoadingSpinner message={loadingMessage} />
      )}
    </div>
  );
};

export default MailDashboard;
