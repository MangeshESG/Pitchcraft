import React, { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faRobot,
  faEllipsisV,
  faPlus,
  faMagnifyingGlass,
  faPlay,
  faPencil,
  faTrashCan,
  faCopy,
  faFile,
  faEye,
  faChevronDown,
  faAnglesLeft,
  faAngleLeft,
  faAngleRight,
  faAnglesRight,
  faSort,
  faSortUp,
  faSortDown,
} from "@fortawesome/free-solid-svg-icons";
import { Tooltip } from "react-tooltip";

interface CampaignTemplate {
  id: number;
  templateName: string;
  createdAt: string;
  selectedModel: string;
  [key: string]: any;
}

const BLUEPRINT_VIDEO = "https://app.pitchkraft.ai/video/BlueprintsGuide1.mp4";

// ============================================================
// Video Modal
// ============================================================
const VideoModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      videoRef.current?.pause();
      onClose();
    }
  };

  return (
    <div className="bp-video-backdrop" onClick={handleBackdropClick}>
      <div className="bp-video-modal">
        <button
          className="bp-video-close"
          onClick={() => { videoRef.current?.pause(); onClose(); }}
          aria-label="Close video"
        >
          ✕
        </button>
        <video
          ref={videoRef}
          src={BLUEPRINT_VIDEO}
          controls
          autoPlay
          className="bp-video-player"
        />
      </div>
    </div>
  );
};

// ============================================================
// Hero illustration — pure inline SVG, no external assets
// ============================================================
export const BlueprintIllustration: React.FC<{ width?: number }> = ({
  width = 340,
}) => {
  const height = width * 0.72;
  return (
    <svg
      viewBox="0 0 420 300"
      width={width}
      height={height}
      style={{ userSelect: "none", display: "block" }}
    >
      <defs>
        <linearGradient id="bp-bg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#e2f1e3" />
          <stop offset="100%" stopColor="#f1f8f2" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="210" cy="160" r="135" fill="url(#bp-bg)" />
      <g fill="#3f9f42" opacity="0.55">
        <path d="M70 90l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" />
        <path d="M345 70l2.5 5 5 2.5-5 2.5-2.5 5-2.5-5-5-2.5 5-2.5z" />
        <path d="M380 200l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
        <path d="M60 240l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
        <path d="M310 240l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
      </g>
      <rect x="118" y="58" width="218" height="160" rx="10" fill="#fff" stroke="#a7d5a9" strokeWidth="2" />
      <rect x="118" y="58" width="218" height="22" rx="10" fill="#fff" stroke="#a7d5a9" strokeWidth="2" />
      <circle cx="131" cy="69" r="2.5" fill="#cfecd6" />
      <circle cx="140" cy="69" r="2.5" fill="#cfecd6" />
      <circle cx="149" cy="69" r="2.5" fill="#cfecd6" />
      <rect x="170" y="65" width="130" height="8" rx="4" fill="#e2f1e3" />
      <rect x="132" y="100" width="60" height="60" rx="4" fill="none" stroke="#a7d5a9" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x="162" y="138" textAnchor="middle" fontFamily="Georgia, serif" fontSize="34" fill="#a7d5a9" fontWeight="700">T</text>
      <rect x="206" y="100" width="62" height="28" rx="4" fill="#e2f1e3" />
      <rect x="206" y="134" width="62" height="26" rx="4" fill="none" stroke="#a7d5a9" strokeWidth="1.5" strokeDasharray="3 3" />
      <rect x="282" y="100" width="40" height="60" rx="4" fill="#f1f8f2" stroke="#a7d5a9" strokeWidth="1.5" />
      <path d="M288 138l8-8 6 6 8-10" stroke="#a7d5a9" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="295" cy="116" r="4" fill="none" stroke="#a7d5a9" strokeWidth="1.5" />
      <rect x="132" y="172" width="190" height="6" rx="3" fill="#e2f1e3" />
      <rect x="132" y="184" width="120" height="6" rx="3" fill="#e2f1e3" />
      <circle cx="220" cy="218" r="22" fill="#3f9f42" />
      <path d="M220 207v22M209 218h22" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

// ============================================================
// EMPTY STATE
// ============================================================
export const BlueprintsEmptyState: React.FC<{ onCreate: () => void }> = ({
  onCreate,
}) => {
  const [showVideo, setShowVideo] = useState(false);
  return (
  <div className="bp-empty-wrap">
    {showVideo && <VideoModal onClose={() => setShowVideo(false)} />}
    <div className="bp-page-header">
      <div className="bp-page-header__inner">
        <div>
         
          <h1 className="bp-page-title">Blueprints</h1>
          <p className="bp-page-sub">
            The recipes behind every campaign email. Build one once, reuse it forever.
          </p>
        </div>
        <span className="bp-demo-pill" onClick={() => setShowVideo(true)} style={{ cursor: "pointer" }}>
          <FontAwesomeIcon icon={faPlay} /> Quick demo · 2 min
        </span>
      </div>
    </div>

    <div className="bp-empty-body">
      <div className="bp-empty-hero">
        <div className="bp-empty-hero__bg" />
        <div className="bp-empty-hero__content">
          <div className="bp-empty-hero__copy">
            <span className="bp-start-pill">⚡ Start here</span>
            <h2 className="bp-empty-headline">Design your first blueprint.</h2>
            <p className="bp-empty-body-text">
              Walk through 5 short steps. PitchKraft drafts the structure, you
              refine the voice, and every future campaign inherits it.
            </p>
            <div className="bp-empty-actions">
              <button className="bp-btn-primary" onClick={onCreate}>
                <FontAwesomeIcon icon={faPlus} />
                Create your first blueprint
              </button>
              <button className="bp-btn-secondary" onClick={() => setShowVideo(true)}>
                <FontAwesomeIcon icon={faPlay} style={{ color: "#3f9f42" }} />
                Watch demo
              </button>
            </div>
            <div className="bp-empty-meta">
              Takes about 8 minutes · You can edit and clone later
            </div>
          </div>
          <div className="bp-empty-hero__art">
            <BlueprintIllustration width={340} />
          </div>
        </div>
      </div>

      <div className="bp-how-it-works">
        <div className="bp-eyebrow" style={{ marginBottom: 16 }}>How blueprints fit in</div>
        <div className="bp-steps">
          {[
            { n: 1, label: "Add contacts",    icon: "👥", active: false },
            { n: 2, label: "Create blueprint", icon: "📄", active: true  },
            { n: 3, label: "Create campaign",  icon: "📣", active: false },
            { n: 4, label: "Kraft emails",     icon: "✉️", active: false },
            { n: 5, label: "View analytics",   icon: "📈", active: false },
          ].map((s) => (
            <div key={s.n} className={`bp-step ${s.active ? "is-active" : ""}`}>
              <div className="bp-step__head">
                <span className="bp-step__num">STEP {String(s.n).padStart(2, "0")}</span>
                <span className="bp-step__icon">{s.icon}</span>
              </div>
              <div className="bp-step__label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
  );
};

// ============================================================
// POPULATED HERO BANNER
// ============================================================
export const BlueprintsHeroBanner: React.FC<{
  totalCount: number;
  onCreateClick: () => void;
}> = ({ totalCount, onCreateClick }) => {
  const [showVideo, setShowVideo] = useState(false);
  return (
  <div className="bp-banner">
    {showVideo && <VideoModal onClose={() => setShowVideo(false)} />}
    <div className="bp-banner__left">
      <div className="bp-banner__art">
        <svg viewBox="0 0 160 120" width="140" height="105" style={{ display: "block" }}>
          <defs>
            <linearGradient id="bb-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#d1fae5" />
              <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="100" height="80" rx="8" fill="#fff" stroke="#bbf7d0" strokeWidth="1.5" />
          <rect x="10" y="10" width="100" height="18" rx="8" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1.5" />
          <circle cx="20" cy="19" r="2.5" fill="#86efac" />
          <circle cx="28" cy="19" r="2.5" fill="#86efac" />
          <circle cx="36" cy="19" r="2.5" fill="#86efac" />
          <rect x="20" y="38" width="60" height="6" rx="3" fill="#dcfce7" />
          <rect x="20" y="50" width="45" height="5" rx="2.5" fill="#dcfce7" />
          <rect x="20" y="62" width="52" height="5" rx="2.5" fill="#dcfce7" />
          <rect x="20" y="74" width="35" height="5" rx="2.5" fill="#dcfce7" />
          <circle cx="118" cy="36" r="22" fill="#3f9f42" opacity="0.9" />
          <path d="M109 36l6 7 12-14" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="138" cy="72" r="16" fill="#3f9f42" opacity="0.7" />
          <path d="M131 72l5 5 9-10" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <g fill="#3f9f42" opacity="0.4">
            <path d="M5 5l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" />
            <path d="M148 10l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" />
            <path d="M155 90l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" />
          </g>
        </svg>
      </div>
      <div className="bp-banner__copy">
        <div className="bp-banner__title">
          Your blueprints are driving great campaigns! 🎉
        </div>
        <div className="bp-banner__sub">
          Well done! You have created <strong>{totalCount}</strong> blueprint{totalCount !== 1 ? "s" : ""}.
          Keep refining your templates and content structures to create even more impactful emails.
        </div>
        <div className="bp-banner__actions">
          <button className="bp-btn-banner-primary" onClick={onCreateClick}>
            <FontAwesomeIcon icon={faPlus} />
            Create campaign blueprint
          </button>
          <button className="bp-btn-banner-ghost" onClick={() => setShowVideo(true)}>
            <FontAwesomeIcon icon={faPlay} />
            Explore blueprint best practices
          </button>
        </div>
      </div>
    </div>
    <div className="bp-banner__features">
      {[
        { icon: "📋", title: "Create & customize", desc: "Design templates and set up dynamic content blocks." },
        { icon: "🎯", title: "Personalize better", desc: "Use smart personalization to make every email relevant." },
        { icon: "♻️", title: "Optimize & reuse", desc: "Track performance and reuse what works best." },
      ].map((f) => (
        <div key={f.title} className="bp-banner__feature">
          <span className="bp-banner__feature-icon">{f.icon}</span>
          <div>
            <div className="bp-banner__feature-title">{f.title}</div>
            <div className="bp-banner__feature-desc">{f.desc}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
  );
};

// ============================================================
// POPULATED STATE
// ============================================================
type Handler = (t: any) => void | Promise<void>;

interface ListProps {
  templates: CampaignTemplate[];
  totalCount: number;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  sortKey: string;
  sortDirection: "asc" | "desc";
  onSort: (key: string) => void;
  currentPage: number;
  totalPages: number;
  pageSize: number | "All";
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number | "All") => void;
  onCreateClick: () => void;
  onRowClick: Handler;
  templateActionsAnchor: string | null;
  setTemplateActionsAnchor: (v: string | null) => void;
  onView: Handler;
  onEdit: Handler;
  onEditModel: Handler;
  onRename: Handler;
  onClone: Handler;
  onDelete: Handler;
  formatDate: (d?: string) => string;
  preloadExampleEmail: Handler;
  exampleCache: Record<number, string | undefined>;
}

const sortIcon = (active: boolean, dir: "asc" | "desc") =>
  active ? (dir === "asc" ? faSortUp : faSortDown) : faSort;

export const BlueprintsList: React.FC<ListProps> = (p) => {
  return (
    <div className="bp-list-wrap">
      <div className="bp-page-header">
        <div className="bp-page-header__inner">
          <div>
            
            <h1 className="bp-page-title">
              Blueprints
              <span className="bp-count-pill">{p.totalCount}</span>
            </h1>
            <p className="bp-page-sub">
              Your library of reusable email recipes. Edit, clone, and watch their performance.
            </p>
          </div>
          <div className="bp-header-actions">
            <button className="bp-btn-primary-dark" onClick={p.onCreateClick}>
              <FontAwesomeIcon icon={faPlus} />
              New blueprint
            </button>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="bp-list-body">
        <BlueprintsHeroBanner totalCount={p.totalCount} onCreateClick={p.onCreateClick} />
      </div>

      <div className="bp-list-body">
        <div className="bp-toolbar">
          <div className="bp-toolbar__left">
            <div className="bp-search">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="bp-search__icon" />
              <input
                value={p.searchQuery}
                onChange={(e) => p.onSearchChange(e.target.value)}
                placeholder="Search by name or ID"
              />
            </div>
            <button className="bp-btn-tertiary" onClick={() => p.onSort("createdAt")}>
              <FontAwesomeIcon icon={faSort} style={{ color: "#6b7280" }} />
              {p.sortKey === "createdAt" && p.sortDirection === "asc" ? "Oldest first" : "Newest first"}
              <FontAwesomeIcon icon={faChevronDown} style={{ color: "#6b7280", fontSize: 11 }} />
            </button>
          </div>

          <div className="bp-pagination">
            <span>
              Showing <strong>{p.templates.length}</strong> of {p.totalCount}
            </span>
            <div className="bp-pagination__nav">
              <button onClick={() => p.onPageChange(1)} disabled={p.currentPage === 1}>
                <FontAwesomeIcon icon={faAnglesLeft} />
              </button>
              <button onClick={() => p.onPageChange(p.currentPage - 1)} disabled={p.currentPage === 1}>
                <FontAwesomeIcon icon={faAngleLeft} />
              </button>
              <span className="bp-pagination__page">
                {p.currentPage} / {p.totalPages}
              </span>
              <button onClick={() => p.onPageChange(p.currentPage + 1)} disabled={p.currentPage === p.totalPages}>
                <FontAwesomeIcon icon={faAngleRight} />
              </button>
              <button onClick={() => p.onPageChange(p.totalPages)} disabled={p.currentPage === p.totalPages}>
                <FontAwesomeIcon icon={faAnglesRight} />
              </button>
            </div>
          </div>
        </div>

        <div className="bp-rows">
          <div className="bp-rows__head">
            <div />
            <div className="bp-th" onClick={() => p.onSort("templateName")}>
              Blueprint{" "}
              <FontAwesomeIcon
                icon={sortIcon(p.sortKey === "templateName", p.sortDirection)}
                className={p.sortKey === "templateName" ? "active" : ""}
              />
            </div>
            <div className="bp-th" onClick={() => p.onSort("id")}>
              ID{" "}
              <FontAwesomeIcon
                icon={sortIcon(p.sortKey === "id", p.sortDirection)}
                className={p.sortKey === "id" ? "active" : ""}
              />
            </div>
            <div className="bp-th" onClick={() => p.onSort("createdAt")}>
              Creation date{" "}
              <FontAwesomeIcon
                icon={sortIcon(p.sortKey === "createdAt", p.sortDirection)}
                className={p.sortKey === "createdAt" ? "active" : ""}
              />
            </div>
            <div />
          </div>

          {p.isLoading ? (
            <div className="bp-rows__msg">Loading...</div>
          ) : p.templates.length === 0 ? (
            <div className="bp-rows__msg">No campaign blueprint found.</div>
          ) : (
            p.templates.map((t) => (
              <div key={t.id} className="bp-row">
                <div className="bp-row__rail" />
                <div className="bp-row__name">
                  <a
                    id={`blueprint-${t.id}`}
                    className="bp-row__link"
                    onMouseEnter={() => p.preloadExampleEmail(t)}
                    onClick={() => p.onRowClick(t)}
                  >
                    {t.templateName}
                  </a>
                  <Tooltip
                    anchorId={`blueprint-${t.id}`}
                    place="right"
                    offset={20}
                    positionStrategy="fixed"
                    className="example-tooltip"
                  >
                    {p.exampleCache[t.id] === undefined ? (
                      <div>Loading example email...</div>
                    ) : (
                      <div
                        className="tooltip-email-content"
                        dangerouslySetInnerHTML={{
                          __html: p.exampleCache[t.id] || "<p>No example email available</p>",
                        }}
                      />
                    )}
                  </Tooltip>
                </div>
                <div className="bp-row__id">#{t.id}</div>
                <div className="bp-row__date">{p.formatDate(t.createdAt)}</div>
                <div className="bp-row__actions">
                  <button title="Edit" onClick={() => p.onEdit(t)}>
                    <FontAwesomeIcon icon={faPencil} />
                  </button>
                  <button title="Duplicate" onClick={() => p.onClone(t)}>
                    <FontAwesomeIcon icon={faCopy} />
                  </button>
                  <button
                    title="More"
                    onClick={() =>
                      p.setTemplateActionsAnchor(
                        p.templateActionsAnchor === `campaign-${t.id}`
                          ? null
                          : `campaign-${t.id}`,
                      )
                    }
                  >
                    <FontAwesomeIcon icon={faEllipsisV} />
                  </button>
                  {p.templateActionsAnchor === `campaign-${t.id}` && (
                    <div className="bp-row__menu">
                      <button onClick={() => { p.onView(t); p.setTemplateActionsAnchor(null); }}>
                        <FontAwesomeIcon icon={faEye} /> View
                      </button>
                      <button onClick={() => { p.onEdit(t); p.setTemplateActionsAnchor(null); }}>
                        <FontAwesomeIcon icon={faPencil} /> Edit
                      </button>
                      <button onClick={() => { p.onEditModel(t); p.setTemplateActionsAnchor(null); }}>
                        <FontAwesomeIcon icon={faRobot} /> Edit model
                      </button>
                      <button onClick={() => { p.onRename(t); p.setTemplateActionsAnchor(null); }}>
                        <FontAwesomeIcon icon={faFile} /> Rename
                      </button>
                      <button onClick={() => { p.onClone(t); p.setTemplateActionsAnchor(null); }}>
                        <FontAwesomeIcon icon={faCopy} /> Clone
                      </button>
                      <button
                        onClick={() => { p.onDelete(t); p.setTemplateActionsAnchor(null); }}
                        className="is-danger"
                      >
                        <FontAwesomeIcon icon={faTrashCan} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bp-tip">
          ⚡ Tip: pin your top 3 performers to surface them at the top of every campaign builder.
        </div>
      </div>
    </div>
  );
};
