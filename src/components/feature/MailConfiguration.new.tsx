import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import mailConfigEmptyImage from "../../assets/images/mail_dashboard_old_user.png";
import "./MailConfiguration.new.css";

// ============================================================
// EMPTY STATE — shown when the client has no mailbox configured
// ============================================================
export const MailConfigurationEmptyState: React.FC<{
  onAddMailbox: () => void;
  isDemoAccount?: boolean;
}> = ({ onAddMailbox, isDemoAccount }) => {
  return (
    <div className="mce-empty-wrap">
      <div className="mce-empty-hero">
        <div className="mce-empty-hero__bg" />
        <div className="mce-empty-hero__content">
          <div className="mce-empty-hero__copy">
            <span className="mce-start-pill">⚙️ Start here</span>
            <h2 className="mce-empty-headline">Connect your first mailbox.</h2>
            <p className="mce-empty-body-text">
              Add a sending mailbox to unlock campaign delivery, BCC copies, and
              domain authentication — everything in Mail Configuration starts here.
            </p>
            {!isDemoAccount && (
              <div className="mce-empty-actions">
                <button className="mce-btn-primary" onClick={onAddMailbox}>
                  <FontAwesomeIcon icon={faPlus} />
                  Add mailbox
                </button>
              </div>
            )}
            <div className="mce-empty-meta">
              Takes about 2 minutes · SMTP and IMAP supported
            </div>
          </div>
          <div className="mce-empty-hero__art">
            <img
              src={mailConfigEmptyImage}
              alt=""
              style={{ width: 430, height: "auto", maxWidth: "100%" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
