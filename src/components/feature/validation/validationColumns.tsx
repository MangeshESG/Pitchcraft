import React from "react";
import ValidationCell, { parseSources } from "./ValidationCell";
import { parseApiDate } from "../../../api/contactValidation";
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
 * The four scores each get their own column so a list can be sorted by one
 * check at a time — sorting is per column, so a single combined cell can only
 * ever be sorted by how many checks ran, not by any one verdict. What stays
 * excluded is the second copy of each score: the comment and the per-check
 * date, which the score cell already shows on hover. Twelve columns for four
 * checks would push the name and company off screen for nothing.
 *
 * Excluding them here also means a client whose saved layout still lists the
 * old columns simply stops seeing them, rather than having to reset their
 * layout by hand.
 */
export const VALIDATION_EXCLUDED_FIELDS = [
  "validationSources",
  "contactFitComments",
  "contactFitCheckedAt",
  "dataIntegrityComments",
  "dataIntegrityCheckedAt",
  "liveContactComments",
  "liveContactCheckedAt",
  "emailValidityComments",
  "emailCheckedAt",
  "verifiedAt",
];

/**
 * What a list shows by default: the four scores in one cell, then each score
 * on its own, when they were last run, and the manual override.
 *
 * The combined "Checks" cell stays because it reads across in a glance, but a
 * column is the unit the table sorts and filters by, so each check also needs
 * one of its own — otherwise "show me the contacts whose email is weakest" has
 * no way to be asked. Any of them can be switched off from the column panel.
 *
 * The table drops any column no row has a value for, so none of this appears
 * until a check has actually been run.
 */
export const VALIDATION_DEFAULT_VISIBLE_COLUMNS = [
  "checks",
  "contactFitConfidence",
  "dataIntegrityConfidence",
  "liveContactConfidence",
  "emailValidityConfidence",
  "lastChecked",
  "isVerified",
];

/**
 * The score a cell shows, once the manual mark is taken into account.
 *
 * Marking a contact verified is a person saying they have checked the record
 * themselves, so every check that had run by then reads 100 — their judgement
 * outranks the model's. Marking now writes the 100s to the database as well;
 * this is what keeps the older rows honest, the ones marked before it did, and
 * it costs nothing once the stored score is already 100.
 *
 * Two things stay untouched. A check that never ran has no score to raise: a
 * blank stays blank, because a 100 there would claim an email had been
 * validated when no email check has ever been run against it. And a check
 * re-run *after* the mark shows its own score — the run is newer evidence than
 * the person's look, which is exactly what re-running one is for.
 */
export const verifiedScore = (
  score: any,
  isVerified: any,
  verifiedAt?: string | null,
  checkedAt?: string | null
): number | null => {
  if (typeof score !== "number") return null;
  if (!isVerified) return score;

  // A run since the mark supersedes it. Missing either date means there is
  // nothing to compare, so the mark stands.
  if (checkedAt && verifiedAt &&
      parseApiDate(checkedAt) > parseApiDate(verifiedAt)) {
    return score;
  }

  return 100;
};

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
  (value: any, row: any) => {
    const raw = row[scoreKey];
    const score = verifiedScore(raw, row.isVerified, row.verifiedAt, row[dateKey]);

    return (
      <ValidationCell
        score={score}
        overriddenFrom={score !== raw ? raw : undefined}
        comments={row[commentKey]}
        checkedAt={row[dateKey]}
        sources={parseSources(row.validationSources)}
        // The spec asks for the LinkedIn prompt whenever a live contact check is
        // anything short of certain — it is the one verdict a person can go and
        // confirm themselves in a single click. A hand-verified contact is not
        // short of certain, so the mark silences it.
        showLinkedInHint={
          !!options.linkedInHint && typeof score === "number" && score < 100
        }
      />
    );
  };

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
 * All four scores in one cell — the summary next to the four per-check columns.
 *
 * It answers "how healthy is this contact?" in one column-width, which the
 * four score columns cannot do without reading across four headers. Sorting
 * belongs to those columns; this one is for the glance, and hovering any chip
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
      {run.map((check) => {
        const raw = row[check.scoreKey];
        const score = verifiedScore(
          raw, row.isVerified, row.verifiedAt, row[check.dateKey]);

        return (
          <ValidationCell
            key={check.key}
            label={check.short}
            score={score}
            overriddenFrom={score !== raw ? raw : undefined}
            comments={row[check.commentKey]}
            checkedAt={row[check.dateKey]}
            sources={sources}
            showLinkedInHint={
              !!check.linkedInHint && typeof score === "number" && score < 100
            }
          />
        );
      })}
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

/**
 * The Audience Assurance fields a filter — and so a saved view — can be built
 * from.
 *
 * The scores are the reason the checks exist: "everyone whose email validity
 * is under 50" is the question a user actually wants to turn into a list, and
 * a filter field is the only way to ask it. They live here with the columns
 * because the list, segment and view grids each build their own filter field
 * set, and one definition is what stops the four checks being named three
 * different things.
 *
 * Scores are plain numbers rather than a banded dropdown so the comparison
 * operators (`>=`, `<`) stay available — the six confidence bands exist to
 * spread the scores out, and collapsing them back into a picker would throw
 * away the precision the scoring instruction works for.
 */
export const VALIDATION_FILTER_FIELDS: {
  key: string;
  label: string;
  type: "number" | "boolean" | "date";
}[] = [
  { key: "contactFitConfidence", label: VALIDATION_COLUMN_LABELS.contactFitConfidence, type: "number" },
  { key: "dataIntegrityConfidence", label: VALIDATION_COLUMN_LABELS.dataIntegrityConfidence, type: "number" },
  { key: "liveContactConfidence", label: VALIDATION_COLUMN_LABELS.liveContactConfidence, type: "number" },
  { key: "emailValidityConfidence", label: VALIDATION_COLUMN_LABELS.emailValidityConfidence, type: "number" },
  { key: "isVerified", label: VALIDATION_COLUMN_LABELS.isVerified, type: "boolean" },
  { key: "lastChecked", label: VALIDATION_COLUMN_LABELS.lastChecked, type: "date" },
];

/** Field keys the filter picker groups under Audience Assurance. */
export const VALIDATION_FILTER_FIELD_KEYS = new Set(
  VALIDATION_FILTER_FIELDS.map((field) => field.key)
);

/**
 * A validation score off a contact row.
 *
 * The API returns the scores nested under `validation` — the grid flattens
 * that one level for display, but a filter reads the row as it arrived, so it
 * has to look inside itself.
 */
export const getValidationFieldValue = (row: any, fieldKey: string) => {
  if (!VALIDATION_FILTER_FIELD_KEYS.has(fieldKey)) return undefined;

  const validation = row?.validation;
  return validation && typeof validation === "object"
    ? validation[fieldKey]
    : undefined;
};
