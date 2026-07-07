import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import mailConfigEmptyImage from "../../assets/images/Email-Configuration.jpg";
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
              Add mailboxes to send and respond to your email campaigns, 
              Inbuilt tools check your domains to ensure they have the highest deliverability. 
              IMAP, Outlook, Google, O365 all supported.
            </p>
            {!isDemoAccount && (
              <div className="mce-empty-actions">
                <button className="btn-default" onClick={onAddMailbox}>
                  <FontAwesomeIcon icon={faPlus} />
                  Add mailbox
                </button>
              </div>
            )}
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
