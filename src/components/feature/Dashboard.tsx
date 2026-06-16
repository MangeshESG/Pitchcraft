import React, { useMemo, useState, useEffect } from "react";
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
  faStar,
} from "@fortawesome/free-solid-svg-icons";

import CreateATemplete from "../../assets/images/icons/create-a-template.png";
import ImportContact from "../../assets/images/icons/import-contact.png";
import CreateACampaign from "../../assets/images/icons/create-a-campaign.png";
import GenerateEmail from "../../assets/images/icons/generate-email.png";


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
}

interface KpiTileData {
  label: string;
  value: string;
  delta: string;
  deltaPos?: boolean;
  series: number[];
}


interface ActivityRow {
  kind: "sent" | "import" | "blueprint" | "verify" | "gen";
  title: string;
  meta: string;
  time: string;
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
const VIDEO_BASE = "https://app.pitchkraft.ai";

/* ------------------------------------------------------------------
   Onboarding view helpers
------------------------------------------------------------------- */

const buildSteps = (
  override: Partial<Record<string, StepStatus>> | undefined
): OnboardingStep[] => {
  const base: OnboardingStep[] = [
    {
      id: "blueprint",
      n: 1,
      title: "Create a blueprint",
      time: "8 minutes",
      status: "done",
      body: "Similar to a template — your blueprint is the recipe for every campaign email. The most important step, and PitchKraft walks you through it.",
      cta: "Create blueprint",
      ctaPath: "/main?tab=TestTemplate",
      illustration: CreateATemplete,
      videoSrc: `${VIDEO_BASE}/video/BlueprintsGuide1.mp4`,
    },
    {
      id: "contacts",
      n: 2,
      title: "Import contacts",
      time: "2 minutes",
      status: "active",
      body: "Add your contacts from your CRM, Excel, or other tools. We'll help you map the fields and keep your data safe.",
      cta: "Import contacts",
      ctaPath: "/main?tab=DataCampaigns&subtab=List",
      illustration: ImportContact,
      videoSrc: `${VIDEO_BASE}/video/ImportContacts.mp4`,
    },
    {
      id: "campaign",
      n: 3,
      title: "Create a campaign",
      time: "4 minutes",
      status: "todo",
      body: "Connect your blueprint and contacts to form an email campaign. Takes a second.",
      cta: "New campaign",
      ctaPath: "/main?tab=Campaigns",
      illustration: CreateACampaign,
      videoSrc: `${VIDEO_BASE}/video/Campaigns.mp4`,
    },
    {
      id: "kraft",
      n: 4,
      title: "Kraft emails",
      time: "5 minutes",
      status: "todo",
      body: "This is where the magic happens. Hit 'Kraft emails' and watch every message get written, one-by-one.",
      cta: "Kraft emails",
      ctaPath: "/main?tab=Output",
      illustration: GenerateEmail,
      videoSrc: `${VIDEO_BASE}/video/KraftEmails.mp4`,
    },
    {
      id: "explore",
      n: "★",
      title: "Explore more",
      time: "Optional",
      status: "optional",
      body: "Load a safe demo workspace you can delete anytime — includes sample templates, dummy contacts, and a sample campaign.",
      cta: "Coming soon",
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
  const isOptional = step.status === "optional";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center justify-between gap-3 rounded-xl px-4 py-3 border transition
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
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold
            ${
              isDone
                ? "text-white"
                : active
                ? "bg-white text-[#3f9f42] border-2 border-[#3f9f42]"
                : isOptional
                ? "bg-white border border-gray-200 text-gray-400"
                : "bg-white border border-gray-200 text-gray-600"
            }`}
          style={isDone ? { background: BRAND } : undefined}
        >
          {isDone ? (
            <FontAwesomeIcon icon={faCheck} className="text-[12px]" />
          ) : isOptional ? (
            <FontAwesomeIcon icon={faStar} className="text-[12px]" />
          ) : (
            step.n
          )}
        </span>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-gray-900 truncate">
            {step.title}
          </div>
          <div
            className={`text-[12px] mt-0.5 ${isDone ? "font-medium" : "text-gray-500"}`}
            style={isDone ? { color: BRAND } : undefined}
          >
            {isDone ? "Done" : step.time}
          </div>
        </div>
      </div>
      {!isDone && (
        <span
          className={`shrink-0 text-[12px] font-medium px-2.5 py-1 rounded-full
            ${active ? "bg-[#e2f1e3] text-[#3f9f42]" : "bg-gray-50 text-gray-500"}`}
        >
          {isOptional ? "Optional" : step.time}
        </span>
      )}
    </button>
  );
};

const StepDetail: React.FC<{
  step: OnboardingStep;
  onPlay: () => void;
}> = ({ step, onPlay }) => {
  const navigate = useNavigate();
  return (
    <div className="h-full rounded-2xl border border-gray-200 bg-white p-7 flex items-center gap-6 relative overflow-hidden">
      <div aria-hidden className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#f1f8f2]" />
      <div aria-hidden className="absolute bottom-6 right-12 w-3 h-3 rounded-full bg-[#52b056]/30" />
      <div aria-hidden className="absolute top-12 left-6 w-2 h-2 rounded-full bg-[#52b056]/30" />

      <div className="flex-1 min-w-0 relative z-10">
        <div className="text-[22px] font-bold text-gray-900 leading-tight">
          {step.title}
        </div>
        <p className="text-[14px] text-gray-600 mt-2 leading-relaxed max-w-[42ch]">
          {step.body}
        </p>
        <div className="flex items-center gap-4 mt-5">
          <button
            type="button"
            onClick={() => step.ctaPath && navigate(step.ctaPath)}
            disabled={!step.ctaPath}
            className={`h-10 px-5 rounded-lg text-white text-[14px] font-semibold transition
              ${step.ctaPath ? "hover:opacity-90" : "opacity-60 cursor-not-allowed"}`}
            style={{ background: BRAND }}
          >
            {step.cta}
          </button>
          {step.status !== "optional" && step.status !== "done" && (
            <button
              type="button"
              className="text-[14px] font-semibold hover:underline"
              style={{ color: BRAND }}
            >
              Skip
            </button>
          )}
          {step.videoSrc && (
            <button
              type="button"
              onClick={onPlay}
              className="text-[13px] text-gray-500 hover:text-gray-700 flex items-center gap-1.5"
            >
              <FontAwesomeIcon
                icon={faPlayCircle}
                className="text-[16px]"
                style={{ color: BRAND }}
              />
              Watch intro
            </button>
          )}
        </div>
      </div>

      {step.illustration && (
        <div className="w-[200px] shrink-0 relative z-10 flex items-center justify-center">
          <div className="w-[180px] h-[180px] rounded-2xl bg-[#f1f8f2] flex items-center justify-center">
            <img
              src={step.illustration}
              alt=""
              className="max-w-[120px] max-h-[120px] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const VideoModal: React.FC<{ src: string | null; onClose: () => void }> = ({
  src,
  onClose,
}) => {
  if (!src) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#fff",
          padding: "20px",
          borderRadius: "10px",
          maxWidth: "800px",
          width: "90%",
          zIndex: 2000,
        }}
      >
        <button onClick={onClose} style={{ float: "right", fontSize: "16px" }}>
          Close
        </button>
        <video width="100%" height="auto" controls autoPlay src={src} />
      </div>
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
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  const active = steps.find((s) => s.id === activeId) || firstActive;
  const required = steps.filter((s) => s.status !== "optional");
  const completed = required.filter((s) => s.status === "done").length;
  const pct = required.length ? Math.round((completed / required.length) * 100) : 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
      <div>
        <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">
          Welcome to PitchKraft{firstName !== "there" ? `, ${firstName}` : ""}!
        </h1>
        <p className="text-[14px] text-gray-600 mt-1">
          You're {pct}% closer to running your first successful campaign.
        </p>
        <div className="flex items-center gap-3 mt-4">
          <span className="text-[13px] font-medium text-gray-600 whitespace-nowrap tabular-nums">
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
          <StepDetail
            step={active}
            onPlay={() => active.videoSrc && setVideoSrc(active.videoSrc)}
          />
        </div>
      </div>

      <VideoModal src={videoSrc} onClose={() => setVideoSrc(null)} />
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

const KpiTile: React.FC<KpiTileData> = ({ label, value, series }) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-md">
    <div className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">
      {label}
    </div>
    <div className="mt-1.5 flex items-end justify-between gap-3">
      <div className="text-[30px] font-bold text-gray-900 leading-none tabular-nums tracking-tight">
        {value}
      </div>
      <Sparkline data={series} />
    </div>
  </div>
);

const NonZeroChartDot = (props: any) => {
  const { cx, cy, stroke, value } = props;
  if (!value || cx == null || cy == null) return null;
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
            <stop offset="5%"  stopColor="#3f9f42" stopOpacity={0.22} />
            <stop offset="95%" stopColor="#3f9f42" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="dgSent" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.14} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.10)", fontSize: 12 }}
          formatter={(value: number, name: string) => [value, name === "gen" ? "Generated" : "Sent"]}
        />
        <Area type="monotone" dataKey="gen"  name="gen"  stroke="#3f9f42" strokeWidth={2} fill="url(#dgGen)"  dot={<NonZeroChartDot />} activeDot={{ r: 5 }} />
        <Area type="monotone" dataKey="sent" name="sent" stroke="#3b82f6" strokeWidth={2} fill="url(#dgSent)" dot={<NonZeroChartDot />} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const ActivityItem: React.FC<ActivityRow> = ({ kind, title, meta, time }) => {
  const palette: Record<string, { bg: string; fg: string; emoji: string }> = {
    sent: { bg: "bg-[#e2f1e3]", fg: "text-[#3f9f42]", emoji: "✉" },
    import: { bg: "bg-blue-50", fg: "text-blue-700", emoji: "👥" },
    blueprint: { bg: "bg-amber-50", fg: "text-amber-700", emoji: "📐" },
    verify: { bg: "bg-violet-50", fg: "text-violet-700", emoji: "✓" },
    gen: { bg: "bg-[#f1f8f2]", fg: "text-[#3f9f42]", emoji: "⚡" },
  };
  const p = palette[kind];
  return (
    <div className="flex items-start gap-3 py-3">
      <div
        className={`shrink-0 w-9 h-9 rounded-lg ${p.bg} ${p.fg} flex items-center justify-center text-[15px]`}
      >
        {p.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-gray-900 leading-tight">{title}</div>
        <div className="text-[12px] text-gray-500 mt-0.5">{meta}</div>
      </div>
      <div className="text-[11px] text-gray-400 shrink-0 mt-1 tabular-nums">{time}</div>
    </div>
  );
};

const PAGE_SIZE = 8;

type DateRange = "1d" | "7d" | "30d" | "all";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "1d": "Today",
  "7d": "Last 7 days",
  "30d": "Last month",
  "all": "All time",
};

function getFromDate(range: DateRange): Date | null {
  if (range === "all") return null;
  const d = new Date();
  if (range === "1d") { d.setHours(0, 0, 0, 0); return d; }
  else if (range === "7d") d.setDate(d.getDate() - 7);
  else if (range === "30d") d.setDate(d.getDate() - 30);
  return d;
}

function buildChartData(
  contacts: ContactApiRow[],
  range: DateRange
): { label: string; gen: number; sent: number }[] {
  if (range === "all") {
    const map = new Map<string, { gen: number; sent: number }>();
    contacts.forEach((c) => {
      if (c.updated_at) {
        const key = new Date(c.updated_at).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
        const e = map.get(key) ?? { gen: 0, sent: 0 };
        e.gen++;
        map.set(key, e);
      }
      if (c.email_sent_at) {
        const key = new Date(c.email_sent_at).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
        const e = map.get(key) ?? { gen: 0, sent: 0 };
        e.sent++;
        map.set(key, e);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => new Date("01 " + a[0]).getTime() - new Date("01 " + b[0]).getTime())
      .map(([label, v]) => ({ label, ...v }));
  }

  const days = range === "7d" ? 7 : 30;
  const result: { label: string; gen: number; sent: number }[] = [];

  if (range === "1d") {
    const now = new Date();
    for (let h = 0; h < 24; h++) {
      const start = new Date(now); start.setHours(h, 0, 0, 0);
      const end   = new Date(now); end.setHours(h, 59, 59, 999);
      const label = `${String(h).padStart(2, "0")}:00`;
      const gen  = contacts.filter((c) => { if (!c.updated_at) return false; const t = new Date(c.updated_at); return t >= start && t <= end; }).length;
      const sent = contacts.filter((c) => { if (!c.email_sent_at) return false; const t = new Date(c.email_sent_at); return t >= start && t <= end; }).length;
      result.push({ label, gen, sent });
    }
    return result;
  }

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);   dayEnd.setHours(23, 59, 59, 999);
    const label = d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
    const gen = contacts.filter((c) => {
      if (!c.updated_at) return false;
      const t = new Date(c.updated_at);
      return t >= dayStart && t <= dayEnd;
    }).length;
    const sent = contacts.filter((c) => {
      if (!c.email_sent_at) return false;
      const t = new Date(c.email_sent_at);
      return t >= dayStart && t <= dayEnd;
    }).length;
    result.push({ label, gen, sent });
  }
  return result;
}

const ContactStatusBadge: React.FC<{ row: ContactApiRow }> = ({ row }) => {
  if (row.email_sent_at)
    return (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#e2f1e3] text-[#3f9f42]">
        Sent
      </span>
    );
  if (row.updated_at)
    return (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
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
  const [contacts, setContacts] = useState<ContactApiRow[]>([]);
  const [contactTotal, setContactTotal] = useState(0);
  const [contactPage, setContactPage] = useState(1);
  const [contactSearch, setContactSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    fetch(`${API_BASE_URL}/api/Crm/allcontacts/list-by-clientId?clientId=${clientId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { contacts?: ContactApiRow[]; contactCount?: number } | null) => {
        const list = Array.isArray(data?.contacts) ? data!.contacts! : [];
        setContacts(list);
        setContactTotal(data?.contactCount ?? list.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  const fromDate = useMemo(() => getFromDate(dateRange), [dateRange]);

  const filteredByRange = useMemo(() => {
    if (!fromDate) return contacts;
    return contacts.filter((c) => {
      const genDate  = c.updated_at    ? new Date(c.updated_at)    : null;
      const sentDate = c.email_sent_at ? new Date(c.email_sent_at) : null;
      return (genDate && genDate >= fromDate) || (sentDate && sentDate >= fromDate);
    });
  }, [contacts, fromDate]);

  const chartData = useMemo(() => buildChartData(filteredByRange, dateRange), [filteredByRange, dateRange]);
  const emailsGeneratedCount = useMemo(
    () => chartData.reduce((total, point) => total + point.gen, 0),
    [chartData]
  );
  const emailsSentCount = useMemo(
    () => chartData.reduce((total, point) => total + point.sent, 0),
    [chartData]
  );

  if (loading) return (
    <div className="w-full flex flex-col items-center justify-center gap-3" style={{ minHeight: "60vh" }}>
      <div
        className="w-10 h-10 rounded-full border-[3px] border-[#e8f5e9] border-t-[#3f9f42]"
        style={{ animation: "spin 0.8s linear infinite" }}
      />
      <p className="text-[13px] text-gray-400 font-medium">Loading dashboard…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const kraftRate = contactTotal > 0 ? Math.round((emailsGeneratedCount / contactTotal) * 100) : 0;
  const sendRate  = emailsGeneratedCount > 0 ? Math.round((emailsSentCount / emailsGeneratedCount) * 100) : 0;

  const tiles: KpiTileData[] = [
    {
      label: "Total contacts",
      value: kpis.totalContacts ?? (contactTotal > 0 ? contactTotal.toLocaleString() : "—"),
      delta: "",
      series: [120, 132, 128, 145, 160, 178, 196],
    },
    {
      label: "Emails generated",
      value: kpis.emailsGenerated ?? (contacts.length > 0 ? emailsGeneratedCount.toLocaleString() : "—"),
      delta: "",
      series: [60, 88, 72, 110, 132, 148, 165],
    },
    {
      label: "Emails sent",
      value: kpis.emailsSent ?? (contacts.length > 0 ? emailsSentCount.toLocaleString() : "—"),
      delta: "",
      series: [58, 76, 92, 88, 110, 138, 162],
    },
    {
      label: "Send rate",
      value: contacts.length > 0 ? `${sendRate}%` : "—",
      delta: "",
      series: [15, 22, 30, 40, 50, 58, sendRate],
    },
    {
      label: "Kraft rate",
      value: contacts.length > 0 ? `${kraftRate}%` : "—",
      delta: "",
      series: [10, 18, 24, 30, 38, 42, kraftRate],
    },
  ];

  const activity: ActivityRow[] = [
    {
      kind: "sent",
      title: 'Campaign "Q3 Promo — UK" sent',
      meta: "2,418 recipients",
      time: "2h ago",
    },
    {
      kind: "import",
      title: "Imported 186 contacts",
      meta: "from Salesforce",
      time: "1d",
    },
    {
      kind: "gen",
      title: "Krafted 412 emails",
      meta: 'Blueprint "Outbound v1"',
      time: "1d",
    },
    {
      kind: "blueprint",
      title: 'Blueprint "Outbound v1" edited',
      meta: "3 sections updated",
      time: "3d",
    },
    {
      kind: "verify",
      title: "Domain pitchkraft.ai verified",
      meta: "DKIM + SPF aligned",
      time: "3d",
    },
  ];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="flex flex-col gap-5">
      {/* Greeting */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">
            {greeting}{firstName !== "there" ? `, ${firstName}` : ""}
          </h1>
          <p className="text-[14px] text-gray-600 mt-1">
            Here's how PitchKraft is performing this week.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#3f9f42] bg-[#e2f1e3] border border-[#cfecd6] px-2.5 py-1 rounded-full">
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

      {/* Chart + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[15px] font-semibold text-gray-900">
                Emails generated vs sent
              </div>
              <div className="text-[12px] text-gray-500 mt-0.5">{DATE_RANGE_LABELS[dateRange]}</div>
            </div>
            <div className="flex items-center gap-4 text-[12px] text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: BRAND }} />{" "}
                Generated
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" /> Sent
              </span>
            </div>
          </div>
          <div className="mt-3 h-[220px]">
            <DualLineAreaChart data={chartData} />
          </div>
        </div>

        <div className="lg:col-span-4 rounded-2xl border border-gray-200 bg-white p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-semibold text-gray-900">Recent activity</div>
            <button
              className="text-[12px] font-medium hover:underline"
              style={{ color: BRAND }}
            >
              View all
            </button>
          </div>
          <div className="mt-1 divide-y divide-gray-100">
            {activity.map((a, i) => (
              <ActivityItem key={i} {...a} />
            ))}
          </div>
        </div>
      </div>

      {/* All Contacts */}
      {contacts.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-[15px] font-semibold text-gray-900">All contacts</div>
              <div className="text-[12px] text-gray-500 mt-0.5">
                {contactTotal.toLocaleString()} total
              </div>
            </div>
            <input
              type="text"
              placeholder="Search name, email or company…"
              value={contactSearch}
              onChange={(e) => { setContactSearch(e.target.value); setContactPage(1); }}
              className="h-9 px-3 rounded-lg border border-gray-200 text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#3f9f42] w-72"
            />
          </div>

          <table className="w-full mt-4 text-[13px]">
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
              {contacts
                .filter((c) => {
                  if (!contactSearch) return true;
                  const q = contactSearch.toLowerCase();
                  return (
                    c.full_name?.toLowerCase().includes(q) ||
                    c.email?.toLowerCase().includes(q) ||
                    c.company_name?.toLowerCase().includes(q)
                  );
                })
                .slice((contactPage - 1) * PAGE_SIZE, contactPage * PAGE_SIZE)
                .map((c) => (
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
            </tbody>
          </table>

          {/* Pagination */}
          {(() => {
            const filtered = contacts.filter((c) => {
              if (!contactSearch) return true;
              const q = contactSearch.toLowerCase();
              return (
                c.full_name?.toLowerCase().includes(q) ||
                c.email?.toLowerCase().includes(q) ||
                c.company_name?.toLowerCase().includes(q)
              );
            });
            const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
            if (totalPages <= 1) return null;
            return (
              <div className="flex items-center justify-between mt-4 text-[12px] text-gray-500">
                <span>
                  {(contactPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(contactPage * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={contactPage === 1}
                    onClick={() => setContactPage((p) => p - 1)}
                    className="h-7 px-3 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={contactPage === totalPages}
                    onClick={() => setContactPage((p) => p + 1)}
                    className="h-7 px-3 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

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
            blueprint: blueprintDone ? "done" : "active",
            contacts: contactsDone ? "done" : blueprintDone ? "active" : "todo",
            campaign: campaignDone ? "done" : contactsDone ? "active" : "todo",
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
    <div className="w-full min-h-full bg-white">
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
