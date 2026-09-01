import React from "react";
import ValidationCell, { parseSources } from "./ValidationCell";
import { formatUserDate } from "../../common/dateTimePreferences";

/**
 * The Audience Assurance columns, shared by every contact grid.
 *
 * The list, segment and saved-view grids each build their own column set, so
 * without one definition here the four scores would be rendered three
 * different ways and drift apart on the first change.
 */

/**
 * Labels for the score columns. The generated labels would read "Contact Fit
 * Confidence" and "Contact Fit Checked At"; these are what the checks are
 * called in the product.
 */
export const VALIDATION_COLUMN_LABELS: Record<string, string> = {
  checks: "Checks",
  lastChecked: "Last checked",
  contactFitConfidence: "Contact fit",
  contactFitComments: "Contact fit comments",
  contactFitCheckedAt: "Contact fit last checked",
  dataIntegrityConfidence: "Data integrity",
  dataIntegrityComments: "Data integrity comments",
  dataIntegrityCheckedAt: "Data integrity last checked",
  liveContactConfidence: "Live contact",
  liveContactComments: "Live contact comments",
  liveContactCheckedAt: "Live contact last checked",
  emailValidityConfidence: "Email validity",
  emailValidityComments: "Email validity comments",
  emailCheckedAt: "Email last checked",
  isVerified: "Verified",
  verifiedAt: "Verified on",
};

/**
 * Validation fields that travel on the row but never become columns.
 *
 * All four scores live in the single "Checks" cell, which reads them straight
 * off the row — so the per-check fields still have to be sent, they just must
 * not each claim a column as well. Four score columns plus four comment
 * columns is eight column-widths for one idea, and it pushed the name and
 * company off screen.
 *
 * Excluding them here also means a client whose saved layout still lists the
 * old columns simply stops seeing them, rather than having to reset their
 * layout by hand.
 */
export const VALIDATION_EXCLUDED_FIELDS = [
  "validationSources",
  "contactFitConfidence",
  "contactFitComments",
  "contactFitCheckedAt",
  "dataIntegrityConfidence",
  "dataIntegrityComments",
  "dataIntegrityCheckedAt",
  "liveContactConfidence",
  "liveContactComments",
  "liveContactCheckedAt",
  "emailValidityConfidence",
  "emailValidityComments",
  "emailCheckedAt",
  "verifiedAt",
];

/**
 * What a list shows by default: the four scores in one cell, when they were
 * last run, and the manual override.
 *
 * The per-check confidence, comment and date columns all still exist and can
 * be switched on from the column panel — useful for sorting by one score or
 * exporting the comments — they are just not worth a column each by default.
 *
 * The table drops any column no row has a value for, so none of this appears
 * until a check has actually been run.
 */
export const VALIDATION_DEFAULT_VISIBLE_COLUMNS = [
  "checks",
  "lastChecked",
  "isVerified",
];

const commentCell = (value: any) =>
  !value || !String(value).trim() ? (
    <span style={{ color: "#9ca3af" }}>—</span>
  ) : (
    <span title={String(value)} style={{ display: "block", maxWidth: 380 }}>
      {String(value)}
    </span>
  );

const verifiedCell = (value: any) =>
  value ? (
    <span
      title="Checked by hand. A later validation run will not clear this."
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 999,
        background: "#f1f8f2",
        border: "1px solid #d5f0da",
        color: "#2d7a30",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      ✓ Verified
    </span>
  ) : (
    <span style={{ color: "#9ca3af" }}>—</span>
  );

const scoreCell =
  (
    scoreKey: string,
    commentKey: string,
    dateKey: string,
    options: { linkedInHint?: boolean } = {}
  ) =>
  (value: any, row: any) => (
    <ValidationCell
      score={row[scoreKey]}
      comments={row[commentKey]}
      checkedAt={row[dateKey]}
      sources={parseSources(row.validationSources)}
      // The spec asks for the LinkedIn prompt whenever a live contact check is
      // anything short of certain — it is the one verdict a person can go and
      // confirm themselves in a single click.
      showLinkedInHint={
        !!options.linkedInHint &&
        typeof row[scoreKey] === "number" &&
        row[scoreKey] < 100
      }
    />
  );

/** The four checks in the order they read across the cell. */
const CHECKS: {
  key: string;
  short: string;
  scoreKey: string;
  commentKey: string;
  dateKey: string;
  linkedInHint?: boolean;
}[] = [
  {
    key: "fit",
    short: "Fit",
    scoreKey: "contactFitConfidence",
    commentKey: "contactFitComments",
    dateKey: "contactFitCheckedAt",
  },
  {
    key: "data",
    short: "Data",
    scoreKey: "dataIntegrityConfidence",
    commentKey: "dataIntegrityComments",
    dateKey: "dataIntegrityCheckedAt",
  },
  {
    key: "live",
    short: "Live",
    scoreKey: "liveContactConfidence",
    commentKey: "liveContactComments",
    dateKey: "liveContactCheckedAt",
    linkedInHint: true,
  },
  {
    key: "email",
    short: "Email",
    scoreKey: "emailValidityConfidence",
    commentKey: "emailValidityComments",
    dateKey: "emailCheckedAt",
  },
];

/**
 * All four scores in one cell.
 *
 * Four separate columns cost four column-widths for what is really one idea —
 * "how healthy is this contact?" — and pushed the name and company off screen.
 * One cell of short chips reads across in a glance, and hovering any chip
 * gives the reasoning behind that specific score.
 *
 * Only checks that have actually run get a chip: a placeholder for every
 * unrun check would fill the column with noise on a list nobody has validated
 * end to end.
 */
const checksCell = (value: any, row: any) => {
  const run = CHECKS.filter(
    (check) => typeof row[check.scoreKey] === "number"
  );

  if (run.length === 0) return <span style={{ color: "#9ca3af" }}>—</span>;

  const sources = parseSources(row.validationSources);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {run.map((check) => (
        <ValidationCell
          key={check.key}
          label={check.short}
          score={row[check.scoreKey]}
          comments={row[check.commentKey]}
          checkedAt={row[check.dateKey]}
          sources={sources}
          showLinkedInHint={
            !!check.linkedInHint && row[check.scoreKey] < 100
          }
        />
      ))}
    </div>
  );
};

/**
 * Renderers keyed by column, ready to spread into a grid's `customFormatters`.
 *
 * Each score cell carries its own comments and the sources behind them, so the
 * confidence column alone answers "why" without the comment column needing to
 * be switched on. The comment columns exist for reading or exporting in bulk.
 */
export const VALIDATION_FORMATTERS: Record<
  string,
  (value: any, row: any) => React.ReactNode
> = {
  checks: checksCell,
  lastChecked: (value: any) => formatUserDate(value),

  contactFitConfidence: scoreCell(
    "contactFitConfidence", "contactFitComments", "contactFitCheckedAt"),
  dataIntegrityConfidence: scoreCell(
    "dataIntegrityConfidence", "dataIntegrityComments", "dataIntegrityCheckedAt"),
  liveContactConfidence: scoreCell(
    "liveContactConfidence", "liveContactComments", "liveContactCheckedAt",
    { linkedInHint: true }),
  emailValidityConfidence: scoreCell(
    "emailValidityConfidence", "emailValidityComments", "emailCheckedAt"),

  contactFitComments: commentCell,
  dataIntegrityComments: commentCell,
  liveContactComments: commentCell,
  emailValidityComments: commentCell,

  contactFitCheckedAt: (value: any) => formatUserDate(value),
  dataIntegrityCheckedAt: (value: any) => formatUserDate(value),
  liveContactCheckedAt: (value: any) => formatUserDate(value),
  emailCheckedAt: (value: any) => formatUserDate(value),
  verifiedAt: (value: any) => formatUserDate(value),

  isVerified: verifiedCell,
};
