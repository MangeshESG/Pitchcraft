import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ValidationJob, fetchJobs, parseApiDate } from "../../../api/contactValidation";
import { bannerClass, cardClass, hintClass } from "../../common/settingsStyles";

interface ValidationJobLogProps {
  selectedClient: string;
}

const CHECK_LABELS: Record<string, string> = {
  contact_fit: "Contact fit",
  data_integrity: "Data integrity",
  live_contact: "Live contact",
  email_verification: "Email verification",
};

const STATUS_STYLES: Record<string, string> = {
  completed: "border-[#d5f0da] bg-[#f1f8f2] text-[#2d7a30]",
  partial: "border-[#fde68a] bg-[#fefce8] text-[#a16207]",
  failed: "border-red-200 bg-red-50 text-red-700",
  running: "border-blue-200 bg-blue-50 text-blue-700",
  queued: "border-[#e8eaee] bg-[#f8f9fa] text-[#6b7280]",
};

const formatDate = (value: string) =>
  parseApiDate(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * What every validation run consumed and what it cost.
 *
 * This is the table the searches-per-100 figure comes out of. Web search is
 * charged per call and a batch may need none or ten, so the cost of the
 * feature cannot be modelled in advance — it has to be read back off real
 * runs, which is what makes this log the basis for credit pricing rather than
 * a diagnostic curiosity.
 */
const ValidationJobLog: React.FC<ValidationJobLogProps> = ({ selectedClient }) => {
  const [jobs, setJobs] = useState<ValidationJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!selectedClient) return;

    setIsLoading(true);
    setError(null);

    try {
      setJobs(await fetchJobs(selectedClient, 100));
    } catch (loadError: any) {
      setError(loadError?.message ?? "The run history could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedClient]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Averages per 100 contacts across finished runs, which is the unit the
   * economics are actually reasoned about in.
   */
  const summary = useMemo(() => {
    const finished = jobs.filter((j) => j.processedCount > 0);
    const contacts = finished.reduce((sum, j) => sum + j.processedCount, 0);

    if (contacts === 0) return null;

    const searches = finished.reduce((sum, j) => sum + j.webSearchCalls, 0);
    const cost = finished.reduce((sum, j) => sum + j.calculatedCost, 0);
    const tokens = finished.reduce((sum, j) => sum + j.totalTokens, 0);

    return {
      contacts,
      searchesPer100: (searches / contacts) * 100,
      costPer100: (cost / contacts) * 100,
      tokensPer100: Math.round((tokens / contacts) * 100),
    };
  }, [jobs]);

  return (
    <div className="max-w-5xl">
      {error && <div className={bannerClass("error")}>{error}</div>}

      {summary && (
        <div className={`${cardClass} mb-6`}>
          <h2 className="text-[15px] font-semibold text-[#0b1220]">Cost per 100 contacts</h2>
          <p className={hintClass}>
            Averaged over {summary.contacts.toLocaleString()} validated contacts.
            Web searches drive the cost, so that is the number to watch.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-4">
            {[
              { label: "Web searches", value: summary.searchesPer100.toFixed(1) },
              { label: "Tokens", value: summary.tokensPer100.toLocaleString() },
              { label: "Cost", value: `$${summary.costPer100.toFixed(3)}` },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-[#eef0f3] bg-[#fafbfc] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280]">
                  {stat.label}
                </div>
                <div className="mt-1 text-[22px] font-semibold text-[#0b1220]">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={cardClass}>
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[#0b1220]">Validation runs</h2>
          <button
            className="text-[13px] font-medium text-[#3f9f42]"
            onClick={load}
            disabled={isLoading}
          >
            {isLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="border-b border-[#eef0f3] text-left text-[11px] uppercase tracking-wide text-[#6b7280]">
                <th className="py-2 pr-3 font-semibold">When</th>
                <th className="py-2 pr-3 font-semibold">Check</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 text-right font-semibold">Contacts</th>
                <th className="py-2 pr-3 text-right font-semibold">Searches</th>
                <th className="py-2 pr-3 text-right font-semibold">Tokens</th>
                <th className="py-2 pr-3 text-right font-semibold">Cost</th>
                <th className="py-2 text-right font-semibold">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f4f5f7]">
              {jobs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-[#6b7280]">
                    No validation runs yet.
                  </td>
                </tr>
              )}

              {jobs.map((job) => (
                <tr key={job.id} title={job.errorMessage ?? undefined}>
                  <td className="py-2.5 pr-3 whitespace-nowrap text-[#6b7280]">
                    {formatDate(job.createdAt)}
                  </td>
                  <td className="py-2.5 pr-3 text-[#0b1220]">
                    {CHECK_LABELS[job.checkType] ?? job.checkType}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        STATUS_STYLES[job.status] ?? STATUS_STYLES.queued
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-right text-[#0b1220]">
                    {job.processedCount}
                    {job.failedCount > 0 && (
                      <span className="text-[#b91c1c]"> (+{job.failedCount} failed)</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-[#0b1220]">{job.webSearchCalls}</td>
                  <td className="py-2.5 pr-3 text-right text-[#6b7280]">
                    {job.totalTokens.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-[#0b1220]">
                    ${job.calculatedCost.toFixed(4)}
                  </td>
                  <td className="py-2.5 text-right text-[#0b1220]">{job.creditsCharged}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ValidationJobLog;
