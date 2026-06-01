import React, { useState, useEffect } from "react";
import axios from "axios";
import type { EventItem, EmailLog } from "../../contexts/AppDataContext";
import DynamicContactsTable from "./DynamicContactsTable";
import AppModal from "../common/AppModal";
import { useAppModal } from "../../hooks/useAppModal";
import SegmentModal from "../common/SegmentModal";
import LoadingSpinner from "../common/LoadingSpinner";
import BulkUpdatePanel from "./BulkUpdatePanel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashAlt } from "@fortawesome/free-regular-svg-icons";
import { faEdit } from "@fortawesome/free-regular-svg-icons";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import ContactsTable from "./ContactsTable";
import API_BASE_URL from "../../config";
import { useAppData } from "../../contexts/AppDataContext";
import { Tooltip as ReactTooltip } from "react-tooltip";
import ContactDetailView from "./contacts/ContactDetailView";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../Redux/store";
import { closePanel, openPanel } from "../../slices/panelSlice";

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
  first_name?: string;
  last_name?: string;
  full_name?: string;
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
  botClicked?: boolean;
  botOpened?: boolean;
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

const asArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const arrayKeys = [
      "data",
      "items",
      "result",
      "results",
      "records",
      "campaigns",
      "logs",
      "events",
      "emailLogs",
      "missingContacts",
    ];

    for (const key of arrayKeys) {
      if (Array.isArray(record[key])) {
        return record[key] as T[];
      }
    }
  }

  return [];
};

const getDisplayNameFromContact = (contact: any) => {
  const first =
    contact?.first_name ||
    contact?.firstName ||
    "";
  const last =
    contact?.last_name ||
    contact?.lastName ||
    "";
  const full =
    contact?.full_name ||
    contact?.fullName ||
    contact?.name ||
    "";
  const combined = `${String(first).trim()} ${String(last).trim()}`.trim();
  return (String(full).trim() || combined || "-");
};

// ── Mini sparkline ──────────────────────────────────────────────────────────
const MiniSparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 100, H = 32;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - 2 - ((v - min) / range) * (H - 6),
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `M0,${H} ${pts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")} L${W},${H} Z`;
  const gId = `sg${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width="100%" height="32" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gId})`} />
      <path d={line} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

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
  const dispatch = useDispatch();
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

   const activePanel = useSelector(
    (state: RootState) => state.panel.activePanel
    );
  const showBulkUpdatePanelModal =
    activePanel === "bulk-update-panel-modal";

  const showSaveSegmentCommonModal =
    activePanel === "save-segment-modal";



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
  const [showBulkUpdatePanel, setShowBulkUpdatePanel] = useState(false);
  const [dataFetchedForCampaign, setDataFetchedForCampaign] =
    useState<string>("");
  const [deletingContacts, setDeletingContacts] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [contactsToDelete, setContactsToDelete] = useState<number[]>([]);
  const [excludeBots, setExcludeBots] = useState(false);

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
    { key: "hasOpened", label: "Opened", visible: true },
    { key: "botOpened", label: "Bot Opened", visible: true },
    { key: "hasClicked", label: "Clicked", visible: true },
    { key: "botClicked", label: "Bot Clicked", visible: true },
    { key: "targetUrl", label: "Target URL", visible: false },
    { key: "linkedin_URL", label: "LinkedIn", visible: false },
    { key: "website", label: "Website", visible: false },
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


  const getSafeDataFileId = (campaign?: Campaign): number | undefined => {
    if (!campaign?.zohoViewId) return undefined;

    const parsed = Number(campaign.zohoViewId);
    return isNaN(parsed) ? undefined : parsed;
  };

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
            events: asArray<EventItem>(cachedData.allEventData).length,
            emails: asArray<any>(cachedData.allEmailLogs).length,
          });

          const cachedEvents = asArray<EventItem>(cachedData.allEventData);
          const cachedAllLogs = asArray<any>(cachedData.allEmailLogs);
          const cachedEmailLogs = asArray<EmailLog>(cachedData.emailLogs);

          setAllEventData(cachedEvents);
          setAllEmailLogs(cachedAllLogs);
          setEmailLogs(cachedEmailLogs);
          setDataFetchedForCampaign(campaignToLoad);

          processDataWithDateFilter(
            cachedEvents,
            cachedAllLogs,
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
          setAvailableCampaigns(asArray<Campaign>(response.data));
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
        events: asArray<EventItem>(cachedData.allEventData).length,
        emails: asArray<any>(cachedData.allEmailLogs).length,
        emailLogs: asArray<EmailLog>(cachedData.emailLogs).length,
      });

      const cachedEvents = asArray<EventItem>(cachedData.allEventData);
      const cachedAllLogs = asArray<any>(cachedData.allEmailLogs);
      const cachedEmailLogs = asArray<EmailLog>(cachedData.emailLogs);

      setAllEventData(cachedEvents);
      setAllEmailLogs(cachedAllLogs);
      setEmailLogs(cachedEmailLogs);
      setDataFetchedForCampaign(selectedCampaign);

      processDataWithDateFilter(
        cachedEvents,
        cachedAllLogs,
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
  }, [startDate, endDate, allEventData, allEmailLogs, isVisible, excludeBots]);

  // 6. Load email logs for email-logs filter type - Updated for campaigns
 useEffect(() => {
  if (!isVisible) return;

  // ================= EMAIL LOGS =================
  if (
    selectedCampaign &&
    emailFilterType === "email-logs" &&
    effectiveUserId
  ) {
    const loadEmailLogs = async () => {
      await withLoader("Loading email logs...", async () => {
        try {
          const campaignIdNumber = Number(selectedCampaign);
          const clientId = Number(effectiveUserId);

          const logs = await fetchEmailLogs(
            clientId,
            campaignIdNumber   // ✅ ONLY campaignId
          );

          setEmailLogs(asArray<EmailLog>(logs));
        } catch (error) {
          console.error("Error loading email logs:", error);
          setEmailLogs([]);
        }
      });
    };

    loadEmailLogs();
  }

  // ================= MISSING LOGS =================
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
          const campaignIdNumber = Number(selectedCampaign);

          const response = await axios.get(
            `${API_BASE_URL}/track/missing-log-contacts`,
            {
              params: {
                startDate,
                endDate,
                campaignId: campaignIdNumber, // ✅ ONLY campaignId
              },
              headers: {
                ...(token && { Authorization: `Bearer ${token}` }),
              },
            }
          );

          let missingContactsData: any[] = [];

          if (response.data.missingContacts) {
            missingContactsData = asArray<any>(response.data.missingContacts);
          } else if (Array.isArray(response.data)) {
            missingContactsData = response.data;
          }

          const transformedData = missingContactsData.map(
            (contact: any, index: number) => ({
              id: contact.contactId || index + 1,
              contactId: contact.contactId,
              first_name: contact.first_name || contact.firstName || "",
              last_name: contact.last_name || contact.lastName || "",
              full_name: getDisplayNameFromContact(contact),
              email: contact.email || "-",
              company_name: contact.company_name || "-",
              job_title: contact.job_title || "-",
              country_or_address: contact.country_or_address || "-",
              email_subject: contact.email_subject || "-",
              linkedin_url: contact.linkedin_url || "-",
              website: contact.website || "-",
            })
          );

          setMissingLogs(transformedData);
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
  startDate,
  endDate,
]);

  // 7. Clear cache when user changes
  useEffect(() => {
    if (effectiveUserId) {
      setDataFetchedForCampaign("");
    }
  }, [effectiveUserId]);



  // Debug useEffect for excludeBots
  useEffect(() => {
    console.log('=== BOT FILTER DEBUG ===');
    console.log('excludeBots state:', excludeBots);
    console.log('Total allEventData length:', allEventData.length);
    console.log('Selected campaign:', selectedCampaign);
    console.log('Date filters:', { startDate, endDate });
    
    const allOpens = allEventData.filter(item => item.eventType === 'Open');
    const allClicks = allEventData.filter(item => item.eventType === 'Click');
    const botOpens = allEventData.filter(item => item.eventType === 'Open' && item.isBot === true);
    const botClicks = allEventData.filter(item => item.eventType === 'Click' && item.isBot === true);
    const humanOpens = allEventData.filter(item => item.eventType === 'Open' && item.isBot === false);
    const humanClicks = allEventData.filter(item => item.eventType === 'Click' && item.isBot === false);
    
    console.log('Total opens in allEventData:', allOpens.length);
    console.log('Total clicks in allEventData:', allClicks.length);
    console.log('Bot opens (isBot: true) in allEventData:', botOpens.length);
    console.log('Bot clicks (isBot: true) in allEventData:', botClicks.length);
    console.log('Human opens (isBot: false) in allEventData:', humanOpens.length);
    console.log('Human clicks (isBot: false) in allEventData:', humanClicks.length);
    
    // Show all event data with bot status
    console.log('All events with bot status:');
    [...allOpens, ...allClicks].forEach((event, index) => {
      console.log(`${index + 1}. ${event.eventType} - ${event.email} - isBot: ${event.isBot} - timestamp: ${event.timestamp}`);
    });
    
    if (botOpens.length > 0) {
      console.log('Sample bot open:', botOpens[0]);
    }
    if (botClicks.length > 0) {
      console.log('Sample bot click:', botClicks[0]);
    }
    if (humanOpens.length > 0) {
      console.log('Sample human open:', humanOpens[0]);
    }
    if (humanClicks.length > 0) {
      console.log('Sample human click:', humanClicks[0]);
    }
    
    console.log('=== END DEBUG ===');
  }, [excludeBots, allEventData, selectedCampaign, startDate, endDate]);

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

  const filterByCampaignIfPresent = <T extends { campaignId?: number }>(
    items: T[],
    campaignId: number
  ): T[] => {
    if (!items || items.length === 0) return items;
    const hasCampaignId = items.some(
      (item) =>
        item.campaignId !== undefined && item.campaignId !== null
    );
    return hasCampaignId
      ? items.filter((item) => item.campaignId === campaignId)
      : items;
  };

const fetchEmailLogs = async (
  clientId: number,
  campaignId: number
) => {
  try {
    const url = new URL(`${API_BASE_URL}/api/Crm/getlogs`);

    url.searchParams.set("clientId", clientId.toString());
    url.searchParams.set("campaignId", campaignId.toString());

    const response = await fetch(url.toString());

    if (response.ok) {
      return await response.json(); // ✅ already filtered from backend
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

      if (!campaign) return;

      const clientId = Number(effectiveUserId);
      const campaignIdNumber = Number(campaignId);

      let allTrackingData: EventItem[] = [];
      let allEmailLogsData: any[] = [];

      // ✅ ONLY CAMPAIGN BASED TRACKING
      const trackingResponse = await axios.get(
        `${API_BASE_URL}/api/Crm/gettrackinglogs`,
        {
          params: {
            clientId,
            campaignId: campaignIdNumber,
          },
          headers: { ...(token && { Authorization: `Bearer ${token}` }) },
        }
      );

      allTrackingData = asArray<EventItem>(trackingResponse.data);

      // ✅ ONLY CAMPAIGN BASED EMAIL LOGS
      allEmailLogsData = asArray<any>(await fetchEmailLogs(
        clientId,
        campaignIdNumber
      ));

      // ✅ SET STATE
      setAllEventData(allTrackingData);
      setAllEmailLogs(allEmailLogsData);
      setEmailLogs(allEmailLogsData);

      // ✅ CACHE
      saveDashboardData(campaignId, {
        allEventData: allTrackingData,
        allEmailLogs: allEmailLogsData,
        emailLogs: allEmailLogsData,
        effectiveUserId: effectiveUserId!,
      });

      setDataFetchedForCampaign(campaignId);

      // ✅ PROCESS
      processDataWithDateFilter(
        allTrackingData,
        allEmailLogsData,
        startDate,
        endDate
      );

      console.log(
        `✅ Campaign ${campaignId} loaded: ${allTrackingData.length} events, ${allEmailLogsData.length} logs`
      );
    } catch (error) {
      console.error("Dashboard: Error fetching logs:", error);

      setAllEventData([]);
      setAllEmailLogs([]);
      setEmailLogs([]);
      setFilteredEventData([]);
      setRequestCount(0);
      setDailyStats([]);
      setTotalStats({
        sent: 0,
        opens: 0,
        clicks: 0,
        totalClicks: 0,
        errors: 0,
      });

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
    trackingData = asArray<EventItem>(trackingData);
    emailLogs = asArray<any>(emailLogs);

    // Apply date filtering
    let filteredTrackingData = trackingData;
    let filteredEmailLogs = emailLogs;

    if (startDate || endDate) {
      filteredTrackingData = trackingData.filter((item) => {
        if (!item.timestamp) return false;
        const itemDate = String(item.timestamp).split("T")[0];
        const isAfterStart = !startDate || itemDate >= startDate;
        const isBeforeEnd = !endDate || itemDate <= endDate;
        return isAfterStart && isBeforeEnd;
      });

      filteredEmailLogs = emailLogs.filter((log: any) => {
        if (!log.sentAt) return false;
        const sentDate = String(log.sentAt).split("T")[0];
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
        if (!log.sentAt) return;
        const date = String(log.sentAt).split("T")[0];
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
      if (!item.timestamp) return;
      const date = String(item.timestamp).split("T")[0];
      if (!dailyTracking[date]) {
        dailyTracking[date] = {
          uniqueOpens: new Set(),
          uniqueClicks: new Set(),
          sentCount: 0,
        };
      }

      if (item.eventType === "Open") {
        console.log('Processing open:', { email: item.email, isBot: item.isBot, excludeBots });
        // Filter out bot opens if excludeBots is true
        if (!excludeBots || !item.isBot) {
          console.log('Including open for:', item.email);
          dailyTracking[date].uniqueOpens.add(item.email);
          uniqueOpensInDateRange.add(item.email);
        } else {
          console.log('Excluding bot open for:', item.email);
        }
      } else if (item.eventType === "Click") {
        console.log('Processing click:', { email: item.email, isBot: item.isBot, excludeBots });
        // Filter out bot clicks if excludeBots is true
        if (!excludeBots || !item.isBot) {
          console.log('Including click for:', item.email);
          dailyTracking[date].uniqueClicks.add(item.email);
          uniqueClicksInDateRange.add(item.email);
        } else {
          console.log('Excluding bot click for:', item.email);
        }
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
    
    const allOpensBeforeFilter = filteredTrackingData.filter(item => item.eventType === 'Open');
    const allClicksBeforeFilter = filteredTrackingData.filter(item => item.eventType === 'Click');
    const totalClickCount = filteredTrackingData.filter(item => {
      if (item.eventType === 'Click') {
        const shouldInclude = !excludeBots || !item.isBot;
        return shouldInclude;
      }
      return false;
    }).length;
    
    console.log('TOTAL CALCULATION:');
    console.log('- All opens before filter:', allOpensBeforeFilter.length);
    console.log('- All clicks before filter:', allClicksBeforeFilter.length);
    console.log('- excludeBots:', excludeBots);
    console.log('- Final totalClickCount:', totalClickCount);
    console.log('- uniqueOpensInDateRange size:', uniqueOpensInDateRange.size);
    console.log('- uniqueClicksInDateRange size:', uniqueClicksInDateRange.size);
    
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
        botClicked: (item as any).isBot && item.eventType === "Click",
        botOpened: (item as any).isBot && item.eventType === "Open",
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

    // Filter out bot opens and clicks if excludeBots is true
    if (excludeBots) {
      console.log('Filtering bots from event data, original length:', filteredEventData.length);
      filteredEventData = filteredEventData.filter((item) => {
        if (item.eventType === 'Click' || item.eventType === 'Open') {
          console.log('Filtering event:', { eventType: item.eventType, email: item.email, isBot: item.isBot });
          return !item.isBot;
        }
        return true;
      });
      console.log('After bot filtering, length:', filteredEventData.length);
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
          log.first_name?.toLowerCase().includes(searchLower) ||
          log.last_name?.toLowerCase().includes(searchLower) ||
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
      const cleanUrl = cleanLinkedInUrl(contact.linkedin_URL);
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
          const cleanUrl = cleanLinkedInUrl(log.linkedIn);
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
        }
        if (log.linkedin_URL && log.linkedin_URL !== "-") {
          const cleanUrl = cleanLinkedInUrl(log.linkedin_URL);
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
  const toggleSelection = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return newSelection;
    });
  };

  const handleSelectEmailLog = (logId: string) => {
    toggleSelection(setSelectedEmailLogs, logId);
  };

  const handleSelectMissingLog = (logId: string) => {
    toggleSelection(setSelectedMissingLogs, logId);
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

  // Helper function to get contact IDs for bulk update based on filter type
  const getBulkUpdateContactIds = (): number[] => {
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

  // Custom Clear Icon Component
  const ClearIcon = ({ size = 20 }: { size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height={size} width={size}>
      <path fill="#3f9f42" d="m17.1 19.15 -2.3 2.325c-0.15 0.15 -0.325 0.225 -0.525 0.225s-0.375 -0.075 -0.525 -0.225c-0.15 -0.15 -0.225 -0.32915 -0.225 -0.5375 0 -0.20835 0.075 -0.3875 0.225 -0.5375l2.3 -2.3 -2.325 -2.3c-0.15 -0.15 -0.225 -0.325 -0.225 -0.525s0.075 -0.375 0.225 -0.525c0.15 -0.15 0.32915 -0.225 0.5375 -0.225 0.20835 0 0.3875 0.075 0.5375 0.225l2.3 2.3 2.3 -2.325c0.15 -0.15 0.325 -0.225 0.525 -0.225s0.375 0.075 0.525 0.225c0.15 0.15 0.225 0.32915 0.225 0.5375 0 0.20835 -0.075 0.3875 -0.225 0.5375l-2.3 2.3 2.325 2.3c0.15 0.15 0.225 0.325 0.225 0.525s-0.075 0.375 -0.225 0.525c-0.15 0.15 -0.32915 0.225 -0.5375 0.225 -0.20835 0 -0.3875 -0.075 -0.5375 -0.225l-2.3 -2.3ZM3.75 15.75c-0.2125 0 -0.390585 -0.07235 -0.53425 -0.217C3.071915 15.3885 3 15.20935 3 14.9955c0 -0.21365 0.071915 -0.39135 0.21575 -0.533 0.143665 -0.14165 0.32175 -0.2125 0.53425 -0.2125h6c0.2125 0 0.39065 0.07235 0.5345 0.217 0.14365 0.1445 0.2155 0.32365 0.2155 0.5375 0 0.21365 -0.07185 0.39135 -0.2155 0.533 -0.14385 0.14165 -0.322 0.2125 -0.5345 0.2125h-6Zm0 -4.125c-0.2125 0 -0.390585 -0.07235 -0.53425 -0.217C3.071915 11.2635 3 11.08435 3 10.8705c0 -0.21365 0.071915 -0.39135 0.21575 -0.533 0.143665 -0.14165 0.32175 -0.2125 0.53425 -0.2125H14c0.2125 0 0.39065 0.07235 0.5345 0.217 0.14365 0.1445 0.2155 0.32365 0.2155 0.5375 0 0.21365 -0.07185 0.39135 -0.2155 0.533 -0.14385 0.14165 -0.322 0.2125 -0.5345 0.2125H3.75Zm0 -4.125c-0.2125 0 -0.390585 -0.07235 -0.53425 -0.217C3.071915 7.1385 3 6.95935 3 6.7455c0 -0.21365 0.071915 -0.39135 0.21575 -0.533C3.359415 6.07085 3.5375 6 3.75 6H14c0.2125 0 0.39065 0.07235 0.5345 0.217 0.14365 0.1445 0.2155 0.32365 0.2155 0.5375 0 0.21365 -0.07185 0.39135 -0.2155 0.533 -0.14385 0.14165 -0.322 0.2125 -0.5345 0.2125H3.75Z" strokeWidth="0.5" />
    </svg>
  );

  // Reusable SVG Component
  const SegmentIcon = ({ size = 100 }: { size?: number }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M50 50H85C85 69.33 69.33 85 50 85C30.67 85 15 69.33 15 50C15 30.67 30.67 15 50 15V50Z"
        stroke="#3f9f42"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M60 40V15C73.8071 15 85 26.1929 85 40H60Z"
        stroke="#3f9f42"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  // Common button styles
  const buttonStyles = {
    clear: {
      background: "none",
      color: "#3f9f42",
      border: "none",
      borderRadius: "12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "40px",
      height: "40px",
      padding: "0",
      cursor: "pointer"
    },
    segment: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: '#3f9f42',
      border: 'none',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '40px',
      height: '40px',
      padding: '0',
      cursor: 'pointer'
    }
  };

  // Header Components
  const getSelectionHeader = (type: 'email-logs' | 'missing-logs' | 'engagement') => {
    const size = type === 'email-logs' ? selectedEmailLogs.size
      : type === 'missing-logs' ? selectedMissingLogs.size
      : detailSelectedContacts.size;

    if (size === 0) return null;

    const label = type === 'email-logs' 
      ? `${size} email log${size > 1 ? 's' : ''} selected`
      : `${size} contact${size > 1 ? 's' : ''} selected`;

    const onClear = () => {
      if (type === 'email-logs') setSelectedEmailLogs(new Set());
      else if (type === 'missing-logs') setSelectedMissingLogs(new Set());
      else setDetailSelectedContacts(new Set());
    };

    const invalidCount = type === 'engagement' ? getInvalidContactsCount() : 0;

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
          {label}
          {invalidCount > 0 && (
            <span style={{ color: "#ff9800", marginLeft: 8 }}>
              ({invalidCount} without valid ID)
            </span>
          )}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            className="button secondary"
            onClick={onClear}
            style={buttonStyles.clear}
            title="Clear Selection"
          >
            <ClearIcon size={32} />
          </button>
          {type === 'engagement' && (
            <button
              className="button"
              onClick={handleDeleteContacts}
              disabled={deletingContacts}
              style={{
                ...buttonStyles.clear,
                cursor: deletingContacts ? "not-allowed" : "pointer",
                opacity: deletingContacts ? 0.6 : 1
              }}
              title={deletingContacts ? "Deleting..." : "Delete Contact"}
            >
              <FontAwesomeIcon
                icon={faTrashAlt}
                style={{ fontSize: 20, color: "#3f9f42" }}
              />
            </button>
          )}
          <button
            className="button primary"
            onClick={() => 
              //setShowSaveSegmentModal(true)
              dispatch(openPanel("save-segment-modal"))
            }
            style={buttonStyles.segment}
            title="Create Segment"
          >
            <SegmentIcon size={type === 'engagement' ? 28 : 36} />
          </button>
          {type === 'engagement' && (
            <button
              className="button secondary"
              onClick={() => 
                //setShowBulkUpdatePanel(true)
                dispatch(openPanel("bulk-update-panel-modal"))

              }
              style={{
                background: "none",
                color: "#3f9f42",
                border: "none",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                padding: "0",
                cursor: "pointer"
              }}
              title="Bulk Update"
            >
              <FontAwesomeIcon
                icon={faEdit}
                style={{ fontSize: 20, color: "#3f9f42" }}
              />
            </button>
          )}
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
    const cleanUrl = url
      .replace(/%7C%7C$/, "") // Remove %7C%7C (||)
      .replace(/\|\|$/, "") // Remove ||
      .replace(/%7C$/, "") // Remove single %7C (|)
      .replace(/\|$/, "") // Remove single |
      .trim();

    if (!cleanUrl || cleanUrl === "-" || cleanUrl === "N/A") return "-";

    return /^[a-z][a-z\d+.-]*:\/\//i.test(cleanUrl)
      ? cleanUrl
      : `https://${cleanUrl}`;
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
    <div className="md-root" style={{ display: isVisible ? "block" : "none" }}>

      {/* ── Tab Bar ── */}
      <div className="md-tab-bar">
        <button
          className={`md-tab${dashboardTab === "Overview" ? " md-tab--active" : ""}`}
          onClick={() => handleDashboardTabChange("Overview")}
        >
          Overview
        </button>
        <button
          className={`md-tab${dashboardTab === "Details" ? " md-tab--active" : ""}`}
          onClick={() => handleDashboardTabChange("Details")}
        >
          Details
        </button>
      </div>

      {/* ── Controls Bar ── */}
      <div className="md-controls-bar">
        {/* Campaign — grows to fill available space */}
        <div className="md-control-campaign">
          <label className="md-label">Campaign <span className="md-required">*</span></label>
          <select
            value={selectedCampaign}
            onChange={handleCampaignChange}
            className={`md-select${!selectedCampaign ? " md-select--error" : ""}`}
          >
            <option value="">Select a campaign</option>
            {availableCampaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.campaignName}{c.dataSource === "Segment" && c.segmentName ? ` (${c.segmentName})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Start date */}
        <div className="md-control-group">
          <label className="md-label">Start date</label>
          <input type="date" value={startDate} onChange={(e) => handleDateChange("start", e.target.value)}
            max={endDate || undefined} className="md-date-input" />
        </div>

        {/* End date */}
        <div className="md-control-group">
          <label className="md-label">End date</label>
          <input type="date" value={endDate} onChange={(e) => handleDateChange("end", e.target.value)}
            min={startDate || undefined} className="md-date-input" />
        </div>

        {/* Refresh icon button */}
        <div className="md-control-refresh">
          <button className="md-icon-btn" onClick={handleRefresh}
            disabled={isRefreshing || loading} title="Refresh analytics">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1.5A6.5 6.5 0 001.5 8a.75.75 0 01-1.5 0A8 8 0 0113.5 2.19V1.25a.75.75 0 011.5 0v3a.75.75 0 01-.75.75h-3a.75.75 0 010-1.5h1.44A6.479 6.479 0 008 1.5zm7.25 5.75a.75.75 0 01.75.75A8 8 0 012.5 13.81v.94a.75.75 0 01-1.5 0v-3a.75.75 0 01.75-.75h3a.75.75 0 010 1.5H3.31A6.5 6.5 0 0014.5 8a.75.75 0 01.75-.75z"/>
            </svg>
          </button>
        </div>

        {/* Only guaranteed toggle */}
        <div className="md-control-group">
          <ReactTooltip anchorSelect="#md-guaranteed-label" place="top">
            Restrict to guaranteed opens and clicks by removing any chance of bot actions. This will deflate numbers pessimistically.
          </ReactTooltip>
          <label className="md-label" id="md-guaranteed-label" style={{ display: "flex", alignItems: "center", gap: 3 }}>
            Only guaranteed
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.45, flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </label>
          <div className="md-toggle-wrapper">
            <button onClick={() => setExcludeBots(!excludeBots)}
              className={`md-toggle${excludeBots ? " md-toggle--on" : ""}`}>
              <span className={`md-toggle-thumb${excludeBots ? " md-toggle-thumb--on" : ""}`} />
            </button>
            <span className="md-toggle-label">{excludeBots ? "ON" : "OFF"}</span>
          </div>
        </div>

        {/* Right-side actions (shown when campaign selected) */}
        {selectedCampaign && (
          <div className="md-control-actions">
            {(startDate || endDate) && (
              <button className="md-clear-btn"
                onClick={() => { setStartDate(""); setEndDate(""); saveCurrentState(); }}>
                Clear dates
              </button>
            )}
            <button className="md-export-btn" title="Export Report">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export Report
            </button>
          </div>
        )}
      </div>

      {/* ── Stats Grid (v2 — icon+label row / value / sparkline) ── */}
      <div className="md-stats-grid">
        {([
          {
            id: "sent", label: "Sent", color: "#00C49F", bg: "#e0faf3",
            value: loading ? null : !selectedCampaign ? null : requestCount,
            sub: !loading && selectedCampaign ? "100%" : null,
            spark: dailyStats.map(d => d.sent),
            icon: <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
          },
          {
            id: "opens", label: "Unique opens", color: "#FF8042", bg: "#fff4e5",
            value: loading ? null : !selectedCampaign ? null : totalStats.opens,
            sub: !loading && selectedCampaign ? `${openRate}%` : null,
            spark: dailyStats.map(d => d.opens),
            icon: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
          },
          {
            id: "clicks", label: "Clicks", color: "#8b5cf6", bg: "#f0eeff",
            value: loading ? null : !selectedCampaign ? null : totalStats.totalClicks,
            sub: null,
            spark: dailyStats.map(d => d.clicks),
            icon: <><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></>,
          },
          {
            id: "uclicks", label: "Unique clicks", color: "#8b5cf6", bg: "#f0eeff",
            value: loading ? null : !selectedCampaign ? null : totalStats.clicks,
            sub: !loading && selectedCampaign ? `${clickRate}%` : null,
            spark: dailyStats.map(d => d.clicks),
            icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
          },
          {
            id: "errors", label: "Errors", color: "#ef4444", bg: "#fef2f2",
            value: loading ? null : !selectedCampaign ? null : totalStats.errors,
            sub: !loading && selectedCampaign
              ? `${requestCount > 0 ? ((totalStats.errors / (requestCount + totalStats.errors)) * 100).toFixed(1) : "0.0"}%`
              : null,
            spark: dailyStats.map(d => d.sent).map((_, i) => totalStats.errors > 0 ? totalStats.errors : 0),
            icon: <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,
          },
        ]).map(card => (
          <div key={card.id} className="md-stat-v2">
            {/* Header row: icon + label */}
            <div className="md-stat-v2-head">
              <span className="md-stat-v2-icon" style={{ background: card.bg, color: card.color }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {card.icon}
                </svg>
              </span>
              <span className="md-stat-v2-label" style={{ color: card.color }}>{card.label}</span>
            </div>
            {/* Value */}
            <div className="md-stat-v2-body">
              <span className="md-stat-v2-value">
                {card.value === null ? "—" : card.value.toLocaleString()}
              </span>
              {card.sub && <span className="md-stat-v2-sub">{card.sub}</span>}
            </div>
            {/* Sparkline (only when campaign loaded and data exists) */}
            {selectedCampaign && card.spark.length > 1 && (
              <div className="md-stat-v2-spark">
                <MiniSparkline data={card.spark} color={card.color} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {dashboardTab === "Overview" && (
        !selectedCampaign ? (
          /* ─── Empty state ─── */
          <>
            <div className="md-empty-state">
              {/* Illustration */}
              <div className="md-empty-illus">
                <svg width="210" height="165" viewBox="0 0 210 165" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* browser window */}
                  <rect x="15" y="8" width="165" height="118" rx="9" fill="#fff" stroke="#e2e8f0" strokeWidth="1.5"/>
                  <rect x="15" y="8" width="165" height="22" rx="9" fill="#f8fafc"/>
                  <rect x="15" y="22" width="165" height="6" fill="#f8fafc"/>
                  {/* dots */}
                  <circle cx="28" cy="19" r="3" fill="#fca5a5"/>
                  <circle cx="38" cy="19" r="3" fill="#fde68a"/>
                  <circle cx="48" cy="19" r="3" fill="#86efac"/>
                  {/* area chart fill */}
                  <path d="M25 110 C45 92 65 78 85 68 C105 58 125 63 145 52 C158 44 165 48 178 43 L178 110 Z" fill="#dcfce7"/>
                  {/* area chart line */}
                  <path d="M25 110 C45 92 65 78 85 68 C105 58 125 63 145 52 C158 44 165 48 178 43" stroke="#3f9f42" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                  {/* donut chart */}
                  <circle cx="163" cy="78" r="20" stroke="#e2e8f0" strokeWidth="7" fill="none"/>
                  <circle cx="163" cy="78" r="20" stroke="#3f9f42" strokeWidth="7" fill="none" strokeDasharray="63 63" strokeLinecap="round" transform="rotate(-90 163 78)"/>
                  <circle cx="163" cy="78" r="20" stroke="#f59e0b" strokeWidth="7" fill="none" strokeDasharray="31 95" strokeLinecap="round" transform="rotate(27 163 78)"/>
                  {/* decorative plus signs */}
                  <text x="5" y="75" fill="#3f9f42" fontSize="14" fontWeight="700" opacity="0.7">+</text>
                  <text x="188" y="118" fill="#3f9f42" fontSize="10" fontWeight="700" opacity="0.6">+</text>
                  {/* arrow */}
                  <path d="M8 120 Q5 135 13 145" stroke="#3f9f42" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                  <path d="M10 143 L13 145 L11 141" stroke="#3f9f42" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="md-empty-title">Select a campaign to view analytics</h3>
              <p className="md-empty-sub">Choose a campaign and date range above to see performance insights like<br/>sent, opens, clicks, and more.</p>
              <button
                className="md-empty-cta"
                onClick={() => {
                  const el = document.querySelector(".md-select") as HTMLSelectElement | null;
                  if (el) el.focus();
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                Select a campaign
              </button>
            </div>

            {/* Feature row */}
            <div className="md-feature-row">
              {([
                { icon: "clock",    title: "Track performance",     desc: "Monitor key metrics and measure campaign success." },
                { icon: "target",   title: "Optimize results",      desc: "Identify what works best and improve future campaigns." },
                { icon: "users",    title: "Data-driven decisions",  desc: "Make informed decisions with real-time insights." },
                { icon: "shield",   title: "Guaranteed accuracy",   desc: "Analytics reflect only guaranteed emails for reliable data." },
              ] as const).map(f => (
                <div key={f.title} className="md-feature-card">
                  <div className="md-feature-icon">
                    {f.icon === "clock"  && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                    {f.icon === "target" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>}
                    {f.icon === "users"  && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}
                    {f.icon === "shield" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
                  </div>
                  <div>
                    <p className="md-feature-title">{f.title}</p>
                    <p className="md-feature-desc">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* ─── Populated state ─── */
          <>
            {/* Chart card with totals panel */}
            <div className="md-chart-card">
              <div className="md-chart-header">
                <h2 className="md-chart-title">Statistics overview</h2>
                <div className="md-chart-legend-tags">
                  <span className="md-legend-tag" style={{ background: "#e0faf3", color: "#00C49F" }}>● Sent</span>
                  <span className="md-legend-tag" style={{ background: "#fff4e5", color: "#FF8042" }}>● Unique opens</span>
                  <span className="md-legend-tag" style={{ background: "#f0eeff", color: "#8b5cf6" }}>● Unique clicks</span>
                </div>
              </div>
              <div className="md-chart-with-totals">
                {/* Area chart */}
                <div className="md-chart-main">
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart
                      data={filteredStats.length ? filteredStats : [{ date: "", sent: 0, opens: 0, clicks: 0 }]}
                      margin={{ top: 6, right: 8, left: 0, bottom: 4 }}
                    >
                      <defs>
                        <linearGradient id="gSent"   x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00C49F" stopOpacity={0.22}/><stop offset="95%" stopColor="#00C49F" stopOpacity={0}/></linearGradient>
                        <linearGradient id="gOpens"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FF8042" stopOpacity={0.18}/><stop offset="95%" stopColor="#FF8042" stopOpacity={0}/></linearGradient>
                        <linearGradient id="gClicks" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.16}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.10)", fontSize: 12 }} />
                      <Area type="monotone" dataKey="sent"   stroke="#00C49F" strokeWidth={2} fill="url(#gSent)"   dot={false} activeDot={{ r: 5 }} />
                      <Area type="monotone" dataKey="opens"  stroke="#FF8042" strokeWidth={2} fill="url(#gOpens)"  dot={false} activeDot={{ r: 5 }} />
                      <Area type="monotone" dataKey="clicks" stroke="#8b5cf6" strokeWidth={2} fill="url(#gClicks)" dot={false} activeDot={{ r: 5 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Performance insights */}
            <div className="md-insights-section">
              <h3 className="md-insights-title">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3f9f42" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                </svg>
                Performance insights
              </h3>
              <div className="md-insights-grid">
                <div className="md-insight-card">
                  <p className="md-insight-sub">Your unique open rate is</p>
                  <p className="md-insight-val" style={{ color: "#FF8042" }}>{openRate}%</p>
                  <p className="md-insight-hint">of {requestCount.toLocaleString()} sent emails</p>
                </div>
                <div className="md-insight-card">
                  <p className="md-insight-sub">Your unique click rate is</p>
                  <p className="md-insight-val" style={{ color: "#8b5cf6" }}>{clickRate}%</p>
                  <p className="md-insight-hint">of {requestCount.toLocaleString()} sent emails</p>
                </div>
                <div className="md-insight-card">
                  <p className="md-insight-sub">Total clicks recorded</p>
                  <p className="md-insight-val" style={{ color: "#8b5cf6" }}>{totalStats.totalClicks.toLocaleString()}</p>
                  <p className="md-insight-hint">{totalStats.clicks.toLocaleString()} unique recipients clicked</p>
                </div>
                <div className="md-insight-card md-insight-card--featured">
                  <p className="md-insight-sub">Top performing day</p>
                  {(() => {
                    const best = [...filteredStats].sort((a, b) => b.opens - a.opens)[0];
                    return best ? (
                      <>
                        <p className="md-insight-val" style={{ color: "#00C49F" }}>{best.date}</p>
                        <p className="md-insight-hint">Opens: {best.opens} · Clicks: {best.clicks}</p>
                      </>
                    ) : <p className="md-insight-val">—</p>;
                  })()}
                </div>
              </div>
            </div>
          </>
        )
      )}

      {/* ── Details Tab ── */}
      {dashboardTab === "Details" && (
        <>
          {/* Filter pills */}
          <div className="md-filter-bar">
            {([
              { key: "opens",            label: "Opens",             color: "#3f9f42" },
              { key: "clicks",           label: "Clicks",            color: "#2196f3" },
              { key: "opens-no-clicks",  label: "Opens not clicked", color: "#f59e0b" },
              { key: "opens-and-clicks", label: "Opens & clicks",    color: "#8b5cf6" },
              { key: "all",              label: "All",               color: "#64748b" },
              { key: "email-logs",       label: "Sent",              color: "#10b981" },
              { key: "missing-logs",     label: "Not sent",          color: "#ef4444" },
            ] as const).map(({ key, label, color }) => (
              <button
                key={key}
                className={`md-filter-pill${emailFilterType === key ? " md-filter-pill--active" : ""}`}
                style={
                  emailFilterType === key
                    ? { background: color, borderColor: color, color: "#fff" }
                    : {}
                }
                onClick={() => handleEmailFilterTypeChange(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Missing logs date warning */}
          {emailFilterType === "missing-logs" && (!startDate || !endDate) && (
            <div className="md-warning-banner">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>
                <strong>Date range required:</strong> Please select both start and end dates to view contacts not sent.
              </span>
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
                : (id: string) => toggleSelection(setDetailSelectedContacts, id)
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
              botClicked: (value: any, item: any) => {
                if (value === true) {
                  return <span style={{ color: "#28a745", fontSize: "14px" }}>✅</span>;
                } else if (value === false) {
                  return <span style={{ color: "#dc3545", fontSize: "16px" }}>-</span>;
                }
                return "-";
              },
              botOpened: (value: any, item: any) => {
                if (value === true) {
                  return <span style={{ color: "#28a745", fontSize: "14px" }}>✅</span>;
                } else if (value === false) {
                  return <span style={{ color: "#dc3545", fontSize: "16px" }}>-</span>;
                }
                return "-";
              },

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
                `${window.location.origin}/#/contact-details/${item.contactId}?tab=Mail&mailSubTab=Dashboard&dataFileId=${dataFileId}&clientId=${effectiveUserId}`,
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
                `${window.location.origin}/#/contact-details/${item.contactId}?tab=Mail&mailSubTab=Dashboard&dataFileId=${dataFileId}&clientId=${effectiveUserId}`,
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
                  "first_name",
                  "last_name",
                  "full_name",
                  "email",
                  "company_name",
                  "job_title",
                  "country_or_address",
                  "email_subject",
                ]
                : ["first_name", "last_name", "full_name", "email", "company", "jobTitle", "location", "ipAddress"]
            }
            primaryKey="id"
            viewMode="table"
            customHeader={
              emailFilterType === "email-logs"
                ? getSelectionHeader('email-logs')
                : emailFilterType === "missing-logs"
                ? getSelectionHeader('missing-logs')
                : getSelectionHeader('engagement')
            }
            onColumnsChange={
              emailFilterType === "email-logs"
                ? setEmailLogsColumns
                : emailFilterType === "missing-logs"
                ? setMissingLogsColumns
                : setEmailColumns
            }
          />
          {/* ── Email Logs Summary ── */}
          {emailFilterType === "email-logs" && (
            <div className="md-summary-row">
              <div className="md-summary-card">
                <span className="md-summary-label">Total emails</span>
                <span className="md-summary-value">{getFilteredEmailLogs().length.toLocaleString()}</span>
              </div>
              <div className="md-summary-card md-summary-card--success">
                <span className="md-summary-label">Successfully sent</span>
                <span className="md-summary-value">
                  {getFilteredEmailLogs().filter((log) => log.isSuccess).length.toLocaleString()}
                </span>
              </div>
              <div className="md-summary-card md-summary-card--error">
                <span className="md-summary-label">Failed</span>
                <span className="md-summary-value">
                  {getFilteredEmailLogs().filter((log) => !log.isSuccess).length.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Segment Save Modal */}
          <SegmentModal
            //isOpen={showSaveSegmentModal}
            isOpen={showSaveSegmentCommonModal}
            onClose={() => 
              //setShowSaveSegmentModal(false)
              dispatch(closePanel())
            }
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

          {/* Bulk Update Panel */}
          <BulkUpdatePanel
            //isOpen={showBulkUpdatePanel}
            isOpen={showBulkUpdatePanelModal}

            onClose={() => 
              //setShowBulkUpdatePanel(false)
              dispatch(closePanel())

            }
            selectedContactIds={getBulkUpdateContactIds().map(id => id.toString())} 
            clientId={effectiveUserId!}
            onUpdateComplete={() => {
              // Clear selections after update
              if (emailFilterType === "email-logs") {
                setSelectedEmailLogs(new Set());
              } else if (emailFilterType === "missing-logs") {
                setSelectedMissingLogs(new Set());
              } else {
                setDetailSelectedContacts(new Set());
              }
              
              // Refresh data if needed
              if (selectedCampaign) {
                setDataFetchedForCampaign("");
                fetchLogsByCampaign(selectedCampaign);
              }
            }}
          />
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
                    style={{ borderRadius: "12px" }}
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
                      border: "1px solid #dc3545",
                      borderRadius: "12px"
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
