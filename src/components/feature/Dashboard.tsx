import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../../config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlayCircle,
  faCheck,
  faStar,
  faArrowUp,
  faArrowRight,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";

import CreateATemplete from "../../assets/images/icons/create-a-template.png";
import ImportContact from "../../assets/images/icons/import-contact.png";
import CreateACampaign from "../../assets/images/icons/create-a-campaign.png";
import GenerateEmail from "../../assets/images/icons/generate-email.png";
import ScheduleCampaign from "../../assets/images/icons/schedule-campaign.png";

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

interface CampaignRow {
  name: string;
  status: "live" | "draft" | "done";
  sent: string;
  open: string;
  reply: string;
}

interface ActivityRow {
  kind: "sent" | "import" | "blueprint" | "verify" | "gen";
  title: string;
  meta: string;
  time: string;
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
      id: "schedule",
      n: 5,
      title: "Schedule and review campaigns",
      time: "4 minutes",
      status: "todo",
      body: "Add email settings, use the deliverability tools, set sending windows, then check analytics for opens, clicks and replies.",
      cta: "Schedule & review",
      ctaPath: "/main?tab=Mail&mailSubTab=Schedule",
      illustration: ScheduleCampaign,
      videoSrc: `${VIDEO_BASE}/video/Schedule_review_campaigns.mp4`,
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

const KpiTile: React.FC<KpiTileData> = ({
  label,
  value,
  delta,
  deltaPos = true,
  series,
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-md">
    <div className="text-[12px] font-medium text-gray-400 uppercase tracking-wider">
      {label}
    </div>
    <div className="mt-1.5 flex items-end justify-between gap-3">
      <div>
        <div className="text-[30px] font-bold text-gray-900 leading-none tabular-nums tracking-tight">
          {value}
        </div>
        <div
          className={`mt-2 text-[12px] font-medium flex items-center gap-1 ${
            deltaPos ? "" : "text-red-600"
          }`}
          style={deltaPos ? { color: BRAND } : undefined}
        >
          <FontAwesomeIcon icon={faArrowUp} className="text-[10px]" /> {delta}
        </div>
      </div>
      <Sparkline data={series} />
    </div>
  </div>
);

const GenSentBars: React.FC<{
  data: { label: string; gen: number; sent: number }[];
  w?: number;
  h?: number;
}> = ({ data, w = 640, h = 220 }) => {
  const pad = { l: 32, r: 12, t: 12, b: 24 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const max = Math.max(...data.flatMap((d) => [d.gen, d.sent]));
  const niceMax = Math.ceil(max / 50) * 50;
  const groupW = innerW / data.length;
  const barW = Math.min(12, groupW / 3);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(t * niceMax));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      {yTicks.map((v, i) => {
        const y = pad.t + innerH - (v / niceMax) * innerH;
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="#f3f4f6" />
            <text x={pad.l - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
              {v}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const cx = pad.l + i * groupW + groupW / 2;
        const genH = (d.gen / niceMax) * innerH;
        const sentH = (d.sent / niceMax) * innerH;
        return (
          <g key={i}>
            <rect
              x={cx - barW - 1}
              y={pad.t + innerH - genH}
              width={barW}
              height={genH}
              rx={2}
              fill={BRAND}
            />
            <rect
              x={cx + 1}
              y={pad.t + innerH - sentH}
              width={barW}
              height={sentH}
              rx={2}
              fill="#cfecd6"
            />
            {i % 2 === 0 && (
              <text x={cx} y={h - 6} textAnchor="middle" fontSize={10} fill="#9ca3af">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
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

const PostOnboardingView: React.FC<{
  firstName: string;
  kpis: NonNullable<DashboardProps["kpis"]>;
}> = ({ firstName, kpis }) => {
  // TODO: replace mock series + tables with real API data
  const tiles: KpiTileData[] = [
    {
      label: "Total contacts",
      value: kpis.totalContacts ?? "2,418",
      delta: "+186 this week",
      series: [120, 132, 128, 145, 160, 178, 196],
    },
    {
      label: "Emails generated",
      value: kpis.emailsGenerated ?? "8,540",
      delta: "+412 this week",
      series: [60, 88, 72, 110, 132, 148, 165],
    },
    {
      label: "Emails sent",
      value: kpis.emailsSent ?? "7,206",
      delta: "+388 this week",
      series: [58, 76, 92, 88, 110, 138, 162],
    },
    {
      label: "Replies",
      value: kpis.replies ?? "342",
      delta: "+27 this week",
      series: [6, 9, 8, 12, 14, 18, 22],
    },
  ];

  const chartData = [
    { label: "May 2", gen: 120, sent: 90 },
    { label: "May 3", gen: 140, sent: 118 },
    { label: "May 4", gen: 95, sent: 80 },
    { label: "May 5", gen: 170, sent: 142 },
    { label: "May 6", gen: 200, sent: 174 },
    { label: "May 7", gen: 180, sent: 155 },
    { label: "May 8", gen: 220, sent: 192 },
    { label: "May 9", gen: 250, sent: 220 },
    { label: "May 10", gen: 195, sent: 178 },
    { label: "May 11", gen: 240, sent: 215 },
    { label: "May 12", gen: 280, sent: 248 },
    { label: "May 13", gen: 225, sent: 210 },
    { label: "May 14", gen: 305, sent: 270 },
    { label: "May 15", gen: 345, sent: 312 },
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

  const campaigns: CampaignRow[] = [
    { name: "Q3 Promo — UK", status: "live", sent: "2,418", open: "42%", reply: "5.8%" },
    { name: "Founder outreach", status: "live", sent: "840", open: "51%", reply: "9.2%" },
    { name: "Webinar invites", status: "draft", sent: "—", open: "—", reply: "—" },
    { name: "Q2 newsletter", status: "done", sent: "4,210", open: "38%", reply: "3.1%" },
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
          <button
            type="button"
            className="h-9 px-3 rounded-lg border border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
          >
            Last 7 days{" "}
            <FontAwesomeIcon icon={faChevronDown} className="text-[10px]" />
          </button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div className="text-[12px] text-gray-500 mt-0.5">Last 14 days</div>
            </div>
            <div className="flex items-center gap-4 text-[12px] text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: BRAND }} />{" "}
                Generated
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#cfecd6]" /> Sent
              </span>
            </div>
          </div>
          <div className="mt-3 h-[220px]">
            <GenSentBars data={chartData} />
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

      {/* Campaigns + Pro tip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-semibold text-gray-900">Active campaigns</div>
            <button
              className="text-[12px] font-medium hover:underline"
              style={{ color: BRAND }}
            >
              View all
            </button>
          </div>
          <table className="w-full mt-3 text-[13px]">
            <thead>
              <tr className="text-left text-gray-400 text-[11px] uppercase tracking-wider">
                <th className="font-medium py-2">Campaign</th>
                <th className="font-medium py-2">Status</th>
                <th className="font-medium py-2 text-right">Sent</th>
                <th className="font-medium py-2 text-right">Open</th>
                <th className="font-medium py-2 text-right">Reply</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((c) => (
                <tr key={c.name} className="hover:bg-gray-50">
                  <td className="py-2.5 font-medium text-gray-900">{c.name}</td>
                  <td className="py-2.5">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full
                      ${
                        c.status === "live"
                          ? "bg-[#e2f1e3] text-[#3f9f42]"
                          : c.status === "draft"
                          ? "bg-gray-100 text-gray-500"
                          : "bg-violet-50 text-violet-700"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-gray-600">{c.sent}</td>
                  <td className="py-2.5 text-right tabular-nums text-gray-600">{c.open}</td>
                  <td className="py-2.5 text-right tabular-nums text-gray-600">{c.reply}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-4 rounded-2xl border border-dashed border-[#3f9f42] bg-[#f1f8f2] p-5 flex flex-col">
          <div
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: BRAND }}
          >
            Pro tip
          </div>
          <div className="mt-1.5 text-[15px] font-semibold text-gray-900 leading-snug">
            Replies up 8% when you A/B test your subject line.
          </div>
          <p className="text-[13px] text-gray-600 mt-2 leading-relaxed">
            Add a B-variant to "Q3 Promo — UK" and PitchKraft will pick the winner
            automatically.
          </p>
          <button
            type="button"
            className="mt-auto pt-4 text-[13px] font-semibold self-start hover:underline flex items-center gap-1"
            style={{ color: BRAND }}
          >
            Try A/B testing{" "}
            <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
          </button>
        </div>
      </div>
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

        const [templatesRes, dataFilesRes, campaignsRes, scheduleRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/CampaignPrompt/templates/${id}`).then((r) =>
            r.ok ? r.json() : []
          ),
          fetch(`${API_BASE_URL}/api/Crm/datafile-byclientid?clientId=${id}`).then((r) =>
            r.ok ? r.json() : []
          ),
          fetch(`${API_BASE_URL}/api/auth/campaigns/client/${id}`).then((r) =>
            r.ok ? r.json() : []
          ),
          fetch(`${API_BASE_URL}/api/email/get-sequence?ClientId=${id}`).then((r) =>
            r.ok ? r.json() : []
          ),
        ]);

        const blueprintDone = Array.isArray(templatesRes) && templatesRes.length > 0;
        const realFiles = Array.isArray(dataFilesRes)
          ? dataFilesRes.filter((f: any) => f.id !== -1 && f.id !== "-1")
          : [];
        const contactsDone = realFiles.length > 0;
        const campaignList = Array.isArray(campaignsRes) ? campaignsRes : [];
        const campaignDone = campaignList.length > 0;
        const scheduleDone = Array.isArray(scheduleRes) && scheduleRes.length > 0;

        // Check kraft: if there are campaigns, fetch contacts for the first one
        // and see if any have an email generated (pitch / email_body present)
        let kraftDone = false;
        if (campaignDone) {
          const firstCampaign = campaignList[0];
          const campaignId =
            firstCampaign?.id ?? firstCampaign?.campaignId ?? firstCampaign?.campaign_id;
          const dataFileId =
            firstCampaign?.dataFileId ??
            firstCampaign?.data_file_id ??
            firstCampaign?.datafileid;

          if (dataFileId != null) {
            try {
              const contactsRes = await fetch(
                `${API_BASE_URL}/api/crm/contacts/by-client-datafile?clientId=${id}&dataFileId=${dataFileId}&isFollowUp=false&notKrafted=false&kraftedNotSent=false`
              ).then((r) => (r.ok ? r.json() : []));
              const contacts = Array.isArray(contactsRes) ? contactsRes : [];
              kraftDone = contacts.some(
                (c: any) =>
                  c.pitch ||
                  c.email_body ||
                  c.sample_email_body ||
                  c.isKrafted === true ||
                  c.isKrafted === 1
              );
            } catch {
              kraftDone = false;
            }
          } else if (campaignId != null) {
            // Fallback: try view-contacts with campaignId
            try {
              const contactsRes = await fetch(`${API_BASE_URL}/api/Crm/view-contacts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientId: id, campaignId, notKrafted: false }),
              }).then((r) => (r.ok ? r.json() : []));
              const contacts = Array.isArray(contactsRes) ? contactsRes : [];
              kraftDone = contacts.some(
                (c: any) =>
                  c.pitch ||
                  c.email_body ||
                  c.sample_email_body ||
                  c.isKrafted === true ||
                  c.isKrafted === 1
              );
            } catch {
              kraftDone = false;
            }
          }
        }

        if (!cancelled) {
          setDetectedStatus({
            blueprint: blueprintDone ? "done" : "active",
            contacts: contactsDone ? "done" : blueprintDone ? "active" : "todo",
            campaign: campaignDone ? "done" : contactsDone ? "active" : "todo",
            kraft: kraftDone ? "done" : campaignDone ? "active" : "todo",
            schedule: scheduleDone ? "done" : kraftDone ? "active" : "todo",
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
    const required = ["blueprint", "contacts", "campaign", "kraft", "schedule"];
    return required.every((id) => stepStatus[id] === "done");
  }, [setupComplete, stepStatus]);

  const name = firstName || "there";

  if (checking && !stepStatus) {
    return (
      <div className="mx-auto max-w-[1200px] flex items-center justify-center py-20">
        <div className="text-gray-400 text-sm">Loading your workspace…</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      {derivedComplete ? (
        <PostOnboardingView firstName={name} kpis={kpis ?? {}} />
      ) : (
        <OnboardingView firstName={name} stepStatus={stepStatus} />
      )}
    </div>
  );
};

export default Dashboard;
