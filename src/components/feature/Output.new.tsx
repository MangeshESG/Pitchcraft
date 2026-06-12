import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import kraftEmailNewImage from "../../assets/images/kraft_email_new.png";
import kraftEmailNoCampaignImage from "../../assets/images/Kraft_email_no_campgain.png";
import "./Output.new.css";

// ============================================================
// LOADING STATE — shown in the right panel while contacts load
// ============================================================
export const KraftLoadingState: React.FC<{ message?: string }> = ({
  message = "Loading contacts...",
}) => (
  <div className="ke-ready-wrap">
    <div className="ke-spinner" />
    <h3 className="ke-ready-title" style={{ marginTop: 16 }}>{message}</h3>
    <p className="ke-ready-text">This should only take a moment.</p>
  </div>
);

// ============================================================
// CAMPAIGN SELECT STATE — banner shown when no campaign is
// selected yet (replaces the entire Kraft Email page)
// ============================================================
export const KraftCampaignSelectState: React.FC<{
  campaigns?: any[];
  selectedCampaign?: string;
  handleCampaignChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}> = ({ campaigns, selectedCampaign, handleCampaignChange }) => (
  <div className="ke-empty-wrap">
    <div className="ke-empty-body">
      <div className="ke-empty-hero">
        <div className="ke-empty-hero__bg" />
        <div className="ke-empty-hero__content">
          <div className="ke-empty-hero__copy">
            <span className="ke-start-pill">📧 Get started</span>
            <h2 className="ke-empty-headline">Ready to craft something amazing?</h2>
            <p className="ke-empty-body-text">
              Select a campaign to start crafting personalized emails. Once selected,
              you'll be able to review contacts, compose, and preview your email before sending.
            </p>
            <div className="ke-empty-actions">
              <div className="ke-empty-campaign-select">
                <label className="ke-ready-label">
                  Campaign <span className="ke-ready-required">*</span>
                </label>
                <select
                  value={selectedCampaign || ""}
                  onChange={handleCampaignChange}
                  className={`ke-ready-select${!selectedCampaign ? " ke-ready-select--error" : ""}`}
                >
                  <option value="">Select a campaign</option>
                  {Array.isArray(campaigns) &&
                    campaigns
                      .slice()
                      .sort((a, b) => a.campaignName.toLowerCase().localeCompare(b.campaignName.toLowerCase()))
                      .map((campaign) => (
                        <option key={campaign.id} value={campaign.id.toString()}>
                          {campaign.campaignName}
                        </option>
                      ))}
                </select>
              </div>
            </div>
          </div>
          <div className="ke-empty-hero__art">
            <img
              src={kraftEmailNoCampaignImage}
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

// ============================================================
// EMPTY STATE — shown when user has zero campaigns
// ============================================================
export const KraftEmailEmptyState: React.FC<{
  onGoToBlueprints?: () => void;
}> = ({ onGoToBlueprints }) => {
  return (
    <div className="ke-empty-wrap">
      <div className="ke-empty-body">
        <div className="ke-empty-hero">
          <div className="ke-empty-hero__bg" />
          <div className="ke-empty-hero__content">
            <div className="ke-empty-hero__copy">
              <span className="ke-start-pill">⚡ Get started</span>
              <h2 className="ke-empty-headline">Craft personalized emails at scale.</h2>
              <p className="ke-empty-body-text">
                No campaigns found yet. Head over to Blueprints to create your first campaign — PitchKraft will personalize every outreach automatically using AI-powered contact insights.
              </p>

              <div className="ke-empty-actions">
                <button className="ke-btn-primary" onClick={onGoToBlueprints}>
                  <FontAwesomeIcon icon={faPlus} />
                  Create your first campaign
                </button>
              </div>
              <div className="ke-empty-meta">
                Create a blueprint first · Takes about 8 minutes · Edit and clone anytime
              </div>
            </div>
            <div className="ke-empty-hero__art">
              <img
                src={kraftEmailNewImage}
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
    </div>
  );
};
