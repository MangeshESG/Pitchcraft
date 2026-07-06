import React from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGear, faInbox, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import inboxHeroImage from "../../../assets/images/Email-inbox.jpg";
import "../Output.new.css";

interface InboxDropdownItem {
  inboxId: number;
  emailAddress: string;
  provider: string;
  totalUnreadCount?: number;
}

// ============================================================
// EMPTY STATE — shown when the user has NOT configured any
// inbox yet. Prompts them to add one in Mail → Configuration.
// ============================================================
export const InboxEmptyState: React.FC<{
  onGoToConfiguration?: () => void;
}> = ({ onGoToConfiguration }) => {
  const navigate = useNavigate();

  const goToConfiguration = () => {
    if (onGoToConfiguration) {
      onGoToConfiguration();
      return;
    }
    navigate("/main?tab=Mail&mailSubTab=Configuration");
  };

  return (
    <div className="ke-empty-wrap">
      {/* PAGE HEADER */}

      <div className="ke-empty-body">
        <div className="ke-empty-hero">
          <div className="ke-empty-hero__bg" />
          <div className="ke-empty-hero__content">
            <div className="ke-empty-hero__copy">
              <span className="ke-start-pill">Get started</span>
              <h2 className="ke-empty-headline">Connect an inbox to read your replies</h2>
              <p className="ke-empty-body-text">
                You haven't added an inbox yet. Add your email inbox in
                Configuration to start receiving, reading and replying to your
                contacts' emails right here.
              </p>

              <div className="ke-empty-actions">
                <button className="btn-default" onClick={goToConfiguration}>
                  <FontAwesomeIcon icon={faGear} />
                  Add inbox in Configuration
                  <FontAwesomeIcon icon={faArrowRight} />
                </button>
              </div>
            </div>
            <div className="ke-empty-hero__art">
              <img
                src={inboxHeroImage}
                alt=""
                style={{ width: 400, height: "auto", maxWidth: "100%" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// INBOX SELECT STATE — shown when the user HAS inboxes but has
// not selected one yet. Presents a dropdown to pick an inbox;
// once selected the full inbox workspace is shown.
// ============================================================
export const InboxSelectState: React.FC<{
  inboxList: InboxDropdownItem[];
  selectedInboxId?: number | null;
  onInboxChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}> = ({ inboxList, selectedInboxId, onInboxChange }) => (
  <div className="ke-empty-wrap">
    {/* PAGE HEADER */}
    <div className="flex items-start justify-between pt-4 pb-2 px-8">
      <h1 className="text-[26px] font-bold text-[#111827] leading-tight">Inbox</h1>
    </div>
    <div className="ke-empty-body">
      <div className="ke-empty-hero">
        <div className="ke-empty-hero__bg" />
        <div className="ke-empty-hero__content">
          <div className="ke-empty-hero__copy">
            <span className="ke-start-pill">Get started</span>
            <h2 className="ke-empty-headline">Select an inbox to get started</h2>
            <p className="ke-empty-body-text">
              Choose one of your connected inboxes to view its associated
              replies, external emails and sent messages.
            </p>

            <div className="ke-empty-actions">
              <div className="ke-empty-campaign-select">
                <label className="ke-ready-label">
                  Inbox <span className="ke-ready-required">*</span>
                </label>
                <select
                  value={selectedInboxId || ""}
                  onChange={onInboxChange}
                  className={`ke-ready-select${!selectedInboxId ? " ke-ready-select--error" : ""}`}
                >
                  <option value="">Select an inbox</option>
                  {Array.isArray(inboxList) &&
                    inboxList.map((inbox) => (
                      <option key={inbox.inboxId} value={inbox.inboxId}>
                        {inbox.emailAddress || `Inbox ${inbox.inboxId}`}
                        {inbox.totalUnreadCount ? ` (${inbox.totalUnreadCount})` : ""}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
          <div className="ke-empty-hero__art">
            <span
              className="ke-setup-card__icon"
              style={{ width: 96, height: 96, fontSize: 40 }}
            >
              <FontAwesomeIcon icon={faInbox} />
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);
