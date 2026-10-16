export type DateFormatPreference = "DD MMM YYYY" | "DD-MM-YYYY" | "MM-DD-YYYY";
export type TimeFormatPreference = "24" | "12";

export interface DateTimePreferences {
  timeZone: string;
  timeZoneLabel?: string;
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
}

export const getLocalTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export const getLocalTimeZoneLabel = (): string => `Local (${getLocalTimeZone()})`;

export const DEFAULT_DATE_TIME_PREFERENCES: DateTimePreferences = {
  timeZone: getLocalTimeZone(),
  timeZoneLabel: getLocalTimeZoneLabel(),
  // A month name reads the same to everyone, so it is what a new account
  // gets. An account that has explicitly chosen one of the numeric formats
  // keeps it — this only fills the gap when nothing is stored.
  dateFormat: "DD MMM YYYY",
  timeFormat: "24",
};

const STORAGE_KEY = "pitchcraft.dateTimePreferences";

export const getDateTimePreferences = (): DateTimePreferences => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...DEFAULT_DATE_TIME_PREFERENCES, ...saved };
  } catch {
    return DEFAULT_DATE_TIME_PREFERENCES;
  }
};

export const setDateTimePreferences = (preferences: DateTimePreferences) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent("dateTimePreferencesChanged", { detail: preferences }));
};

const parseDate = (value?: string | Date | null) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parts = (
  value?: string | Date | null,
  includeTime = false,
  includeSeconds = false
) => {
  const date = parseDate(value);
  if (!date) return null;
  const preference = getDateTimePreferences();
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: preference.timeZone,
    day: "2-digit",
    month: preference.dateFormat === "DD MMM YYYY" ? "short" : "2-digit",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
          ...(includeSeconds ? { second: "2-digit" as const } : {}),
          hour12: preference.timeFormat === "12",
        }
      : {}),
  }).formatToParts(date);
  return { preference, values: Object.fromEntries(values.map((item) => [item.type, item.value])) };
};

// The date half on its own, in whichever layout the account has chosen.
const datePart = (
  preference: DateTimePreferences,
  values: Record<string, string>
) => {
  const { day, month, year } = values;
  if (preference.dateFormat === "DD MMM YYYY") return `${day} ${month} ${year}`;
  return preference.dateFormat === "MM-DD-YYYY"
    ? `${month}-${day}-${year}`
    : `${day}-${month}-${year}`;
};

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// For a calendar day that is already in the account's time zone and has no
// instant behind it — a day picked in a filter, a chart's day bucket. Going
// through a Date would only invite it to shift.
export const formatUserDateNumbers = (year: number, month: number, day: number) => {
  const preference = getDateTimePreferences();
  return datePart(preference, {
    year: String(year),
    month:
      preference.dateFormat === "DD MMM YYYY"
        ? SHORT_MONTHS[month - 1] ?? String(month)
        : String(month).padStart(2, "0"),
    day: String(day).padStart(2, "0"),
  });
};

// A clock reading that is already in the account's time zone, in whichever of
// 12- or 24-hour it has chosen.
export const formatUserClock = (hour: number, minute: number) => {
  const mm = String(minute).padStart(2, "0");
  if (getDateTimePreferences().timeFormat !== "12") {
    return `${String(hour).padStart(2, "0")}:${mm}`;
  }
  const h12 = hour % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${mm} ${hour >= 12 ? "PM" : "AM"}`;
};

// The date-fns pattern matching the account's choice, for date pickers.
export const userDateFnsPattern = () => {
  switch (getDateTimePreferences().dateFormat) {
    case "DD MMM YYYY": return "dd MMM yyyy";
    case "MM-DD-YYYY": return "MM-dd-yyyy";
    default: return "dd-MM-yyyy";
  }
};

export const formatUserDate = (value?: string | Date | null, fallback = "-") => {
  const result = parts(value);
  if (!result) return fallback;
  return datePart(result.preference, result.values);
};

export const formatUserTime = (value?: string | Date | null, fallback = "-") => {
  const result = parts(value, true);
  if (!result) return fallback;
  const { hour, minute, dayPeriod } = result.values;
  return `${hour}:${minute}${dayPeriod ? ` ${dayPeriod}` : ""}`;
};

export const formatUserDateTime = (value?: string | Date | null, fallback = "-") => {
  const result = parts(value, true);
  if (!result) return fallback;
  const { hour, minute, dayPeriod } = result.values;
  const date = datePart(result.preference, result.values);
  return `${date}, ${hour}:${minute}${dayPeriod ? ` ${dayPeriod}` : ""}`;
};

/* A run log is read line by line while the run is still going, and several
   entries can land inside the same minute, so its stamps keep the seconds that
   the screen formats elsewhere drop. The account's time zone, date layout and
   12-/24-hour choice still apply. */

export const formatUserDateTimeWithSeconds = (value?: string | Date | null, fallback = "-") => {
  const result = parts(value, true, true);
  if (!result) return fallback;
  const { hour, minute, second, dayPeriod } = result.values;
  const date = datePart(result.preference, result.values);
  return `${date}, ${hour}:${minute}:${second}${dayPeriod ? ` ${dayPeriod}` : ""}`;
};

/* A download is read by other software — Excel, a CRM, a script — rather than
   by a person, so it carries the sortable ISO form whatever the screen is set
   to. The account's time zone still applies, so the day in the file is the day
   that was on the screen. */

const isoParts = (value?: string | Date | null) => {
  const date = parseDate(value);
  if (!date) return null;
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: getDateTimePreferences().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    // h23, not hour12:false — the latter renders midnight as "24" in some engines.
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(values.map((item) => [item.type, item.value]));
};

export const formatIsoDate = (value?: string | Date | null, fallback = "") => {
  const v = isoParts(value);
  return v ? `${v.year}-${v.month}-${v.day}` : fallback;
};

export const formatIsoDateTime = (value?: string | Date | null, fallback = "") => {
  const v = isoParts(value);
  return v ? `${v.year}-${v.month}-${v.day} ${v.hour}:${v.minute}:${v.second}` : fallback;
};
