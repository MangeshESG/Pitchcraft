import React from "react";

/**
 * The badge shown next to a contact's name for the profile summary's
 * "nameUsuallyAssociatedWith" field.
 *
 * The value describes how the FIRST NAME is commonly used, not the person's
 * gender, so the tooltip says exactly that. "Both" and "Unknown" get a glyph
 * rather than a figure because there is no single figure to draw.
 */
export type NameAssociation = "Male" | "Female" | "Both" | "Unknown";

const SKIN = "#f6c9a8";
const NECK = "#efb891";

/** Shoulders + collar shared by both figures, filled with the garment colour. */
const Body = ({ garment }: { garment: string }) => (
  <>
    <path d="M28 35h8v9h-8z" fill={NECK} />
    <path d="M5 64c1.6-12.2 11.4-19.5 27-19.5S57.4 51.8 59 64z" fill={garment} />
    <path d="M25.5 44.5 32 52l6.5-7.5-3.2-1.6h-6.6z" fill="#ffffff" />
  </>
);

const MaleFigure = () => (
  <>
    <Body garment="#2f3a4a" />
    <path d="M32 47.5 29.6 50 32 61l2.4-11z" fill="#d64545" />
    <ellipse cx="32" cy="26" rx="11" ry="13" fill={SKIN} />
    <path d="M21 25.5c-1-9.2 5-14.5 11-14.5s12 5.3 11 14.5c-1.4-5.8-5-8-11-8s-9.6 2.2-11 8z" fill="#3d3733" />
  </>
);

const FemaleFigure = () => (
  <>
    <Body garment="#1d4f91" />
    {/* Long hair sits behind the face */}
    <path
      d="M18 27c0-9.4 6.2-15.5 14-15.5S46 17.6 46 27v11c0 3-1.8 5-4 5V25c0-1.2-1-2.2-2.2-2.2H24.2c-1.2 0-2.2 1-2.2 2.2v18c-2.2 0-4-2-4-5z"
      fill="#5b4038"
    />
    <ellipse cx="32" cy="27" rx="11" ry="13" fill={SKIN} />
    <path d="M21 26.5c0-8.4 5-13.5 11-13.5s11 5.1 11 13.5c-2-5.2-5-7.4-11-7.4s-9 2.2-11 7.4z" fill="#5b4038" />
  </>
);

const GenderAvatar: React.FC<{
  value?: string | null;
  size?: number;
}> = ({ value, size = 30 }) => {
  const normalized = (value || "").trim().toLowerCase();

  const association: NameAssociation | null =
    normalized === "male"
      ? "Male"
      : normalized === "female"
      ? "Female"
      : normalized === "both" || normalized === "male & female"
      ? "Both"
      : normalized === "unknown" || normalized === "not known"
      ? "Unknown"
      : null;

  if (!association) return null;

  const tooltip = `Name usually associated with: ${association}`;

  // No figure to draw for a name used either way, or one we cannot place.
  if (association === "Both" || association === "Unknown") {
    return (
      <span
        title={tooltip}
        aria-label={tooltip}
        className="inline-flex flex-shrink-0 items-center justify-center rounded-full bg-[#f0fdf4] font-semibold text-[#3f9f42]"
        style={{ width: size, height: size, fontSize: size * 0.62, lineHeight: 1 }}
      >
        {association === "Both" ? "⚥" : "?"}
      </span>
    );
  }

  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      className="inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#eef2f6]"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-hidden="true">
        {association === "Male" ? <MaleFigure /> : <FemaleFigure />}
      </svg>
    </span>
  );
};

export default GenderAvatar;
