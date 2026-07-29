/**
 * Normalizes the personalization inputs returned by
 * POST /api/email-generation/generate so the editor's Insights tabs get the
 * same values regardless of the response shape.
 *
 * The API exposes them in two places:
 *   - top level:  notes / emails / professionalSummary
 *   - details:    details.notes, details.useEmails,
 *                 details.runtimeReplacements.linkedin_info
 * Only the second form exists on older builds, so both are read.
 */
export interface GenerationInsights {
  finalPrompt: string;
  webSearchData: string;
  emails: string;
  notes: string;
  professionalSummary: string;
}

const firstString = (...values: any[]): string => {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed && !/^(na|n\/a|null|undefined)$/i.test(trimmed)) return value;
  }
  return "";
};

export const extractGenerationInsights = (data: any): GenerationInsights => {
  const details = data?.details ?? data?.Details ?? {};
  const runtime =
    details?.runtimeReplacements ?? details?.RuntimeReplacements ?? {};

  return {
    finalPrompt: firstString(data?.finalPrompt, data?.FinalPrompt),
    webSearchData: firstString(
      data?.webSearchData,
      data?.WebSearchData,
      runtime?.search_output_summary,
    ),
    emails: firstString(
      data?.emails,
      data?.Emails,
      details?.useEmails,
      details?.UseEmails,
      runtime?.use_emails,
      runtime?.use_email,
    ),
    notes: firstString(
      data?.notes,
      data?.Notes,
      details?.notes,
      details?.Notes,
      runtime?.notes,
    ),
    professionalSummary: firstString(
      data?.professionalSummary,
      data?.ProfessionalSummary,
      details?.linkedinInfo,
      details?.LinkedinInfo,
      runtime?.linkedin_info,
      runtime?.professional_summary,
    ),
  };
};

export default extractGenerationInsights;
