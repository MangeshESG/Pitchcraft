/**
 * The email options one kraft produced.
 *
 * A blueprint decides how many emails a generation writes (Email Option Count
 * in the prompt, one to five). The API always answers with an `emailOptions`
 * array — one entry for a blueprint that asks for a single email, several for
 * one that asks for a choice — and `emailBody` keeps pointing at the first of
 * them, which is the one already saved to the contact row.
 *
 * Reading them through here means the UI has one shape to render whether the
 * blueprint asked for one email or four, and keeps working against an older
 * API build that has no options array at all.
 */

import { EmailHighlight, parseEmailHighlights } from "./emailHighlights";

export interface EmailOption {
  /** Position in the returned set, 0-based. Also the picker's order. */
  index: number;
  /** A few plain words naming the angle, for the picker. May be empty. */
  label: string;
  /** This option's own subject line. */
  subject: string;
  /** This option's complete body HTML, clean of highlight markup. */
  bodyHtml: string;
  /**
   * Highlights belonging to THIS option's wording. Options differ, so a
   * record from one of them generally does not match another.
   */
  highlights: EmailHighlight[];
}

const readString = (...values: any[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
};

/**
 * Reads the options out of a POST /api/email-generation/generate reply.
 *
 * Returns an empty list only when the reply carries no email at all — the
 * caller then keeps whatever is already in the editor.
 */
export const parseEmailOptions = (data: any): EmailOption[] => {
  const raw = data?.emailOptions ?? data?.EmailOptions;

  const options: EmailOption[] = (Array.isArray(raw) ? raw : [])
    .map((item: any): EmailOption | null => {
      if (!item || typeof item !== "object") return null;

      const bodyHtml = readString(item.bodyHtml, item.BodyHtml, item.body_html);
      if (!bodyHtml.trim()) return null;

      return {
        index: 0,
        label: readString(item.label, item.Label).trim(),
        subject: readString(item.subject, item.Subject).trim(),
        bodyHtml,
        highlights: parseEmailHighlights(item.highlights ?? item.Highlights),
      };
    })
    .filter((option: EmailOption | null): option is EmailOption => option !== null)
    // Numbered by position, so the picker and the saved choice always agree
    // even if the API ever leaves a gap.
    .map((option: EmailOption, index: number) => ({ ...option, index }));

  if (options.length > 0) return options;

  // Older API build, or a blueprint whose reply was not structured JSON:
  // the one email arrives at the top level.
  const bodyHtml = readString(data?.emailBody, data?.EmailBody);
  if (!bodyHtml.trim()) return [];

  return [
    {
      index: 0,
      label: "",
      subject: readString(data?.emailSubject, data?.EmailSubject).trim(),
      bodyHtml,
      highlights: parseEmailHighlights(data?.emailHighlights ?? data?.EmailHighlights),
    },
  ];
};

/** What the picker calls an option: its label, or its position. */
export const emailOptionTitle = (option: EmailOption): string =>
  option.label || `Option ${option.index + 1}`;
