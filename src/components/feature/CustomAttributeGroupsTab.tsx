import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, PlusCircle, Trash2 } from "lucide-react";
import {
  AttributeGroup,
  GroupAttribute,
  deleteAttributeGroup,
  getAttributeGroups,
  getGroupAttributes,
  getSystemAttributeGroups,
  moveGroupAttribute,
  moveGroupAttributeToSystem,
  moveSystemAttributes,
  reorderAttributeGroups,
  reorderGroupAttributes,
  reorderMixedGroupAttributes,
  reorderSystemAttributes,
  SystemAttributeGroup,
} from "../../api/customAttributeGroups";

const PAGE_SIZE = 20;

interface GroupMembersState {
  items: GroupAttribute[];
  total: number;
  page: number;
  search: string;
  loading: boolean;
  error: string;
}

const emptyGroupMembers = (): GroupMembersState => ({ items: [], total: 0, page: 1, search: "", loading: false, error: "" });

function moveItem<T extends { id: number }>(items: T[], sourceId: number, targetId: number): T[] {
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return items;
  const reordered = [...items];
  reordered.splice(targetIndex, 0, reordered.splice(sourceIndex, 1)[0]);
  return reordered;
}

function getOptions(optionsJson: string | null): string[] {
  if (!optionsJson) return [];
  try {
    const options = JSON.parse(optionsJson);
    return Array.isArray(options) ? options.map(String) : [];
  } catch {
    return [];
  }
}

interface Props {
  refreshKey: number;
  onCreate: () => void;
  onEdit: (group: AttributeGroup) => void;
  onEditField: (field: GroupAttribute) => void;
  onCreateField: () => void;
  onAddFieldToGroup: (groupId: number) => void;
  onAddFieldToSystemGroup: (groupKey: "personal" | "company") => void;
  onDeleteField: (field: GroupAttribute) => void;
  onChanged: () => void;
  onToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

const CustomAttributeGroupsTab: React.FC<Props> = ({ refreshKey, onCreate, onEdit, onEditField, onCreateField, onAddFieldToGroup, onAddFieldToSystemGroup, onDeleteField, onChanged, onToast }) => {
  const [groups, setGroups] = useState<AttributeGroup[]>([]);
  const [systemGroups, setSystemGroups] = useState<SystemAttributeGroup[]>([]);
  const [openSystemGroups, setOpenSystemGroups] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AttributeGroup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openCustomGroups, setOpenCustomGroups] = useState<number[]>([]);
  const [membersByGroup, setMembersByGroup] = useState<Record<number, GroupMembersState>>({});
  const [systemMembersByGroup, setSystemMembersByGroup] = useState<Record<string, GroupMembersState>>({});
  const [ungroupedOpen, setUngroupedOpen] = useState(true);
  const [ungroupedFields, setUngroupedFields] = useState<GroupAttribute[]>([]);
  const [ungroupedTotal, setUngroupedTotal] = useState(0);
  const [ungroupedPage, setUngroupedPage] = useState(1);
  const [ungroupedSearch, setUngroupedSearch] = useState("");
  const [ungroupedLoading, setUngroupedLoading] = useState(false);
  const [ungroupedError, setUngroupedError] = useState("");
  const [actionMenu, setActionMenu] = useState<{ group: AttributeGroup; top: number; left: number } | null>(null);
  const dragItem = useRef<{ type: "group" | "attribute" | "system"; id: number; key?: string } | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ group: string; row?: string } | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const startDrag = (event: React.DragEvent, type: "group" | "attribute", id: number) => {
    dragItem.current = { type, id };
    setDraggedItem(`${type}:${id}`);
    setDropTarget(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(id));
  };

  const startSystemDrag = (event: React.DragEvent, key: string) => {
    dragItem.current = { type: "system", id: 0, key };
    setDraggedItem(`system:${key}`);
    setDropTarget(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", key);
  };

  const finishDrag = () => {
    dragItem.current = null;
    setDraggedItem(null);
    setDropTarget(null);
  };

  const markDropTarget = (group: string, row?: string) => {
    setDropTarget(current => current?.group === group && current.row === row ? current : { group, row });
  };

  const dropGroup = async (targetId: number) => {
    const source = dragItem.current;
    dragItem.current = null;
    if (!source || source.type !== "group" || source.id === targetId || search || savingOrder) return;
    const reordered = moveItem(groups, source.id, targetId);
    if (reordered === groups) return;
    setGroups(reordered);
    setSavingOrder(true);
    setError("");
    try {
      await reorderAttributeGroups(page, PAGE_SIZE, reordered.map((group) => group.id));
      onChanged();
    } catch (err: any) {
      setGroups(groups);
      const message = err.message || "Could not save group order.";
      setError(message);
      onToast(message, "error");
    } finally { setSavingOrder(false); }
  };

  const dropAttribute = async (groupId: number, targetId: number) => {
    const source = dragItem.current;
    dragItem.current = null;
    const groupMembers = membersByGroup[groupId];
    if (!source || source.type !== "attribute" || source.id === targetId || !groupMembers || groupMembers.search || savingOrder) return;
    const reordered = moveItem(groupMembers.items, source.id, targetId);
    if (reordered === groupMembers.items) return;
    setMembersByGroup(current => ({ ...current, [groupId]: { ...current[groupId], items: reordered, error: "" } }));
    setSavingOrder(true);
    try {
      await reorderGroupAttributes(groupId, groupMembers.page, PAGE_SIZE, reordered.map((member) => member.id));
      onChanged();
    } catch (err: any) {
      const message = err.message || "Could not save attribute order.";
      setMembersByGroup(current => ({ ...current, [groupId]: { ...current[groupId], items: groupMembers.items, error: message } }));
      onToast(message, "error");
    } finally { setSavingOrder(false); }
  };

  const dropSystemField = async (group: SystemAttributeGroup, targetKey: string) => {
    const source = dragItem.current;
    dragItem.current = null;
    if (source?.type !== "system" || !source.key || source.key === targetKey || savingOrder) return;
    const sourceIndex = group.fields.findIndex(field => field.key === source.key);
    const targetIndex = group.fields.findIndex(field => field.key === targetKey);
    if (sourceIndex < 0) {
      try { await moveSystemAttributes(group.key, [source.key]); setSystemGroups(await getSystemAttributeGroups()); onChanged(); }
      catch (err: any) { onToast(err.message || "Could not move system field.", "error"); }
      return;
    }
    if (targetIndex < 0) return;
    const fields = [...group.fields];
    fields.splice(targetIndex, 0, fields.splice(sourceIndex, 1)[0]);
    setSystemGroups(current => current.map(item => item.key === group.key ? { ...item, fields } : item));
    setSavingOrder(true);
    try {
      await reorderSystemAttributes(group.key, fields.map(field => field.key));
    } catch (err: any) {
      setSystemGroups(current => current.map(item => item.key === group.key ? group : item));
      onToast(err.message || "Could not save system field order.", "error");
    } finally { setSavingOrder(false); }
  };

  const dropMixedAttribute = async (groupId: number, targetKey: string, orderedKeys: string[]) => {
    const source = dragItem.current;
    dragItem.current = null;
    if (!source || membersByGroup[groupId]?.search || savingOrder) return;
    const sourceKey = source.type === "system" ? `s:${source.key}` : source.type === "attribute" ? `c:${source.id}` : "";
    const sourceIndex = orderedKeys.indexOf(sourceKey);
    const targetIndex = orderedKeys.indexOf(targetKey);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const next = [...orderedKeys];
    next.splice(targetIndex, 0, next.splice(sourceIndex, 1)[0]);
    setSavingOrder(true);
    try {
      await reorderMixedGroupAttributes(groupId, next);
      onChanged();
    } catch (err: any) {
      onToast(err.message || "Could not save attribute order.", "error");
    } finally { setSavingOrder(false); }
  };

  const dropSystemOnGroup = async (groupKey: string) => {
    const source = dragItem.current;
    dragItem.current = null;
    if (source?.type !== "system" || !source.key || savingOrder) return;
    if (systemGroups.find(group => group.key === groupKey)?.fields.some(field => field.key === source.key)) return;
    try { await moveSystemAttributes(groupKey, [source.key]); setSystemGroups(await getSystemAttributeGroups()); onChanged(); }
    catch (err: any) { onToast(err.message || "Could not move system field.", "error"); }
  };

  const dropAttributeOnGroup = async (destinationGroupId: number | null) => {
    const source = dragItem.current;
    dragItem.current = null;
    if (source?.type !== "attribute" || savingOrder) return;
    setSavingOrder(true);
    try {
      await moveGroupAttribute(source.id, destinationGroupId);
      onChanged();
      onToast(destinationGroupId === null ? "Attribute moved to Ungrouped attributes." : "Attribute moved to group.", "success");
    } catch (err: any) {
      onToast(err.message || "Could not move attribute.", "error");
    } finally { setSavingOrder(false); }
  };

  const dropAttributeOnSystemGroup = async (groupKey: "personal" | "company") => {
    const source = dragItem.current;
    dragItem.current = null;
    if (source?.type !== "attribute" || savingOrder) return;
    setSavingOrder(true);
    try {
      await moveGroupAttributeToSystem(source.id, groupKey);
      onChanged();
      onToast(`Attribute moved to ${groupKey === "personal" ? "Personal" : "Company"}.`, "success");
    } catch (err: any) {
      onToast(err.message || "Could not move attribute.", "error");
    } finally { setSavingOrder(false); }
  };

  useEffect(() => {
    getSystemAttributeGroups().then(setSystemGroups).catch((err) => onToast(err.message, "error"));
  }, [refreshKey]);

  useEffect(() => {
    if (!actionMenu) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!(event.target as Element).closest("[data-group-action-menu], [data-group-action-trigger]")) setActionMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setActionMenu(null); };
    const closeOnScroll = () => setActionMenu(null);
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", closeOnScroll);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", closeOnScroll);
    };
  }, [actionMenu]);

  const toggleActionMenu = (group: AttributeGroup, button: HTMLButtonElement) => {
    if (actionMenu?.group.id === group.id) { setActionMenu(null); return; }
    const rect = button.getBoundingClientRect();
    setActionMenu({
      group,
      top: rect.bottom + 8 + 88 > window.innerHeight ? rect.top - 88 : rect.bottom + 8,
      left: Math.max(8, Math.min(rect.right - 160, window.innerWidth - 168)),
    });
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      getAttributeGroups(page, PAGE_SIZE, search)
        .then((result) => {
          if (!active) return;
          setGroups(result.items);
          setTotal(result.total);
          setError("");
        })
        .catch((err) => { if (active) { const message = err.message || "Could not load groups."; setError(message); onToast(message, "error"); } })
        .finally(() => { if (active) setLoading(false); });
    }, search ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [page, search, refreshKey]);

  const memberQueryKey = openCustomGroups.map(id => {
    const state = membersByGroup[id];
    return `${id}:${state?.page ?? 1}:${state?.search ?? ""}`;
  }).join("|");
  useEffect(() => {
    if (openCustomGroups.length === 0) return;
    let active = true;
    const requests = openCustomGroups.map(id => ({ id, page: membersByGroup[id]?.page ?? 1, search: membersByGroup[id]?.search ?? "" }));
    setMembersByGroup(current => {
      const next = { ...current };
      requests.forEach(({ id }) => { next[id] = { ...(current[id] ?? emptyGroupMembers()), loading: true }; });
      return next;
    });
    const timer = setTimeout(() => {
      requests.forEach(({ id, page, search }) => {
        getGroupAttributes(page, PAGE_SIZE, search, id)
          .then(result => {
            if (!active) return;
            setMembersByGroup(current => ({ ...current, [id]: {
              ...(current[id] ?? emptyGroupMembers()), items: result.items, total: result.total,
              page: page > 1 && result.items.length === 0 ? page - 1 : page,
              loading: false, error: "",
            } }));
          })
          .catch((err) => {
            if (!active) return;
            const message = err.message || "Could not load group attributes.";
            setMembersByGroup(current => ({ ...current, [id]: { ...(current[id] ?? emptyGroupMembers()), loading: false, error: message } }));
            onToast(message, "error");
          });
      });
    }, requests.some(request => request.search) ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [memberQueryKey, refreshKey]);

  const systemMemberQueryKey = openSystemGroups.map(key => {
    const state = systemMembersByGroup[key];
    return `${key}:${state?.page ?? 1}:${state?.search ?? ""}`;
  }).join("|");
  useEffect(() => {
    if (openSystemGroups.length === 0) return;
    let active = true;
    const requests = openSystemGroups.map(key => ({ key, page: systemMembersByGroup[key]?.page ?? 1, search: systemMembersByGroup[key]?.search ?? "" }));
    setSystemMembersByGroup(current => {
      const next = { ...current };
      requests.forEach(({ key }) => { next[key] = { ...(current[key] ?? emptyGroupMembers()), loading: true }; });
      return next;
    });
    const timer = setTimeout(() => {
      requests.forEach(({ key, page, search }) => {
        getGroupAttributes(page, PAGE_SIZE, search, undefined, false, key)
          .then(result => {
            if (!active) return;
            setSystemMembersByGroup(current => ({ ...current, [key]: {
              ...(current[key] ?? emptyGroupMembers()), items: result.items, total: result.total,
              page: page > 1 && result.items.length === 0 ? page - 1 : page,
              loading: false, error: "",
            } }));
          })
          .catch((err) => {
            if (!active) return;
            setSystemMembersByGroup(current => ({ ...current, [key]: { ...(current[key] ?? emptyGroupMembers()), loading: false, error: err.message || "Could not load attributes." } }));
          });
      });
    }, requests.some(request => request.search) ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [systemMemberQueryKey, refreshKey]);

  useEffect(() => {
    let active = true;
    setUngroupedLoading(true);
    const timer = setTimeout(() => {
      getGroupAttributes(ungroupedPage, PAGE_SIZE, ungroupedSearch, undefined, true)
        .then(result => {
          if (!active) return;
          setUngroupedFields(result.items);
          setUngroupedTotal(result.total);
          setUngroupedError("");
          if (ungroupedPage > 1 && result.items.length === 0) setUngroupedPage(page => Math.max(1, page - 1));
        })
        .catch((err) => { if (active) setUngroupedError(err.message || "Could not load ungrouped attributes."); })
        .finally(() => { if (active) setUngroupedLoading(false); });
    }, ungroupedSearch ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [ungroupedPage, ungroupedSearch, refreshKey]);

  const removeGroup = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteAttributeGroup(deleteTarget.id);
      setDeleteTarget(null);
      setPage((current) => total - 1 <= (current - 1) * PAGE_SIZE ? Math.max(1, current - 1) : current);
      onChanged();
    } catch (err: any) {
      const message = err.message || "Could not delete group.";
      setError(message);
      onToast(message, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="cf-groups">
      <h2 className="cf-groups__heading">Attributes</h2>
      <div className="cf-groups__toolbar">
        <div className="cf-groups__search">
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search groups" aria-label="Search groups" />
        </div>
        <div className="cf-groups__toolbar-actions"><span>{total + 3} groups</span><button type="button" className="bp-btn-default" onClick={onCreate}>Create group</button></div>
      </div>
      {error && <div className="cf-groups__error" role="alert">{error}</div>}
      <p className="cf-groups__sort-hint">{savingOrder ? "Saving order..." : search ? "Clear search to rearrange groups." : "Drag a group row to rearrange groups on this page."}</p>
      <div className="cf-groups__cards">
        {systemGroups.filter(group => (group.key === "personal" || group.key === "company") && group.name.toLowerCase().includes(search.toLowerCase())).map(group => {
          const groupKey = group.key as "personal" | "company";
          const customMembers = systemMembersByGroup[group.key] ?? emptyGroupMembers();
          return (
          <section key={group.key} className={`cf-groups__card${openSystemGroups.includes(group.key) ? " is-expanded" : ""}${dropTarget?.group === group.key ? " is-drop-target" : ""}`}
            onDragOver={(event) => { if (dragItem.current?.type === "system" || dragItem.current?.type === "attribute") { event.preventDefault(); markDropTarget(group.key); } }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(current => current?.group === group.key ? null : current); }}
            onDrop={(event) => { setDraggedItem(null); setDropTarget(null); if (dragItem.current?.type === "system") { event.preventDefault(); void dropSystemOnGroup(group.key); } else if (dragItem.current?.type === "attribute") { event.preventDefault(); void dropAttributeOnSystemGroup(groupKey); } }}>
            <div className="cf-groups__card-head">
              <button type="button" className="cf-groups__expand" aria-expanded={openSystemGroups.includes(group.key)}
                onClick={() => setOpenSystemGroups(current => current.includes(group.key) ? current.filter(key => key !== group.key) : [...current, group.key])}>
                <span className="cf-groups__chevron" aria-hidden="true">{openSystemGroups.includes(group.key) ? "▾" : "▸"}</span>
                <span className="cf-groups__card-title"><strong>{group.name}</strong><span className="cf-groups__count">{group.fields.length + (group.customAttributeCount ?? 0)} attributes</span><small>Default group · system fields cannot be edited or deleted</small></span>
              </button>
            </div>
            {openSystemGroups.includes(group.key) && <div className="cf-groups__card-body">
              {customMembers.error && <div className="cf-groups__error" role="alert">{customMembers.error}</div>}
              <p className="cf-groups__sort-hint">Drag a field row to set its order in the contact profile.</p>
              <div className="cf-groups__attribute-table-wrap"><table className="cf-groups__attribute-table cf-groups__attribute-table--actions">
                <thead><tr><th>#</th><th aria-label="Order" /><th>Field name</th><th>Type</th><th>Options / rules</th><th>Actions</th></tr></thead>
                <tbody>{group.fields.map((field, index) => <tr key={field.key} draggable={!savingOrder}
                  className={`${draggedItem === `system:${field.key}` ? "is-dragging" : ""}${dropTarget?.row === `system:${group.key}:${field.key}` ? " is-drop-target" : ""}`}
                  onDragStart={(event) => startSystemDrag(event, field.key)}
                  onDragEnd={finishDrag}
                  onDragOver={(event) => { if (dragItem.current?.type === "system" || dragItem.current?.type === "attribute") { event.preventDefault(); event.stopPropagation(); markDropTarget(group.key, `system:${group.key}:${field.key}`); } }}
                  onDrop={(event) => { event.preventDefault(); event.stopPropagation(); setDraggedItem(null); setDropTarget(null); if (dragItem.current?.type === "attribute") void dropAttributeOnSystemGroup(groupKey); else void dropSystemField(group, field.key); }}>
                  <td>{index + 1}</td><td><span className="cf-groups__handle" aria-hidden="true">⋮⋮</span></td>
                  <td className="cf-groups__field-name">{field.name}</td><td><span className="cf-type-badge">{field.type}</span></td><td>—</td><td />
                </tr>)}
                {customMembers.loading ? <tr><td colSpan={6} className="cf-groups__empty">Loading attributes...</td></tr> :
                  customMembers.items.map((field, index) => <tr key={`c:${field.id}`} draggable={!savingOrder}
                    className={`${draggedItem === `attribute:${field.id}` ? "is-dragging" : ""}${dropTarget?.row === `system:${group.key}:c:${field.id}` ? " is-drop-target" : ""}`}
                    onDragStart={(event) => startDrag(event, "attribute", field.id)}
                    onDragEnd={finishDrag}
                    onDragOver={(event) => { if (dragItem.current?.type === "system" || dragItem.current?.type === "attribute") { event.preventDefault(); event.stopPropagation(); markDropTarget(group.key, `system:${group.key}:c:${field.id}`); } }}
                    onDrop={(event) => { event.preventDefault(); event.stopPropagation(); setDraggedItem(null); setDropTarget(null); if (dragItem.current?.type === "system") void dropSystemOnGroup(groupKey); else if (dragItem.current?.type === "attribute") void dropAttributeOnSystemGroup(groupKey); }}>
                    <td>{group.fields.length + (customMembers.page - 1) * PAGE_SIZE + index + 1}</td>
                    <td><span className="cf-groups__handle" aria-hidden="true">⋮⋮</span></td>
                    <td className="cf-groups__field-name">{field.field_name}</td>
                    <td><span className="cf-type-badge">{field.field_type}</span></td>
                    <td className="cf-groups__options">{getOptions(field.options_json).join(", ") || "—"}</td>
                    <td><div className="cf-groups__row-actions">
                      <button type="button" aria-label={`Edit ${field.field_name}`} title="Edit attribute" onClick={() => onEditField(field)}><Pencil size={15} /></button>
                      <button type="button" className="is-danger" aria-label={`Delete ${field.field_name}`} title="Delete attribute" onClick={() => onDeleteField(field)}><Trash2 size={15} /></button>
                    </div></td>
                  </tr>)}
                </tbody>
              </table></div>
              <button type="button" className="cf-groups__add-attribute" onClick={() => onAddFieldToSystemGroup(groupKey)}><PlusCircle size={18} />Add attribute to this group</button>
              {customMembers.total > PAGE_SIZE && <div className="cf-groups__pager"><span>{customMembers.total} custom attributes</span><div>
                <button type="button" disabled={customMembers.page === 1 || customMembers.loading} onClick={() => setSystemMembersByGroup(current => ({ ...current, [group.key]: { ...current[group.key], page: customMembers.page - 1 } }))}>Previous</button>
                <span>Page {customMembers.page} of {Math.ceil(customMembers.total / PAGE_SIZE)}</span>
                <button type="button" disabled={customMembers.page * PAGE_SIZE >= customMembers.total || customMembers.loading} onClick={() => setSystemMembersByGroup(current => ({ ...current, [group.key]: { ...current[group.key], page: customMembers.page + 1 } }))}>Next</button>
              </div></div>}
            </div>}
          </section>
        ); })}
        {loading ? <div className="cf-groups__empty">Loading groups...</div> :
          groups.length === 0 ? null :
          groups.map((group) => {
            const expanded = openCustomGroups.includes(group.id);
            const groupMembers = membersByGroup[group.id] ?? emptyGroupMembers();
            const { items: members, total: memberTotal, page: memberPage, search: memberSearch, loading: membersLoading, error: memberError } = groupMembers;
            const systemFields = memberPage === 1 ? (systemGroups.find(item => item.key === `custom:${group.id}`)?.fields || []) : [];
            const mixedMembers = [
              ...systemFields.filter(field => field.name.toLowerCase().includes(memberSearch.toLowerCase())).map(field => ({ key: `s:${field.key}`, name: field.name, type: field.type, options: "", order: field.order, id: 0, systemKey: field.key, customField: null as GroupAttribute | null })),
              ...members.map(member => ({ key: `c:${member.id}`, name: member.field_name, type: member.field_type, options: getOptions(member.options_json).join(", "), order: member.sort_order, id: member.id, systemKey: "", customField: member as GroupAttribute | null })),
            ].sort((left, right) => left.order - right.order || left.key.localeCompare(right.key));
            return <section key={group.id} className={`cf-groups__card${expanded ? " is-expanded" : ""}${draggedItem === `group:${group.id}` ? " is-dragging" : ""}${dropTarget?.group === `custom:${group.id}` ? " is-drop-target" : ""}`}
              onDragOver={(event) => { if (dragItem.current) { event.preventDefault(); markDropTarget(`custom:${group.id}`); } }}
              onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(current => current?.group === `custom:${group.id}` ? null : current); }}
              onDrop={(event) => { event.preventDefault(); setDraggedItem(null); setDropTarget(null); if (dragItem.current?.type === "group") void dropGroup(group.id); else if (dragItem.current?.type === "system") void dropSystemOnGroup(`custom:${group.id}`); else if (dragItem.current?.type === "attribute") void dropAttributeOnGroup(group.id); }}>
              <div className="cf-groups__card-head" draggable={!search && !savingOrder}
                onDragStart={(event) => startDrag(event, "group", group.id)}
                onDragEnd={finishDrag}
                title={search ? "Clear search to reorder" : "Drag row to reorder"}>
                <span className="cf-groups__handle" aria-hidden="true">⋮⋮</span>
                <button type="button" className="cf-groups__expand" aria-expanded={expanded}
                  aria-label={`${expanded ? "Hide" : "Show"} attributes in ${group.name}`}
                  onClick={() => {
                    setOpenCustomGroups(current => current.includes(group.id) ? current.filter(id => id !== group.id) : [...current, group.id]);
                    setMembersByGroup(current => ({ ...current, [group.id]: current[group.id] ?? emptyGroupMembers() }));
                  }}>
                  <span className="cf-groups__chevron" aria-hidden="true">{expanded ? "▾" : "▸"}</span>
                  <span className="cf-groups__card-title"><strong>{group.name}</strong><span className="cf-groups__count">{group.attributeCount + (systemGroups.find(item => item.key === `custom:${group.id}`)?.fields.length || 0)} attributes</span><small>{group.description || "No description"}</small></span>
                </button>
                <button type="button" data-group-action-trigger className="cf-groups__action-button"
                  aria-label={`Actions for ${group.name}`} aria-haspopup="menu" aria-expanded={actionMenu?.group.id === group.id}
                  onClick={(event) => toggleActionMenu(group, event.currentTarget)}>⋮</button>
              </div>
              {expanded && <div className="cf-groups__card-body">
                {memberError && <div className="cf-groups__error" role="alert">{memberError}</div>}
                {memberTotal > PAGE_SIZE || memberSearch ? <div className="cf-groups__search cf-groups__member-search"><input value={memberSearch} onChange={(event) => setMembersByGroup(current => ({ ...current, [group.id]: { ...(current[group.id] ?? emptyGroupMembers()), search: event.target.value, page: 1 } }))} placeholder="Search attributes" aria-label={`Search attributes in ${group.name}`} /></div> : null}
                <p className="cf-groups__sort-hint">{savingOrder ? "Saving order..." : memberSearch ? "Clear search to rearrange attributes." : "Drag an attribute row to rearrange attributes on this page."}</p>
                <div className="cf-groups__attribute-table-wrap"><table className="cf-groups__attribute-table cf-groups__attribute-table--actions">
                  <thead><tr><th>#</th><th aria-label="Order" /><th>Field name</th><th>Type</th><th>Options / rules</th><th>Actions</th></tr></thead>
                  <tbody>{membersLoading ? <tr><td colSpan={6} className="cf-groups__empty">Loading attributes...</td></tr> :
                    mixedMembers.length === 0 ? <tr><td colSpan={6} className="cf-groups__empty">No attributes found.</td></tr> :
                    mixedMembers.map((member, index) => <tr key={member.key} draggable={!memberSearch && !savingOrder}
                      className={`${draggedItem === (member.systemKey ? `system:${member.systemKey}` : `attribute:${member.id}`) ? "is-dragging" : ""}${dropTarget?.row === `custom:${group.id}:${member.key}` ? " is-drop-target" : ""}`}
                      onDragStart={(event) => { if (member.systemKey) startSystemDrag(event, member.systemKey); else startDrag(event, "attribute", member.id); }}
                      onDragEnd={finishDrag}
                      onDragOver={(event) => { if (dragItem.current?.type === "attribute" || dragItem.current?.type === "system") { event.preventDefault(); event.stopPropagation(); markDropTarget(`custom:${group.id}`, `custom:${group.id}:${member.key}`); } }}
                      onDrop={(event) => { event.preventDefault(); event.stopPropagation(); setDraggedItem(null); setDropTarget(null); const source = dragItem.current; const sourceKey = source?.type === "attribute" ? `c:${source.id}` : source?.type === "system" ? `s:${source.key}` : ""; if (source?.type === "attribute" && !mixedMembers.some(item => item.key === sourceKey)) void dropAttributeOnGroup(group.id); else if (source?.type === "system" && !mixedMembers.some(item => item.key === sourceKey)) void dropSystemOnGroup(`custom:${group.id}`); else if (memberPage === 1) void dropMixedAttribute(group.id, member.key, mixedMembers.map(item => item.key)); else if (member.id) void dropAttribute(group.id, member.id); }}>
                      <td>{(memberPage - 1) * PAGE_SIZE + index + 1}</td>
                      <td><span className="cf-groups__handle" aria-hidden="true">⋮⋮</span></td>
                      <td className="cf-groups__field-name">{member.customField ? <button type="button" className="cf-groups__field-link" onClick={() => onEditField(member.customField!)}>{member.name}</button> : <>{member.name}<span className="cf-row__group-note">System</span></>}</td>
                      <td><span className="cf-type-badge">{member.type}</span></td>
                      <td className="cf-groups__options">{member.options || "—"}</td>
                      <td>{member.customField && <div className="cf-groups__row-actions">
                        <button type="button" aria-label={`Edit ${member.name}`} title="Edit attribute" onClick={() => onEditField(member.customField!)}><Pencil size={15} /></button>
                        <button type="button" className="is-danger" aria-label={`Delete ${member.name}`} title="Delete attribute" onClick={() => onDeleteField(member.customField!)}><Trash2 size={15} /></button>
                      </div>}</td>
                    </tr>)}</tbody>
                </table></div>
                <button type="button" className="cf-groups__add-attribute" onClick={() => onAddFieldToGroup(group.id)}><PlusCircle size={18} />Add attribute to this group</button>
                {memberTotal > PAGE_SIZE && <div className="cf-groups__pager"><span>{memberTotal} attributes</span><div><button type="button" disabled={memberPage === 1 || membersLoading} onClick={() => setMembersByGroup(current => ({ ...current, [group.id]: { ...current[group.id], page: memberPage - 1 } }))}>Previous</button><span>Page {memberPage} of {Math.max(1, Math.ceil(memberTotal / PAGE_SIZE))}</span><button type="button" disabled={memberPage * PAGE_SIZE >= memberTotal || membersLoading} onClick={() => setMembersByGroup(current => ({ ...current, [group.id]: { ...current[group.id], page: memberPage + 1 } }))}>Next</button></div></div>}
              </div>}
            </section>;
          })}
        {"Ungrouped attributes".toLowerCase().includes(search.toLowerCase()) && <section className={`cf-groups__card${ungroupedOpen ? " is-expanded" : ""}${dropTarget?.group === "ungrouped" ? " is-drop-target" : ""}`}
          onDragOver={(event) => { if (dragItem.current?.type === "attribute") { event.preventDefault(); markDropTarget("ungrouped"); } }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(current => current?.group === "ungrouped" ? null : current); }}
          onDrop={(event) => { if (dragItem.current?.type === "attribute") { event.preventDefault(); setDraggedItem(null); setDropTarget(null); void dropAttributeOnGroup(null); } }}>
          <div className="cf-groups__card-head">
            <button type="button" className="cf-groups__expand" aria-expanded={ungroupedOpen}
              aria-label={`${ungroupedOpen ? "Hide" : "Show"} ungrouped attributes`} onClick={() => setUngroupedOpen(open => !open)}>
              <span className="cf-groups__chevron" aria-hidden="true">{ungroupedOpen ? "▾" : "▸"}</span>
              <span className="cf-groups__card-title"><strong>Ungrouped attributes</strong><span className="cf-groups__count">{ungroupedTotal} attributes</span><small>Fields not assigned to a group</small></span>
            </button>
          </div>
          {ungroupedOpen && <div className="cf-groups__card-body">
            <div className="cf-groups__search cf-groups__member-search"><input value={ungroupedSearch}
              onChange={(event) => { setUngroupedSearch(event.target.value); setUngroupedPage(1); }}
              placeholder="Search ungrouped attributes" aria-label="Search ungrouped attributes" /></div>
            {ungroupedError && <div className="cf-groups__error" role="alert">{ungroupedError}</div>}
            <div className="cf-groups__attribute-table-wrap"><table className="cf-groups__attribute-table cf-groups__attribute-table--actions">
              <thead><tr><th>#</th><th aria-label="Order" /><th>Field name</th><th>Type</th><th>Options / rules</th><th>Actions</th></tr></thead>
              <tbody>{ungroupedLoading ? <tr><td colSpan={6} className="cf-groups__empty">Loading attributes...</td></tr> :
                ungroupedFields.length === 0 ? <tr><td colSpan={6} className="cf-groups__empty">No ungrouped attributes found.</td></tr> :
                ungroupedFields.map((field, index) => <tr key={field.id} draggable={!savingOrder}
                  className={draggedItem === `attribute:${field.id}` ? "is-dragging" : ""}
                  onDragStart={(event) => startDrag(event, "attribute", field.id)}
                  onDragEnd={finishDrag}>
                  <td>{(ungroupedPage - 1) * PAGE_SIZE + index + 1}</td><td><span className="cf-groups__handle" aria-hidden="true">⋮⋮</span></td>
                  <td className="cf-groups__field-name"><button type="button" className="cf-groups__field-link" onClick={() => onEditField(field)}>{field.field_name}</button></td>
                  <td><span className="cf-type-badge">{field.field_type}</span></td>
                  <td className="cf-groups__options">{getOptions(field.options_json).join(", ") || "—"}</td>
                  <td><div className="cf-groups__row-actions">
                    <button type="button" aria-label={`Edit ${field.field_name}`} title="Edit attribute" onClick={() => onEditField(field)}><Pencil size={15} /></button>
                    <button type="button" className="is-danger" aria-label={`Delete ${field.field_name}`} title="Delete attribute" onClick={() => onDeleteField(field)}><Trash2 size={15} /></button>
                  </div></td>
                </tr>)}</tbody>
            </table></div>
            <button type="button" className="cf-groups__add-attribute" onClick={onCreateField}><PlusCircle size={18} />Add attribute</button>
            {ungroupedTotal > PAGE_SIZE && <div className="cf-groups__pager"><span>{ungroupedTotal} attributes</span><div>
              <button type="button" disabled={ungroupedPage === 1 || ungroupedLoading} onClick={() => setUngroupedPage(page => page - 1)}>Previous</button>
              <span>Page {ungroupedPage} of {Math.ceil(ungroupedTotal / PAGE_SIZE)}</span>
              <button type="button" disabled={ungroupedPage * PAGE_SIZE >= ungroupedTotal || ungroupedLoading} onClick={() => setUngroupedPage(page => page + 1)}>Next</button>
            </div></div>}
          </div>}
        </section>}
      </div>
      {actionMenu && createPortal(
        <div data-group-action-menu role="menu" aria-label={`Actions for ${actionMenu.group.name}`} className="cf-groups__action-menu" style={{ top: actionMenu.top, left: actionMenu.left }}>
          <button type="button" role="menuitem" onClick={() => { const group = actionMenu.group; setActionMenu(null); onEdit(group); }}>Edit group</button>
          <button type="button" role="menuitem" className="cf-groups__action-menu-delete" onClick={() => { setDeleteTarget(actionMenu.group); setActionMenu(null); }}>Delete group</button>
        </div>, document.body
      )}
      <div className="cf-groups__pager">
        <span>Showing {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
        <div><button type="button" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span><button type="button" disabled={page * PAGE_SIZE >= total || loading} onClick={() => setPage(page + 1)}>Next</button></div>
      </div>

      {deleteTarget && <div className="cf-groups__overlay" onMouseDown={() => !deleting && setDeleteTarget(null)}>
        <div className="cf-groups__dialog cf-groups__dialog--small" role="dialog" aria-modal="true" aria-label="Delete group" onMouseDown={(event) => event.stopPropagation()}>
          <h3>Delete group?</h3><p>“{deleteTarget.name}” will be deleted. Its attributes will become ungrouped.</p>
          <div className="cf-groups__dialog-actions"><button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)}>Cancel</button><button type="button" className="cf-groups__delete" disabled={deleting} onClick={removeGroup}>{deleting ? "Deleting..." : "Delete group"}</button></div>
        </div>
      </div>}
    </div>
  );
};

export default CustomAttributeGroupsTab;
