import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AttributeGroup,
  GroupAttribute,
  deleteAttributeGroup,
  getAttributeGroups,
  getGroupAttributes,
  getSystemAttributeGroups,
  moveSystemAttributes,
  reorderAttributeGroups,
  reorderGroupAttributes,
  reorderMixedGroupAttributes,
  reorderSystemAttributes,
  SystemAttributeGroup,
} from "../../api/customAttributeGroups";

const PAGE_SIZE = 20;

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
  onChanged: () => void;
  onToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

const CustomAttributeGroupsTab: React.FC<Props> = ({ refreshKey, onCreate, onEdit, onChanged, onToast }) => {
  const [groups, setGroups] = useState<AttributeGroup[]>([]);
  const [systemGroups, setSystemGroups] = useState<SystemAttributeGroup[]>([]);
  const [openSystemGroup, setOpenSystemGroup] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AttributeGroup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewGroup, setViewGroup] = useState<AttributeGroup | null>(null);
  const [members, setMembers] = useState<GroupAttribute[]>([]);
  const [memberTotal, setMemberTotal] = useState(0);
  const [memberPage, setMemberPage] = useState(1);
  const [memberSearch, setMemberSearch] = useState("");
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [actionMenu, setActionMenu] = useState<{ group: AttributeGroup; top: number; left: number } | null>(null);
  const dragItem = useRef<{ type: "group" | "attribute" | "system"; id: number; key?: string } | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const startDrag = (event: React.DragEvent, type: "group" | "attribute", id: number) => {
    dragItem.current = { type, id };
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(id));
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

  const dropAttribute = async (targetId: number) => {
    const source = dragItem.current;
    dragItem.current = null;
    if (!source || source.type !== "attribute" || source.id === targetId || memberSearch || savingOrder || !viewGroup) return;
    const reordered = moveItem(members, source.id, targetId);
    if (reordered === members) return;
    setMembers(reordered);
    setSavingOrder(true);
    setMemberError("");
    try {
      await reorderGroupAttributes(viewGroup.id, memberPage, PAGE_SIZE, reordered.map((member) => member.id));
      onChanged();
    } catch (err: any) {
      setMembers(members);
      const message = err.message || "Could not save attribute order.";
      setMemberError(message);
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
      try { await moveSystemAttributes(group.key, [source.key]); setSystemGroups(await getSystemAttributeGroups()); }
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

  const dropMixedAttribute = async (targetKey: string, orderedKeys: string[]) => {
    const source = dragItem.current;
    dragItem.current = null;
    if (!viewGroup || !source || memberSearch || savingOrder) return;
    const sourceKey = source.type === "system" ? `s:${source.key}` : source.type === "attribute" ? `c:${source.id}` : "";
    const sourceIndex = orderedKeys.indexOf(sourceKey);
    const targetIndex = orderedKeys.indexOf(targetKey);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
    const next = [...orderedKeys];
    next.splice(targetIndex, 0, next.splice(sourceIndex, 1)[0]);
    setSavingOrder(true);
    try {
      await reorderMixedGroupAttributes(viewGroup.id, next);
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
    try { await moveSystemAttributes(groupKey, [source.key]); setSystemGroups(await getSystemAttributeGroups()); }
    catch (err: any) { onToast(err.message || "Could not move system field.", "error"); }
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

  useEffect(() => {
    if (!viewGroup) return;
    let active = true;
    setMembersLoading(true);
    const timer = setTimeout(() => {
      getGroupAttributes(memberPage, PAGE_SIZE, memberSearch, viewGroup.id)
        .then((result) => {
          if (!active) return;
          setMembers(result.items);
          setMemberTotal(result.total);
          setMemberError("");
        })
        .catch((err) => { if (active) { const message = err.message || "Could not load group attributes."; setMemberError(message); onToast(message, "error"); } })
        .finally(() => { if (active) setMembersLoading(false); });
    }, memberSearch ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [viewGroup, memberPage, memberSearch, refreshKey]);

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
      <div className="cf-groups__toolbar">
        <div className="cf-groups__search">
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search groups" aria-label="Search groups" />
        </div>
        <div className="cf-groups__toolbar-actions"><span>{total + 2} groups</span><button type="button" className="bp-btn-default" onClick={onCreate}>Create group</button></div>
      </div>
      {error && <div className="cf-groups__error" role="alert">{error}</div>}
      <p className="cf-groups__sort-hint">{savingOrder ? "Saving order..." : search ? "Clear search to rearrange groups." : "Drag the handle to rearrange groups on this page."}</p>
      <div className="cf-groups__cards">
        {systemGroups.filter(group => (group.key === "personal" || group.key === "company") && group.name.toLowerCase().includes(search.toLowerCase())).map(group => (
          <section key={group.key} className={`cf-groups__card${openSystemGroup === group.key ? " is-expanded" : ""}`}
            onDragOver={(event) => { if (dragItem.current?.type === "system") event.preventDefault(); }}
            onDrop={(event) => { if (dragItem.current?.type === "system") { event.preventDefault(); void dropSystemOnGroup(group.key); } }}>
            <div className="cf-groups__card-head">
              <button type="button" className="cf-groups__expand" aria-expanded={openSystemGroup === group.key}
                onClick={() => setOpenSystemGroup(openSystemGroup === group.key ? null : group.key)}>
                <span className="cf-groups__chevron" aria-hidden="true">{openSystemGroup === group.key ? "▾" : "▸"}</span>
                <span className="cf-groups__card-title"><strong>{group.name}</strong><span className="cf-groups__count">{group.fields.length} system fields</span><small>Default group · fields cannot be edited or deleted</small></span>
              </button>
            </div>
            {openSystemGroup === group.key && <div className="cf-groups__card-body">
              <p className="cf-groups__sort-hint">Drag fields to set their order in the contact profile.</p>
              <div className="cf-groups__attribute-table-wrap"><table className="cf-groups__attribute-table">
                <thead><tr><th>#</th><th aria-label="Order" /><th>Field name</th><th>Type</th><th>Options / rules</th></tr></thead>
                <tbody>{group.fields.map((field, index) => <tr key={field.key}
                  onDragOver={(event) => { if (dragItem.current?.type === "system") event.preventDefault(); }}
                  onDrop={(event) => { event.preventDefault(); event.stopPropagation(); void dropSystemField(group, field.key); }}>
                  <td>{index + 1}</td><td><span className="cf-groups__handle" draggable={!savingOrder}
                    onDragStart={(event) => { dragItem.current = { type: "system", id: 0, key: field.key }; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", field.key); }}
                    onDragEnd={() => { dragItem.current = null; }} aria-label={`Drag ${field.name} to reorder`}>⋮⋮</span></td>
                  <td className="cf-groups__field-name">{field.name}</td><td><span className="cf-type-badge">{field.type}</span></td><td>—</td>
                </tr>)}</tbody>
              </table></div>
            </div>}
          </section>
        ))}
        {loading ? <div className="cf-groups__empty">Loading groups...</div> :
          groups.length === 0 ? <div className="cf-groups__empty">{search ? "No groups match your search." : "No groups created yet."}</div> :
          groups.map((group) => {
            const expanded = viewGroup?.id === group.id;
            const systemFields = memberPage === 1 ? (systemGroups.find(item => item.key === `custom:${group.id}`)?.fields || []) : [];
            const mixedMembers = [
              ...systemFields.filter(field => field.name.toLowerCase().includes(memberSearch.toLowerCase())).map(field => ({ key: `s:${field.key}`, name: field.name, type: field.type, options: "", order: field.order, id: 0, systemKey: field.key })),
              ...members.map(member => ({ key: `c:${member.id}`, name: member.field_name, type: member.field_type, options: getOptions(member.options_json).join(", "), order: member.sort_order, id: member.id, systemKey: "" })),
            ].sort((left, right) => left.order - right.order || left.key.localeCompare(right.key));
            return <section key={group.id} className={`cf-groups__card${expanded ? " is-expanded" : ""}`}
              onDragOver={(event) => { if (dragItem.current?.type === "group" || dragItem.current?.type === "system") event.preventDefault(); }}
              onDrop={(event) => { if (dragItem.current?.type === "group") { event.preventDefault(); void dropGroup(group.id); } else if (dragItem.current?.type === "system") { event.preventDefault(); void dropSystemOnGroup(`custom:${group.id}`); } }}>
              <div className="cf-groups__card-head">
                <span className="cf-groups__handle" draggable={!search && !savingOrder}
                  onDragStart={(event) => startDrag(event, "group", group.id)}
                  onDragEnd={() => { dragItem.current = null; }}
                  title={search ? "Clear search to reorder" : "Drag to reorder"}
                  aria-label={`Drag ${group.name} to reorder`}>⋮⋮</span>
                <button type="button" className="cf-groups__expand" aria-expanded={expanded}
                  aria-label={`${expanded ? "Hide" : "Show"} attributes in ${group.name}`}
                  onClick={() => { setMemberError(""); setViewGroup(expanded ? null : group); setMemberSearch(""); setMemberPage(1); }}>
                  <span className="cf-groups__chevron" aria-hidden="true">{expanded ? "▾" : "▸"}</span>
                  <span className="cf-groups__card-title"><strong>{group.name}</strong><span className="cf-groups__count">{group.attributeCount + (systemGroups.find(item => item.key === `custom:${group.id}`)?.fields.length || 0)} attributes</span><small>{group.description || "No description"}</small></span>
                </button>
                <button type="button" data-group-action-trigger className="cf-groups__action-button"
                  aria-label={`Actions for ${group.name}`} aria-haspopup="menu" aria-expanded={actionMenu?.group.id === group.id}
                  onClick={(event) => toggleActionMenu(group, event.currentTarget)}>⋮</button>
              </div>
              {expanded && <div className="cf-groups__card-body">
                {memberError && <div className="cf-groups__error" role="alert">{memberError}</div>}
                {memberTotal > PAGE_SIZE || memberSearch ? <div className="cf-groups__search cf-groups__member-search"><input value={memberSearch} onChange={(event) => { setMemberSearch(event.target.value); setMemberPage(1); }} placeholder="Search attributes" aria-label={`Search attributes in ${group.name}`} /></div> : null}
                <p className="cf-groups__sort-hint">{savingOrder ? "Saving order..." : memberSearch ? "Clear search to rearrange attributes." : "Drag the handle to rearrange attributes on this page."}</p>
                <div className="cf-groups__attribute-table-wrap"><table className="cf-groups__attribute-table">
                  <thead><tr><th>#</th><th aria-label="Order" /><th>Field name</th><th>Type</th><th>Options / rules</th></tr></thead>
                  <tbody>{membersLoading ? <tr><td colSpan={5} className="cf-groups__empty">Loading attributes...</td></tr> :
                    mixedMembers.length === 0 ? <tr><td colSpan={5} className="cf-groups__empty">No attributes found.</td></tr> :
                    mixedMembers.map((member, index) => <tr key={member.key}
                      onDragOver={(event) => { if (dragItem.current?.type === "attribute" || dragItem.current?.type === "system") event.preventDefault(); }}
                      onDrop={(event) => { event.preventDefault(); event.stopPropagation(); if (memberPage === 1) void dropMixedAttribute(member.key, mixedMembers.map(item => item.key)); else if (member.id) void dropAttribute(member.id); }}>
                      <td>{(memberPage - 1) * PAGE_SIZE + index + 1}</td>
                      <td><span className="cf-groups__handle" draggable={!memberSearch && !savingOrder}
                        onDragStart={(event) => { if (member.systemKey) { dragItem.current = { type: "system", id: 0, key: member.systemKey }; event.dataTransfer.setData("text/plain", member.key); } else startDrag(event, "attribute", member.id); }}
                        onDragEnd={() => { dragItem.current = null; }} title={memberSearch ? "Clear search to reorder" : "Drag to reorder"}
                        aria-label={`Drag ${member.name} to reorder`}>⋮⋮</span></td>
                      <td className="cf-groups__field-name">{member.name}{member.systemKey && <span className="cf-row__group-note">System</span>}</td>
                      <td><span className="cf-type-badge">{member.type}</span></td>
                      <td className="cf-groups__options">{member.options || "—"}</td>
                    </tr>)}</tbody>
                </table></div>
                {memberTotal > PAGE_SIZE && <div className="cf-groups__pager"><span>{memberTotal} attributes</span><div><button type="button" disabled={memberPage === 1 || membersLoading} onClick={() => setMemberPage(memberPage - 1)}>Previous</button><span>Page {memberPage} of {Math.max(1, Math.ceil(memberTotal / PAGE_SIZE))}</span><button type="button" disabled={memberPage * PAGE_SIZE >= memberTotal || membersLoading} onClick={() => setMemberPage(memberPage + 1)}>Next</button></div></div>}
              </div>}
            </section>;
          })}
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
