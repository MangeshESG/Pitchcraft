export type DateFormatPreference = "DD-MM-YYYY" | "MM-DD-YYYY";
export type TimeFormatPreference = "24" | "12";

export interface DateTimePreferences {
  timeZone: string;
  timeZoneLabel?: string;
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
}

export const DEFAULT_DATE_TIME_PREFERENCES: DateTimePreferences = {
  timeZone: "Asia/Kolkata",
  timeZoneLabel: "(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi",
  dateFormat: "DD-MM-YYYY",
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

const parts = (value?: string | Date | null, includeTime = false) => {
  const date = parseDate(value);
  if (!date) return null;
  const preference = getDateTimePreferences();
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: preference.timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(includeTime
      ? { hour: "2-digit", minute: "2-digit", hour12: preference.timeFormat === "12" }
      : {}),
  }).formatToParts(date);
  return { preference, values: Object.fromEntries(values.map((item) => [item.type, item.value])) };
};

export const formatUserDate = (value?: string | Date | null, fallback = "-") => {
  const result = parts(value);
  if (!result) return fallback;
  const { day, month, year } = result.values;
  return result.preference.dateFormat === "MM-DD-YYYY"
    ? `${month}-${day}-${year}`
    : `${day}-${month}-${year}`;
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
  const { day, month, year, hour, minute, dayPeriod } = result.values;
  const date = result.preference.dateFormat === "MM-DD-YYYY"
    ? `${month}-${day}-${year}`
    : `${day}-${month}-${year}`;
  return `${date}, ${hour}:${minute}${dayPeriod ? ` ${dayPeriod}` : ""}`;
};
