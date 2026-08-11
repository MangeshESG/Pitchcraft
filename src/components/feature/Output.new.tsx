import React from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faCircleCheck, faUsers, faFileLines, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
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
      icon: faUsers,
      title: "Add at least one contact",
      subtitle: "Add contacts to build your audience.",
      addLabel: "Add contacts",
      onAdd: () => navigate("/main?tab=DataCampaigns&subtab=List"),
    },
    {
      done: hasBlueprint,
      icon: faFileLines,
      title: "Add at least one blueprint",
      subtitle: "Create a blueprint to use in your campaign.",
      addLabel: "Add blueprint",
      onAdd: () => navigate("/main?tab=TestTemplate"),
    },
    {
      done: hasCampaign,
      icon: faPaperPlane,
      title: "Add at least one campaign",
      subtitle: "Link contacts and a blueprint together in a campaign.",
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
                  <div key={step.addLabel} className="ke-setup-card">
                    <span className="ke-setup-card__icon">
                      <FontAwesomeIcon icon={step.icon} />
                    </span>
                    <div className="ke-setup-card__text">
                      <div className="ke-setup-card__title">{step.title}</div>
                      <div className="ke-setup-card__subtitle">{step.subtitle}</div>
                    </div>
                    {step.done ? (
                      <span className="ke-setup-badge ke-setup-badge--done">
                        <FontAwesomeIcon icon={faCircleCheck} />
                        Completed
                      </span>
                    ) : (
                      <button className="btn-default ke-setup-card__btn" onClick={step.onAdd}>
                        <FontAwesomeIcon icon={faPlus} />
                        {step.addLabel}
                      </button>
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
