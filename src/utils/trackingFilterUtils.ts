import API_BASE_URL from "../config";
import type { FilterCondition, FilterConditionContext, FilterGroup } from "../components/common/filterTypes";

export const TRACKING_OPEN_FIELD = "tracking_open";
export const TRACKING_CLICK_FIELD = "tracking_click";
export const ALL_CAMPAIGNS_ID = "__all__";

export const isTrackingField = (fieldKey?: string) =>
  fieldKey === TRACKING_OPEN_FIELD || fieldKey === TRACKING_CLICK_FIELD;

export const conditionRequiresCampaign = (condition: Pick<FilterCondition, "field">) =>
  isTrackingField(condition.field);

export const hasRequiredConditionContext = (
  condition: Pick<FilterCondition, "field" | "context">
) => {
  if (!conditionRequiresCampaign(condition)) {
    return true;
  }

  return Boolean(condition.context?.campaignId);
};

export interface CampaignOption {
  id: number | string;
  name: string;
}

interface CampaignEngagementIndex {
  sentContactIds: Set<string>;
  sentEmails: Set<string>;
  openedContactIds: Set<string>;
  openedEmails: Set<string>;
  clickedContactIds: Set<string>;
  clickedEmails: Set<string>;
}

const normalizeId = (value: any) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

const normalizeEmail = (value: any) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim().toLowerCase();
};

const addIdentifiers = (
  source: Record<string, any>,
  idKeys: string[],
  emailKeys: string[],
  idSet: Set<string>,
  emailSet: Set<string>
) => {
  idKeys.forEach((key) => {
    const normalized = normalizeId(source[key]);
    if (normalized) {
      idSet.add(normalized);
    }
  });

  emailKeys.forEach((key) => {
    const normalized = normalizeEmail(source[key]);
    if (normalized) {
      emailSet.add(normalized);
    }
  });
};

const createEmptyCampaignIndex = (): CampaignEngagementIndex => ({
  sentContactIds: new Set<string>(),
  sentEmails: new Set<string>(),
  openedContactIds: new Set<string>(),
  openedEmails: new Set<string>(),
  clickedContactIds: new Set<string>(),
  clickedEmails: new Set<string>(),
});

const fetchCampaignEmailLogs = async (clientId: number, campaignId: number) => {
  const url = new URL(`${API_BASE_URL}/api/Crm/getlogs`);
  url.searchParams.set("clientId", String(clientId));
  url.searchParams.set("campaignId", String(campaignId));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch email logs for campaign ${campaignId}`);
  }

  return response.json();
};

const fetchCampaignTrackingLogs = async (clientId: number, campaignId: number) => {
  const url = new URL(`${API_BASE_URL}/api/Crm/gettrackinglogs`);
  url.searchParams.set("clientId", String(clientId));
  url.searchParams.set("campaignId", String(campaignId));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Failed to fetch tracking logs for campaign ${campaignId}`);
  }

  return response.json();
};

const buildCampaignEngagementIndex = async (
  clientId: number,
  campaignId: number
): Promise<CampaignEngagementIndex> => {
  const [emailLogs, trackingLogs] = await Promise.all([
    fetchCampaignEmailLogs(clientId, campaignId),
    fetchCampaignTrackingLogs(clientId, campaignId),
  ]);

  const index = createEmptyCampaignIndex();

  (emailLogs || []).forEach((item: Record<string, any>) => {
    addIdentifiers(
      item,
      ["ContactId", "contactId"],
      ["ToEmail", "toEmail", "Email", "email"],
      index.sentContactIds,
      index.sentEmails
    );
  });

  (trackingLogs || []).forEach((item: Record<string, any>) => {
    const eventType = String(item.EventType || item.eventType || "").toLowerCase();
    if (!eventType) {
      return;
    }

    if (eventType === "open") {
      addIdentifiers(
        item,
        ["ContactId", "contactId"],
        ["Email", "email"],
        index.openedContactIds,
        index.openedEmails
      );
    }

    if (eventType === "click") {
      addIdentifiers(
        item,
        ["ContactId", "contactId"],
        ["Email", "email"],
        index.clickedContactIds,
        index.clickedEmails
      );
    }
  });

  return index;
};

export const getCampaignOptions = async (
  clientId: string | number
): Promise<CampaignOption[]> => {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/campaigns/client/${clientId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch campaigns");
  }

  const data = await response.json();
  const campaigns = (data || [])
    .filter((campaign: any) => campaign?.id != null)
    .map((campaign: any) => ({
      id: Number(campaign.id),
      name:
        campaign.campaignName ||
        campaign.name ||
        `Campaign ${campaign.id}`,
    }))
    .sort((left: CampaignOption, right: CampaignOption) =>
      left.name.localeCompare(right.name, undefined, { sensitivity: "base" })
    );

  return [
    { id: ALL_CAMPAIGNS_ID, name: "All campaigns" },
    ...campaigns,
  ];
};

const getCampaignIdFromContext = (
  context?: FilterConditionContext
): number | typeof ALL_CAMPAIGNS_ID | null => {
  const rawValue = context?.campaignId;
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return null;
  }

  if (String(rawValue) === ALL_CAMPAIGNS_ID) {
    return ALL_CAMPAIGNS_ID;
  }

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
};

export const buildTrackingIndexesForGroups = async (
  clientId: string | number,
  groups: FilterGroup[]
) => {
  const numericClientId = Number(clientId);
  if (!Number.isFinite(numericClientId)) {
    return new Map<number, CampaignEngagementIndex>();
  }

  const requestedCampaignIds = Array.from(
    new Set(
      groups.flatMap((group) =>
        (group.conditions || [])
          .filter((condition) => conditionRequiresCampaign(condition))
          .map((condition) => getCampaignIdFromContext(condition.context))
          .filter(
            (
              campaignId
            ): campaignId is number | typeof ALL_CAMPAIGNS_ID => campaignId !== null
          )
      )
    )
  );

  if (requestedCampaignIds.length === 0) {
    return new Map<number, CampaignEngagementIndex>();
  }

  const includesAllCampaigns = requestedCampaignIds.includes(ALL_CAMPAIGNS_ID);
  const campaignIds = includesAllCampaigns
    ? (await getCampaignOptions(numericClientId))
        .map((campaign) => Number(campaign.id))
        .filter((campaignId) => Number.isFinite(campaignId))
    : requestedCampaignIds.filter(
        (campaignId): campaignId is number => typeof campaignId === "number"
      );

  if (campaignIds.length === 0) {
    return new Map<number, CampaignEngagementIndex>();
  }

  const entries = await Promise.all(
    campaignIds.map(async (campaignId) => [
      campaignId,
      await buildCampaignEngagementIndex(numericClientId, campaignId),
    ] as const)
  );

  return new Map<number, CampaignEngagementIndex>(entries);
};

const setHasIdentifier = (
  idSet: Set<string>,
  emailSet: Set<string>,
  row: Record<string, any>
) => {
  const contactId = normalizeId(row.id ?? row.Id ?? row.contactId ?? row.ContactId);
  const email = normalizeEmail(row.email ?? row.Email ?? row.toEmail ?? row.ToEmail);

  return Boolean(
    (contactId && idSet.has(contactId)) || (email && emailSet.has(email))
  );
};

export const evaluateTrackingCondition = (
  row: Record<string, any>,
  condition: FilterCondition,
  campaignIndexes: Map<number, CampaignEngagementIndex>
) => {
  const campaignId = getCampaignIdFromContext(condition.context);
  if (!campaignId) {
    return false;
  }

  const indexesToEvaluate =
    campaignId === ALL_CAMPAIGNS_ID
      ? Array.from(campaignIndexes.values())
      : [campaignIndexes.get(campaignId)].filter(
          (campaignIndex): campaignIndex is CampaignEngagementIndex =>
            Boolean(campaignIndex)
        );

  if (indexesToEvaluate.length === 0) {
    return false;
  }

  const sentInCampaign = indexesToEvaluate.some((campaignIndex) =>
    setHasIdentifier(campaignIndex.sentContactIds, campaignIndex.sentEmails, row)
  );

  const eventOccurred = indexesToEvaluate.some((campaignIndex) =>
    condition.field === TRACKING_OPEN_FIELD
      ? setHasIdentifier(
          campaignIndex.openedContactIds,
          campaignIndex.openedEmails,
          row
        )
      : setHasIdentifier(
          campaignIndex.clickedContactIds,
          campaignIndex.clickedEmails,
          row
        )
  );

  const expectsPositive = String(condition.value).toLowerCase() === "true";
  const matches = expectsPositive
    ? eventOccurred
    : sentInCampaign && !eventOccurred;

  return condition.operator === "notEquals" ? !matches : matches;
};
