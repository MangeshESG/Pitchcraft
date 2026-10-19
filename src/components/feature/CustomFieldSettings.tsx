import React, { useEffect, useRef, useState } from "react";
import API_BASE_URL from "../../config";
import { useAppData } from "../../contexts/AppDataContext";
import "./customFieldSettings.css";
import "./blueprint/Template.new.css";
import CommonSidePanel from "../common/CommonSidePanel";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../Redux/store";
import { closePanel, openPanel } from "../../slices/panelSlice";
import { MoreVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
import CustomAttributeGroupsTab from "./CustomAttributeGroupsTab";
import { AttributeGroup, SystemAttributeGroup, getGroupAttributes, getSystemAttributeGroups, moveSystemAttributes, saveAttributeGroup } from "../../api/customAttributeGroups";
import ToastMessage from "../common/ToastMessage";
import { useToast } from "../../hooks/useToast";

interface CustomField {
  id: number;
  field_name: string;
  field_key: string;
  field_type: string;
  options_json?: string | null;
  group_id?: number | null;
  assigned_system_group_key?: string | null;
}

interface Props {
  selectedClient: string;
}

const CustomFieldSettings: React.FC<Props> = ({ selectedClient }) => {
  const { triggerRefresh } = useAppData();
  const { toast, showToast, hideToast } = useToast();
  const dispatch = useDispatch();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("text");
  const [options, setOptions] = useState<string[]>([""]);
  const [originalOptions, setOriginalOptions] = useState<string[]>([]);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [createInGroupId, setCreateInGroupId] = useState<number | null>(null);
  const [createInSystemGroupKey, setCreateInSystemGroupKey] = useState<"personal" | "company" | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [fieldActionsAnchor, setFieldActionsAnchor] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<CustomField | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");
  const [fieldPage, setFieldPage] = useState(1);
  const [fieldTotal, setFieldTotal] = useState(0);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [fieldsError, setFieldsError] = useState("");
  const fieldLoadId = useRef(0);
  const [editingGroup, setEditingGroup] = useState<AttributeGroup | null>(null);
  const [groupMode, setGroupMode] = useState(false);
  const groupEditorRef = useRef<HTMLDivElement>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupChanges, setGroupChanges] = useState<Map<number, boolean>>(new Map());
  const [systemGroups, setSystemGroups] = useState<SystemAttributeGroup[]>([]);
  const [selectedSystemKeys, setSelectedSystemKeys] = useState<string[]>([]);
  const [showMoveConfirmation, setShowMoveConfirmation] = useState(false);
  const [groupSaving, setGroupSaving] = useState(false);
  const [groupError, setGroupError] = useState("");
  const [groupRefreshKey, setGroupRefreshKey] = useState(0);

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
  const previousClientId = useRef(effectiveUserId);

  const loadFields = async () => {
    const loadId = ++fieldLoadId.current;
    setFieldsLoading(true);
    try {
      const result = await getGroupAttributes(fieldPage, 20, fieldSearch, undefined, !groupMode);
      if (loadId !== fieldLoadId.current) return;
      setFields(result.items);
      setFieldTotal(result.total);
      setFieldsError("");
      if (fieldPage > 1 && result.items.length === 0) setFieldPage((page) => Math.max(1, page - 1));
    } catch (error) {
      if (loadId === fieldLoadId.current) {
        const message = error instanceof Error ? error.message : "Could not load custom attributes.";
        setFieldsError(message);
        showToast(message, "error");
      }
    } finally {
      if (loadId === fieldLoadId.current) setFieldsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadFields, fieldSearch ? 250 : 0);
    return () => { clearTimeout(timer); fieldLoadId.current += 1; };
  }, [effectiveUserId, fieldPage, fieldSearch, groupMode, groupRefreshKey]);
  useEffect(() => {
    let active = true;
    getSystemAttributeGroups().then((groups) => { if (active) setSystemGroups(groups); })
      .catch((error) => { if (active) showToast(error.message, "error"); });
    return () => { active = false; };
  }, [effectiveUserId, groupRefreshKey]);
  useEffect(() => {
    if (previousClientId.current === effectiveUserId) return;
    previousClientId.current = effectiveUserId;
    setGroupMode(false);
    setEditingGroup(null);
    setGroupChanges(new Map());
    setSelectedSystemKeys([]);
    setShowMoveConfirmation(false);
    setFieldPage(1);
    setFieldSearch("");
    setFieldToDelete(null);
    setShowDeleteModal(false);
    dispatch(closePanel());
  }, [effectiveUserId]);
  useEffect(() => {
    if (groupMode) groupEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [groupMode, editingGroup?.id]);

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
          groupId: createInGroupId,
          systemGroupKey: createInSystemGroupKey,
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
      triggerRefresh();
      setName("");
      setOptions([""]);
      setOriginalOptions([]);
      setIsEditMode(false);
      setEditingField(null);
      setCreateInGroupId(null);
      setCreateInSystemGroupKey(null);
      dispatch(closePanel());
      loadFields();
      setGroupRefreshKey((key) => key + 1);
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
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/crm/custom-field-delete/${fieldToDelete.id}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Could not delete the attribute. Please try again.");
      loadFields();
      setGroupRefreshKey((key) => key + 1);
      setShowDeleteModal(false);
      setFieldToDelete(null);
      setDeleteConfirmText("");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not delete the attribute.", "error");
    }
  };

  const openCreatePanel = (groupId: number | null = null) => {
    setIsEditMode(false);
    setEditingField(null);
    setCreateInGroupId(groupId);
    setCreateInSystemGroupKey(null);
    setName("");
    setOptions([""]);
    setOriginalOptions([]);
    setType("text");
    dispatch(openPanel("custom-crm-field-modal"));
  };

  const openCreateInSystemGroup = (groupKey: "personal" | "company") => {
    openCreatePanel();
    setCreateInSystemGroupKey(groupKey);
  };

  const openEditPanel = (field: CustomField) => {
    setIsEditMode(true);
    setEditingField(field);
    setCreateInGroupId(null);
    setCreateInSystemGroupKey(null);
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

  const filteredFields = fields;
  const systemFields = systemGroups.flatMap(group => group.fields.map(field => ({ ...field, groupName: group.name })));
  const matchingSystemFields = groupMode ? systemFields.filter(field => field.name.toLowerCase().includes(fieldSearch.toLowerCase())) : [];
  const visibleSystemFields = fieldPage === 1 ? matchingSystemFields : [];
  const selectedGroupCount = editingGroup
    ? editingGroup.attributeCount + (systemGroups.find(group => group.key === `custom:${editingGroup.id}`)?.fields.length || 0) + Array.from(groupChanges.values()).filter(Boolean).length - Array.from(groupChanges.values()).filter((selected) => !selected).length + selectedSystemKeys.length
    : Array.from(groupChanges.values()).filter(Boolean).length + selectedSystemKeys.length;

  const cancelGroup = () => {
    setGroupMode(false);
    setFieldPage(1);
    setFieldSearch("");
    setShowMoveConfirmation(false);
    setEditingGroup(null);
    setGroupChanges(new Map());
    setSelectedSystemKeys([]);
    setGroupError("");
  };

  const createGroup = () => {
    setFieldPage(1);
    setFieldSearch("");
    setEditingGroup(null);
    setGroupName("");
    setGroupDescription("");
    setGroupChanges(new Map());
    setSelectedSystemKeys([]);
    setGroupError("");
    setGroupMode(true);
  };

  const editGroup = (group: AttributeGroup) => {
    setFieldPage(1);
    setFieldSearch("");
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupDescription(group.description || "");
    setGroupChanges(new Map());
    setSelectedSystemKeys([]);
    setGroupError("");
    setGroupMode(true);
  };

  const toggleGroupField = (field: CustomField) => {
    if (field.assigned_system_group_key || (field.group_id && field.group_id !== editingGroup?.id)) return;
    setGroupChanges((current) => {
      const next = new Map(current);
      const initiallySelected = Boolean(editingGroup && field.group_id === editingGroup.id);
      const newSelection = !(next.get(field.id) ?? initiallySelected);
      if (newSelection === initiallySelected) next.delete(field.id);
      else next.set(field.id, newSelection);
      return next;
    });
  };

  const toggleSystemField = (field: typeof systemFields[number]) => {
    if (field.groupKey === `custom:${editingGroup?.id}`) return;
    if (selectedSystemKeys.includes(field.key)) {
      setSelectedSystemKeys(current => current.filter(key => key !== field.key));
      return;
    }
    setSelectedSystemKeys(current => [...current, field.key]);
  };

  const requestSaveGroup = () => {
    if (!groupName.trim()) { setGroupError("Enter a group name."); return; }
    if (selectedSystemKeys.length) setShowMoveConfirmation(true);
    else void saveGroup();
  };

  const saveGroup = async () => {
    if (!groupName.trim() || groupSaving) {
      if (!groupName.trim()) setGroupError("Enter a group name.");
      return;
    }
    setGroupSaving(true);
    setGroupError("");
    let savedGroupId: number | null = null;
    try {
      const groupId = editingGroup?.id ?? null;
      const saved = await saveAttributeGroup(groupId, {
        name: groupName.trim(),
        description: groupDescription.trim(),
        addAttributeIds: Array.from(groupChanges).filter(([, selected]) => selected).map(([id]) => id),
        removeAttributeIds: Array.from(groupChanges).filter(([, selected]) => !selected).map(([id]) => id),
      });
      savedGroupId = saved.id;
      if (selectedSystemKeys.length) await moveSystemAttributes(`custom:${saved.id}`, selectedSystemKeys);
      cancelGroup();
      setGroupRefreshKey((key) => key + 1);
      showToast(editingGroup ? "Group updated successfully." : "Group created successfully.", "success");
    } catch (error: any) {
      if (savedGroupId && !editingGroup) {
        setEditingGroup({ id: savedGroupId, name: groupName.trim(), description: groupDescription.trim(),
          created_at: new Date().toISOString(), attributeCount: 0, sort_order: 0 });
      }
      const message = error.message || "Could not save group.";
      setGroupError(message);
      showToast(message, "error");
    } finally {
      setGroupSaving(false);
    }
  };

  return (
    <div className="bp-list-wrap">
      <CustomAttributeGroupsTab
        key={effectiveUserId}
        refreshKey={groupRefreshKey}
        onCreate={createGroup}
        onEdit={editGroup}
        onEditField={openEditPanel}
        onCreateField={() => openCreatePanel()}
        onAddFieldToGroup={(groupId) => openCreatePanel(groupId)}
        onAddFieldToSystemGroup={openCreateInSystemGroup}
        onDeleteField={(field) => { setFieldToDelete(field); setDeleteConfirmText(""); setShowDeleteModal(true); }}
        onToast={showToast}
        onChanged={() => { setGroupRefreshKey((key) => key + 1); }}
      />
      {groupMode && (
        <div className="cf-group-editor" ref={groupEditorRef}>
          <div><h2>{editingGroup ? "Edit group" : "Create group"}</h2><p>Select attributes below. Fields already in another group can be moved after confirmation.</p></div>
          <div className="cf-group-editor__inputs">
            <label>Group name<input value={groupName} maxLength={120} onChange={(event) => setGroupName(event.target.value)} placeholder="Enter group name" /></label>
            <label>Description (optional)<input value={groupDescription} maxLength={500} onChange={(event) => setGroupDescription(event.target.value)} placeholder="What is this group for?" /></label>
          </div>
          {groupError && <div className="cf-groups__error" role="alert">{groupError}</div>}
          <div className="cf-group-editor__actions"><span>{selectedGroupCount} selected</span><button type="button" className="panel-cancel-btn" disabled={groupSaving} onClick={cancelGroup}>Cancel</button><button type="button" className="panel-create-btn" disabled={groupSaving || !groupName.trim()} onClick={requestSaveGroup}>{groupSaving ? "Saving..." : editingGroup ? "Update group" : "Save group"}</button></div>
        </div>
      )}

      {showMoveConfirmation && <div className="cf-groups__overlay" onMouseDown={() => setShowMoveConfirmation(false)}>
        <div className="cf-groups__dialog" role="alertdialog" aria-modal="true" aria-labelledby="cf-move-title" onMouseDown={(event) => event.stopPropagation()}>
          <h3 id="cf-move-title">Move attributes to {groupName.trim()}?</h3>
          <p>These system attributes already exist in other groups. Creating or updating this group will move them here.</p>
          <div className="cf-groups__members-list">
            {selectedSystemKeys.map(key => {
              const field = systemFields.find(item => item.key === key);
              return field && <div className="cf-groups__member" key={key}><span className="cf-groups__member-name">{field.name}</span><span>From {field.groupName}</span></div>;
            })}
          </div>
          <div className="cf-groups__dialog-actions" style={{ marginTop: 18 }}>
            <button type="button" onClick={() => setShowMoveConfirmation(false)}>Cancel</button>
            <button type="button" className="panel-create-btn" onClick={() => { setShowMoveConfirmation(false); void saveGroup(); }}>Confirm and save</button>
          </div>
        </div>
      </div>}
      {groupMode && <section className="cf-ungrouped-section" aria-label="Select attributes">
          <div className="bp-page-header">
            <div className="bp-page-header__inner">
              <div>
                <h2 className="bp-page-title">
                  {groupMode ? "Select attributes" : "Ungrouped attributes"}
                  <span className="bp-count-pill">{fieldTotal + matchingSystemFields.length}</span>
                </h2>
                <p className="bp-page-sub">
                  {groupMode ? "Choose fields for this group. Existing group assignments stay visible below." : "Attributes not assigned to any group appear here."}
                </p>
              </div>
              <div className="bp-header-actions">
                <button type="button" className="bp-btn-default" onClick={() => openCreatePanel()}>
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
                  onChange={(e) => { setFieldSearch(e.target.value); setFieldPage(1); }}
                />
              </div>
            </div>
            <span style={{ fontSize: "12.5px", color: "var(--bp-ink-faint)" }}>
              {fieldTotal + matchingSystemFields.length} field{fieldTotal + matchingSystemFields.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="bp-rows">
            <div
              className="bp-rows__head"
              style={{ gridTemplateColumns: groupMode ? "36px 14px minmax(0,1.5fr) minmax(0,1fr) 60px" : "14px minmax(0,1.5fr) minmax(0,1fr) 60px" }}
            >
              {groupMode && <div>✓</div>}
              <div />
              <div>Field name</div>
              <div>Type</div>
              <div />
            </div>

            {visibleSystemFields.map(field => (
              <div key={`system-${field.key}`} className={`bp-row${groupMode ? " cf-row--select" : ""}`}
                style={{ gridTemplateColumns: groupMode ? "36px 14px minmax(0,1.5fr) minmax(0,1fr) 60px" : "14px minmax(0,1.5fr) minmax(0,1fr) 60px" }}>
                {groupMode && <div className="cf-row__checkbox"><input type="checkbox"
                  checked={selectedSystemKeys.includes(field.key) || field.groupKey === `custom:${editingGroup?.id}`}
                  disabled={field.groupKey === `custom:${editingGroup?.id}`}
                  onChange={() => toggleSystemField(field)} aria-label={`Move ${field.name} to group`} /></div>}
                <div className="bp-row__rail" />
                <div className="bp-row__name"><span className="bp-row__link">{field.name}</span><span className="cf-row__group-note">System · {field.groupName}</span></div>
                <div className="bp-row__id"><span className="cf-type-badge">{field.type}</span></div>
                <div />
              </div>
            ))}

            {fieldsLoading || fieldsError || (filteredFields.length === 0 && visibleSystemFields.length === 0) ? (
              <div className="bp-rows__msg">{fieldsLoading ? "Loading attributes..." : fieldsError || (groupMode || fieldSearch ? "No fields match your search." : "No ungrouped attributes yet.")}</div>
            ) : (
              filteredFields.map((f) => {
                let parsedOptions: string[] = [];
                if (f.field_type === "dropdown" && f.options_json) {
                  try { parsedOptions = JSON.parse(f.options_json); } catch { parsedOptions = []; }
                }
                return (
                  <div
                    key={f.id}
                    className={`bp-row${groupMode ? " cf-row--select" : ""}`}
                    style={{ gridTemplateColumns: groupMode ? "36px 14px minmax(0,1.5fr) minmax(0,1fr) 60px" : "14px minmax(0,1.5fr) minmax(0,1fr) 60px" }}
                  >
                    {groupMode && <div className="cf-row__checkbox"><input type="checkbox" checked={groupChanges.get(f.id) ?? Boolean(editingGroup && f.group_id === editingGroup.id)} disabled={Boolean(f.assigned_system_group_key || (f.group_id && f.group_id !== editingGroup?.id))} onChange={() => toggleGroupField(f)} aria-label={`Add ${f.field_name} to group`} title={f.assigned_system_group_key || (f.group_id && f.group_id !== editingGroup?.id) ? "Already in another group; drag it between groups to move it" : undefined} /></div>}
                    <div className="bp-row__rail" />
                    <div className="bp-row__name">
                      <button
                        type="button"
                        className="bp-row__link"
                        onClick={() => openEditPanel(f)}
                      >
                        {f.field_name}
                      </button>
                      {groupMode && (f.assigned_system_group_key || (f.group_id && f.group_id !== editingGroup?.id)) && <span className="cf-row__group-note">In another group</span>}
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
            Showing {fieldTotal === 0 ? 0 : (fieldPage - 1) * 20 + 1}–{Math.min(fieldPage * 20, fieldTotal)} of {fieldTotal} field{fieldTotal !== 1 ? "s" : ""}.
          </div>
          {fieldTotal > 20 && <div className="cf-groups__pagination"><button type="button" disabled={fieldPage === 1 || fieldsLoading} onClick={() => setFieldPage((page) => page - 1)}>Previous</button><span>Page {fieldPage} of {Math.ceil(fieldTotal / 20)}</span><button type="button" disabled={fieldPage >= Math.ceil(fieldTotal / 20) || fieldsLoading} onClick={() => setFieldPage((page) => page + 1)}>Next</button></div>}
        </div>
      </section>}

      <CommonSidePanel
        isOpen={showCustomCRMFieldModal}
        onClose={() => dispatch(closePanel())}
        title={isEditMode ? "Edit custom field" : createInGroupId || createInSystemGroupKey ? "Add attribute to group" : "Create custom field"}
        footerContent={
          <>
            <button
              className="panel-cancel-btn"
              onClick={() => dispatch(closePanel())}
            >
              Cancel
            </button>
            {isEditMode && editingField && <button type="button" className="panel-cancel-btn" style={{ color: "var(--btn-danger-bg)" }} onClick={() => {
              setFieldToDelete(editingField);
              setDeleteConfirmText("");
              setShowDeleteModal(true);
              dispatch(closePanel());
            }}>Delete</button>}
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
            <option value="hyperlink">Hyperlink</option>
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

      <ToastMessage show={toast.show} message={toast.message} type={toast.type} onClose={hideToast} duration={6} position="bottom-center" />
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
                className="px-5 py-2 rounded-full"
                style={{
                  background: "var(--btn-muted-bg)",
                  color: "var(--btn-muted-fg)",
                  border: "1.5px solid var(--btn-muted-border)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteField}
                disabled={deleteConfirmText !== "DELETE"}
                className="px-5 py-2 rounded-full"
                style={{
                  background: "var(--btn-danger-bg)",
                  color: "var(--btn-danger-fg)",
                  border: "1px solid var(--btn-danger-border)",
                  cursor: deleteConfirmText === "DELETE" ? "pointer" : "not-allowed",
                  opacity: deleteConfirmText === "DELETE" ? 1 : 0.5,
                }}
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
