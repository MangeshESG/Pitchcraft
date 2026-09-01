import API_BASE_URL from "../config";

/**
 * Audience Assurance: the saved targeting briefs, the validation runs and
 * their results. Backed by `api/ContactValidation`.
 */

const BASE = `${API_BASE_URL}/api/ContactValidation`;

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
