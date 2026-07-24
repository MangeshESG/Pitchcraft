import React, { useEffect, useState } from "react";
import API_BASE_URL from "../../config";
import {
  DateTimePreferences,
  DEFAULT_DATE_TIME_PREFERENCES,
  getDateTimePreferences,
  setDateTimePreferences,
} from "../common/dateTimePreferences";
import { timezoneOptions } from "./schedule/ScheduleTab";

const DateTimeSettings: React.FC<{ selectedClient: string }> = ({ selectedClient }) => {
  const [form, setForm] = useState<DateTimePreferences>(getDateTimePreferences());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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
    setMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/date-time-settings/${selectedClient}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error();
      setDateTimePreferences(form);
      setMessage("Date and time settings saved.");
    } catch {
      setMessage("Could not save date and time settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl p-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-6 text-lg font-semibold text-gray-900">Date and Time</h2>
        <label className="mb-2 block text-sm font-medium text-gray-700">Time zone</label>
        <select
          className="mb-6 w-full rounded-lg border border-gray-300 px-3 py-2"
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

        <fieldset className="mb-6">
          <legend className="mb-2 text-sm font-medium text-gray-700">Time format</legend>
          {([["24", "24 hours"], ["12", "12 hours"]] as const).map(([value, label]) => (
            <label className="mr-6 inline-flex items-center gap-2 text-sm" key={value}>
              <input type="radio" checked={form.timeFormat === value}
                onChange={() => setForm({ ...form, timeFormat: value })} /> {label}
            </label>
          ))}
        </fieldset>

        <fieldset className="mb-6">
          <legend className="mb-2 text-sm font-medium text-gray-700">Date format</legend>
          {(["DD-MM-YYYY", "MM-DD-YYYY"] as const).map((value) => (
            <label className="mr-6 inline-flex items-center gap-2 text-sm" key={value}>
              <input type="radio" checked={form.dateFormat === value}
                onChange={() => setForm({ ...form, dateFormat: value })} /> {value}
            </label>
          ))}
        </fieldset>
        <button onClick={save} disabled={saving || !selectedClient}
          className="rounded-lg bg-[#3f9f42] px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
          {saving ? "Saving..." : "Save"}
        </button>
        {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}
      </div>
    </div>
  );
};

export default DateTimeSettings;
