import React, { useEffect, useState } from "react";
import API_BASE_URL from "../../config";
import "./customFieldSettings.css";
import CommonSidePanel from "../common/CommonSidePanel";
import { useSelector } from "react-redux";
import { RootState } from "../../Redux/store";

interface CustomField {
  id: number;
  field_name: string;
  field_key: string;
  field_type: string;
  options_json?: string;
}

interface Props {
  selectedClient: string;
}

const CustomFieldSettings: React.FC<Props> = ({ selectedClient  }) => {

  const [fields, setFields] = useState<CustomField[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const [options, setOptions] = useState("");

  const [isPanelOpen, setIsPanelOpen] = useState(false);
   const reduxUserId = useSelector((state: RootState) => state.auth.userId);

  const effectiveUserId = Number(
  selectedClient !== "" ? selectedClient : reduxUserId
    );

  const loadFields = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/crm/custom-fields?clientId=${effectiveUserId}`
      );

      if (!res.ok) return;

      const data = await res.json();
      setFields(data || []);
    } catch (error) {
      console.error("Error loading custom fields:", error);
    }
  };

  useEffect(() => {
    loadFields();
  }, [effectiveUserId]);

  const createField = async () => {
    if (!name) return;

    const body = {
      clientId: effectiveUserId,
      fieldName: name,
      fieldKey: name.toLowerCase().replace(/\s+/g, "_"),
      fieldType: type,
      optionsJson:
        type === "dropdown" ? JSON.stringify(options.split(",")) : null,
    };

    const res = await fetch(`${API_BASE_URL}/api/crm/custom-field`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setName("");
      setOptions("");
      setIsPanelOpen(false);
      loadFields();
    }
  };

return (
  <div className="section-wrapper">

    {/* HEADER */}
<div className="custom-fields-header">
  <h3 className="custom-fields-title" style={{ marginTop: "-70px" }}>
    Custom CRM Fields
  </h3>

  <button
    className="custom-field-btn"
    onClick={() => setIsPanelOpen(true)}
  >
    + Add Field
  </button>
</div>
    {/* TABLE */}
    <table className="contacts-table">
      <thead>
        <tr>
          <th>Field Name</th>
          <th>Field Type</th>
        </tr>
      </thead>

<tbody>
  {fields.length === 0 ? (
    <tr>
      <td colSpan={2} className="custom-fields-empty">
        No custom fields created yet
      </td>
    </tr>
  ) : (
    fields.map((f) => {
      let options: string[] = [];

      if (f.field_type === "dropdown" && f.options_json) {
        try {
          options = JSON.parse(f.options_json);
        } catch {
          options = [];
        }
      }

      return (
        <tr key={f.id}>
          <td>{f.field_name}</td>

          <td>
            {f.field_type}

            {f.field_type === "dropdown" && options.length > 0 && (
            <div>
            {options.map(opt => (
              <span className="option-badge">{opt}</span>
            ))}
            </div>
            )}
          </td>
        </tr>
      );
    })
  )}
</tbody>
    </table>

    {/* SIDE PANEL */}
    <CommonSidePanel
      isOpen={isPanelOpen}
      onClose={() => setIsPanelOpen(false)}
      title="Create Custom Field"
      footerContent={
        <>
          <button
            className="panel-cancel-btn"
            onClick={() => setIsPanelOpen(false)}
          >
            Cancel
          </button>

          <button
            className="panel-create-btn"
            onClick={createField}
          >
            Create
          </button>
        </>
      }
    >
      <div className="panel-form">

        <label>Field Name</label>
        <input
          className="custom-field-input"
          placeholder="Enter field name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label>Field Type</label>
        <select
          className="custom-field-select"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="boolean">Yes / No</option>
          <option value="dropdown">Dropdown</option>
        </select>

        {type === "dropdown" && (
          <>
            <label>Dropdown Options</label>
            <input
              className="custom-field-input"
              placeholder="Option1, Option2, Option3"
              value={options}
              onChange={(e) => setOptions(e.target.value)}
            />
          </>
        )}

      </div>
    </CommonSidePanel>
  </div>
);
};

export default CustomFieldSettings;