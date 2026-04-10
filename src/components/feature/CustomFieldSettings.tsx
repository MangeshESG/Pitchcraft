import React, { useEffect, useState } from "react";
import API_BASE_URL from "../../config";
import "./customFieldSettings.css";
import CommonSidePanel from "../common/CommonSidePanel";
import { useSelector } from "react-redux";
import { RootState } from "../../Redux/store";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrashAlt } from "@fortawesome/free-regular-svg-icons";


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
const actionIconStyle = {
  width: 24,
  height: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};
const CustomFieldSettings: React.FC<Props> = ({ selectedClient }) => {

  const [fields, setFields] = useState<CustomField[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const [options, setOptions] = useState<string[]>([""]);

  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const reduxUserId = useSelector((state: RootState) => state.auth.userId);
  const [fieldActionsAnchor, setFieldActionsAnchor] = useState<number | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<CustomField | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const storedSelectedClientId =
    localStorage.getItem("selectedClientId") ||
    sessionStorage.getItem("selectedClientId") ||
    "";

  const effectiveUserId = Number(
    selectedClient !== ""
      ? selectedClient
      : storedSelectedClientId !== ""
        ? storedSelectedClientId
        : reduxUserId
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

  const saveField = async () => {

    if (!name.trim()) return;

    const exists = fields.some(
      (f) =>
        f.field_name.toLowerCase() === name.toLowerCase() &&
        (!isEditMode || f.id !== editingField?.id)
    );

    if (exists) {
      alert("Field already exists");
      return;
    }

    const optionsJson =
      type === "dropdown"
        ? JSON.stringify(options.filter((o) => o.trim() !== ""))
        : "[]";

    const body = isEditMode
      ? {
          id: editingField?.id,
          fieldName: name,
          fieldType: type,
          optionsJson,
        }
      : {
          clientId: effectiveUserId,
          fieldName: name,
          fieldKey: name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .replace(/\s+/g, "_"),
          fieldType: type,
          optionsJson,
        };

    const url = isEditMode
      ? `${API_BASE_URL}/api/crm/custom-field-rename`
      : `${API_BASE_URL}/api/crm/custom-field`;

    const method = "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setName("");
      setOptions([""]);
      setIsEditMode(false);
      setEditingField(null);
      setIsPanelOpen(false);
      loadFields();
    } else {
      try {
        const errorData = await res.json();
        if (errorData?.usedOptions?.length) {
          alert(
            `${errorData.message || "Cannot remove options"}: ${errorData.usedOptions.join(
              ", "
            )}`
          );
          return;
        }
        if (errorData?.message) {
          alert(errorData.message);
          return;
        }
      } catch {
        // ignore parse errors and fall through to generic alert
      }
      alert("Failed to save custom field");
    }
  };

  const confirmDeleteField = async () => {
  if (!fieldToDelete) return;

    const res = await fetch(
      `${API_BASE_URL}/api/crm/custom-field-delete/${fieldToDelete.id}`,
      { method: "POST" }
    );

    if (res.ok) {
      loadFields();
    }

    setShowDeleteModal(false);
    setFieldToDelete(null);
    setDeleteConfirmText("");
  };

  const openCreatePanel = () => {
    setIsEditMode(false);
    setEditingField(null);
    setName("");
    setOptions([""]);
    setType("text");
    setIsPanelOpen(true);
  };

  const openEditPanel = (field: CustomField) => {

    setIsEditMode(true);
    setEditingField(field);
    setName(field.field_name);
    setType(field.field_type);

    if (field.field_type === "dropdown" && field.options_json) {
      try {
        const opts = JSON.parse(field.options_json);
        setOptions(opts);
      } catch {
        setOptions([""]);
      }
    }

    setIsPanelOpen(true);
  };

    const addOption = () => {
      setOptions([...options, ""]);
    };

    const updateOption = (value: string, index: number) => {
      const updated = [...options];
      updated[index] = value;
      setOptions(updated);
    };

    const removeOption = (index: number) => {
      const updated = options.filter((_, i) => i !== index);
      setOptions(updated.length ? updated : [""]);
    };
  return (
    <div className="section-wrapper">

      <div className="custom-fields-header">
        <h3 className="custom-fields-title" style={{ marginTop: "-70px" }}>
          Custom CRM fields
        </h3>

        <button
          className="custom-field-btn"
          onClick={openCreatePanel}
        >
          + Add field
        </button>
      </div>

      <table className="contacts-table">
        <thead>
        <tr>
          <th>Field name</th>
          <th>Field type</th>
          <th>Actions</th>
        </tr>
        </thead>

        <tbody>
          {fields.length === 0 ? (
            <tr>
              <td colSpan={3} className="custom-fields-empty">
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

  <td style={{ position: "relative" }}>

    <button
      onClick={() =>
        setFieldActionsAnchor(
          fieldActionsAnchor === f.id ? null : f.id
        )
      }
      style={{
        padding: "4px 10px",
        borderRadius: "5px",
        fontSize: "20px",
        fontWeight: "600",
        cursor: "pointer",
      }}
    >
      ⋮
    </button>

    {fieldActionsAnchor === f.id && (
      <div
        style={{
          position: "absolute",
          top: "30px",
          right: 0,
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: "6px",
          boxShadow: "0px 4px 12px rgba(0,0,0,0.15)",
          zIndex: 100,
          padding: "8px 0",
          width: "120px",
        }}
      >

        {/* EDIT */}
<button
  onClick={() => {
    openEditPanel(f);
    setFieldActionsAnchor(null);
  }}
  style={{
    width: "100%",
    padding: "8px 18px",
    textAlign: "left",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    display: "flex",
    gap: "8px",
    alignItems: "center",
  }}
>

  <span style={actionIconStyle}>
    <FontAwesomeIcon
      icon={faEdit}
      style={{ color: "#3f9f42", fontSize: 20 }}
    />
  </span>

  <span>Edit</span>

</button>

        {/* DELETE */}
<button
  onClick={() => {
    setFieldToDelete(f);
    setShowDeleteModal(true);
    setDeleteConfirmText("");
    setFieldActionsAnchor(null);
  }}
  style={{
    width: "100%",
    padding: "8px 18px",
    textAlign: "left",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    display: "flex",
    gap: "8px",
    alignItems: "center",
  }}
>

  <span style={actionIconStyle}>
    <FontAwesomeIcon
      icon={faTrashAlt}
      style={{ color: "#3f9f42", fontSize: 20 }}
    />
  </span>

  <span>Delete</span>

</button>

      </div>
    )}

  </td>
</tr>
              );
            })
          )}
        </tbody>
      </table>

      <CommonSidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        title={isEditMode ? "Edit custom field" : "Create custom field"}
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
              onClick={saveField}
            >
              {isEditMode ? "Update" : "Create"}
            </button>
          </>
        }
      >
        <div className="panel-form">

          <label>Field name</label>
          <input
            className="custom-field-input"
            placeholder="Enter field name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label>Field type</label>
          <select
            className="custom-field-select"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="text">Text</option>
            <option value="longtext">Long Text</option>
            <option value="number">Number</option>
            <option value="boolean">Checkbox (Yes / No)</option>
            <option value="date">Date</option>
            <option value="datetime">Date & Time</option>
            <option value="dropdown">Pick List</option>
          </select>

          {type === "dropdown" && (
            <>
              <label>Dropdown Options</label>
<div className="dropdown-options-container">

  {options.map((opt, index) => (
    <div key={index} className="dropdown-option-row">

      <input
        className="custom-field-input"
        placeholder={`Option ${index + 1}`}
        value={opt}
        onChange={(e) => updateOption(e.target.value, index)}
      />

      <button
        type="button"
        className="remove-option-btn"
        onClick={() => removeOption(index)}
      >
        ✕
      </button>

    </div>
  ))}

  <button
    type="button"
    className="add-option-btn"
    onClick={addOption}
  >
    + Add option
  </button>

</div>
            </>
          )}

        </div>
      </CommonSidePanel>

{showDeleteModal && (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]"
    onClick={() => setShowDeleteModal(false)}
  >
    <div
      className="bg-white rounded-xl p-6 w-[520px] relative"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Title */}
      <h3 className="text-lg font-semibold mb-3 text-gray-900">
        Delete custom field
      </h3>

      {/* Message */}
      <p className="text-sm text-gray-600 mb-3">
        This action will permanently delete the field
        <strong> "{fieldToDelete?.field_name}" </strong>
        and all associated data.
      </p>

      <p className="text-sm text-gray-600 mb-4">
        Please type <strong>DELETE</strong> to confirm.
      </p>

      {/* Input */}
      <input
        type="text"
        value={deleteConfirmText}
        onChange={(e) => setDeleteConfirmText(e.target.value)}
        placeholder="Type DELETE"
        className="w-full border border-gray-300 rounded-md px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-red-500"
      />

      {/* Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setShowDeleteModal(false)}
          className="px-5 py-2 rounded-full bg-black text-white"
        >
          Cancel
        </button>

        <button
          onClick={confirmDeleteField}
          disabled={deleteConfirmText !== "DELETE"}
          className={`px-5 py-2 rounded-full text-white ${
            deleteConfirmText === "DELETE"
              ? "bg-red-600 hover:bg-red-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          Delete
        </button>
      </div>

      {/* Close button */}
      <button
        onClick={() => setShowDeleteModal(false)}
        className="absolute top-4 right-4 text-xl"
      >
        ✕
      </button>
    </div>
  </div>
)}
    </div>
  );
};

export default CustomFieldSettings;
