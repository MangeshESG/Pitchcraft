import React, { useEffect, useState } from "react";
import API_BASE_URL from "../../config";
import "./customFieldSettings.css";
import "./blueprint/Template.new.css";
import CommonSidePanel from "../common/CommonSidePanel";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../Redux/store";
import { closePanel, openPanel } from "../../slices/panelSlice";
import { MoreVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
import customFieldNewUserImage from "../../assets/images/Custom_field_new_user.png";

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

const CustomFieldSettings: React.FC<Props> = ({ selectedClient }) => {
  const dispatch = useDispatch();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const [options, setOptions] = useState<string[]>([""]);
  const [originalOptions, setOriginalOptions] = useState<string[]>([]);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [fieldActionsAnchor, setFieldActionsAnchor] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<CustomField | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");

  const reduxUserId = useSelector((state: RootState) => state.auth.userId);
  const activePanel = useSelector((state: RootState) => state.panel.activePanel);
  const showCustomCRMFieldModal = activePanel === "custom-crm-field-modal";

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
    if (exists) { alert("Field already exists"); return; }

    const cleanedOptions = options.map((o) => o.trim()).filter(Boolean);
    if (type === "dropdown" && cleanedOptions.length === 0) {
      alert("Dropdown must have at least one option");
      return;
    }

    const hasDuplicateOptions = cleanedOptions.some(
      (option, index) =>
        cleanedOptions.findIndex(
          (existing) => existing.toLowerCase() === option.toLowerCase()
        ) !== index
    );
    if (hasDuplicateOptions) { alert("Dropdown options must be unique"); return; }

    const optionRenames =
      isEditMode && editingField?.field_type === "dropdown" && type === "dropdown"
        ? originalOptions.reduce<Record<string, string>>((renames, oldOption, index) => {
            const oldValue = oldOption.trim();
            const newValue = cleanedOptions[index]?.trim();
            if (
              oldValue &&
              newValue &&
              oldValue.toLowerCase() !== newValue.toLowerCase() &&
              !originalOptions.some(
                (option) => option.trim().toLowerCase() === newValue.toLowerCase()
              )
            ) {
              renames[oldValue] = newValue;
            }
            return renames;
          }, {})
        : {};

    const optionsJson = type === "dropdown" ? JSON.stringify(cleanedOptions) : "[]";

    const body = isEditMode
      ? { id: editingField?.id, fieldName: name, fieldType: type, optionsJson, optionRenames }
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

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setName("");
      setOptions([""]);
      setOriginalOptions([]);
      setIsEditMode(false);
      setEditingField(null);
      dispatch(closePanel());
      loadFields();
    } else {
      try {
        const errorData = await res.json();
        if (errorData?.usedOptions?.length) {
          alert(
            `${errorData.message || "Cannot remove options"}: ${errorData.usedOptions.join(", ")}`
          );
          return;
        }
        if (errorData?.message) { alert(errorData.message); return; }
      } catch {
        // ignore parse errors
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
    if (res.ok) loadFields();
    setShowDeleteModal(false);
    setFieldToDelete(null);
    setDeleteConfirmText("");
  };

  const openCreatePanel = () => {
    setIsEditMode(false);
    setEditingField(null);
    setName("");
    setOptions([""]);
    setOriginalOptions([]);
    setType("text");
    dispatch(openPanel("custom-crm-field-modal"));
  };

  const openEditPanel = (field: CustomField) => {
    setIsEditMode(true);
    setEditingField(field);
    setName(field.field_name);
    setType(field.field_type);
    setOptions([""]);
    setOriginalOptions([]);
    if (field.field_type === "dropdown" && field.options_json) {
      try {
        const parsed = JSON.parse(field.options_json);
        const opts = Array.isArray(parsed) ? parsed : [""];
        setOptions(opts);
        setOriginalOptions(opts);
      } catch {
        setOptions([""]);
        setOriginalOptions([]);
      }
    }
    dispatch(openPanel("custom-crm-field-modal"));
  };

  const addOption = () => setOptions([...options, ""]);
  const updateOption = (value: string, index: number) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };
  const removeOption = (index: number) => {
    const updated = options.filter((_, i) => i !== index);
    setOptions(updated.length ? updated : [""]);
  };

  const filteredFields = fields.filter((f) =>
    f.field_name.toLowerCase().includes(fieldSearch.toLowerCase())
  );

  return (
    <div className="bp-list-wrap">
      {fields.length === 0 ? (
        <div className="bp-empty-wrap">
          <div className="bp-empty-body">
            <div className="bp-empty-hero">
              <div className="bp-empty-hero__bg" />
              <div className="bp-empty-hero__content">
                <div className="bp-empty-hero__copy">
                  <span className="bp-start-pill">Start here</span>
                  <h2 className="bp-empty-headline">Create your first custom field.</h2>
                  <p className="bp-empty-body-text">
                    Custom fields let you store any extra information about contacts — industry, deal size, lead source, or anything your team tracks.
                  </p>
                  <div className="bp-empty-actions">
                    <button className="bp-btn-default" onClick={openCreatePanel}>
                      <Plus className="h-4 w-4" />
                      Add your first field
                    </button>
                  </div>
                  <div className="bp-empty-meta">
                     Custom attributes are available on every contact record and can be used to create views
                  </div>
                </div>
                <div className="bp-empty-hero__art">
                  <img
                    src={customFieldNewUserImage}
                    alt=""
                    style={{ width: 460, height: "auto", maxWidth: "100%" }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bp-page-header">
            <div className="bp-page-header__inner">
              <div>
                <h1 className="bp-page-title">
                  Custom fields
                  <span className="bp-count-pill">{fields.length}</span>
                </h1>
                <p className="bp-page-sub">
                  Define custom attributes to capture unique contact and company data beyond standard fields.
                </p>
              </div>
              <div className="bp-header-actions">
                <button type="button" className="bp-btn-primary-dark" onClick={openCreatePanel}>
                  <Plus className="h-4 w-4" />
                  Add field
                </button>
              </div>
            </div>
          </div>

          <div className="bp-list-body">
          <div className="bp-toolbar">
            <div className="bp-toolbar__left">
              <div className="bp-search">
                <Search className="bp-search__icon h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search fields"
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                />
              </div>
            </div>
            <span style={{ fontSize: "12.5px", color: "var(--bp-ink-faint)" }}>
              {filteredFields.length} field{filteredFields.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="bp-rows">
            <div
              className="bp-rows__head"
              style={{ gridTemplateColumns: "14px 1.5fr 1fr 60px" }}
            >
              <div />
              <div>Field name</div>
              <div>Type</div>
              <div />
            </div>

            {filteredFields.length === 0 ? (
              <div className="bp-rows__msg">No fields match your search.</div>
            ) : (
              filteredFields.map((f) => {
                let parsedOptions: string[] = [];
                if (f.field_type === "dropdown" && f.options_json) {
                  try { parsedOptions = JSON.parse(f.options_json); } catch { parsedOptions = []; }
                }
                return (
                  <div
                    key={f.id}
                    className="bp-row"
                    style={{ gridTemplateColumns: "14px 1.5fr 1fr 60px" }}
                  >
                    <div className="bp-row__rail" />
                    <div className="bp-row__name">
                      <button
                        type="button"
                        className="bp-row__link"
                        onClick={() => openEditPanel(f)}
                      >
                        {f.field_name}
                      </button>
                    </div>
                    <div className="bp-row__id">
                      <span className="cf-type-badge">{f.field_type}</span>
                      {parsedOptions.length > 0 && (
                        <div style={{ marginTop: 6 }}>
                          {parsedOptions.slice(0, 5).map((opt) => (
                            <span key={opt} className="option-badge">{opt}</span>
                          ))}
                          {parsedOptions.length > 5 && (
                            <span className="option-badge">+{parsedOptions.length - 5} more</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="bp-row__actions">
                      <button
                        type="button"
                        onClick={() =>
                          setFieldActionsAnchor(fieldActionsAnchor === f.id ? null : f.id)
                        }
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#6b7280] hover:bg-[#eef0f3]"
                        aria-label={`Open actions for ${f.field_name}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {fieldActionsAnchor === f.id && (
                        <div className="bp-row__menu">
                          <button
                            type="button"
                            onClick={() => { openEditPanel(f); setFieldActionsAnchor(null); }}
                          >
                            <Pencil className="h-4 w-4" /> Edit
                          </button>
                          <button
                            type="button"
                            className="is-danger"
                            onClick={() => {
                              setFieldToDelete(f);
                              setShowDeleteModal(true);
                              setDeleteConfirmText("");
                              setFieldActionsAnchor(null);
                            }}
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="bp-tip">
            Showing {filteredFields.length} of {fields.length} field{fields.length !== 1 ? "s" : ""}.
          </div>
        </div>
        </>
      )}

      <CommonSidePanel
        isOpen={showCustomCRMFieldModal}
        onClose={() => dispatch(closePanel())}
        title={isEditMode ? "Edit custom field" : "Create custom field"}
        footerContent={
          <>
            <button
              className="panel-cancel-btn"
              onClick={() => dispatch(closePanel())}
            >
              Cancel
            </button>
            <button className="panel-create-btn" onClick={saveField}>
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
                <button type="button" className="add-option-btn" onClick={addOption}>
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
            <h3 className="text-lg font-semibold mb-3 text-gray-900">
              Delete custom field
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              This action will permanently delete the field
              <strong> "{fieldToDelete?.field_name}" </strong>
              and all associated data.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Please type <strong>DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
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
