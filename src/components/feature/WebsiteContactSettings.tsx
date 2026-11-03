import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import API_BASE_URL from "../../config";
import ToastMessage from "../common/ToastMessage";
import { useToast } from "../../hooks/useToast";
import { formatUserDate } from "../common/dateTimePreferences";

interface WebsiteIntegration {
  id: number;
  website_name: string;
  data_file_id: number;
  created_at: string;
}

interface Props {
  selectedClient: string;
}

const WebsiteContactSettings: React.FC<Props> = ({ selectedClient }) => {
  const clientId =
    selectedClient ||
    sessionStorage.getItem("clientId") ||
    localStorage.getItem("clientId") ||
    "";

  const [integrations, setIntegrations] = useState<WebsiteIntegration[]>([]);
  const [websiteName, setWebsiteName] = useState("");
  const [modal, setModal] = useState<"create" | "regenerate" | "key" | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<WebsiteIntegration | null>(null);
  const [keyWebsiteName, setKeyWebsiteName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    let active = true;
    setIntegrations([]);
    setModal(null);
    setNewKey("");

    if (!clientId) return;

    const url = `${API_BASE_URL}/api/crm/website-contact-integrations?clientId=${encodeURIComponent(clientId)}`;
    fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Could not load website integrations (${response.status}).`);
        }
        if (!response.headers.get("content-type")?.includes("application/json")) {
          throw new Error("Website contact API returned an unexpected response.");
        }
        return response.json();
      })
      .then((data: WebsiteIntegration[]) => {
        if (!active) return;
        if (!Array.isArray(data)) throw new Error("Website contact API returned invalid data.");
        setIntegrations(data);
      })
      .catch((reason) => {
        if (active) showToast(reason.message, "error");
      });

    return () => {
      active = false;
    };
  }, [clientId]);

  const createIntegration = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!clientId || !websiteName.trim() || loading) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/crm/website-contact-integrations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: Number(clientId),
          websiteName: websiteName.trim(),
        }),
      });
      const data = response.headers.get("content-type")?.includes("application/json")
        ? await response.json().catch(() => null)
        : null;

      if (!response.ok) {
        const message =
          response.status === 401 ? "Please sign in again and retry." :
          response.status === 403 ? "You do not have access to this client." :
          response.status === 404 ? "Website contact API is not available on this server yet." :
          response.status >= 500 ? "Server error. Check the API deployment and website_api_keys table." :
          "Could not create website integration.";
        throw new Error(data?.message || `${message} (${response.status})`);
      }

      if (!data?.apiKey || !data?.dataFileId || !data?.id) {
        throw new Error("Website contact API returned an empty response. Check that the API is updated.");
      }

      setNewKey(data.apiKey);
      setKeyWebsiteName(data.websiteName);
      setIntegrations((current) => [
        {
          id: data.id,
          website_name: data.websiteName,
          data_file_id: data.dataFileId,
          created_at: new Date().toISOString(),
        },
        ...current,
      ]);
      setWebsiteName("");
      setModal("key");
      showToast("API key created. Copy it before closing this window.", "success");
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Could not create website integration.", "error");
    } finally {
      setLoading(false);
    }
  };

  const regenerateKey = async () => {
    if (!clientId || !selectedIntegration || loading) return;
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/crm/website-contact-integrations/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: Number(clientId), integrationId: selectedIntegration.id }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || `Could not regenerate API key (${response.status}).`);
      }
      if (!data?.apiKey) throw new Error("Website contact API returned an empty response.");

      setNewKey(data.apiKey);
      setKeyWebsiteName(data.websiteName);
      setModal("key");
      showToast("New API key generated. The previous key no longer works.", "success");
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : "Could not regenerate API key.", "error");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    if (loading) return;
    setModal(null);
    setNewKey("");
    setSelectedIntegration(null);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-6">
        <p className="text-sm text-gray-600">
          Create a key for each website. Its contacts will be added to a list with the same name.
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <a className="btn-muted" href="https://www.pitchkraft.ai/knowledge-base/website-contacts/">
            Setup guide
          </a>
          <button type="button" className="btn-default" disabled={!clientId} onClick={() => setModal("create")}>
            + Create API key
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500">
            <tr>
              <th className="px-6 py-3">Website name</th>
              <th className="px-6 py-3">Contact list</th>
              <th className="px-6 py-3">Created at</th>
              <th className="px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {integrations.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{item.website_name}</td>
                <td className="px-6 py-4 text-gray-700">#{item.data_file_id}</td>
                <td className="px-6 py-4 text-gray-500">{formatUserDate(item.created_at)}</td>
                <td className="px-6 py-4">
                  <button
                    type="button"
                    className="text-green-700 underline"
                    onClick={() => { setSelectedIntegration(item); setModal("regenerate"); }}
                  >
                    Regenerate key
                  </button>
                </td>
              </tr>
            ))}
            {integrations.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No API keys generated yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ToastMessage
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      />

      {modal && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" aria-label="Website API key" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            {modal === "create" && (
              <form onSubmit={createIntegration}>
                <h3 className="text-lg font-semibold">Generate API key</h3>
                <p className="mt-1 text-sm text-gray-600">A contact list with the website name will be created.</p>
                <label className="mt-5 flex flex-col gap-1 text-sm font-medium">
                  Website name
                  <input
                    autoFocus
                    className="rounded border border-gray-300 px-3 py-2"
                    value={websiteName}
                    maxLength={120}
                    onChange={(event) => setWebsiteName(event.target.value)}
                    required
                    placeholder="e.g. Company website"
                  />
                </label>
                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" onClick={closeModal} disabled={loading}>Cancel</button>
                  <button className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50" disabled={loading || !websiteName.trim()}>
                    {loading ? "Generating..." : "Generate key"}
                  </button>
                </div>
              </form>
            )}

            {modal === "regenerate" && (
              <>
                <h3 className="text-lg font-semibold">Regenerate API key?</h3>
                <p className="mt-3 text-sm text-gray-600">The old key for {selectedIntegration?.website_name} will stop working immediately.</p>
                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" onClick={closeModal} disabled={loading}>Cancel</button>
                  <button type="button" onClick={regenerateKey} disabled={loading} className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50">
                    {loading ? "Regenerating..." : "Regenerate key"}
                  </button>
                </div>
              </>
            )}

            {modal === "key" && (
              <>
                <h3 className="text-lg font-semibold">API key for {keyWebsiteName}</h3>
                <p className="mt-3 text-sm text-gray-600">Copy this key now. It will not be shown again. Keep it on your website server.</p>
                <code className="mt-4 block break-all rounded bg-gray-100 p-3 text-sm select-all">{newKey}</code>
                <div className="mt-6 flex justify-end gap-3">
                  <button type="button" onClick={closeModal}>Close</button>
                  <button
                    type="button"
                    className="rounded bg-green-600 px-4 py-2 text-white"
                    onClick={() => navigator.clipboard.writeText(newKey)
                      .then(() => showToast("API key copied.", "success"))
                      .catch(() => showToast("Could not copy the key. Select and copy it manually.", "error"))}
                  >
                    Copy key
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default WebsiteContactSettings;
