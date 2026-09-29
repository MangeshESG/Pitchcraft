import React, { useEffect, useRef, useState } from "react";
import { CreditCard } from "lucide-react";
import {
  ClientCreditBalance,
  addUserCredits,
  fetchClientCredits,
  reduceUserCredits,
} from "../../utils/adminCredits";
import { ClientOption, fetchClientOptions } from "../../utils/clientDirectory";
import {
  bannerClass,
  cardClass,
  hintClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  sectionClass,
} from "../common/settingsStyles";

type Banner = { type: "success" | "error"; text: string } | null;
type Mode = "add" | "remove";

/** Amounts granted often enough to be worth a click rather than typing. */
const PRESETS = [100, 500, 1000, 5000];

/**
 * Credits — the admin page tab for granting credit by hand and taking it back.
 *
 * Restricted on the API to the client ids in `SuperAdmins:ClientIds`, not to
 * admins in general, because both directions move something a client pays
 * for. The tab is hidden from other admins as a courtesy; the API is what
 * actually refuses them.
 *
 * The balance is looked up before either action so the amount is typed
 * against a number the admin can see, rather than blind.
 */
const AdminCreditSettings: React.FC = () => {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientError, setClientError] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [balance, setBalance] = useState<ClientCreditBalance | null>(null);
  const [loadedClientId, setLoadedClientId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  // Picking a second client before the first balance arrives would otherwise
  // let the slower response win and show the wrong numbers.
  const lookupSequence = useRef(0);

  const parsedClientId = Number(clientId);
  const isClientIdValid = Number.isInteger(parsedClientId) && parsedClientId > 0;

  const parsedAmount = Number(amount);
  const isAmountValid = Number.isInteger(parsedAmount) && parsedAmount > 0;

  // The balance on screen belongs to the client it was loaded for. Switching
  // clients mid-edit would otherwise leave an admin adjusting one against
  // another's numbers.
  const isBalanceCurrent =
    loadedClientId !== null && loadedClientId === parsedClientId;

  const selectedClient = clients.find(
    (client) => client.clientId === parsedClientId,
  );

  /** What to call the client in messages — their name, or the bare id. */
  const clientLabel = selectedClient?.label ?? `client ${parsedClientId}`;

  useEffect(() => {
    let isMounted = true;

    void fetchClientOptions()
      .then((loaded) => {
        if (!isMounted) return;
        setClients(loaded);
        setClientError(
          loaded.length === 0 ? "No clients came back from the API." : null,
        );
      })
      .catch((error: any) => {
        if (!isMounted) return;
        setClients([]);
        setClientError(error?.message || "Could not load the client list.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const loadBalance = async (id: number): Promise<ClientCreditBalance | null> => {
    const sequence = ++lookupSequence.current;

    setIsLoading(true);

    try {
      const loaded = await fetchClientCredits(id);

      if (sequence !== lookupSequence.current) return null;

      setBalance(loaded);
      setLoadedClientId(id);
      return loaded;
    } catch (error: any) {
      if (sequence !== lookupSequence.current) return null;

      setBalance(null);
      setLoadedClientId(null);
      setBanner({
        type: "error",
        text: error?.message || "Could not load this client's balance.",
      });
      return null;
    } finally {
      if (sequence === lookupSequence.current) setIsLoading(false);
    }
  };

  /**
   * Choosing a client is unambiguous, unlike typing an id, so the balance is
   * fetched straight away rather than behind a second click.
   */
  const handleClientChange = async (nextClientId: string) => {
    setClientId(nextClientId);
    setBanner(null);
    setAmount("");
    setReason("");

    const parsed = Number(nextClientId);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      lookupSequence.current += 1;
      setBalance(null);
      setLoadedClientId(null);
      setIsLoading(false);
      return;
    }

    await loadBalance(parsed);
  };

  const handleApply = async () => {
    if (!isClientIdValid || !isAmountValid || !isBalanceCurrent) return;

    setIsSaving(true);
    setBanner(null);

    try {
      if (mode === "add") {
        await addUserCredits(parsedClientId, parsedAmount);
        setBanner({
          type: "success",
          text: `Added ${parsedAmount} credits to ${clientLabel}.`,
        });
      } else {
        const outcome = await reduceUserCredits(
          parsedClientId,
          parsedAmount,
          reason,
        );
        setBanner({
          type: "success",
          text:
            `Removed ${parsedAmount} credits from ${clientLabel} ` +
            `(${outcome.removedFromCustom} custom, ${outcome.removedFromPlan} plan).`,
        });
      }

      setAmount("");
      setReason("");
      // Straight back to the source rather than adjusting the number here, so
      // what is on screen is what the API actually holds.
      await loadBalance(parsedClientId);
    } catch (error: any) {
      setBanner({
        type: "error",
        text:
          error?.message ||
          (mode === "add"
            ? "Could not add the credits."
            : "Could not remove the credits."),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const total = balance ? balance.totalCredit + balance.customLimit : 0;

  // The button repeats the amount so the last thing read before clicking is
  // the number being moved, not just the direction.
  const actionLabel = [
    mode === "add" ? "Add" : "Remove",
    isAmountValid ? String(parsedAmount) : "",
    "credits",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      {banner && <div className={bannerClass(banner.type)}>{banner.text}</div>}

      <div className={sectionClass}>
        <div className={cardClass}>
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[#e2f1e3] bg-[#f1f8f2] text-[#3f9f42]">
              <CreditCard size={18} />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#0b1220]">
                Adjust a client&rsquo;s credits
              </div>
              <p className="mt-0.5 text-[13px] leading-relaxed text-[#6b7280]">
                Choose a client to see their balance, then add or remove
                against it. Changes apply immediately.
              </p>
            </div>
          </div>

          <div className="mt-5 max-w-md">
            <label className={labelClass} htmlFor="admin-credit-client">
              Client
            </label>
            <select
              id="admin-credit-client"
              value={clientId}
              disabled={isSaving || clients.length === 0}
              onChange={(event) => void handleClientChange(event.target.value)}
              className={inputClass}
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.clientId} value={String(client.clientId)}>
                  {client.label}
                </option>
              ))}
            </select>

            {clientError ? (
              <p className="mt-2 text-[13px] text-red-600">{clientError}</p>
            ) : (
              <p className={hintClass}>
                {isLoading
                  ? "Loading balance…"
                  : selectedClient
                    ? `Client ${selectedClient.clientId}`
                    : "The balance loads as soon as a client is chosen."}
              </p>
            )}
          </div>

          {balance && isBalanceCurrent && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { label: "Total available", value: total },
                { label: "Plan credit", value: balance.totalCredit },
                { label: "Custom credit", value: balance.customLimit },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-[#e8eaee] bg-[#fafbfc] px-3.5 py-3"
                >
                  <div className="text-[12px] text-[#6b7280]">{stat.label}</div>
                  <div className="mt-0.5 text-[17px] font-semibold text-[#0b1220]">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {balance && isBalanceCurrent && (
        <div className={sectionClass}>
          <div className={cardClass}>
            <div className="flex gap-2">
              {(
                [
                  ["add", "Add credits"],
                  ["remove", "Remove credits"],
                ] as [Mode, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  disabled={isSaving}
                  className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-60 ${
                    mode === key
                      ? "border-[#3f9f42] bg-[#f1f8f2] text-[#2d7a30]"
                      : "border-[#e8eaee] bg-white text-[#374151] hover:border-[#d1d5db]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-5 max-w-xs">
              <label className={labelClass} htmlFor="admin-credit-amount">
                Credits
              </label>
              <input
                id="admin-credit-amount"
                type="number"
                min={1}
                step={1}
                value={amount}
                disabled={isSaving}
                onChange={(event) => setAmount(event.target.value)}
                className={inputClass}
              />
              <p className={hintClass}>
                {mode === "add"
                  ? "Added as custom credit, which is spent only once the monthly plan allowance runs out."
                  : `Taken from custom credit first, then the plan. ${total} available.`}
              </p>
              {amount !== "" && !isAmountValid && (
                <p className="mt-2 text-[13px] text-red-600">
                  Enter a whole number above zero.
                </p>
              )}
              {mode === "remove" && isAmountValid && parsedAmount > total && (
                <p className="mt-2 text-[13px] text-red-600">
                  This client holds {total} credits, so {parsedAmount} cannot be
                  removed.
                </p>
              )}
            </div>

            {mode === "add" && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-[#6b7280]">Try:</span>
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    disabled={isSaving}
                    className={`rounded-full border px-3 py-1 text-[13px] font-medium transition-colors disabled:opacity-60 ${
                      parsedAmount === preset
                        ? "border-[#3f9f42] bg-[#f1f8f2] text-[#2d7a30]"
                        : "border-[#e8eaee] bg-white text-[#374151] hover:border-[#d1d5db]"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            )}

            {mode === "remove" && (
              <div className="mt-4 max-w-md">
                <label className={labelClass} htmlFor="admin-credit-reason">
                  Reason{" "}
                  <span className="font-normal text-[#6b7280]">(optional)</span>
                </label>
                <input
                  id="admin-credit-reason"
                  type="text"
                  value={reason}
                  disabled={isSaving}
                  placeholder="e.g. refunded in Stripe"
                  onChange={(event) => setReason(event.target.value)}
                  className={inputClass}
                />
                <p className={hintClass}>
                  Written to the API log beside the removal.
                </p>
              </div>
            )}

            <div className="mt-5 flex items-center gap-3 border-t border-[#f1f2f4] pt-4">
              <button
                type="button"
                onClick={handleApply}
                disabled={
                  isSaving ||
                  !isAmountValid ||
                  (mode === "remove" && parsedAmount > total)
                }
                className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isSaving ? "Applying…" : actionLabel}
              </button>
            </div>

            <p className={`${hintClass} border-t border-[#f1f2f4] pt-4`}>
              A removal is all-or-nothing: if the client holds less than the
              amount asked for, nothing is taken and the balance is left alone.
              Removing credit does not count as usage, so it never eats into
              the client&rsquo;s monthly allowance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCreditSettings;
