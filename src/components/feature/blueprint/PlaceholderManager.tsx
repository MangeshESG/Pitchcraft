import React, { useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../../config";

export interface PlaceholderDefinition {
  id?: number;
  placeholderKey: string;
  friendlyName: string;
  category: string;
  inputType: "text" | "textarea" | "richtext";
  uiSize: "sm" | "md" | "lg" | "xl";
  isRuntimeOnly: boolean;
  isExpandable: boolean;
  isRichText: boolean;
}

interface Props {
  templateDefinitionId: number | null;
}

const PlaceholderManager: React.FC<Props> = ({ templateDefinitionId }) => {
  const [placeholders, setPlaceholders] = useState<PlaceholderDefinition[]>([]);
  const [loading, setLoading] = useState(false);

  // --------------------------------------------------
  // LOAD PLACEHOLDERS
  // --------------------------------------------------
  useEffect(() => {
    if (!templateDefinitionId) return;

    setLoading(true);
    axios
      .get(
        `${API_BASE_URL}/api/CampaignPrompt/placeholders/by-template/${templateDefinitionId}`
      )
      .then((res) => setPlaceholders(res.data || []))
      .finally(() => setLoading(false));
  }, [templateDefinitionId]);

  // --------------------------------------------------
  // UPDATE FIELD
  // --------------------------------------------------
  const update = (
    index: number,
    field: keyof PlaceholderDefinition,
    value: any
  ) => {
    setPlaceholders((prev) => {
      const copy = [...prev];
      (copy[index] as any)[field] = value;
      return copy;
    });
  };

  // --------------------------------------------------
  // SAVE
  // --------------------------------------------------
  const save = async () => {
    if (!templateDefinitionId) return;

    await axios.post(
      `${API_BASE_URL}/api/CampaignPrompt/placeholders/save`,
      {
        templateDefinitionId,
        placeholders
      }
    );

    alert("✅ Placeholder settings saved");
  };

  if (!templateDefinitionId) {
    return <p style={{ color: "#6b7280" }}>Select a template first.</p>;
  }

  if (loading) {
    return <p>Loading placeholders…</p>;
  }

  return (
    <div className="placeholder-manager">
      <table className="w-full border border-gray-300">
        <thead style={{ background: "#f9fafb" }}>
          <tr>
            <th>Placeholder</th>
            <th>Category</th>
            <th>Input</th>
            <th>Size</th>
            <th>Runtime</th>
            <th>Rich</th>
            <th>Expand</th>
          </tr>
        </thead>

        <tbody>
          {placeholders.map((p, i) => (
            <tr key={p.placeholderKey}>
              <td>{`{${p.placeholderKey}}`}</td>

              <td>
                <select
                  value={p.category}
                  onChange={(e) => update(i, "category", e.target.value)}
                >
                  <option>Vendor</option>
                  <option>Search</option>
                  <option>Output</option>
                  <option>Contact</option>
                  <option>Custom</option>
                </select>
              </td>

              <td>
                <select
                  value={p.inputType}
                  onChange={(e) =>
                    update(i, "inputType", e.target.value)
                  }
                >
                  <option value="text">Text</option>
                  <option value="textarea">Textarea</option>
                  <option value="richtext">Rich text</option>
                </select>
              </td>

              <td>
                <select
                  value={p.uiSize}
                  onChange={(e) => update(i, "uiSize", e.target.value)}
                >
                  <option value="sm">SM</option>
                  <option value="md">MD</option>
                  <option value="lg">LG</option>
                  <option value="xl">XL</option>
                </select>
              </td>

              <td>
                <input
                  type="checkbox"
                  checked={p.isRuntimeOnly}
                  onChange={(e) =>
                    update(i, "isRuntimeOnly", e.target.checked)
                  }
                />
              </td>

              <td>
                <input
                  type="checkbox"
                  checked={p.isRichText}
                  onChange={(e) =>
                    update(i, "isRichText", e.target.checked)
                  }
                />
              </td>

              <td>
                <input
                  type="checkbox"
                  checked={p.isExpandable}
                  onChange={(e) =>
                    update(i, "isExpandable", e.target.checked)
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: "16px", textAlign: "right" }}>
        <button
          onClick={save}
          style={{
            padding: "10px 18px",
            background: "#2563eb",
            color: "#fff",
            borderRadius: "6px",
            fontWeight: 600
          }}
        >
          Save Placeholder Settings
        </button>
      </div>
    </div>
  );
};

export default PlaceholderManager;
