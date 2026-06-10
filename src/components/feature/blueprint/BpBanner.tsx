import React from "react";

interface BpBannerProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  primaryLabel: string;
  primaryIcon?: React.ReactNode;
  onPrimaryClick: () => void;
  secondaryLabel?: string;
  secondaryIcon?: React.ReactNode;
  secondaryHref?: string;
  imageSrc: string;
  imageAlt?: string;
}

// Shared hero banner used above the Blueprints and Campaigns lists.
// Styling lives in Template.new.css under the .bp-banner* classes.
export const BpBanner: React.FC<BpBannerProps> = ({
  title,
  subtitle,
  primaryLabel,
  primaryIcon,
  onPrimaryClick,
  secondaryLabel,
  secondaryIcon,
  secondaryHref,
  imageSrc,
  imageAlt = "",
}) => {
  return (
    <div className="bp-banner">
      <div className="bp-banner__left">
        <div className="bp-banner__copy">
          <div className="bp-banner__title">{title}</div>
          <div className="bp-banner__sub">{subtitle}</div>
          <div className="bp-banner__actions">
            <button className="bp-btn-banner-primary" onClick={onPrimaryClick}>
              {primaryIcon}
              {primaryLabel}
            </button>
            {secondaryLabel && secondaryHref && (
              <a
                className="bp-btn-banner-ghost"
                href={secondaryHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                {secondaryIcon}
                {secondaryLabel}
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="bp-banner__art">
        <img
          src={imageSrc}
          alt={imageAlt}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      </div>
    </div>
  );
};

export default BpBanner;
