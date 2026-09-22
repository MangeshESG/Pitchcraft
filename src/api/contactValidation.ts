/**
 * Audience Assurance: the saved targeting briefs, the validation runs and
 * their results. Backed by `api/ContactValidation`, which lives in the same
 * API that serves this app -- so contact fit, data integrity, live contact and
 * email discovery all go to the host that loaded the page.
 */
import API_BASE_URL from "../config";

const BASE = `${API_BASE_URL}/api/ContactValidation`;

/**
 * Reads a timestamp the API sent as UTC without saying so.
 *
 * These columns are datetime2, which carries no offset, so a UTC value
 * serialises as "2026-09-02T19:24:00" and `new Date` would read it as local
 * time - showing a run five and a half hours out in India and eight hours out
 * in California. Stamping the Z back on is what keeps the run log honest about
 * when something actually happened.
 */
export const parseApiDate = (value: string): Date =>
  new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`);

// ---------------------------------------------------------------- types

export type ValidationCheckType =
  | "contact_fit"
  | "data_integrity"
  | "live_contact"
  | "email_verification";

export interface CheckTypeInfo {
  key: ValidationCheckType;
  label: string;
  description: string;
  requiresBrief: boolean;
  usesWebSearch: boolean;
}

export interface ContactFitBrief {
  id: number;
  name: string;
  briefText: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export type ValidationJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "partial"
  | "failed";

export interface ValidationJob {
  id: number;
  checkType: ValidationCheckType;
  status: ValidationJobStatus;
  briefId?: number | null;
  modelName?: string | null;
  provider?: string | null;
  contactCount: number;
  processedCount: number;
  failedCount: number;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  totalTokens: number;
  /** Actual searches performed. This, not the contact count, is what a run costs. */
  webSearchCalls: number;
  calculatedCost: number;
  creditsCharged: number;
  elapsedMs: number;
  errorMessage?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  isFinished: boolean;
}

export interface ValidationSource {
  label: string;
  url: string;
}

/**
 * A correction one check offered for one field.
 *
 * The comments say what is wrong in prose; this says what the value should be,
 * in a shape a button can act on. Three of the four checks produce them from a
 * model; email validity builds its own from whatever Prospeo or Hunter
 * returned, with no model involved.
 */
export interface ValidationSuggestion {
  /** Stable within one check result; posted back so the server resolves the right one. */
  id: string;
  /** A contact column the check is allowed to correct, e.g. "job_title". */
  field: string;
  /** What the record said when the check ran. */
  current?: string | null;
  suggested: string;
  /** The evidence behind the correction. The server drops any suggestion without one. */
  reason?: string | null;
  status: "pending" | "accepted" | "dismissed";
  resolvedAt?: string | null;
  resolvedBy?: string | null;
}

/** What the contact row now holds, after a suggestion was accepted. */
export interface AppliedSuggestion {
  field: string;
  value: string;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

/**
 * How each correctable field is named in the UI, and which contact column it
 * writes. The column names are what the grid rows are keyed by, so a row can
 * be patched in place from an accepted suggestion without refetching it.
 *
 * Kept in step with ValidationSuggestionFields on the server — that list is
 * what decides which writes are actually allowed; this one only labels them.
 */
export const SUGGESTION_FIELDS: Record<string, { label: string; column: string }> = {
  full_name: { label: "Name", column: "full_name" },
  job_title: { label: "Job title", column: "job_title" },
  company_name: { label: "Company", column: "company_name" },
  email: { label: "Email", column: "email" },
  website: { label: "Website", column: "website" },
  country_or_address: { label: "Location", column: "country_or_address" },
  linkedin_url: { label: "LinkedIn URL", column: "linkedin_url" },
};

export const suggestionFieldLabel = (field: string): string =>
  SUGGESTION_FIELDS[field]?.label ?? field;

/**
 * Where each check's corrections sit on a grid row.
 *
 * The four are kept apart all the way through: a suggestion id is only unique
 * within one check's list, so accepting one has to say which check it came
 * from, and the grid shows each check's corrections beside its own score.
 */
export const VALIDATION_SCORE_KEYS: Record<ValidationCheckType, string> = {
  contact_fit: "contactFitConfidence",
  data_integrity: "dataIntegrityConfidence",
  live_contact: "liveContactConfidence",
  email_verification: "emailValidityConfidence",
};

export const SUGGESTION_ROW_KEYS: Record<ValidationCheckType, string> = {
  contact_fit: "contactFitSuggestions",
  data_integrity: "dataIntegritySuggestions",
  live_contact: "liveContactSuggestions",
  email_verification: "emailValiditySuggestions",
};

/**
 * Reads the suggestions blob. The grid endpoints send it as the JSON string it
 * is stored as — sending an array would make it a column candidate in the
 * auto-generated grid — while the results endpoint sends it already parsed.
 * Malformed JSON yields none rather than taking the score cell down with it.
 */
export const parseSuggestions = (raw: unknown): ValidationSuggestion[] => {
  if (Array.isArray(raw)) return raw as ValidationSuggestion[];
  if (typeof raw !== "string" || !raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export interface ContactValidationResult {
  contactId: number;
  contactFitConfidence?: number | null;
  contactFitComments?: string | null;
  contactFitBriefId?: number | null;
  contactFitCheckedAt?: string | null;
  dataIntegrityConfidence?: number | null;
  dataIntegrityComments?: string | null;
  dataIntegrityCheckedAt?: string | null;
  liveContactConfidence?: number | null;
  liveContactComments?: string | null;
  liveContactCheckedAt?: string | null;
  emailValidityConfidence?: number | null;
  emailValidityStatus?: string | null;
  emailValiditySource?: string | null;
  emailValidityComments?: string | null;
  emailCheckedAt?: string | null;
  sources: ValidationSource[];
  contactFitSuggestions?: ValidationSuggestion[];
  dataIntegritySuggestions?: ValidationSuggestion[];
  liveContactSuggestions?: ValidationSuggestion[];
  emailValiditySuggestions?: ValidationSuggestion[];
  isVerified: boolean;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
}

/**
 * One credit per ten contacts, rounded up — the same arithmetic the server
 * uses, repeated here so the run panel can show the cost before committing to
 * it rather than after.
 */
export const creditsForContacts = (count: number): number =>
  Math.max(0, Math.ceil(count / 10));

// ---------------------------------------------------------------- helpers

/**
 * The API answers `{ success, message }` on a refusal — no brief chosen, not
 * enough credit — and that message is written for the user, so it is surfaced
 * rather than replaced with a status code.
 */
const readJson = async (res: Response, fallback: string) => {
  let json: any = null;

  try {
    json = await res.json();
  } catch {
    /* an empty or non-JSON body falls through to the status-code message */
  }

  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `${fallback} (${res.status})`);
  }

  return json;
};

const postJson = async (url: string, body: unknown, fallback: string) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return readJson(res, fallback);
};

// ------------------------------------------------------- admin tuning

/**
 * The tuning values behind a run, as the admin page shows them. The bounds
 * come from the API rather than being repeated here, so the field can never
 * offer a number the server would refuse.
 */
export interface ValidationSettings {
  /** Contacts sent in one model request. */
  batchSize: number;
  defaultBatchSize: number;
  minBatchSize: number;
  maxBatchSize: number;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export const fetchValidationSettings = async (): Promise<ValidationSettings> => {
  const json = await readJson(
    await fetch(`${BASE}/settings`),
    "Validation settings could not be loaded"
  );

  return {
    batchSize: Number(json?.batchSize) || 50,
    defaultBatchSize: Number(json?.defaultBatchSize) || 50,
    minBatchSize: Number(json?.minBatchSize) || 1,
    maxBatchSize: Number(json?.maxBatchSize) || 200,
    updatedAt: json?.updatedAt ?? null,
    updatedBy: json?.updatedBy ?? null,
  };
};

/** Returns the message the API wrote, which says what was actually stored. */
export const saveValidationBatchSize = async (
  batchSize: number,
  updatedBy: number
): Promise<{ batchSize: number; message: string }> => {
  const json = await postJson(
    `${BASE}/settings/batch-size`,
    { batchSize, updatedBy },
    "The batch size could not be saved"
  );

  return {
    batchSize: Number(json?.batchSize) || batchSize,
    message: json?.message ?? "Saved.",
  };
};

// ---------------------------------------------------------------- briefs

export const fetchBriefs = async (
  clientId: string | number
): Promise<ContactFitBrief[]> => {
  const json = await readJson(
    await fetch(`${BASE}/briefs?clientId=${clientId}`),
    "Briefs could not be loaded"
  );

  return Array.isArray(json?.briefs) ? json.briefs : [];
};

export const saveBrief = async (
  clientId: string | number,
  brief: {
    id?: number;
    name: string;
    briefText: string;
    isDefault: boolean;
    updatedBy?: string;
  }
): Promise<ContactFitBrief> => {
  const json = await postJson(
    `${BASE}/briefs`,
    { ...brief, id: brief.id ?? 0, clientId: Number(clientId) },
    "The brief could not be saved"
  );

  return json.brief;
};

export const setDefaultBrief = async (
  clientId: string | number,
  briefId: number
): Promise<void> => {
  await postJson(
    `${BASE}/briefs/set-default?clientId=${clientId}&briefId=${briefId}`,
    {},
    "The default could not be changed"
  );
};

export const deleteBrief = async (
  clientId: string | number,
  briefId: number
): Promise<void> => {
  await postJson(
    `${BASE}/briefs/delete/${briefId}?clientId=${clientId}`,
    {},
    "The brief could not be deleted"
  );
};

// ------------------------------------------------------------------ runs

export const fetchCheckTypes = async (): Promise<CheckTypeInfo[]> => {
  const json = await readJson(
    await fetch(`${BASE}/check-types`),
    "The check list could not be loaded"
  );

  return Array.isArray(json?.checkTypes) ? json.checkTypes : [];
};

export const runValidation = async (request: {
  clientId: string | number;
  checkType: ValidationCheckType;
  contactIds: number[];
  briefId?: number | null;
  requestedBy?: string;
}): Promise<ValidationJob> => {
  const json = await postJson(
    `${BASE}/run`,
    { ...request, clientId: Number(request.clientId) },
    "The validation run could not be started"
  );

  return json.job;
};

export const fetchJob = async (
  clientId: string | number,
  jobId: number
): Promise<ValidationJob> => {
  const json = await readJson(
    await fetch(`${BASE}/job/${jobId}?clientId=${clientId}`),
    "The run status could not be loaded"
  );

  return json.job;
};

export const fetchJobs = async (
  clientId: string | number,
  take = 50
): Promise<ValidationJob[]> => {
  const json = await readJson(
    await fetch(`${BASE}/jobs?clientId=${clientId}&take=${take}`),
    "The run history could not be loaded"
  );

  return Array.isArray(json?.jobs) ? json.jobs : [];
};

// --------------------------------------------------------------- results

export const fetchValidationResults = async (
  clientId: string | number,
  contactIds?: number[]
): Promise<ContactValidationResult[]> => {
  const query = contactIds?.length ? `&contactIds=${contactIds.join(",")}` : "";

  const json = await readJson(
    await fetch(`${BASE}/results?clientId=${clientId}${query}`),
    "Validation results could not be loaded"
  );

  return Array.isArray(json?.results) ? json.results : [];
};

export const markVerified = async (
  clientId: string | number,
  contactIds: number[],
  isVerified: boolean,
  verifiedBy?: string
): Promise<string> => {
  const json = await postJson(
    `${BASE}/mark-verified`,
    { clientId: Number(clientId), contactIds, isVerified, verifiedBy },
    "The contacts could not be marked"
  );

  return json.message ?? "Done.";
};

// ----------------------------------------------------- suggestions

export interface ResolveSuggestionResponse {
  message: string;
  /** Present on accept only: the value the contact now holds. */
  applied?: AppliedSuggestion | null;
  /** The contact's full suggestion list, with this one resolved. */
  suggestions: ValidationSuggestion[];
}

const resolveSuggestion = async (
  action: "accept" | "dismiss",
  clientId: string | number,
  contactId: number,
  checkType: ValidationCheckType,
  suggestionId: string,
  resolvedBy?: string
): Promise<ResolveSuggestionResponse> => {
  const json = await postJson(
    `${BASE}/suggestions/${action}`,
    { clientId: Number(clientId), contactId, checkType, suggestionId, resolvedBy },
    action === "accept"
      ? "The correction could not be applied"
      : "The suggestion could not be dismissed"
  );

  return {
    message: json?.message ?? "Done.",
    applied: json?.applied ?? null,
    suggestions: Array.isArray(json?.suggestions) ? json.suggestions : [],
  };
};

/**
 * Writes one suggested correction to the contact and marks it accepted.
 *
 * The server does both in one save and sends back the value it stored, so the
 * caller patches the single row it has on screen rather than refetching the
 * list — accepting a name fix on row 40 of 500 should not scroll the user back
 * to the top.
 */
export const acceptSuggestion = (
  clientId: string | number,
  contactId: number,
  checkType: ValidationCheckType,
  suggestionId: string,
  resolvedBy?: string
): Promise<ResolveSuggestionResponse> =>
  resolveSuggestion("accept", clientId, contactId, checkType, suggestionId, resolvedBy);

/** Marks a suggestion dismissed. The contact is not touched. */
export const dismissSuggestion = (
  clientId: string | number,
  contactId: number,
  checkType: ValidationCheckType,
  suggestionId: string,
  resolvedBy?: string
): Promise<ResolveSuggestionResponse> =>
  resolveSuggestion("dismiss", clientId, contactId, checkType, suggestionId, resolvedBy);

// ------------------------------------------------- single-score override

/**
 * Sets one check's score to 100, for a user overruling that verdict alone.
 *
 * Narrower than {@link markVerified}, which speaks for the whole contact and
 * raises all four checks. Someone who disagrees with a data integrity score is
 * not thereby claiming the email address was validated.
 */
export const verifyCheckScore = async (
  clientId: string | number,
  contactId: number,
  checkType: ValidationCheckType,
  verifiedBy?: string
): Promise<string> => {
  const json = await postJson(
    `${BASE}/score/verify`,
    { clientId: Number(clientId), contactId, checkType, verifiedBy },
    "The score could not be set"
  );

  return json?.message ?? "Done.";
};

/**
 * Deletes one contact outright.
 *
 * Lives here rather than in a CRM module because the only thing that calls it
 * is the Audience Assurance cell — the point of the action is "this record is
 * junk, and the score is how I found out". It posts to the same CRM endpoint
 * the rest of the app deletes through.
 */
export const deleteContact = async (contactId: number): Promise<void> => {
  await postJson(
    `${API_BASE_URL}/api/Crm/delete-Datafile-contact?contactId=${contactId}`,
    {},
    "The contact could not be deleted"
  );
};
