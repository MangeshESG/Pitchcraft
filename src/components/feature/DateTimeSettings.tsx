import React, { useEffect, useState } from "react";
import API_BASE_URL from "../../config";
import {
  DateTimePreferences,
  DEFAULT_DATE_TIME_PREFERENCES,
  getDateTimePreferences,
  setDateTimePreferences,
} from "../common/dateTimePreferences";
import { timezoneOptions } from "./schedule/ScheduleTab";
import {
  bannerClass,
  cardClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  sectionClass,
} from "../common/settingsStyles";

const DateTimeSettings: React.FC<{ selectedClient: string }> = ({ selectedClient }) => {
  const [form, setForm] = useState<DateTimePreferences>(getDateTimePreferences());
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);

  useEffect(() => {
    if (!selectedClient) return;
    fetch(`${API_BASE_URL}/api/auth/date-time-settings/${selectedClient}`)
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (!data) return;
        const preferences = {
          ...DEFAULT_DATE_TIME_PREFERENCES,
          timeZone: data.timeZone || data.TimeZone || DEFAULT_DATE_TIME_PREFERENCES.timeZone,
          timeZoneLabel: data.timeZoneLabel || data.TimeZoneLabel,
          dateFormat: data.dateFormat || data.DateFormat || DEFAULT_DATE_TIME_PREFERENCES.dateFormat,
          timeFormat: data.timeFormat || data.TimeFormat || DEFAULT_DATE_TIME_PREFERENCES.timeFormat,
        } as DateTimePreferences;
        setForm(preferences);
        setDateTimePreferences(preferences);
      })
      .catch(() => undefined);
  }, [selectedClient]);

  const save = async () => {
    setSaving(true);
    setBanner(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/date-time-settings/${selectedClient}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error();
      setDateTimePreferences(form);
      setBanner({ type: "success", text: "Date and time settings saved." });
    } catch {
      setBanner({ type: "error", text: "Could not save date and time settings." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl">
      {banner && <div className={bannerClass(banner.type)}>{banner.text}</div>}

      <div className={`${sectionClass} mb-8`}>
        <div className={cardClass}>
          <div className="mb-4">
            <label className={labelClass}>Time zone</label>
            <select
              className={inputClass}
              value={form.timeZone}
              onChange={(event) => {
                const option = timezoneOptions.find((item) => item.iana === event.target.value);
                setForm({ ...form, timeZone: event.target.value, timeZoneLabel: option?.label });
              }}
            >
              {timezoneOptions.map((option) => (
                <option key={`${option.value}-${option.iana}`} value={option.iana}>{option.label}</option>
              ))}
            </select>
          </div>

          <fieldset className="mb-4">
            <legend className={labelClass}>Time format</legend>
            {([["24", "24 hours"], ["12", "12 hours"]] as const).map(([value, label]) => (
              <label className="mr-6 inline-flex items-center gap-2 text-sm text-[#374151]" key={value}>
                <input type="radio" className="accent-[#3f9f42]" checked={form.timeFormat === value}
                  onChange={() => setForm({ ...form, timeFormat: value })} /> {label}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend className={labelClass}>Date format</legend>
            {(["DD-MM-YYYY", "MM-DD-YYYY"] as const).map((value) => (
              <label className="mr-6 inline-flex items-center gap-2 text-sm text-[#374151]" key={value}>
                <input type="radio" className="accent-[#3f9f42]" checked={form.dateFormat === value}
                  onChange={() => setForm({ ...form, dateFormat: value })} /> {value}
              </label>
            ))}
          </fieldset>
        </div>
      </div>

      <div className={sectionClass}>
        <button onClick={save} disabled={saving || !selectedClient} className={primaryButtonClass}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
};

export default DateTimeSettings;
