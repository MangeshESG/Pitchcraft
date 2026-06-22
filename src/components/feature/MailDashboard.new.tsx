import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import mailDashboardNewUserImage from "../../assets/images/mail_dashboard_old_user.png";
import mailDashboardSelectImage from "../../assets/images/mail_dashboard_new_user.png";
import "./MailDashboard.new.css";

export const MailDashboardEmptyState: React.FC<{
  onGoToCampaigns?: () => void;
}> = ({ onGoToCampaigns }) => {
  return (
    <div className="mde-empty-wrap">
      <div className="mde-empty-hero">
        <div className="mde-empty-hero__bg" />
        <div className="mde-empty-hero__content">
          <div className="mde-empty-hero__copy">
            <span className="mde-start-pill">📊 Stats dashboard</span>
            <div className="mde-empty-headline">Your outreach stats will appear here.</div>
            <p className="mde-empty-body-text">
              Once you send emails through a campaign, this dashboard comes alive — tracking
              emails sent, open rates, click rates, and delivery performance in real time.
            </p>
            <div className="mde-empty-actions">
              <button className="mde-btn-primary" onClick={onGoToCampaigns}>
                <FontAwesomeIcon icon={faPlus} />
                Create your first campaign
              </button>
            </div>
            <div className="mde-empty-meta">
              Stats update automatically after each send · No setup needed
            </div>
          </div>
          <div className="mde-empty-hero__art">
            <img
              src={mailDashboardNewUserImage}
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

// ============================================================
// CAMPAIGN SELECT STATE — banner shown when campaigns exist but
// none is selected yet (replaces the dashboard's Overview tab)
// ============================================================
export const MailDashboardCampaignSelectState: React.FC<{
  availableCampaigns?: any[];
  selectedCampaign?: string;
  handleCampaignChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}> = ({ availableCampaigns, selectedCampaign, handleCampaignChange }) => (
  <div className="mde-empty-wrap">
    <div className="mde-empty-hero">
      <div className="mde-empty-hero__bg" />
      <div className="mde-empty-hero__content">
        <div className="mde-empty-hero__copy">
          <span className="mde-start-pill">📊 Stats dashboard</span>
          <div className="mde-empty-headline">Select a campaign to view analytics</div>
          <p className="mde-empty-body-text">
            Choose a campaign and date range above to see performance insights like sent, opens, clicks, and more.
          </p>
          <div className="mde-empty-actions">
            <div className="mde-empty-campaign-select">
              <label className="mde-select-label">
                Campaign <span className="mde-required">*</span>
              </label>
              <select
                value={selectedCampaign || ""}
                onChange={handleCampaignChange}
                className={`mde-select${!selectedCampaign ? " mde-select--error" : ""}`}
              >
                <option value="">Select a campaign</option>
                <option value="all">All campaigns</option>
                {Array.isArray(availableCampaigns) &&
                  availableCampaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.campaignName}
                      {c.dataSource === "Segment" && c.segmentName ? ` (${c.segmentName})` : ""}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>
        <div className="mde-empty-hero__art">
          <img
            src={mailDashboardSelectImage}
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
