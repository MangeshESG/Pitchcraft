import React from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import kraftEmailNewImage from "../../assets/images/Kraft_email_no_campgain.png";
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
            <span className="ke-start-pill">Get started</span>
            <h2 className="ke-empty-headline">Kraft personalized emails at scale</h2>
            <p className="ke-empty-body-text">
              Select an existing campaign to start krafting hyper-relevant emails for each of the contacts in that campaign. Send the emails from here with a human-style randomized timer or schedule for later.
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
  hasContacts?: boolean;
  hasBlueprint?: boolean;
  hasCampaign?: boolean;
}> = ({ hasContacts = false, hasBlueprint = false, hasCampaign = false }) => {
  const navigate = useNavigate();

  const steps = [
    {
      done: hasContacts,
      doneLabel: "Contacts added",
      todoLabel: "No contacts added",
      addLabel: "Add contacts",
      onAdd: () => navigate("/main?tab=DataCampaigns&subtab=List"),
    },
    {
      done: hasBlueprint,
      doneLabel: "Blueprint added",
      todoLabel: "No blueprints added",
      addLabel: "Add blueprint",
      onAdd: () => navigate("/main?tab=TestTemplate"),
    },
    {
      done: hasCampaign,
      doneLabel: "Campaign added",
      todoLabel: "No campaigns added",
      addLabel: "Add campaign",
      onAdd: () => navigate("/main?tab=Campaigns"),
    },
  ];

  return (
    <div className="ke-empty-wrap">
      <div className="ke-empty-body">
        <div className="ke-empty-hero">
          <div className="ke-empty-hero__bg" />
          <div className="ke-empty-hero__content">
            <div className="ke-empty-hero__copy">
              <span className="ke-start-pill">Get started</span>
              <h2 className="ke-empty-headline">Kraft personalized emails at scale.</h2>
              <p className="ke-empty-body-text">
                To start krafting emails you must first add some contacts, create a
                blueprint, and then link them together by creating a campaign.
              </p>

              <div className="ke-setup-checklist">
                {steps.map((step) => (
                  <div key={step.addLabel} className="ke-setup-row">
                    {step.done ? (
                      <span className="ke-setup-status ke-setup-status--done">
                        <FontAwesomeIcon icon={faCircleCheck} className="ke-setup-tick" />
                        {step.doneLabel}: YES
                      </span>
                    ) : (
                      <>
                        <span className="ke-setup-status">{step.todoLabel}</span>
                        <button className="btn-default" onClick={step.onAdd}>
                          <FontAwesomeIcon icon={faPlus} />
                          {step.addLabel}
                        </button>
                      </>
                    )}
                  </div>
                ))}
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
