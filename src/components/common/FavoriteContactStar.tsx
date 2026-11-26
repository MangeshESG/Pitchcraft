import React, { useEffect, useState } from "react";
import API_BASE_URL from "../../config";

export const FAVORITES_CHANGED_EVENT = "pitchkraft:favorites-changed";

const favoritesByClient = new Map<string, Set<number>>();
const pendingLoads = new Map<string, Promise<void>>();

function notify(clientId: string, changed = false) {
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT, { detail: { clientId, changed } }));
}

function loadFavorites(clientId: string) {
  if (favoritesByClient.has(clientId)) return Promise.resolve();
  const pending = pendingLoads.get(clientId);
  if (pending) return pending;

  const request = fetch(`${API_BASE_URL}/api/Crm/favorite-contacts?clientId=${clientId}`)
    .then(async (response) => {
      if (!response.ok) throw new Error("Could not load favorites");
      const data = await response.json();
      favoritesByClient.set(clientId, new Set((data.contactIds || []).map(Number)));
      notify(clientId);
    })
    .catch(() => {})
    .finally(() => pendingLoads.delete(clientId));
  pendingLoads.set(clientId, request);
  return request;
}

interface FavoriteContactStarProps {
  clientId: string | number;
  contactId: string | number;
  className?: string;
  style?: React.CSSProperties;
}

const FavoriteContactStar: React.FC<FavoriteContactStarProps> = ({ clientId, contactId, className, style }) => {
  const key = String(clientId);
  const id = Number(contactId);
  const [favorite, setFavorite] = useState(() => favoritesByClient.get(key)?.has(id) ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFavorite(favoritesByClient.get(key)?.has(id) ?? false);
    const onChange = (event: Event) => {
      if ((event as CustomEvent<{ clientId: string }>).detail?.clientId === key)
        setFavorite(favoritesByClient.get(key)?.has(id) ?? false);
    };
    window.addEventListener(FAVORITES_CHANGED_EVENT, onChange);
    if (Number(key) > 0 && id > 0) void loadFavorites(key);
    return () => window.removeEventListener(FAVORITES_CHANGED_EVENT, onChange);
  }, [key, id]);

  const toggle = async (event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    if (saving || !id || !Number(key)) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/Crm/favorite-contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: Number(key), contactId: id, isFavorite: !favorite }),
      });
      if (!response.ok) throw new Error("Could not update favorite");
      const updated = new Set(favoritesByClient.get(key) || []);
      if (favorite) updated.delete(id);
      else updated.add(id);
      favoritesByClient.set(key, updated);
      notify(key, true);
    } catch {
      // Keep the current state when saving fails.
    } finally {
      setSaving(false);
    }
  };

  return (
    <button type="button" onClick={toggle} disabled={saving || !id || !Number(key)}
      title={favorite ? "Remove from favorites" : "Add to favorites"}
      aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={favorite} className={className}
      style={{ border: 0, background: "transparent", padding: 4, cursor: "pointer", color: "#e8a600", fontSize: 21, lineHeight: 1, ...style }}>
      {favorite ? "★" : "☆"}
    </button>
  );
};

export default FavoriteContactStar;
