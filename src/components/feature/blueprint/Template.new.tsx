import React, { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEllipsisV,
  faPlus,
  faMagnifyingGlass,
  faPlay,
  faArrowUpRightFromSquare,
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
import blueprintNewUserImage from "../../../assets/images/blueprint_new_user.png";
import blueprintOldUserImage from "../../../assets/images/blueprint_new_user.png";
import { BpBanner } from "./BpBanner";

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
// EMPTY STATE
// ============================================================
export const BlueprintsEmptyState: React.FC<{ onCreate: () => void }> = ({
  onCreate,
}) => {
  const [showVideo, setShowVideo] = useState(false);
  return (
  <div className="bp-empty-wrap">
    {showVideo && <VideoModal onClose={() => setShowVideo(false)} />}
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
              <button className="btn-default" onClick={onCreate}>
                <FontAwesomeIcon icon={faPlus} />
                Create your first blueprint
              </button>
              <button className="btn-muted" onClick={() => setShowVideo(true)}>
                <FontAwesomeIcon icon={faPlay} style={{ color: "#3f9f42" }} />
                Watch demo
              </button>
            </div>
            <div className="bp-empty-meta">
              Takes about 8 minutes · You can edit and clone later
            </div>
          </div>
          <div className="bp-empty-hero__art">
            <img
              src={blueprintNewUserImage}
              alt=""
              style={{ width: 500, height: "auto", maxWidth: "100%" }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          </div>
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
  return (
    <BpBanner
      title={`You have so far created ${totalCount} blueprint${totalCount !== 1 ? "s" : ""}`}
      subtitle="Keep adding and refining your blueprints to create even more impactful emails."
      primaryLabel="Create blueprint"
      primaryIcon={<FontAwesomeIcon icon={faPlus} />}
      primaryClassName="bp-btn-banner-default"
      onPrimaryClick={onCreateClick}
      secondaryLabel="Explore blueprint best practices"
      secondaryIcon={<FontAwesomeIcon icon={faArrowUpRightFromSquare} />}
      secondaryHref="https://www.pitchkraft.ai/blueprints"
      imageSrc={blueprintOldUserImage}
      imageAlt=""
    />
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
                  <button
                    type="button"
                    id={`blueprint-${t.id}`}
                    className="bp-row__link"
                    onMouseEnter={() => p.preloadExampleEmail(t)}
                    onClick={() => p.onRowClick(t)}
                  >
                    {t.templateName}
                  </button>
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
