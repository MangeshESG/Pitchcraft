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
  | "email_verification"
  | "data_enhancement";

export interface CheckTypeInfo {
  key: ValidationCheckType;
  label: string;
  description: string;
  requiresBrief: boolean;
  usesWebSearch: boolean;
  /** True for the one check that is told at run time which columns to work on. */
  requiresFields?: boolean;
}

/**
 * One column a Customisable Data Enhancement run can be pointed at.
 *
 * The list comes from the API rather than being assembled here, because the
 * keys have to be the ones a run will accept: a picker offering a column the
 * runner would silently drop is the failure that endpoint exists to prevent.
 */
export interface EnhancementField {
  /** `job_title`, or `custom:17` for a custom attribute. */
  key: string;
  label: string;
  /** What the column is for. Empty for a custom attribute. */
  description?: string;
  isCustom: boolean;
  customFieldId?: number | null;
  /** text | number | date | dropdown - a custom attribute's type. */
  fieldType?: string | null;
  /** A dropdown's permitted values. */
  options?: string[];
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
  /** The columns an enhancement run was pointed at. Empty for every other check. */
  targetFields?: string[];
  /** What the user typed into the run panel. */
  instructions?: string | null;
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
  /**
   * A contact column the check is allowed to correct, e.g. "job_title" - or,
   * for the enhancement check, `custom:17` for a custom attribute.
   */
  field: string;
  /**
   * What the column is called on screen, stored with the suggestion by the run
   * that made it. Only the enhancement check sets it: `custom:17` means
   * nothing to a grid cell, and the alternative is every cell loading the
   * client's field definitions to render one label.
   */
  label?: string | null;
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
  /**
   * The name this value arrives under on a contact row, which is not always
   * the field key: the four company columns are camel-cased by the API, so
   * `company_industry` is written to the row as `companyIndustry`. Patching a
   * row under the key instead would be a write that reports success and
   * changes nothing on screen.
   *
   * Null for a custom attribute, which has no column of its own on the row -
   * `customFieldName` is where that one lives.
   */
  columnKey?: string | null;
  value: string;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  /**
   * Set when the value went to a custom attribute rather than a contact
   * column. The grid keys a row's custom values by the attribute's name, so
   * that is what a row patch needs to find the cell that just changed.
   */
  customFieldId?: number | null;
  customFieldName?: string | null;
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

/**
 * How one suggestion names the column it is about.
 *
 * The label the run stored wins, because the enhancement check's columns can
 * be the client's own attributes and nothing compiled in here knows their
 * names. The four fixed checks never set it and fall through to the table
 * above, so their labels stay in one place.
 */
export const suggestionLabel = (suggestion: {
  field: string;
  label?: string | null;
}): string => suggestion.label?.trim() || suggestionFieldLabel(suggestion.field);

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
  data_enhancement: "dataEnhancementConfidence",
};

/**
 * A note that one check's score was set to 100 by a person rather than earned
 * by a run.
 */
export interface ManualScoreMark {
  /** When it was set. UTC, like every other stamp the API sends. */
  at?: string | null;
  /** Who set it, when the caller said. */
  by?: string | null;
}

/** Where the hand-set marks sit on a grid row. */
export const MANUAL_SCORES_ROW_KEY = "manualScores";

/**
 * Reads the hand-set marks off a row.
 *
 * Accepts both shapes for the same reason {@link parseSuggestions} does: the
 * grid endpoints send the column as the JSON string it is stored as, so it
 * cannot become a column of its own in the auto-generated table, while the
 * results endpoint sends it already parsed through MVC. Malformed JSON yields
 * no marks rather than taking the score cell down with it.
 */
export const parseManualScores = (
  raw: unknown
): Partial<Record<ValidationCheckType, ManualScoreMark>> => {
  const asObject = (value: unknown) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Partial<Record<ValidationCheckType, ManualScoreMark>>)
      : {};

  if (typeof raw !== "string") return asObject(raw);
  if (!raw.trim()) return {};

  try {
    return asObject(JSON.parse(raw));
  } catch {
    return {};
  }
};

/**
 * The row's marks with one more check recorded, as the JSON string the row
 * carries.
 *
 * This is what lets a grid patch the single row a user just overrode instead
 * of refetching the list: the server has stored the same thing, so the note in
 * the popover is right immediately rather than after the next reload.
 */
export const withManualScoreMark = (
  raw: unknown,
  checkType: ValidationCheckType,
  by?: string
): string =>
  JSON.stringify({
    ...parseManualScores(raw),
    [checkType]: { at: new Date().toISOString(), by: by ?? null },
  });

export const SUGGESTION_ROW_KEYS: Record<ValidationCheckType, string> = {
  contact_fit: "contactFitSuggestions",
  data_integrity: "dataIntegritySuggestions",
  live_contact: "liveContactSuggestions",
  email_verification: "emailValiditySuggestions",
  data_enhancement: "dataEnhancementSuggestions",
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
  dataEnhancementConfidence?: number | null;
  dataEnhancementComments?: string | null;
  dataEnhancementCheckedAt?: string | null;
  sources: ValidationSource[];
  contactFitSuggestions?: ValidationSuggestion[];
  dataIntegritySuggestions?: ValidationSuggestion[];
  liveContactSuggestions?: ValidationSuggestion[];
  emailValiditySuggestions?: ValidationSuggestion[];
  dataEnhancementSuggestions?: ValidationSuggestion[];
  isVerified: boolean;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  /** Which of the four scores were set by hand rather than earned by a run. */
  manualScores?: Partial<Record<ValidationCheckType, ManualScoreMark>>;
}

/**
 * One credit per ten contacts, rounded up — the same arithmetic the server
 * uses, repeated here so the run panel can show the cost before committing to
 * it rather than after.
 */
export const creditsForContacts = (
  count: number,
  checkType?: ValidationCheckType,
): number =>
  checkType === "email_verification"
    ? Math.max(0, count)
    : Math.max(0, Math.ceil(count / 10));

/**
 * What the panel says under the credit figure. Email discovery is priced
 * per contact because it runs the same four-stage unlock the extension does,
 * and the AI search stage inside it costs about what one unlock costs. It is
 * also the only check that charges as it goes rather than reserving up front,
 * so a contact it finds nothing for is never billed at all.
 */
export const creditNoteFor = (checkType?: ValidationCheckType): string =>
  checkType === "email_verification"
    ? "One credit per contact, charged only for contacts an address is found for."
    : "One credit per ten contacts. Credits for contacts that come back with no result are refunded when the run finishes.";

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

/**
 * The columns a Customisable Data Enhancement run can be pointed at: the
 * contact's own, then this client's custom attributes, in the order they
 * arranged them.
 */
export const fetchEnhancementFields = async (
  clientId: string | number
): Promise<EnhancementField[]> => {
  const json = await readJson(
    await fetch(`${BASE}/enhancement-fields?clientId=${clientId}`),
    "The column list could not be loaded"
  );

  return Array.isArray(json?.fields) ? json.fields : [];
};

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
  /** Enhancement only: the columns to fill or check. */
  fields?: string[];
  /** Enhancement only: what the user asked for, in their own words. */
  instructions?: string | null;
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

/**
 * Applies every correction this check still has pending on one contact, in one
 * call.
 *
 * The single-suggestion endpoint is still the normal path: a correction is a
 * write to a customer record, and each one deserves to be read first. This is
 * for the case that stops being reasonable - an enhancement run asked for eight
 * columns comes back with eight proposals, the user reads them once, and
 * clicking Accept eight times is eight round trips re-patching the same row.
 *
 * The server applies them one at a time through the same checks, so anything it
 * could not write is reported and left pending rather than failing the rest.
 */
export const acceptAllSuggestions = async (
  clientId: string | number,
  contactId: number,
  checkType: ValidationCheckType,
  resolvedBy?: string
): Promise<{
  message: string;
  applied: AppliedSuggestion[];
  suggestions: ValidationSuggestion[];
}> => {
  const json = await postJson(
    `${BASE}/suggestions/accept-all`,
    { clientId: Number(clientId), contactId, checkType, resolvedBy },
    "The corrections could not be applied"
  );

  return {
    message: json?.message ?? "Done.",
    applied: Array.isArray(json?.applied) ? json.applied : [],
    suggestions: Array.isArray(json?.suggestions) ? json.suggestions : [],
  };
};

/**
 * Applies every pending correction one check holds, across a whole selection
 * of contacts, in one call.
 *
 * {@link acceptAllSuggestions} is the same action on one contact, and stays
 * the normal path — a correction is a write to a customer record, and each one
 * deserves to be read. This is for after that reading has happened at the
 * level of the run rather than the row: an enhancement run over a list comes
 * back with a proposal on nearly every contact, and once the user has decided
 * the run was good, accepting them one at a time is the same decision typed
 * out several hundred times.
 *
 * A contact with nothing pending is skipped rather than failing the request,
 * so the counts in the reply are what actually happened, not what was asked
 * for.
 */
export const acceptAllSuggestionsBulk = async (
  clientId: string | number,
  contactIds: number[],
  checkType: ValidationCheckType,
  resolvedBy?: string
): Promise<{
  message: string;
  /** Corrections written, counted across every contact. */
  appliedCount: number;
  /** Proposals that no longer name a writable column, and stay pending. */
  refusedCount: number;
  contactsUpdated: number;
}> => {
  const json = await postJson(
    `${BASE}/suggestions/accept-all-bulk`,
    { clientId: Number(clientId), contactIds, checkType, resolvedBy },
    "The corrections could not be applied"
  );

  return {
    message: json?.message ?? "Done.",
    appliedCount: Number(json?.appliedCount ?? 0),
    refusedCount: Number(json?.refusedCount ?? 0),
    contactsUpdated: Number(json?.contactsUpdated ?? 0),
  };
};

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
 * Sets one check's score to 100 across many contacts at once.
 *
 * The bulk update panel's version of {@link verifyCheckScore}: one check, many
 * contacts, where {@link markVerified} is the other axis — many checks, one
 * contact at a time. A user working down a single column who can see that
 * fifty rows are fine is making one judgement about one check, and should not
 * have to claim the other three were checked to record it.
 */
export const verifyCheckScores = async (
  clientId: string | number,
  contactIds: number[],
  checkType: ValidationCheckType,
  verifiedBy?: string
): Promise<string> => {
  const json = await postJson(
    `${BASE}/score/verify-bulk`,
    { clientId: Number(clientId), contactIds, checkType, verifiedBy },
    "The scores could not be set"
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
