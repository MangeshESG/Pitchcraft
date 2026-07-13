import { useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import moment from "moment-timezone";
import axios from "axios";
import API_BASE_URL from "../../../config";
import LoadingSpinner from "../../common/LoadingSpinner";
import AppModal from "../../common/AppModal";
import { useAppModal } from "../../../hooks/useAppModal";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../../Redux/store";
import "../blueprint/Template.new.css";
import schedulingNewUserImage from "../../../assets/images/scheduling_new_user.png";
import CommonSidePanel from "../../common/CommonSidePanel";
import PaginationControls from "../PaginationControls";
import { closePanel, openPanel } from "../../../slices/panelSlice";
import {
  CalendarClock,
  Clock,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  CalendarCheck,
  Send,
  Mailbox,
  Megaphone,
  CheckCircle2,
} from "lucide-react";

interface scheduleFetch {
  id?: number;
  clientId: number;
  title: string;
  bccEmail?: string;
  scheduledDate: string;
  scheduledTime: string | { ticks?: number };
  timeZone: string;
  smtpID: number;
  smtpName: string;
  provider?: string;
  zohoviewName: string;
  zohoViewName: string;
  isSent: boolean;
  testIsSent: boolean;
  dataFileId: number | null;
  segmentId?: number | null;
  campaignId?: number | null;
  steps?: Array<{
    scheduledDate?: string;
    ScheduledDate?: string;
    scheduledTime?: string | { ticks?: number };
    ScheduledTime?: string | { ticks?: number };
  }>;
}

interface SmtpUser {
  id: number;
  username?: string;
  email?: string;
  type?: string;
  smtpType?: string;
  provider?: string;
}

interface EmailEntry {
  id?: string;
  full_Name?: string;
  job_Title?: string;
  account_name_friendlySingle_Line_12?: string;
  mailing_Country?: string;
  website?: string;
  linkedIn_URL?: string;
  sample_email_body?: string;
  generated: boolean;
}

export interface ScheduleTabProps {
  effectiveUserId: string | null | undefined;
  token: string | null;
  isDemoAccount: boolean;
  setExistingResponse: React.Dispatch<React.SetStateAction<any[]>>;
}

const asArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const arrayKeys = ["data", "items", "result", "results", "records", "campaigns", "mailboxes", "schedules", "emails"];
    for (const key of arrayKeys) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
  }
  return [];
};

const getCampaignId = (campaign: any) =>
  campaign?.id ?? campaign?.Id ?? campaign?.campaignId ?? campaign?.CampaignId ?? "";

const getCampaignName = (campaign: any) =>
  String(
    campaign?.campaignName ??
      campaign?.CampaignName ??
      campaign?.name ??
      campaign?.Name ??
      campaign?.title ??
      campaign?.Title ??
      ""
  ).trim();

const getCampaignLabel = (campaign: any) => {
  const name = getCampaignName(campaign);
  if (name) return name;

  const id = getCampaignId(campaign);
  return id ? `Campaign ${id}` : "Untitled campaign";
};

const timezoneOptions = [
  { value: "Dateline Standard Time", label: "(UTC-12:00) International Date Line West", iana: "Etc/GMT+12" },
  { value: "UTC-11", label: "(UTC-11:00) Coordinated Universal Time-11", iana: "Etc/GMT+11" },
  { value: "Aleutian Standard Time", label: "(UTC-10:00) Aleutian Islands", iana: "America/Adak" },
  { value: "Hawaiian Standard Time", label: "(UTC-10:00) Hawaii", iana: "Pacific/Honolulu" },
  { value: "Marquesas Standard Time", label: "(UTC-09:30) Marquesas Islands", iana: "Pacific/Marquesas" },
  { value: "Alaskan Standard Time", label: "(UTC-09:00) Alaska", iana: "America/Anchorage" },
  { value: "UTC-09", label: "(UTC-09:00) Coordinated Universal Time-09", iana: "Etc/GMT+9" },
  { value: "Pacific Standard Time (Mexico)", label: "(UTC-08:00) Baja California", iana: "America/Tijuana" },
  { value: "UTC-08", label: "(UTC-08:00) Coordinated Universal Time-08", iana: "Etc/GMT+8" },
  { value: "Pacific Standard Time", label: "(UTC-08:00) Pacific Time (US & Canada)", iana: "America/Los_Angeles" },
  { value: "US Mountain Standard Time", label: "(UTC-07:00) Arizona", iana: "America/Phoenix" },
  { value: "Mountain Standard Time (Mexico)", label: "(UTC-07:00) La Paz, Mazatlan", iana: "America/Mazatlan" },
  { value: "Mountain Standard Time", label: "(UTC-07:00) Mountain Time (US & Canada)", iana: "America/Denver" },
  { value: "Yukon Standard Time", label: "(UTC-07:00) Yukon", iana: "America/Whitehorse" },
  { value: "Central America Standard Time", label: "(UTC-06:00) Central America", iana: "America/Guatemala" },
  { value: "Central Standard Time", label: "(UTC-06:00) Central Time (US & Canada)", iana: "America/Chicago" },
  { value: "Easter Island Standard Time", label: "(UTC-06:00) Easter Island", iana: "Pacific/Easter" },
  { value: "Central Standard Time (Mexico)", label: "(UTC-06:00) Guadalajara, Mexico City, Monterrey", iana: "America/Mexico_City" },
  { value: "Canada Central Standard Time", label: "(UTC-06:00) Saskatchewan", iana: "America/Regina" },
  { value: "SA Pacific Standard Time", label: "(UTC-05:00) Bogota, Lima, Quito, Rio Branco", iana: "America/Bogota" },
  { value: "Eastern Standard Time (Mexico)", label: "(UTC-05:00) Chetumal", iana: "America/Cancun" },
  { value: "Eastern Standard Time", label: "(UTC-05:00) Eastern Time (US & Canada)", iana: "America/New_York" },
  { value: "Haiti Standard Time", label: "(UTC-05:00) Haiti", iana: "America/Port-au-Prince" },
  { value: "Cuba Standard Time", label: "(UTC-05:00) Havana", iana: "America/Havana" },
  { value: "US Eastern Standard Time", label: "(UTC-05:00) Indiana (East)", iana: "America/Indianapolis" },
  { value: "Turks And Caicos Standard Time", label: "(UTC-05:00) Turks and Caicos", iana: "America/Grand_Turk" },
  { value: "Paraguay Standard Time", label: "(UTC-04:00) Asuncion", iana: "America/Asuncion" },
  { value: "Atlantic Standard Time", label: "(UTC-04:00) Atlantic Time (Canada)", iana: "America/Halifax" },
  { value: "Venezuela Standard Time", label: "(UTC-04:00) Caracas", iana: "America/Caracas" },
  { value: "Central Brazilian Standard Time", label: "(UTC-04:00) Cuiaba", iana: "America/Cuiaba" },
  { value: "SA Western Standard Time", label: "(UTC-04:00) Georgetown, La Paz, Manaus, San Juan", iana: "America/La_Paz" },
  { value: "Pacific SA Standard Time", label: "(UTC-04:00) Santiago", iana: "America/Santiago" },
  { value: "Newfoundland Standard Time", label: "(UTC-03:30) Newfoundland", iana: "America/St_Johns" },
  { value: "Tocantins Standard Time", label: "(UTC-03:00) Araguaina", iana: "America/Araguaina" },
  { value: "E. South America Standard Time", label: "(UTC-03:00) Brasilia", iana: "America/Sao_Paulo" },
  { value: "SA Eastern Standard Time", label: "(UTC-03:00) Cayenne, Fortaleza", iana: "America/Cayenne" },
  { value: "Argentina Standard Time", label: "(UTC-03:00) City of Buenos Aires", iana: "America/Buenos_Aires" },
  { value: "Montevideo Standard Time", label: "(UTC-03:00) Montevideo", iana: "America/Montevideo" },
  { value: "Magallanes Standard Time", label: "(UTC-03:00) Punta Arenas", iana: "America/Punta_Arenas" },
  { value: "Saint Pierre Standard Time", label: "(UTC-03:00) Saint Pierre and Miquelon", iana: "America/Miquelon" },
  { value: "Bahia Standard Time", label: "(UTC-03:00) Salvador", iana: "America/Bahia" },
  { value: "UTC-02", label: "(UTC-02:00) Coordinated Universal Time-02", iana: "Etc/GMT+2" },
  { value: "Greenland Standard Time", label: "(UTC-02:00) Greenland", iana: "America/Godthab" },
  { value: "Mid-Atlantic Standard Time", label: "(UTC-02:00) Mid-Atlantic - Old", iana: "Etc/GMT+2" },
  { value: "Azores Standard Time", label: "(UTC-01:00) Azores", iana: "Atlantic/Azores" },
  { value: "Cape Verde Standard Time", label: "(UTC-01:00) Cabo Verde Is.", iana: "Atlantic/Cape_Verde" },
  { value: "UTC", label: "(UTC) Coordinated Universal Time", iana: "Etc/UTC" },
  { value: "GMT Standard Time", label: "(UTC+00:00) Dublin, Edinburgh, Lisbon, London", iana: "Europe/London" },
  { value: "Greenwich Standard Time", label: "(UTC+00:00) Monrovia, Reykjavik", iana: "Atlantic/Reykjavik" },
  { value: "Sao Tome Standard Time", label: "(UTC+00:00) Sao Tome", iana: "Africa/Sao_Tome" },
  { value: "Morocco Standard Time", label: "(UTC+01:00) Casablanca", iana: "Africa/Casablanca" },
  { value: "W. Europe Standard Time", label: "(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna", iana: "Europe/Berlin" },
  { value: "Central Europe Standard Time", label: "(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague", iana: "Europe/Budapest" },
  { value: "Romance Standard Time", label: "(UTC+01:00) Brussels, Copenhagen, Madrid, Paris", iana: "Europe/Paris" },
  { value: "Central European Standard Time", label: "(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb", iana: "Europe/Warsaw" },
  { value: "W. Central Africa Standard Time", label: "(UTC+01:00) West Central Africa", iana: "Africa/Lagos" },
  { value: "GTB Standard Time", label: "(UTC+02:00) Athens, Bucharest", iana: "Europe/Bucharest" },
  { value: "Middle East Standard Time", label: "(UTC+02:00) Beirut", iana: "Asia/Beirut" },
  { value: "Egypt Standard Time", label: "(UTC+02:00) Cairo", iana: "Africa/Cairo" },
  { value: "E. Europe Standard Time", label: "(UTC+02:00) Chisinau", iana: "Europe/Chisinau" },
  { value: "West Bank Standard Time", label: "(UTC+02:00) Gaza, Hebron", iana: "Asia/Gaza" },
  { value: "South Africa Standard Time", label: "(UTC+02:00) Harare, Pretoria", iana: "Africa/Johannesburg" },
  { value: "FLE Standard Time", label: "(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius", iana: "Europe/Kiev" },
  { value: "Israel Standard Time", label: "(UTC+02:00) Jerusalem", iana: "Asia/Jerusalem" },
  { value: "South Sudan Standard Time", label: "(UTC+02:00) Juba", iana: "Africa/Juba" },
  { value: "Kaliningrad Standard Time", label: "(UTC+02:00) Kaliningrad", iana: "Europe/Kaliningrad" },
  { value: "Sudan Standard Time", label: "(UTC+02:00) Khartoum", iana: "Africa/Khartoum" },
  { value: "Libya Standard Time", label: "(UTC+02:00) Tripoli", iana: "Africa/Tripoli" },
  { value: "Namibia Standard Time", label: "(UTC+02:00) Windhoek", iana: "Africa/Windhoek" },
  { value: "Jordan Standard Time", label: "(UTC+03:00) Amman", iana: "Asia/Amman" },
  { value: "Arabic Standard Time", label: "(UTC+03:00) Baghdad", iana: "Asia/Baghdad" },
  { value: "Syria Standard Time", label: "(UTC+03:00) Damascus", iana: "Asia/Damascus" },
  { value: "Turkey Standard Time", label: "(UTC+03:00) Istanbul", iana: "Europe/Istanbul" },
  { value: "Arab Standard Time", label: "(UTC+03:00) Kuwait, Riyadh", iana: "Asia/Riyadh" },
  { value: "Belarus Standard Time", label: "(UTC+03:00) Minsk", iana: "Europe/Minsk" },
  { value: "Russian Standard Time", label: "(UTC+03:00) Moscow, St. Petersburg", iana: "Europe/Moscow" },
  { value: "E. Africa Standard Time", label: "(UTC+03:00) Nairobi", iana: "Africa/Nairobi" },
  { value: "Volgograd Standard Time", label: "(UTC+03:00) Volgograd", iana: "Europe/Volgograd" },
  { value: "Iran Standard Time", label: "(UTC+03:30) Tehran", iana: "Asia/Tehran" },
  { value: "Arabian Standard Time", label: "(UTC+04:00) Abu Dhabi, Muscat", iana: "Asia/Dubai" },
  { value: "Astrakhan Standard Time", label: "(UTC+04:00) Astrakhan, Ulyanovsk", iana: "Europe/Astrakhan" },
  { value: "Azerbaijan Standard Time", label: "(UTC+04:00) Baku", iana: "Asia/Baku" },
  { value: "Russia Time Zone 3", label: "(UTC+04:00) Izhevsk, Samara", iana: "Europe/Samara" },
  { value: "Mauritius Standard Time", label: "(UTC+04:00) Port Louis", iana: "Indian/Mauritius" },
  { value: "Saratov Standard Time", label: "(UTC+04:00) Saratov", iana: "Europe/Saratov" },
  { value: "Georgian Standard Time", label: "(UTC+04:00) Tbilisi", iana: "Asia/Tbilisi" },
  { value: "Caucasus Standard Time", label: "(UTC+04:00) Yerevan", iana: "Asia/Yerevan" },
  { value: "Afghanistan Standard Time", label: "(UTC+04:30) Kabul", iana: "Asia/Kabul" },
  { value: "West Asia Standard Time", label: "(UTC+05:00) Ashgabat, Tashkent", iana: "Asia/Tashkent" },
  { value: "Ekaterinburg Standard Time", label: "(UTC+05:00) Ekaterinburg", iana: "Asia/Yekaterinburg" },
  { value: "Pakistan Standard Time", label: "(UTC+05:00) Islamabad, Karachi", iana: "Asia/Karachi" },
  { value: "Qyzylorda Standard Time", label: "(UTC+05:00) Qyzylorda", iana: "Asia/Qyzylorda" },
  { value: "India Standard Time", label: "(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi", iana: "Asia/Kolkata" },
  { value: "Sri Lanka Standard Time", label: "(UTC+05:30) Sri Jayawardenepura", iana: "Asia/Colombo" },
  { value: "Nepal Standard Time", label: "(UTC+05:45) Kathmandu", iana: "Asia/Kathmandu" },
  { value: "Central Asia Standard Time", label: "(UTC+06:00) Astana", iana: "Asia/Almaty" },
  { value: "Bangladesh Standard Time", label: "(UTC+06:00) Dhaka", iana: "Asia/Dhaka" },
  { value: "Omsk Standard Time", label: "(UTC+06:00) Omsk", iana: "Asia/Omsk" },
  { value: "Myanmar Standard Time", label: "(UTC+06:30) Yangon (Rangoon)", iana: "Asia/Yangon" },
  { value: "SE Asia Standard Time", label: "(UTC+07:00) Bangkok, Hanoi, Jakarta", iana: "Asia/Bangkok" },
  { value: "Altai Standard Time", label: "(UTC+07:00) Barnaul, Gorno-Altaysk", iana: "Asia/Barnaul" },
  { value: "W. Mongolia Standard Time", label: "(UTC+07:00) Hovd", iana: "Asia/Hovd" },
  { value: "North Asia Standard Time", label: "(UTC+07:00) Krasnoyarsk", iana: "Asia/Krasnoyarsk" },
  { value: "N. Central Asia Standard Time", label: "(UTC+07:00) Novosibirsk", iana: "Asia/Novosibirsk" },
  { value: "Tomsk Standard Time", label: "(UTC+07:00) Tomsk", iana: "Asia/Tomsk" },
  { value: "China Standard Time", label: "(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi", iana: "Asia/Shanghai" },
  { value: "North Asia East Standard Time", label: "(UTC+08:00) Irkutsk", iana: "Asia/Irkutsk" },
  { value: "Singapore Standard Time", label: "(UTC+08:00) Kuala Lumpur, Singapore", iana: "Asia/Singapore" },
  { value: "W. Australia Standard Time", label: "(UTC+08:00) Perth", iana: "Australia/Perth" },
  { value: "Taipei Standard Time", label: "(UTC+08:00) Taipei", iana: "Asia/Taipei" },
  { value: "Ulaanbaatar Standard Time", label: "(UTC+08:00) Ulaanbaatar", iana: "Asia/Ulaanbaatar" },
  { value: "Aus Central W. Standard Time", label: "(UTC+08:45) Eucla", iana: "Australia/Eucla" },
  { value: "Transbaikal Standard Time", label: "(UTC+09:00) Chita", iana: "Asia/Chita" },
  { value: "Tokyo Standard Time", label: "(UTC+09:00) Osaka, Sapporo, Tokyo", iana: "Asia/Tokyo" },
  { value: "North Korea Standard Time", label: "(UTC+09:00) Pyongyang", iana: "Asia/Pyongyang" },
  { value: "Korea Standard Time", label: "(UTC+09:00) Seoul", iana: "Asia/Seoul" },
  { value: "Yakutsk Standard Time", label: "(UTC+09:00) Yakutsk", iana: "Asia/Yakutsk" },
  { value: "Cen. Australia Standard Time", label: "(UTC+09:30) Adelaide", iana: "Australia/Adelaide" },
  { value: "AUS Central Standard Time", label: "(UTC+09:30) Darwin", iana: "Australia/Darwin" },
  { value: "E. Australia Standard Time", label: "(UTC+10:00) Brisbane", iana: "Australia/Brisbane" },
  { value: "AUS Eastern Standard Time", label: "(UTC+10:00) Canberra, Melbourne, Sydney", iana: "Australia/Sydney" },
  { value: "West Pacific Standard Time", label: "(UTC+10:00) Guam, Port Moresby", iana: "Pacific/Port_Moresby" },
  { value: "Tasmania Standard Time", label: "(UTC+10:00) Hobart", iana: "Australia/Hobart" },
  { value: "Vladivostok Standard Time", label: "(UTC+10:00) Vladivostok", iana: "Asia/Vladivostok" },
  { value: "Lord Howe Standard Time", label: "(UTC+10:30) Lord Howe Island", iana: "Australia/Lord_Howe" },
  { value: "Bougainville Standard Time", label: "(UTC+11:00) Bougainville Island", iana: "Pacific/Bougainville" },
  { value: "Russia Time Zone 10", label: "(UTC+11:00) Chokurdakh", iana: "Asia/Srednekolymsk" },
  { value: "Magadan Standard Time", label: "(UTC+11:00) Magadan", iana: "Asia/Magadan" },
  { value: "Norfolk Standard Time", label: "(UTC+11:00) Norfolk Island", iana: "Pacific/Norfolk" },
  { value: "Sakhalin Standard Time", label: "(UTC+11:00) Sakhalin", iana: "Asia/Sakhalin" },
  { value: "Central Pacific Standard Time", label: "(UTC+11:00) Solomon Is., New Caledonia", iana: "Pacific/Guadalcanal" },
  { value: "Russia Time Zone 11", label: "(UTC+12:00) Anadyr, Petropavlovsk-Kamchatsky", iana: "Asia/Kamchatka" },
  { value: "New Zealand Standard Time", label: "(UTC+12:00) Auckland, Wellington", iana: "Pacific/Auckland" },
  { value: "UTC+12", label: "(UTC+12:00) Coordinated Universal Time+12", iana: "Etc/GMT-12" },
  { value: "Fiji Standard Time", label: "(UTC+12:00) Fiji", iana: "Pacific/Fiji" },
  { value: "Chatham Islands Standard Time", label: "(UTC+12:45) Chatham Islands", iana: "Pacific/Chatham" },
  { value: "UTC+13", label: "(UTC+13:00) Coordinated Universal Time+13", iana: "Etc/GMT-13" },
  { value: "Tonga Standard Time", label: "(UTC+13:00) Nuku'alofa", iana: "Pacific/Tongatapu" },
  { value: "Samoa Standard Time", label: "(UTC+13:00) Samoa", iana: "Pacific/Apia" },
  { value: "Line Islands Standard Time", label: "(UTC+14:00) Kiritimati Island", iana: "Pacific/Kiritimati" },
];

const emptyForm = () => ({
  title: "",
  timeZone: "",
  scheduledDate: "",
  scheduledTime: "",
  EmailDeliver: "",
  bccEmail: "",
  smtpID: "",
});

const ScheduleTab: React.FC<ScheduleTabProps> = ({
  effectiveUserId,
  token,
  isDemoAccount,
  setExistingResponse,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const appModal = useAppModal();

  const activePanel = useSelector((state: RootState) => state.panel.activePanel);
  const scheduleModal = activePanel === "schedule-modal";

  const [scheduleCampaigns, setScheduleCampaigns] = useState<any[]>([]);
  const [scheduleDataLoading, setScheduleDataLoading] = useState(false);
  const [selectedZohoviewId1, setSelectedZohoviewId1] = useState<string>("");
  const [nextPageToken1, setNextPageToken1] = useState<string | null>(null);
  const [prevPageToken1, setPrevPageToken1] = useState<string | null>(null);
  const [selectedScheduleFile, setSelectedScheduleFile] = useState<{ id: number; name: string } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const [formData, setFormData] = useState(emptyForm());
  const [isFollowUp, setIsFollowUp] = useState(false);
  const [bccError, setBccError] = useState("");
  const [editingId, setEditingId] = useState<any>(null);

  const [smtpUsers, setSmtpUsers] = useState<SmtpUser[]>([]);
  const [selectedUser, setSelectedUser] = useState("");

  const [scheduleList, setScheduleList] = useState<scheduleFetch[]>([]);
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [scheduleActionsAnchor, setScheduleActionsAnchor] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "All">(10);

  const isFormValid = (formData.title || "").trim() !== "";

  // ── data fetching ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!effectiveUserId) return;
    setScheduleDataLoading(true);
    axios
      .get(`${API_BASE_URL}/api/auth/campaigns/client/${effectiveUserId}`, {
        headers: { accept: "*/*", ...(token && { Authorization: `Bearer ${token}` }) },
      })
      .then((r) => setScheduleCampaigns(asArray<any>(r.data)))
      .catch(() => setScheduleCampaigns([]))
      .finally(() => setScheduleDataLoading(false));
  }, [effectiveUserId, token]);

  useEffect(() => {
    setSelectedZohoviewId1("");
    setScheduleCampaigns([]);
  }, [effectiveUserId]);

  useEffect(() => {
    if (!scheduleModal || !effectiveUserId || scheduleCampaigns.length > 0) return;
    setScheduleDataLoading(true);
    axios
      .get(`${API_BASE_URL}/api/auth/campaigns/client/${effectiveUserId}`, {
        headers: { accept: "*/*", ...(token && { Authorization: `Bearer ${token}` }) },
      })
      .then((r) => setScheduleCampaigns(asArray<any>(r.data)))
      .catch(() => setScheduleCampaigns([]))
      .finally(() => setScheduleDataLoading(false));
  }, [scheduleModal, effectiveUserId, token, scheduleCampaigns.length]);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/email/get-Outboxs?clientId=${effectiveUserId}`, {
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      })
      .then((r) => setSmtpUsers(asArray<SmtpUser>(r.data?.data || r.data)))
      .catch((err) => { if (!axios.isAxiosError(err)) console.error(err); });
  }, [effectiveUserId, token]);

  const fetchSchedule = async () => {
    try {
      const r = await axios.get(
        `${API_BASE_URL}/api/email/get-sequence?ClientId=${effectiveUserId}`,
        { headers: { "Content-Type": "application/json" } }
      );
      setScheduleList(asArray<scheduleFetch>(r.data));
    } catch {
      setScheduleList([]);
    }
  };

  useEffect(() => { fetchSchedule(); }, [effectiveUserId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".sch-actions-btn") && !t.closest(".sch-actions-menu")) {
        setScheduleActionsAnchor(null);
      }
    };
    if (scheduleActionsAnchor) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [scheduleActionsAnchor]);

  // ── email bodies ─────────────────────────────────────────────────────────────

  const fetchAndDisplayEmailBodies1 = useCallback(
    async (
      zohoviewId: string,
      pageToken: string | null = null,
      direction: "next" | "previous" | null = null
    ) => {
      try {
        setEmailLoading(true);
        let url = `${API_BASE_URL}/api/auth/pitchgenData/${zohoviewId}?ClientId=${effectiveUserId}`;
        if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch email bodies");
        const data = await res.json();
        if (!Array.isArray(data.data)) return;

        const emailResponses = data.data.map((entry: EmailEntry) => ({
          id: entry.id,
          name: entry.full_Name || "N/A",
          title: entry.job_Title || "N/A",
          company: entry.account_name_friendlySingle_Line_12 || "N/A",
          location: entry.mailing_Country || "N/A",
          website: entry.website || "N/A",
          linkedin: entry.linkedIn_URL || "N/A",
          pitch: entry.sample_email_body || "No email body found",
          timestamp: new Date().toISOString(),
          nextPageToken: data.nextPageToken,
          prevPageToken: data.previousPageToken,
          generated: false,
        }));

        if (direction === "next") setExistingResponse((p) => [...p, ...emailResponses]);
        else if (direction === "previous") setExistingResponse((p) => [...emailResponses, ...p]);
        else setExistingResponse(emailResponses);

        setNextPageToken1(data.nextPageToken || null);
        setPrevPageToken1(data.previousPageToken || null);
      } catch (error) {
        console.error("Error fetching email bodies:", error);
      } finally {
        setEmailLoading(false);
      }
    },
    [effectiveUserId]
  );

  // ── handlers ─────────────────────────────────────────────────────────────────

  const handleZohoModelChange1 = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedZohoviewId1(val);
    if (val) {
      const [type, id] = val.split("-");
      if (type === "campaign") {
        const c = scheduleCampaigns.find((c) => String(getCampaignId(c)) === id);
        setSelectedScheduleFile({ id: Number(getCampaignId(c)) || 0, name: c ? getCampaignLabel(c) : "" });
      }
      try { await fetchAndDisplayEmailBodies1(val.split("-")[1]); } catch { /* noop */ }
    }
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "bccEmail") {
      const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      setBccError(value && !pattern.test(value.trim()) ? "Please enter a valid email address." : "");
    }
  };

  const closeAndReset = () => {
    dispatch(closePanel());
    setEditingId(null);
    setFormData(emptyForm());
    setIsFollowUp(false);
    setSelectedZohoviewId1("");
    setSelectedUser("");
  };

  const formatTicksAsTime = (ticks?: number) => {
    if (typeof ticks !== "number") return "";
    const totalSeconds = Math.floor(ticks / 10000000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
  };

  const getScheduleStep = (item: any) => item.steps?.[0] || item.Steps?.[0] || null;

  const getScheduledDateValue = (item: any) => {
    const step = getScheduleStep(item);
    return item.scheduledDate || item.ScheduledDate || step?.scheduledDate || step?.ScheduledDate || "";
  };

  const getScheduledTimeValue = (item: any) => {
    const step = getScheduleStep(item);
    const value = item.scheduledTime || item.ScheduledTime || step?.scheduledTime || step?.ScheduledTime || "";

    if (value && typeof value === "object") {
      return formatTicksAsTime(value.ticks ?? value.Ticks);
    }

    return value || "";
  };

  const getSmtpDisplayName = (user?: SmtpUser | null) => user?.email || user?.username || "";

  const handleSubmitSchedule = async (e: any) => {
    e.preventDefault();
    if (!selectedUser) {
      appModal.showError("Please select a From mailbox.");
      return;
    }

    if (!formData.scheduledDate || !formData.scheduledTime) {
      appModal.showError("Please select both scheduled date and time.");
      return;
    }

    const selectedTz = timezoneOptions.find((tz) => tz.value === formData.timeZone);
    const ianaTimezone = selectedTz?.iana || "UTC";
    const utcMoment = moment.tz(`${formData.scheduledDate}T${formData.scheduledTime}`, ianaTimezone).utc();

    const stepsPayload = [{
      scheduledDate: utcMoment.toISOString(),
      scheduledTime: utcMoment.format("HH:mm:ss"),
    }];

    const [type, id] = selectedZohoviewId1.split("-");
    let selectedName = "";
    let dataFileId: number | null = null;
    let segmentId: number | null = null;
    let campaignId: number | null = null;

    if (type === "campaign") {
      const c = scheduleCampaigns.find((c) => String(getCampaignId(c)) === id);
      selectedName = c ? getCampaignLabel(c) : "";
      campaignId = Number(getCampaignId(c)) || null;
      if (c?.dataSource === "DataFile") dataFileId = parseInt(c.zohoViewId) || null;
      else if (c?.dataSource === "Segment") segmentId = c.segmentId || null;
    }

    const selectedSmtp = smtpUsers.find((u) => u.id === parseInt(selectedUser || "0"));

    const payload = {
      title: formData.title,
      zohoviewName: selectedName,
      testIsSent: false,
      smtpID: parseInt(selectedUser) || 0,
      provider: selectedSmtp?.provider || selectedSmtp?.type || selectedSmtp?.smtpType || "",
      timeZone: formData.timeZone,
      bccEmail: formData.bccEmail,
      steps: stepsPayload,
      dataFileId,
      segmentId,
      campaignId,
      isFollowUp,
    };

    const headers = { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) };
    try {
      if (editingId) {
        await axios.post(`${API_BASE_URL}/api/email/update-sequence/${editingId}?ClientId=${effectiveUserId}`, payload, { headers });
      } else {
        await axios.post(`${API_BASE_URL}/api/email/create-sequence?ClientId=${effectiveUserId}`, payload, { headers });
      }
      closeAndReset();
      fetchSchedule();
    } catch (err) {
      appModal.showError(
        axios.isAxiosError(err)
          ? `Failed to schedule mail: ${err.response?.data?.message || err.message}`
          : "Failed to schedule mail. Please check the details."
      );
    }
  };

  const handleEditSchedule = (item: any) => {
    const scheduledDate = getScheduledDateValue(item);
    const scheduledTime = getScheduledTimeValue(item);

    setFormData({
      title: item.title || "",
      timeZone: item.timeZone || item.TimeZone || "",
      scheduledDate: scheduledDate ? scheduledDate.slice(0, 10) : "",
      scheduledTime: scheduledTime ? scheduledTime.slice(0, 8) : "",
      EmailDeliver: item.EmailDeliver || "",
      bccEmail: item.bccEmail || "",
      smtpID: item.smtpID || "",
    });
    setEditingId(item.id);

    const matchingCampaign = scheduleCampaigns.find((c) => {
      if (item.segmentId && item.segmentId > 0) return c.segmentId === item.segmentId;
      if (item.dataFileId && item.dataFileId > 0) return c.zohoViewId === item.dataFileId.toString();
      return false;
    });
    if (matchingCampaign) setSelectedZohoviewId1(`campaign-${getCampaignId(matchingCampaign)}`);
    setSelectedUser(item.smtpID ? item.smtpID.toString() : "");
    dispatch(openPanel("schedule-modal"));
  };

  const handleDeleteSchedule = async (id: any) => {
    try {
      await axios.post(
        `${API_BASE_URL}/api/email/delete-sequence/${id}?ClientId=${effectiveUserId}`,
        {},
        { headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) } }
      );
      fetchSchedule();
    } catch {
      appModal.showError("Error deleting schedule.");
    }
  };

  // ── derived ──────────────────────────────────────────────────────────────────

  const safeScheduleList = asArray<scheduleFetch>(scheduleList);

  // A schedule needs both a campaign and a mailbox. When either prerequisite is
  // missing, guide the user to create it (mirrors the Kraft Email setup checklist).
  const hasCampaign = scheduleCampaigns.length > 0;
  const hasMailbox = smtpUsers.length > 0;
  const prerequisitesMissing = !hasCampaign || !hasMailbox;
  const setupSteps = [
    {
      done: hasCampaign,
      icon: Megaphone,
      title: "At least one campaign",
      subtitle: "Link your contacts and a blueprint together in a campaign to schedule.",
      addLabel: "Add campaign",
      onAdd: () => navigate("/main?tab=Campaigns"),
    },
    {
      done: hasMailbox,
      icon: Mailbox,
      title: "At least one mailbox",
      subtitle: "Connect a mailbox so PitchKraft has an address to send sends from.",
      addLabel: "Add mailbox",
      onAdd: () => navigate("/main?tab=Mail&mailSubTab=Configuration"),
    },
  ];

  const filteredList = safeScheduleList.filter(
    (item) =>
      item.title?.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
      item.zohoviewName?.toLowerCase().includes(scheduleSearch.toLowerCase())
  );
  const totalPages = pageSize === "All" ? 1 : Math.ceil(filteredList.length / pageSize);
  const paginatedList =
    pageSize === "All"
      ? filteredList
      : filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const sentCount = safeScheduleList.filter((s) => s.isSent).length;
  const upcomingCount = safeScheduleList.filter((s) => !s.isSent).length;

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="bp-list-wrap schedule-bp-page">

        {/* ── Page header ── */}
        {(scheduleDataLoading || safeScheduleList.length > 0) && (
          <div className="bp-page-header">
            <div className="bp-page-header__inner">
              <div>
                <h1 className="bp-page-title">
                  Schedules
                  <span className="bp-count-pill">{safeScheduleList.length}</span>
                </h1>
                <p className="bp-page-sub">
                  Create and manage email delivery schedules for your campaigns.
                </p>
              </div>
              {!isDemoAccount && (
                <div className="bp-header-actions">
                  <button
                    type="button"
                    className="btn-default"
                    onClick={() => dispatch(openPanel("schedule-modal"))}
                  >
                    <Plus className="h-4 w-4" />
                    New schedule
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {scheduleDataLoading ? (
          <div className="bp-list-body">
            <div className="bp-rows__msg">Loading schedules…</div>
          </div>
        ) : prerequisitesMissing && safeScheduleList.length === 0 ? (

          /* ── Setup checklist (no campaign and/or no mailbox yet) ── */
          <div className="bp-empty-body">
            <div className="bp-empty-hero">
              <div className="bp-empty-hero__bg" />
              <div className="bp-empty-hero__content">
                <div className="bp-empty-hero__copy">
                  <span className="bp-start-pill">Start here</span>
                  <h2 className="bp-empty-headline">A little setup before you schedule.</h2>
                  <p className="bp-empty-body-text">
                    To schedule a send you first need a campaign to send and a mailbox
                    to send it from. Finish the steps below to get going.
                  </p>

                  {!isDemoAccount && (
                    <div className="sch-setup-checklist">
                      {setupSteps.map((step) => {
                        const StepIcon = step.icon;
                        return (
                          <div key={step.addLabel} className="sch-setup-card">
                            <span className="sch-setup-card__icon">
                              <StepIcon className="h-4 w-4" />
                            </span>
                            <div className="sch-setup-card__text">
                              <div className="sch-setup-card__title">{step.title}</div>
                              <div className="sch-setup-card__subtitle">{step.subtitle}</div>
                            </div>
                            {step.done ? (
                              <span className="sch-setup-badge sch-setup-badge--done">
                                <CheckCircle2 className="h-4 w-4" />
                                Done
                              </span>
                            ) : (
                              <button className="btn-default sch-setup-card__btn" onClick={step.onAdd}>
                                <Plus className="h-4 w-4" />
                                {step.addLabel}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="bp-empty-hero__art">
                  <img
                    src={schedulingNewUserImage}
                    alt=""
                    style={{ width: 460, height: "auto", maxWidth: "100%" }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              </div>
            </div>
          </div>

        ) : safeScheduleList.length === 0 ? (

          /* ── Empty state ── */
          <div className="bp-empty-body">
            <div className="bp-empty-hero">
              <div className="bp-empty-hero__bg" />
              <div className="bp-empty-hero__content">
                <div className="bp-empty-hero__copy">
                  <span className="bp-start-pill">Start here</span>
                  <h2 className="bp-empty-headline">Schedule your first send.</h2>
                  <p className="bp-empty-body-text">
                    Pick a campaign, choose a mailbox, set a date and time — PitchKraft will handle the rest.
                  </p>
                  {!isDemoAccount && (
                    <div className="bp-empty-actions">
                      <button
                        className="btn-default"
                        onClick={() => dispatch(openPanel("schedule-modal"))}
                      >
                        <Plus className="h-4 w-4" />
                        Create your first schedule
                      </button>
                    </div>
                  )}
                  <div className="bp-empty-meta">Takes less than a minute. You can edit or delete at any time.</div>
                </div>
                <div className="bp-empty-hero__art">
                  <img
                    src={schedulingNewUserImage}
                    alt=""
                    style={{ width: 460, height: "auto", maxWidth: "100%" }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              </div>
            </div>


          </div>

        ) : (
          <>
            {/* ── Banner ── */}
            <div className="bp-list-body" style={{ paddingBottom: 0 }}>
              <div className="bp-banner">
                <div className="bp-banner__left">
                  <div className="bp-banner__art">
                    <CalendarClock style={{ width: 72, height: 72, color: "#3f9f42" }} />
                  </div>
                  <div className="bp-banner__copy">
                    <div className="bp-banner__title">Your email schedules are set and ready.</div>
                    <div className="bp-banner__sub">
                      You have <strong>{safeScheduleList.length}</strong> schedule{safeScheduleList.length !== 1 ? "s" : ""}.{" "}
                      Keep campaigns moving by scheduling sends in advance.
                    </div>
                    {!isDemoAccount && (
                      <div className="bp-banner__actions">
                        <button
                          className="btn-default"
                          onClick={() => dispatch(openPanel("schedule-modal"))}
                        >
                          <Plus className="h-4 w-4" />
                          New schedule
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="bp-banner__features">
                  <div className="bp-banner__feature">
                    <span className="bp-banner__feature-icon"><CalendarCheck className="h-4 w-4" /></span>
                    <div>
                      <div className="bp-banner__feature-title">Total schedules</div>
                      <div className="bp-banner__feature-desc">{safeScheduleList.length} created</div>
                    </div>
                  </div>
                  <div className="bp-banner__feature">
                    <span className="bp-banner__feature-icon"><Send className="h-4 w-4" /></span>
                    <div>
                      <div className="bp-banner__feature-title">Sent</div>
                      <div className="bp-banner__feature-desc">{sentCount} completed</div>
                    </div>
                  </div>
                  <div className="bp-banner__feature">
                    <span className="bp-banner__feature-icon"><Clock className="h-4 w-4" /></span>
                    <div>
                      <div className="bp-banner__feature-title">Upcoming</div>
                      <div className="bp-banner__feature-desc">{upcomingCount} pending</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Toolbar + Table ── */}
            <div className="bp-list-body">
              <div className="bp-toolbar">
                <div className="bp-toolbar__left">
                  <div className="bp-search">
                    <Search className="bp-search__icon h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search schedules…"
                      value={scheduleSearch}
                      onChange={(e) => { setScheduleSearch(e.target.value); setCurrentPage(1); }}
                    />
                  </div>
                </div>
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalRecords={filteredList.length}
                  pageSize={pageSize}
                  setCurrentPage={setCurrentPage}
                  setPageSize={(s) => {
                    setPageSize(s);
                    setCurrentPage(1);
                  }}
                  pageSizeOptions={[10, 30, 50, "All"]}
                />
              </div>

              <div className="bp-rows sch-rows">
                <div className="bp-rows__head sch-row-grid">
                  <div />
                  <div>Sequence name</div>
                  <div>Campaign</div>
                  <div>From</div>
                  <div>Date &amp; Time</div>
                  <div>Timezone</div>
                  <div>BCC</div>
                  <div />
                </div>

                {paginatedList.length === 0 ? (
                  <div className="bp-rows__msg">No schedules match your search.</div>
                ) : (
                  paginatedList.map((item, index) => {
                    const smtpUser = smtpUsers.find((u) => u.id === item.smtpID);
                    const scheduledDate = getScheduledDateValue(item);
                    const scheduledTime = getScheduledTimeValue(item);
                    const dateStr = scheduledDate ? scheduledDate.slice(0, 10) : "-";
                    const timeStr = scheduledTime || "-";

                    return (
                      <div key={item.id ?? index} className="bp-row sch-row-grid">
                        <div className="bp-row__rail" />
                        <div className="bp-row__name">
                          <span className="bp-row__link">{item.title}</span>
                          {item.isSent && <span className="sch-sent-badge">Sent</span>}
                        </div>
                        <div className="bp-row__id">{item.zohoviewName || "-"}</div>
                        <div className="bp-row__id">{getSmtpDisplayName(smtpUser) || item.smtpName || "-"}</div>
                        <div className="bp-row__date">
                          <span className="sch-date-line">
                            <CalendarCheck className="h-3 w-3 sch-date-icon" />
                            {dateStr}
                          </span>
                          <span className="sch-time-line">
                            <Clock className="h-3 w-3 sch-date-icon" />
                            {timeStr}
                          </span>
                        </div>
                        <div className="bp-row__id sch-tz">{item.timeZone || "-"}</div>
                        <div className="bp-row__id">{item.bccEmail || "-"}</div>
                        <div className="bp-row__actions" style={{ position: "relative" }}>
                          <button
                            type="button"
                            className="sch-actions-btn inline-flex h-8 w-8 items-center justify-center rounded-md text-[#6b7280] hover:bg-[#eef0f3]"
                            onClick={() =>
                              setScheduleActionsAnchor(
                                item.id?.toString() === scheduleActionsAnchor
                                  ? null
                                  : item.id?.toString() ?? null
                              )
                            }
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {scheduleActionsAnchor === item.id?.toString() && (
                            <div className="sch-actions-menu bp-row__menu">
                              {!isDemoAccount && (
                                <button
                                  type="button"
                                  onClick={() => { handleEditSchedule(item); setScheduleActionsAnchor(null); }}
                                >
                                  <Pencil className="h-4 w-4" style={{ color: "#3f9f42" }} />
                                  Edit
                                </button>
                              )}
                              {!isDemoAccount && (
                                <button
                                  type="button"
                                  className="is-danger"
                                  onClick={() => { handleDeleteSchedule(item.id); setScheduleActionsAnchor(null); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Side panel ── */}
      <CommonSidePanel
        isOpen={scheduleModal}
        onClose={closeAndReset}
        title={editingId ? "Edit schedule" : "Create schedule"}
        width={600}
        footerContent={
          <>
            <button type="button" onClick={closeAndReset} className="btn-muted">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitSchedule}
              disabled={!isFormValid}
              className="btn-default"
            >
              {editingId ? "Update" : "Create"}
            </button>
          </>
        }
      >
        <form onSubmit={(e) => e.preventDefault()} className="sch-form">
          <div className="sch-form-grid">

            <div className="sch-field">
              <label className="sch-label">
                Sequence name <span className="sch-required">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter sequence name"
                className="sch-input"
              />
            </div>

            <div className="sch-field">
              <label className="sch-label">
                Campaign <span className="sch-required">*</span>
              </label>
              <select
                name="model"
                onChange={handleZohoModelChange1}
                value={selectedZohoviewId1}
                disabled={scheduleDataLoading}
                className="sch-input"
              >
                <option value="">Select campaign</option>
                {scheduleCampaigns.length > 0
                  ? [...scheduleCampaigns]
                      .filter((c) => getCampaignId(c))
                      .sort((a, b) =>
                        getCampaignLabel(a).localeCompare(getCampaignLabel(b), undefined, { sensitivity: "base" })
                      )
                      .map((c) => {
                        const campaignId = getCampaignId(c);
                        return (
                          <option key={`campaign-${campaignId}`} value={`campaign-${campaignId}`}>
                            {getCampaignLabel(c)}
                          </option>
                        );
                      })
                  : !scheduleDataLoading && <option disabled>No campaigns available</option>}
              </select>
            </div>

            <div className="sch-field">
              <label className="sch-label">
                From <span className="sch-required">*</span>
              </label>
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="sch-input">
                <option value="">Select mailbox</option>
                {smtpUsers
                  .filter((u) => getSmtpDisplayName(u))
                  .sort((a, b) =>
                    getSmtpDisplayName(a).localeCompare(getSmtpDisplayName(b), undefined, { sensitivity: "base" })
                  )
                  .map((u) => (
                    <option key={u.id} value={u.id}>{getSmtpDisplayName(u)}</option>
                  ))}
              </select>
            </div>

            <div className="sch-field">
              <label className="sch-label">BCC email</label>
              <input
                type="email"
                name="bccEmail"
                value={formData.bccEmail}
                onChange={handleChange}
                placeholder="Optional BCC address"
                className="sch-input"
              />
              {bccError && <p className="sch-error">{bccError}</p>}
            </div>

            <div className="sch-field">
              <label className="sch-label">
                Timezone <span className="sch-required">*</span>
              </label>
              <select name="timeZone" value={formData.timeZone} onChange={handleChange} className="sch-input">
                <option value="">Select timezone</option>
                {timezoneOptions.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>

            <div className="sch-field">
              <label className="sch-label">
                Scheduled date <span className="sch-required">*</span>
              </label>
              <input
                type="date"
                name="scheduledDate"
                value={formData.scheduledDate}
                onChange={handleChange}
                className="sch-input"
              />
            </div>

            <div className="sch-field">
              <label className="sch-label">
                Scheduled time <span className="sch-required">*</span>
              </label>
              <input
                type="time"
                name="scheduledTime"
                value={formData.scheduledTime}
                onChange={handleChange}
                className="sch-input"
              />
            </div>

          </div>

          <div className="sch-checkbox-row">
            <input
              type="checkbox"
              id="isFollowUp"
              checked={isFollowUp}
              onChange={(e) => setIsFollowUp(e.target.checked)}
              className="sch-checkbox"
            />
            <label htmlFor="isFollowUp" className="sch-checkbox-label">Include email trail</label>
          </div>
        </form>
      </CommonSidePanel>

      <AppModal isOpen={appModal.isOpen} onClose={appModal.hideModal} {...appModal.config} />
      {emailLoading && <LoadingSpinner message="Loading emails…" />}

      <style>{`
        .schedule-bp-page {
          margin: 0;
          width: 100%;
          background: var(--bp-bg, #fafbfc);
        }
        .schedule-bp-page .bp-empty-headline {
          color: var(--bp-ink, #0b1220);
          text-align: left;
          font-size: 34px;
          font-weight: 700;
          margin: 12px 0 0;
        }
        .schedule-bp-page .bp-page-header {
          margin: 0;
          border-radius: 0;
          box-shadow: none;
        }
        .schedule-bp-page .bp-list-body { max-width: none; }

        /* Row grid: rail | name | campaign | from | date+time | tz | bcc | actions */
        .sch-rows .bp-rows__head.sch-row-grid,
        .sch-rows .bp-row.sch-row-grid {
          display: grid !important;
          grid-template-columns: 10px 1.4fr 1.1fr 1.1fr 140px 160px 120px 44px;
          gap: 12px;
          align-items: center;
        }

        /* Setup checklist (missing campaign / mailbox) */
        .sch-setup-checklist {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 24px;
          max-width: 620px;
        }
        .sch-setup-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border: 1px solid #eef0f3;
          border-radius: 12px;
          background: #fafbfc;
        }
        .sch-setup-card__icon {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #e8f3e9;
          color: #3f9f42;
        }
        .sch-setup-card__text { flex: 1; min-width: 0; }
        .sch-setup-card__title { font-size: 14px; font-weight: 600; color: #0b1220; }
        .sch-setup-card__subtitle { font-size: 12.5px; color: #6b7280; margin-top: 2px; }
        .sch-setup-badge {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12.5px;
          font-weight: 600;
        }
        .sch-setup-badge--done { background: #e8f3e9; color: #2d7a30; }
        .sch-setup-card__btn { flex-shrink: 0; padding: 8px 14px; font-size: 12.5px; }

        .sch-sent-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 999px;
          background: #dcfce7;
          color: #166534;
          font-size: 11px;
          font-weight: 600;
          margin-left: 8px;
          flex-shrink: 0;
        }

        .sch-date-line,
        .sch-time-line {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 13px;
          color: #6b7280;
          white-space: nowrap;
        }
        .sch-time-line { margin-top: 2px; }
        .sch-date-icon { color: #9ca3af; flex-shrink: 0; }

        .sch-tz {
          font-size: 11.5px !important;
          line-height: 1.4;
          white-space: normal;
          word-break: break-word;
        }

        /* Form */
        .sch-form { padding: 4px 0; }
        .sch-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-bottom: 20px;
        }
        .sch-field { display: flex; flex-direction: column; gap: 5px; }
        .sch-label { font-size: 13px; font-weight: 600; color: #374151; }
        .sch-required { color: #ef4444; margin-left: 2px; }
        .sch-input {
          height: 40px;
          padding: 0 12px;
          border: 1px solid #dadde2;
          border-radius: 8px;
          font-size: 13.5px;
          color: #374151;
          background: #fff;
          width: 100%;
          box-sizing: border-box;
          font-family: inherit;
          transition: border-color 0.15s, box-shadow 0.15s;
          appearance: auto;
        }
        .sch-input:focus {
          outline: none;
          border-color: #3f9f42;
          box-shadow: 0 0 0 2px rgba(63,159,66,0.15);
        }
        .sch-error { font-size: 11.5px; color: #ef4444; margin: 0; }
        .sch-checkbox-row { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
        .sch-checkbox { width: 15px; height: 15px; accent-color: #3f9f42; cursor: pointer; }
        .sch-checkbox-label { font-size: 13.5px; color: #374151; cursor: pointer; user-select: none; }

        /* Footer buttons */
        .sch-btn-cancel {
          padding: 10px 28px;
          border: 1px solid #dadde2;
          background: #fff;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          transition: background 0.15s;
        }
        .sch-btn-cancel:hover { background: #f5f6f8; }
        .sch-btn-submit {
          padding: 10px 28px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          border: 1px solid #dadde2;
          background: #f4f5f7;
          color: #9ca3af;
          cursor: not-allowed;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }
        .sch-btn-submit.is-active {
          background: #3f9f42;
          border-color: #3f9f42;
          color: #fff;
          cursor: pointer;
        }
        .sch-btn-submit.is-active:hover { background: #2d7a30; border-color: #2d7a30; }
      `}</style>
    </>
  );
};

export default ScheduleTab;
