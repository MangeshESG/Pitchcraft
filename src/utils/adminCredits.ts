import { getAsSuperAdmin, postAsSuperAdmin } from "./superAdminRequest";

/**
 * Adding and removing credits from the admin page.
 *
 * Two buckets sit behind one balance. "Plan" credit is what a subscription
 * grants each month and is what the monthly limit applies to; "custom" credit
 * is granted by hand here and is only spent once the monthly allowance is
 * used up. Adding always lands in custom; removing takes custom first, so a
 * grant handed to the wrong account comes back off cleanly.
 */

/**
 * The API's plan id for a hand-granted top-up, which it stores as the plan
 * name "Internal".
 *
 * Not "Custom Credit", which is what the Stripe payment path writes on a real
 * credit purchase. Both ids spend identically — the API treats "Custom Credit"
 * and "Internal" as one bucket everywhere — but `Plane` is surfaced as the
 * plan name in the client's own billing history, so a grant sent as "Custom
 * Credit" would sit among their purchases as a $0.00 line.
 */
const INTERNAL_CREDIT_PLAN = "Jdnkdomd8585dkbsdhhnLNDKmm4&^^588400755%";

export interface ClientCreditBalance {
  /** Plan credit remaining. */
  totalCredit: number;
  /** Credits the plan allows per month. */
  monthlyLimit: number;
  /** Plan credit spent this month, against monthlyLimit. */
  limitUsed: number;
  /** Custom credit remaining. */
  customLimit: number;
  /** Custom credit spent. */
  customCreditUsed: number;
}

export interface ReduceCreditsOutcome {
  message: string;
  removedFromCustom: number;
  removedFromPlan: number;
  remainingCustom: number;
  remainingPlan: number;
}

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const fetchClientCredits = async (
  clientId: number,
): Promise<ClientCreditBalance> => {
  const json = await getAsSuperAdmin<any>(
    `/api/crm/Check_credit?clientId=${clientId}`,
    "Could not load this client's balance.",
  );

  return {
    totalCredit: toNumber(json?.totalCredit ?? json?.TotalCredit),
    monthlyLimit: toNumber(json?.monthlyLimit ?? json?.MonthlyLimit),
    limitUsed: toNumber(json?.limitUsed ?? json?.LimitUsed),
    customLimit: toNumber(json?.customLimit ?? json?.CustomLimit),
    customCreditUsed: toNumber(json?.customCreditUsed ?? json?.CustomCreditUsed),
  };
};

export const addUserCredits = async (
  clientId: number,
  credits: number,
): Promise<void> => {
  await postAsSuperAdmin(
    "/api/stripe/save-user-credits",
    { userId: clientId, planId: INTERNAL_CREDIT_PLAN, creditsCount: credits },
    "Could not add the credits.",
  );
};

export const reduceUserCredits = async (
  clientId: number,
  credits: number,
  reason: string,
): Promise<ReduceCreditsOutcome> => {
  const json = await postAsSuperAdmin<any>(
    "/api/stripe/admin/reduce-user-credits",
    { userId: clientId, creditsCount: credits, reason: reason.trim() || null },
    "Could not remove the credits.",
  );

  return {
    message: json?.message ?? json?.Message ?? "Credits removed.",
    removedFromCustom: toNumber(json?.removedFromCustom ?? json?.RemovedFromCustom),
    removedFromPlan: toNumber(json?.removedFromPlan ?? json?.RemovedFromPlan),
    remainingCustom: toNumber(json?.remainingCustom ?? json?.RemainingCustom),
    remainingPlan: toNumber(json?.remainingPlan ?? json?.RemainingPlan),
  };
};
