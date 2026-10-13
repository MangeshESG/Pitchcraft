import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GripVertical, ListTree, MoreVertical, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  AttributeGroup,
  GroupAttribute,
  deleteAttributeGroup,
  getAttributeGroups,
  getGroupAttributes,
  reorderAttributeGroups,
  reorderGroupAttributes,
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

interface Props {
  refreshKey: number;
  onCreate: () => void;
  onEdit: (group: AttributeGroup) => void;
  onChanged: () => void;
  onToast: (message: string, type: "success" | "error" | "info" | "warning") => void;
}

const CustomAttributeGroupsTab: React.FC<Props> = ({ refreshKey, onCreate, onEdit, onChanged, onToast }) => {
  const [groups, setGroups] = useState<AttributeGroup[]>([]);
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
  const dragItem = useRef<{ type: "group" | "attribute"; id: number } | null>(null);
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
          <Search size={16} aria-hidden="true" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search groups" aria-label="Search groups" />
        </div>
        <div className="cf-groups__toolbar-actions"><span>{total} group{total === 1 ? "" : "s"}</span><button type="button" className="bp-btn-default" onClick={onCreate}><Plus size={16} /> Create group</button></div>
      </div>
      {error && <div className="cf-groups__error" role="alert">{error}</div>}
      <p className="cf-groups__sort-hint">{savingOrder ? "Saving order..." : search ? "Clear search to rearrange groups." : "Drag the handle to rearrange groups on this page."}</p>
      <div className="cf-groups__table-wrap">
        <table className="cf-groups__table">
          <thead><tr><th aria-label="Order" /><th>Group name</th><th>Description</th><th>Attributes</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="cf-groups__empty">Loading groups...</td></tr> :
              groups.length === 0 ? <tr><td colSpan={5} className="cf-groups__empty">{search ? "No groups match your search." : "No groups created yet."}</td></tr> :
              groups.map((group) => (
                <tr key={group.id} onDragOver={(event) => { if (dragItem.current?.type === "group") event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); void dropGroup(group.id); }}>
                  <td className="cf-groups__drag-cell"><span draggable={!search && !savingOrder} onDragStart={(event) => startDrag(event, "group", group.id)} onDragEnd={() => { dragItem.current = null; }} title={search ? "Clear search to reorder" : "Drag to reorder"} aria-label={`Drag ${group.name} to reorder`}><GripVertical size={17} /></span></td>
                  <td className="cf-groups__name">{group.name}</td>
                  <td className="cf-groups__description">{group.description || "—"}</td>
                  <td>
                    <button type="button" className="cf-groups__members-btn" title={`View attributes in ${group.name}`} aria-label={`View attributes in ${group.name}`} onClick={() => { setMemberError(""); setViewGroup(group); setMemberSearch(""); setMemberPage(1); }}>
                      <ListTree size={18} aria-hidden="true" /> <span>{group.attributeCount}</span>
                    </button>
                  </td>
                  <td>
                    <div className="cf-groups__action-wrap">
                      <button type="button" data-group-action-trigger className="cf-groups__action-button" aria-label={`Actions for ${group.name}`} aria-haspopup="menu" aria-expanded={actionMenu?.group.id === group.id} onClick={(event) => toggleActionMenu(group, event.currentTarget)}><MoreVertical size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {actionMenu && createPortal(
        <div data-group-action-menu role="menu" aria-label={`Actions for ${actionMenu.group.name}`} className="cf-groups__action-menu" style={{ top: actionMenu.top, left: actionMenu.left }}>
          <button type="button" role="menuitem" onClick={() => { const group = actionMenu.group; setActionMenu(null); onEdit(group); }}><Pencil size={16} /> Edit</button>
          <button type="button" role="menuitem" className="cf-groups__action-menu-delete" onClick={() => { setDeleteTarget(actionMenu.group); setActionMenu(null); }}><Trash2 size={16} /> Delete</button>
        </div>, document.body
      )}
      <div className="cf-groups__pager">
        <span>Showing {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
        <div><button type="button" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span><button type="button" disabled={page * PAGE_SIZE >= total || loading} onClick={() => setPage(page + 1)}>Next</button></div>
      </div>

      {viewGroup && <div className="cf-groups__overlay" onMouseDown={() => setViewGroup(null)}>
        <div className="cf-groups__dialog" role="dialog" aria-modal="true" aria-label={`${viewGroup.name} attributes`} onMouseDown={(event) => event.stopPropagation()}>
          <div className="cf-groups__dialog-head"><div><h3>{viewGroup.name}</h3><p>Attributes in this group</p></div><button type="button" onClick={() => setViewGroup(null)} aria-label="Close">×</button></div>
          {memberError && <div className="cf-groups__error" role="alert">{memberError}</div>}
          <p className="cf-groups__sort-hint">{savingOrder ? "Saving order..." : memberSearch ? "Clear search to rearrange attributes." : "Drag the handle to rearrange attributes on this page."}</p>
          <div className="cf-groups__search"><Search size={16} aria-hidden="true" /><input value={memberSearch} onChange={(event) => { setMemberSearch(event.target.value); setMemberPage(1); }} placeholder="Search attributes" aria-label="Search attributes" /></div>
          <div className="cf-groups__members-list">
            {membersLoading ? <div className="cf-groups__empty">Loading attributes...</div> : members.length === 0 ? <div className="cf-groups__empty">No attributes found.</div> : members.map((member) => <div className="cf-groups__member" key={member.id} onDragOver={(event) => { if (dragItem.current?.type === "attribute") event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); void dropAttribute(member.id); }}><span className="cf-groups__drag-cell" draggable={!memberSearch && !savingOrder} onDragStart={(event) => startDrag(event, "attribute", member.id)} onDragEnd={() => { dragItem.current = null; }} title={memberSearch ? "Clear search to reorder" : "Drag to reorder"} aria-label={`Drag ${member.field_name} to reorder`}><GripVertical size={17} /></span><span className="cf-groups__member-name">{member.field_name}</span><span className="cf-type-badge">{member.field_type}</span></div>)}
          </div>
          <div className="cf-groups__pager"><span>{memberTotal} attribute{memberTotal === 1 ? "" : "s"}</span><div><button type="button" disabled={memberPage === 1 || membersLoading} onClick={() => setMemberPage(memberPage - 1)}>Previous</button><span>Page {memberPage} of {Math.max(1, Math.ceil(memberTotal / PAGE_SIZE))}</span><button type="button" disabled={memberPage * PAGE_SIZE >= memberTotal || membersLoading} onClick={() => setMemberPage(memberPage + 1)}>Next</button></div></div>
        </div>
      </div>}

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
