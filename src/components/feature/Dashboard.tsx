import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../../config";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlayCircle,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import ToastMessage from "../common/ToastMessage";
import { useToast } from "../../hooks/useToast";

import CreateATemplete from "../../assets/images/Dashboard-blueprint.jpg";
import ImportContact from "../../assets/images/Dashboard-contact.jpg";
import CreateACampaign from "../../assets/images/Dashboard-campgain.jpg";
import GenerateEmail from "../../assets/images/Dashboard-kraft-email.jpg";


/* ------------------------------------------------------------------
   Types
------------------------------------------------------------------- */

type StepStatus = "done" | "active" | "todo" | "optional";

interface OnboardingStep {
  id: string;
  n: string | number;
  title: string;
  time: string;
  status: StepStatus;
  body: string;
  cta: string;
  ctaPath?: string;
  illustration?: string;
  videoSrc?: string;
  tipsUrl?: string;
}

interface KpiTileData {
  label: string;
  value: string;
  delta: string;
  deltaPos?: boolean;
  series: number[];
  color?: string;
  onClick?: () => void;
}


interface ContactApiRow {
  id: number;
  dataFileId: number;
  full_name: string;
  email: string;
  company_name: string;
  job_title: string;
  country_or_address: string;
  updated_at: string | null;
  email_sent_at: string | null;
  unsubscribe: string;
}

interface DashboardSummary {
  totalContacts: number;
  emailsGenerated: number;
  emailsSent: number;
  sendRate: number;
  kraftRate: number;
  chartData: { label: string; gen: number; sent: number }[];
}

interface ContactListResponse {
  contacts?: ContactApiRow[];
  hasNextPage?: boolean;
}

export interface DashboardProps {
  /** Override automatic detection: if you know setup is complete, pass true. */
  setupComplete?: boolean;
  /** First name used in the welcome line. */
  firstName?: string;
  /** Client/user ID used for API step-completion checks. */
  clientId?: number | string;
  /** Onboarding step statuses keyed by step id (blueprint/contacts/campaign/kraft/schedule). */
  stepStatus?: Partial<Record<string, StepStatus>>;
  /** KPI numbers — pass real values once available. */
  kpis?: {
    totalContacts?: string;
    emailsGenerated?: string;
    emailsSent?: string;
    replies?: string;
  };
}

/* ------------------------------------------------------------------
   Constants
------------------------------------------------------------------- */

const BRAND = "#3f9f42";

/* ------------------------------------------------------------------
   Onboarding view helpers
------------------------------------------------------------------- */

const buildSteps = (
  override: Partial<Record<string, StepStatus>> | undefined
): OnboardingStep[] => {
  const base: OnboardingStep[] = [
    {
      id: "contacts",
      n: 1,
      title: "Import contacts",
      time: "5 minutes",
      status: "active",
      body: "Add your contacts. Import from a spreadsheet, and the columns will be mapped automatically. You can also add them individually. You'll need contacts to send your beautifully personalized emails to.",
      cta: "Import contacts",
      ctaPath: "/main?tab=DataCampaigns&subtab=List",
      illustration: ImportContact,
      videoSrc: "https://www.youtube.com/embed/tO7r20HDjUo",
      tipsUrl: "https://www.pitchkraft.ai/contacts",
    },
    {
      id: "blueprint",
      n: 2,
      title: "Create a blueprint",
      time: "10 minutes",
      status: "todo",
      body: "Similar to a template, but so much more. A blueprint is the recipe to personalize the emails in a campaign. This is the most important part of the process but only takes 10 minutes. PitchKraft will talk you through it.",
      cta: "Create blueprint",
      ctaPath: "/main?tab=TestTemplate",
      illustration: CreateATemplete,
      videoSrc: "https://www.youtube.com/embed/eVNMhPXB3eU",
      tipsUrl: "https://www.pitchkraft.ai/blueprints/",
    },
    {
      id: "campaign",
      n: 3,
      title: "Create a campaign",
      time: "1 minute",
      status: "todo",
      body: "Connect your blueprint and contacts to form an email campaign. This takes a minute at most.",
      cta: "New campaign",
      ctaPath: "/main?tab=Campaigns",
      illustration: CreateACampaign,
      videoSrc: "https://www.youtube.com/embed/A9v62GRIXfs",
      tipsUrl: "https://www.pitchkraft.ai/campaigns",
    },
    {
      id: "kraft",
      n: 4,
      title: "Kraft emails",
      time: "5 minutes",
      status: "todo",
      body: "This is where the magic happens. You've done all the work now, so all you have to do is click the 'Kraft emails' button and watch the emails being krafted, one-by-one, hypnotically. Prepare to be amazed.",
      cta: "Kraft emails",
      ctaPath: "/main?tab=Output",
      illustration: GenerateEmail,
      videoSrc: "https://www.youtube.com/embed/C9xqxoc6Rwg",
      tipsUrl: "https://www.pitchkraft.ai/kraft-email/",
    },
  ];

  if (!override) return base;
  return base.map((s) => (override[s.id] ? { ...s, status: override[s.id]! } : s));
};

const ProgressBar: React.FC<{ pct: number }> = ({ pct }) => (
  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
    <div
      className="h-full rounded-full transition-all duration-500"
      style={{ width: `${pct}%`, background: BRAND }}
    />
  </div>
);

const StepRow: React.FC<{
  step: OnboardingStep;
  active: boolean;
  onClick: () => void;
}> = ({ step, active, onClick }) => {
  const isDone = step.status === "done";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 border transition
        ${
          active
            ? "border-[#3f9f42] bg-[#f1f8f2]"
            : "border-gray-200 bg-white hover:border-gray-300"
        }`}
      style={
        active
          ? { boxShadow: "0 0 0 1px #3f9f42, 0 4px 12px rgba(63,159,66,0.18)" }
          : undefined
      }
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-semibold
            ${
              isDone
                ? "text-white"
                : active
                ? "bg-white text-[#3f9f42] border-2 border-[#3f9f42]"
                : "bg-white border border-gray-200 text-gray-600"
            }`}
          style={isDone ? { background: BRAND } : undefined}
        >
          {isDone ? (
            <FontAwesomeIcon icon={faCheck} className="text-[14px]" />
          ) : (
            step.n
          )}
        </span>
        <div className="min-w-0">
          <div className="text-[16px] font-semibold text-gray-900 truncate">
            {step.title}
          </div>
          <div
            className={`text-[13px] mt-0.5 ${isDone ? "font-medium" : "text-gray-500"}`}
            style={isDone ? { color: BRAND } : undefined}
          >
            {isDone ? "Done" : step.time}
          </div>
        </div>
      </div>
      {!isDone && (
        <span
          className={`shrink-0 text-[13px] font-medium px-2.5 py-1 rounded-full
            ${active ? "bg-[#e2f1e3] text-[#3f9f42]" : "bg-gray-50 text-gray-500"}`}
        >
          {step.time}
        </span>
      )}
    </button>
  );
};

/** Convert a YouTube embed URL to a regular watch URL for opening in a new tab. */
const toYouTubeWatchUrl = (embedUrl: string): string =>
  embedUrl.replace("/embed/", "/watch?v=");

const StepDetail: React.FC<{
  step: OnboardingStep;
}> = ({ step }) => {
  const navigate = useNavigate();
  return (
    <div className="h-full rounded-2xl border border-gray-200 bg-white p-7 flex items-center gap-6 relative overflow-hidden">
      <div aria-hidden className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#f1f8f2]" />
      <div aria-hidden className="absolute bottom-6 right-12 w-3 h-3 rounded-full bg-[#52b056]/30" />
      <div aria-hidden className="absolute top-12 left-6 w-2 h-2 rounded-full bg-[#52b056]/30" />

      <div className="flex-1 min-w-0 relative z-10">
        <div className="text-[26px] font-bold text-gray-900 leading-tight">
          {step.title}
        </div>
        <div className="text-[14px] font-medium text-gray-500 mt-1">
          {step.time}
        </div>
        <p className="text-[16px] text-gray-600 mt-3 leading-relaxed max-w-[46ch]">
          {step.body}
        </p>
        <div className="flex items-center gap-4 mt-6">
          <button
            type="button"
            onClick={() => step.ctaPath && navigate(step.ctaPath)}
            disabled={!step.ctaPath}
            className={`h-11 px-5 rounded-lg text-[15px] font-semibold border transition
              ${step.ctaPath ? "hover:bg-[var(--btn-default-bg-hover)]" : "opacity-60 cursor-not-allowed"}`}
            style={{
              background: "var(--btn-default-bg)",
              color: "var(--btn-default-fg)",
              borderColor: "var(--btn-default-border)",
            }}
          >
            {step.cta}
          </button>
          {step.tipsUrl && (
            <a
              href={step.tipsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[15px] font-semibold hover:underline"
              style={{ color: BRAND }}
            >
              Tips
            </a>
          )}
          {step.videoSrc && (
            <a
              href={toYouTubeWatchUrl(step.videoSrc)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] text-gray-500 hover:text-gray-700 flex items-center gap-1.5"
            >
              <FontAwesomeIcon
                icon={faPlayCircle}
                className="text-[17px]"
                style={{ color: BRAND }}
              />
              Watch intro
            </a>
          )}
        </div>
      </div>

      {step.illustration && (
        <div className="w-[340px] shrink-0 relative z-10 flex items-center justify-center">
          <div className="w-[320px] h-[260px] rounded-2xl bg-[#f1f8f2] overflow-hidden flex items-center justify-center">
            <img
              src={step.illustration}
              alt={step.title}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const OnboardingView: React.FC<{
  firstName: string;
  stepStatus?: Partial<Record<string, StepStatus>>;
}> = ({ firstName, stepStatus }) => {
  const steps = useMemo(() => buildSteps(stepStatus), [stepStatus]);
  const firstActive = steps.find((s) => s.status === "active") || steps[0];
  const [activeId, setActiveId] = useState<string>(firstActive.id);

  const active = steps.find((s) => s.id === activeId) || firstActive;
  const required = steps.filter((s) => s.status !== "optional");
  const completed = required.filter((s) => s.status === "done").length;
  const pct = required.length ? Math.round((completed / required.length) * 100) : 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
      <div>
        <h1 className="text-[32px] font-bold text-gray-900 tracking-tight">
          Welcome to PitchKraft{firstName !== "there" ? `, ${firstName}` : ""}!
        </h1>
        <p className="text-[16px] text-gray-600 mt-1.5">
          {pct === 0
            ? "You're on your way to running your first successful campaign."
            : `You're ${pct}% closer to running your first successful campaign.`}
        </p>
        <div className="flex items-center gap-3 mt-5">
          <span className="text-[15px] font-medium text-gray-600 whitespace-nowrap tabular-nums">
            {completed} of {required.length} complete
          </span>
          <ProgressBar pct={pct} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 mt-7">
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-2.5">
          {steps.map((s) => (
            <StepRow
              key={s.id}
              step={s}
              active={s.id === activeId}
              onClick={() => setActiveId(s.id)}
            />
          ))}
        </div>
        <div className="col-span-12 lg:col-span-7">
          <StepDetail step={active} />
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------
   Post-onboarding view (K1 — KPI tiles + sparklines + activity)
------------------------------------------------------------------- */

const Sparkline: React.FC<{
  data: number[];
  w?: number;
  h?: number;
  color?: string;
}> = ({ data, w = 120, h = 52, color = BRAND }) => {
  const id = useMemo(() => "spk-" + Math.random().toString(36).slice(2, 8), []);
  const max = Math.max(...data);
  const min = Math.min(...data);
  const sx = w / (data.length - 1);
  const sy = (v: number) => h - 6 - ((v - min) / (max - min || 1)) * (h - 12);
  const pts = data.map((v, i) => [i * sx, sy(v)] as [number, number]);
  const path = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M ${x} ${y}`;
    const [px, py] = pts[i - 1];
    return `${acc} Q ${px} ${py} ${(px + x) / 2} ${(py + y) / 2} T ${x} ${y}`;
  }, "");
  const fill = `${path} L ${w} ${h} L 0 ${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${id})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={3} fill={color} stroke="#fff" strokeWidth={1.5} />
    </svg>
  );
};

const KpiTile: React.FC<KpiTileData> = ({ label, value, series, color, onClick }) => {
  const clickable = typeof onClick === "function";
  return (
    <div
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick!();
              }
            }
          : undefined
      }
      title={clickable ? `View ${label.toLowerCase()}` : undefined}
      className={`rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-md ${
        clickable
          ? "cursor-pointer hover:border-[#3f9f42] focus:outline-none focus:ring-2 focus:ring-[#3f9f42]/40"
          : ""
      }`}
    >
      <div className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">
        {label}
      </div>
      <div className="mt-1.5 flex items-end justify-between gap-3">
        <div className="text-[30px] font-bold text-gray-900 leading-none tabular-nums tracking-tight">
          {value}
        </div>
        <Sparkline data={series} color={color} />
      </div>
    </div>
  );
};

const NonZeroChartDot = (props: any): React.ReactElement<SVGElement> => {
  const { cx, cy, stroke, value } = props;
  if (!Number(value) || cx == null || cy == null) return <g />;
  return <circle cx={cx} cy={cy} r={3.5} fill={stroke} stroke="#fff" strokeWidth={1.5} />;
};

const DualLineAreaChart: React.FC<{
  data: { label: string; gen: number; sent: number }[];
}> = ({ data }) => {
  if (!data.length) return (
    <div className="w-full h-full flex items-center justify-center text-[12px] text-gray-400">
      No data for this period
    </div>
  );
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="dgGen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="dgSent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3f9f42" stopOpacity={0.22} />
            <stop offset="95%" stopColor="#3f9f42" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.10)", fontSize: 12 }}
          formatter={(value: number, name: string) => [value, name === "gen" ? "Krafted" : "Sent"]}
        />
        <Area type="monotone" dataKey="gen"  name="gen"  stroke="#3b82f6" strokeWidth={2} fill="url(#dgGen)"  dot={NonZeroChartDot} activeDot={{ r: 5 }} />
        <Area type="monotone" dataKey="sent" name="sent" stroke="#3f9f42" strokeWidth={2} fill="url(#dgSent)" dot={NonZeroChartDot} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const PAGE_SIZE = 8;
const emptyDashboardSummary: DashboardSummary = {
  totalContacts: 0,
  emailsGenerated: 0,
  emailsSent: 0,
  sendRate: 0,
  kraftRate: 0,
  chartData: [],
};

type DateRange = "1d" | "24h" | "yesterday" | "7d" | "30d" | "all";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "1d": "Today",
  "24h": "Last 24 hours",
  "yesterday": "Yesterday",
  "7d": "Last 7 days",
  "30d": "Last month",
  "all": "All time",
};

const ContactStatusBadge: React.FC<{ row: ContactApiRow }> = ({ row }) => {
  if (row.email_sent_at)
    return (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#e2f1e3] text-[#3f9f42]">
        Sent
      </span>
    );
  if (row.updated_at)
    return (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#e8f0fe] text-[#3b82f6]">
        Krafted
      </span>
    );
  return (
    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
      Pending
    </span>
  );
};

const PostOnboardingView: React.FC<{
  firstName: string;
  kpis: NonNullable<DashboardProps["kpis"]>;
  clientId?: number | string;
}> = ({ firstName, kpis, clientId }) => {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  const [contacts, setContacts] = useState<ContactApiRow[]>([]);
  const [contactTotal, setContactTotal] = useState(0);
  const [hasNextContactPage, setHasNextContactPage] = useState(false);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>(emptyDashboardSummary);
  const [contactPage, setContactPage] = useState(1);
  const [contactSearch, setContactSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("1d");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const contactRequestRef = useRef(0);
  const activeContactClientRef = useRef<string>("");
  const lastNoContactSearchRef = useRef("");

  const fetchContactList = () => {
    if (!clientId) return Promise.resolve();
    const requestedClientId = String(clientId);
    const requestId = ++contactRequestRef.current;
    const params = new URLSearchParams({
      clientId: requestedClientId,
      pageNumber: String(contactPage),
      pageSize: String(PAGE_SIZE),
    });
    const trimmedSearch = contactSearch.trim();
    if (trimmedSearch) params.set("search", trimmedSearch);

    setContactsLoading(true);
    return fetch(`${API_BASE_URL}/api/Crm/dashboard-contacts?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ContactListResponse | null) => {
        if (requestId !== contactRequestRef.current || requestedClientId !== activeContactClientRef.current) {
          return;
        }
        const list = Array.isArray(data?.contacts) ? data!.contacts! : [];
        const clientFilteredList =
          trimmedSearch && list.length > PAGE_SIZE
            ? list.filter((c) => {
                const q = trimmedSearch.toLowerCase();
                return (
                  c.full_name?.toLowerCase().includes(q) ||
                  c.email?.toLowerCase().includes(q) ||
                  c.company_name?.toLowerCase().includes(q)
                );
              })
            : list;
        const total = clientFilteredList.length;
        const pageContacts =
          clientFilteredList.length > PAGE_SIZE
            ? clientFilteredList.slice((contactPage - 1) * PAGE_SIZE, contactPage * PAGE_SIZE)
            : clientFilteredList;
        setContacts(pageContacts);
        setContactTotal(total);
        setHasNextContactPage(Boolean(data?.hasNextPage ?? clientFilteredList.length > contactPage * PAGE_SIZE));
        const noSearchResults = Boolean(trimmedSearch) && pageContacts.length === 0;
        if (noSearchResults && lastNoContactSearchRef.current !== trimmedSearch) {
          lastNoContactSearchRef.current = trimmedSearch;
          showToast("No contact available", "warning", 3000);
        }
        if (!noSearchResults) {
          lastNoContactSearchRef.current = "";
        }
      })
      .catch(() => {})
      .finally(() => {
        if (requestId === contactRequestRef.current && requestedClientId === activeContactClientRef.current) {
          setContactsLoading(false);
        }
      });
  };

  const fetchDashboardSummary = () => {
    if (!clientId) return Promise.resolve();
    return fetch(`${API_BASE_URL}/api/Crm/dashboard-summary?clientId=${clientId}&dateRange=${dateRange}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Partial<DashboardSummary> | null) => {
        setDashboardSummary({
          totalContacts: Number(data?.totalContacts ?? 0),
          emailsGenerated: Number(data?.emailsGenerated ?? 0),
          emailsSent: Number(data?.emailsSent ?? 0),
          sendRate: Number(data?.sendRate ?? 0),
          kraftRate: Number(data?.kraftRate ?? 0),
          chartData: Array.isArray(data?.chartData) ? data.chartData : [],
        });
      })
      .catch(() => {
        setDashboardSummary(emptyDashboardSummary);
      });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardSummary().finally(() => setRefreshing(false));
    fetchContactList();
  };

  useEffect(() => {
    if (!clientId) {
      contactRequestRef.current += 1;
      activeContactClientRef.current = "";
      setContacts([]);
      setContactTotal(0);
      setHasNextContactPage(false);
      setContactsLoading(false);
      lastNoContactSearchRef.current = "";
      return;
    }
    const currentClientId = String(clientId);
    const clientChanged = activeContactClientRef.current !== currentClientId;
    if (clientChanged) {
      contactRequestRef.current += 1;
      activeContactClientRef.current = currentClientId;
      setContacts([]);
      setContactTotal(0);
      setHasNextContactPage(false);
      setContactsLoading(true);
      lastNoContactSearchRef.current = "";
      if (contactPage !== 1) setContactPage(1);
      if (contactSearch) setContactSearch("");
      if (contactPage !== 1 || contactSearch) return;
    }
    const delay = contactSearch.trim() ? 300 : 150;
    const timer = window.setTimeout(() => {
      fetchContactList();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [clientId, contactPage, contactSearch]);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchDashboardSummary().finally(() => setLoading(false));
  }, [clientId, dateRange]);

  const chartData = dashboardSummary.chartData;
  const emailsGeneratedCount = dashboardSummary.emailsGenerated;
  const emailsSentCount = dashboardSummary.emailsSent;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  if (loading) return (
    <div className="flex flex-col gap-5">
      {/* Greeting */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">
            {greeting}{firstName !== "there" ? `, ${firstName}` : ""}
          </h1>
          <p className="text-[14px] text-gray-600 mt-1">
            Here's how PitchKraft is performing
          </p>
        </div>
      </div>

      {/* KPI skeleton tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {["Total contacts", "Emails krafted", "Emails sent", "Send rate", "Kraft rate"].map((label) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">
              {label}
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="h-7 w-20 rounded-md bg-gray-100 animate-pulse" />
              <div className="h-[52px] w-[120px] rounded-md bg-gray-50 animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold text-gray-900">
              Emails krafted vs sent
            </div>
            <div className="text-[12px] text-gray-500 mt-0.5">Loading…</div>
          </div>
        </div>
        <div className="mt-3 h-[220px] rounded-xl bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-8 h-8 rounded-full border-[3px] border-[#e8f5e9] border-t-[#3f9f42]"
              style={{ animation: "spin 0.8s linear infinite" }}
            />
            <p className="text-[12px] text-gray-400 font-medium">Loading data…</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  const kraftRate = dashboardSummary.kraftRate;
  const sendRate = dashboardSummary.sendRate;
  const totalContactsCount = dashboardSummary.totalContacts || contactTotal;
  const generatedSeries = chartData.length > 0 ? chartData.map((point) => point.gen) : [0, 0, 0, 0, 0, 0, 0];
  const sentSeries = chartData.length > 0 ? chartData.map((point) => point.sent) : [0, 0, 0, 0, 0, 0, 0];

  const tiles: KpiTileData[] = [
    {
      label: "Total contacts",
      value: kpis.totalContacts ?? (totalContactsCount > 0 ? totalContactsCount.toLocaleString() : "—"),
      delta: "",
      series: [120, 132, 128, 145, 160, 178, 196],
      color: "#111827",
      onClick: () => navigate("/main?tab=DataCampaigns&subtab=List&dataFileId=-1"),
    },
    {
      label: "Emails krafted",
      value: kpis.emailsGenerated ?? (totalContactsCount > 0 ? emailsGeneratedCount.toLocaleString() : "—"),
      delta: "",
      series: generatedSeries,
      color: "#3b82f6",
    },
    {
      label: "Emails sent",
      value: kpis.emailsSent ?? (totalContactsCount > 0 ? emailsSentCount.toLocaleString() : "—"),
      delta: "",
      series: sentSeries,
      color: BRAND,
      onClick: () => navigate("/main?tab=Mail&mailSubTab=Dashboard"),
    },
    {
      label: "Send rate",
      value: totalContactsCount > 0 ? `${sendRate}%` : "—",
      delta: "",
      series: [15, 22, 30, 40, 50, 58, sendRate],
      color: BRAND,
    },
    {
      label: "Kraft rate",
      value: totalContactsCount > 0 ? `${kraftRate}%` : "—",
      delta: "",
      series: [10, 18, 24, 30, 38, 42, kraftRate],
      color: "#3b82f6",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Greeting */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">
            {greeting}{firstName !== "there" ? `, ${firstName}` : ""}
          </h1>
          <p className="text-[14px] text-gray-600 mt-1">
            Here's how PitchKraft is  performing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9 w-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh dashboard"
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 16 16" 
              fill="#3f9f42"
              className={refreshing ? "animate-spin" : ""}
            >
              <path d="M8 1.5A6.5 6.5 0 001.5 8a.75.75 0 01-1.5 0A8 8 0 0113.5 2.19V1.25a.75.75 0 011.5 0v3a.75.75 0 01-.75.75h-3a.75.75 0 010-1.5h1.44A6.479 6.479 0 008 1.5zm7.25 5.75a.75.75 0 01.75.75A8 8 0 012.5 13.81v.94a.75.75 0 01-1.5 0v-3a.75.75 0 01.75-.75h3a.75.75 0 010 1.5H3.31A6.5 6.5 0 0014.5 8a.75.75 0 01.75-.75z"/>
            </svg>
          </button>
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#3f9f42] bg-white border border-[#cfecd6] px-2.5 py-1 rounded-full">
            <FontAwesomeIcon icon={faCheck} className="text-[10px]" /> Setup complete
          </span>
          <select
            value={dateRange}
            onChange={(e) => { setDateRange(e.target.value as DateRange); setContactPage(1); }}
            className="h-9 px-3 rounded-lg border border-gray-200 text-[13px] font-medium text-gray-600 bg-white hover:bg-gray-50 cursor-pointer focus:outline-none focus:border-[#3f9f42]"
          >
            {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((k) => (
              <option key={k} value={k}>{DATE_RANGE_LABELS[k]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {tiles.map((t) => (
          <KpiTile key={t.label} {...t} />
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[15px] font-semibold text-gray-900">
              Emails krafted vs sent
            </div>
            <div className="text-[12px] text-gray-500 mt-0.5">{DATE_RANGE_LABELS[dateRange]}</div>
          </div>
          <div className="flex items-center gap-4 text-[12px] text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" /> Krafted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: BRAND }} />{" "}
              Sent
            </span>
          </div>
        </div>
        <div className="mt-3 h-[220px]">
          <DualLineAreaChart data={chartData} />
        </div>
      </div>

      {/* All Contacts */}
      {(contacts.length > 0 || contactTotal > 0 || contactsLoading || contactSearch.trim()) && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-[15px] font-semibold text-gray-900">All contacts</div>
              <div className="text-[12px] text-gray-500 mt-0.5">
                Page {contactPage}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {contactsLoading && (
                <div className="flex items-center gap-2 text-[12px] font-medium text-gray-500" aria-live="polite">
                  <div className="w-5 h-5 rounded-full border-2 border-[#e8f5e9] border-t-[#3f9f42] animate-spin" />
                  <span>Loading contacts...</span>
                </div>
              )}
              <input
                type="text"
                placeholder="Search name, email or company…"
                value={contactSearch}
                onChange={(e) => { setContactSearch(e.target.value); setContactPage(1); }}
                className="h-9 px-3 rounded-lg border border-gray-200 text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#3f9f42] w-72"
              />
            </div>
          </div>

          <div className="relative mt-4 min-h-[160px] overflow-hidden rounded-xl border border-gray-100">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-gray-400 text-[11px] uppercase tracking-wider border-b border-gray-100">
                  <th className="font-medium pb-2">Name</th>
                  <th className="font-medium pb-2">Email</th>
                  <th className="font-medium pb-2">Company</th>
                  <th className="font-medium pb-2">Job title</th>
                  <th className="font-medium pb-2">Country</th>
                  <th className="font-medium pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.slice(0, PAGE_SIZE).map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="py-2.5 max-w-[160px] truncate">
                      <a
                        href={`/#/contact-details/${c.id}?tab=DataCampaigns&subtab=List&dataFileId=${c.dataFileId}&clientId=${clientId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-gray-900 hover:text-[#3f9f42] hover:underline"
                      >
                        {c.full_name || "—"}
                      </a>
                    </td>
                    <td className="py-2.5 text-gray-600 max-w-[180px] truncate">{c.email || "—"}</td>
                    <td className="py-2.5 text-gray-600 max-w-[140px] truncate">{c.company_name || "—"}</td>
                    <td className="py-2.5 text-gray-600 max-w-[140px] truncate">{c.job_title || "—"}</td>
                    <td className="py-2.5 text-gray-600">{c.country_or_address || "—"}</td>
                    <td className="py-2.5">
                      <ContactStatusBadge row={c} />
                    </td>
                  </tr>
                ))}
                {!contactsLoading && contacts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400">
                      No contacts found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(() => {
            if (contactPage === 1 && !hasNextContactPage) return null;
            return (
              <div className="flex items-center justify-end gap-2 mt-4 text-[12px] text-gray-500">
                <button
                  type="button"
                  disabled={contactPage === 1 || contactsLoading}
                  onClick={() => setContactPage((p) => p - 1)}
                  className="h-7 px-3 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={!hasNextContactPage || contactsLoading}
                  onClick={() => setContactPage((p) => p + 1)}
                  className="h-7 px-3 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            );
          })()}
        </div>
      )}

      <ToastMessage
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
        duration={3}
        position="top-right"
      />

    </div>
  );
};

/* ------------------------------------------------------------------
   Exported component
------------------------------------------------------------------- */

export const Dashboard: React.FC<DashboardProps> = ({
  setupComplete,
  firstName,
  clientId,
  stepStatus: externalStepStatus,
  kpis,
}) => {
  const [detectedStatus, setDetectedStatus] = useState<
    Partial<Record<string, StepStatus>> | undefined
  >(undefined);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!clientId || typeof setupComplete === "boolean" || externalStepStatus) return;

    let cancelled = false;
    setChecking(true);

    const detect = async () => {
      try {
        const id = clientId;

        const [templatesRes, dataFilesRes, campaignsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/CampaignPrompt/templates/${id}`).then((r) =>
            r.ok ? r.json() : []
          ),
          fetch(`${API_BASE_URL}/api/Crm/datafile-byclientid?clientId=${id}`).then((r) =>
            r.ok ? r.json() : []
          ),
          fetch(`${API_BASE_URL}/api/auth/campaigns/client/${id}`).then((r) =>
            r.ok ? r.json() : []
          ),
        ]);

        const templateList = Array.isArray(templatesRes?.templates)
          ? templatesRes.templates
          : Array.isArray(templatesRes)
          ? templatesRes
          : [];
        const blueprintDone = templateList.length > 0;
        const realFiles = Array.isArray(dataFilesRes)
          ? dataFilesRes.filter((f: any) => f.id !== -1 && f.id !== "-1")
          : [];
        const contactsDone = realFiles.length > 0;
        const campaignList = Array.isArray(campaignsRes) ? campaignsRes : [];
        const campaignDone = campaignList.length > 0;
        // Check kraft: dedicated endpoint checks if any contact for this client has been krafted
        let kraftDone = false;
        if (campaignDone) {
          try {
            const kraftRes = await fetch(
              `${API_BASE_URL}/api/Crm/kraft-done?clientId=${id}`
            );
            const kraftData = kraftRes.ok ? await kraftRes.json() : {};
            kraftDone = kraftData.kraftDone === true;
          } catch {
            kraftDone = false;
          }
        }

        if (!cancelled) {
          setDetectedStatus({
            contacts: contactsDone ? "done" : "active",
            blueprint: blueprintDone ? "done" : contactsDone ? "active" : "todo",
            campaign: campaignDone ? "done" : blueprintDone ? "active" : "todo",
            kraft: kraftDone ? "done" : campaignDone ? "active" : "todo",
          });
        }
      } catch {
        // silently fall back to onboarding view with no statuses
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    detect();
    return () => {
      cancelled = true;
    };
  }, [clientId, setupComplete, externalStepStatus]);

  const stepStatus = externalStepStatus ?? detectedStatus;

  const derivedComplete = useMemo(() => {
    if (typeof setupComplete === "boolean") return setupComplete;
    if (!stepStatus) return false;
    const required = ["blueprint", "contacts", "campaign", "kraft"];
    return required.every((id) => stepStatus[id] === "done");
  }, [setupComplete, stepStatus]);

  const name = firstName || "there";

  if (checking && !stepStatus) {
    return (
      <div className="w-full min-h-full flex items-center justify-center py-20">
        <div className="text-gray-400 text-sm">Loading your workspace…</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full bg-gray-50">
      {derivedComplete ? (
        <div className="p-6">
          <PostOnboardingView firstName={name} kpis={kpis ?? {}} clientId={clientId} />
        </div>
      ) : (
        <div className="p-6">
          <OnboardingView firstName={name} stepStatus={stepStatus} />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
