import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import kraftEmailNewImage from "../../assets/images/kraft_email_new.png";
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
// READY STATE — shown in the right panel when no campaign selected
// ============================================================
const EnvelopeIllustration: React.FC = () => (
  <svg width="220" height="185" viewBox="0 0 220 185" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Decorative clouds */}
    <ellipse cx="28" cy="72" rx="15" ry="8" fill="#c8e6c9" opacity="0.7"/>
    <ellipse cx="40" cy="65" rx="12" ry="10" fill="#c8e6c9" opacity="0.7"/>
    <ellipse cx="50" cy="71" rx="10" ry="8" fill="#c8e6c9" opacity="0.7"/>
    <ellipse cx="175" cy="48" rx="14" ry="8" fill="#c8e6c9" opacity="0.7"/>
    <ellipse cx="187" cy="42" rx="12" ry="10" fill="#c8e6c9" opacity="0.7"/>
    <ellipse cx="197" cy="47" rx="10" ry="8" fill="#c8e6c9" opacity="0.7"/>
    {/* Plus signs */}
    <text x="12" y="108" fill="#3f9f42" fontFamily="sans-serif" fontSize="18" fontWeight="300" opacity="0.45">+</text>
    <text x="100" y="16" fill="#3f9f42" fontFamily="sans-serif" fontSize="13" fontWeight="300" opacity="0.35">+</text>
    <text x="203" y="98" fill="#3f9f42" fontFamily="sans-serif" fontSize="16" fontWeight="300" opacity="0.45">+</text>
    <text x="42" y="170" fill="#3f9f42" fontFamily="sans-serif" fontSize="11" fontWeight="300" opacity="0.3">+</text>
    <text x="165" y="172" fill="#3f9f42" fontFamily="sans-serif" fontSize="11" fontWeight="300" opacity="0.3">+</text>
    {/* Envelope body */}
    <rect x="42" y="74" width="136" height="96" rx="8" fill="#f1f8f2" stroke="#4caf50" strokeWidth="2"/>
    {/* Envelope inner left/right shading triangles */}
    <path d="M42 74 L42 170 L98 122 Z" fill="#dcedc8" opacity="0.6"/>
    <path d="M178 74 L178 170 L122 122 Z" fill="#dcedc8" opacity="0.6"/>
    {/* Envelope bottom fold */}
    <path d="M42 170 L110 128 L178 170 Z" fill="#e8f5e9" stroke="#4caf50" strokeWidth="1.5" strokeLinejoin="round"/>
    {/* Envelope open flap */}
    <path d="M42 74 L110 116 L178 74" fill="#a5d6a7" stroke="#4caf50" strokeWidth="2" strokeLinejoin="round"/>
    {/* Letter sticking out */}
    <rect x="66" y="48" width="88" height="68" rx="5" fill="white" stroke="#a5d6a7" strokeWidth="1.5"/>
    {/* Letter lines */}
    <line x1="76" y1="64" x2="144" y2="64" stroke="#c8e6c9" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="76" y1="76" x2="140" y2="76" stroke="#c8e6c9" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="76" y1="88" x2="134" y2="88" stroke="#c8e6c9" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="76" y1="100" x2="140" y2="100" stroke="#c8e6c9" strokeWidth="2.5" strokeLinecap="round"/>
    {/* Paper plane */}
    <g transform="translate(166,32) rotate(-30)">
      <path d="M0 0 L-20 11 L-7 3 Z" fill="#3f9f42"/>
      <path d="M0 0 L-17 9 L-13 19 Z" fill="#2d7a30"/>
      <path d="M0 0 L11 7 L3 3 Z" fill="#66bb6a"/>
    </g>
    {/* Plane trail */}
    <circle cx="148" cy="22" r="2.2" fill="#3f9f42" opacity="0.4"/>
    <circle cx="140" cy="18" r="1.6" fill="#3f9f42" opacity="0.3"/>
    <circle cx="132" cy="15" r="1.1" fill="#3f9f42" opacity="0.2"/>
  </svg>
);

export const KraftReadyState: React.FC = () => (
  <div className="ke-ready-wrap">
    <EnvelopeIllustration />
    <h3 className="ke-ready-title">Ready to craft something amazing?</h3>
    <p className="ke-ready-text">
      Select a campaign to start crafting personalized emails. Once selected,
      you'll be able to review contacts, compose, and preview your email before
      sending.
    </p>
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
