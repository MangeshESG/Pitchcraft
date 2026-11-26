import React, { useEffect, useState } from "react";
import API_BASE_URL from "../../config";

export const COLLECTION_FAVORITES_CHANGED = "pitchkraft:collection-favorites-changed";
type FavoriteType = "list" | "view";
type Favorites = { listIds: number[]; viewIds: number[] };

const cache = new Map<string, Favorites>();
const pending = new Map<string, Promise<void>>();

export async function fetchFavoriteCollections(clientId: string | number): Promise<Favorites> {
  const response = await fetch(`${API_BASE_URL}/api/Crm/favorite-collections?clientId=${clientId}`);
  if (!response.ok) throw new Error("Could not load favorites");
  return response.json();
}

function load(clientId: string) {
  if (cache.has(clientId)) return;
  if (pending.has(clientId)) return;
  const request = fetchFavoriteCollections(clientId)
    .then((data) => {
      cache.set(clientId, data);
      window.dispatchEvent(new CustomEvent(COLLECTION_FAVORITES_CHANGED, { detail: { clientId } }));
    })
    .catch(() => {})
    .finally(() => pending.delete(clientId));
  pending.set(clientId, request);
}

const FavoriteCollectionStar: React.FC<{
  clientId: string | number;
  itemType: FavoriteType;
  itemId: number;
}> = ({ clientId, itemType, itemId }) => {
  const key = String(clientId);
  const field = itemType === "list" ? "listIds" : "viewIds";
  const [favorite, setFavorite] = useState(cache.get(key)?.[field]?.includes(itemId) ?? false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const sync = (event: Event) => {
      if ((event as CustomEvent<{ clientId: string }>).detail?.clientId === key)
        setFavorite(cache.get(key)?.[field]?.includes(itemId) ?? false);
    };
    setFavorite(cache.get(key)?.[field]?.includes(itemId) ?? false);
    window.addEventListener(COLLECTION_FAVORITES_CHANGED, sync);
    if (Number(key) > 0) load(key);
    return () => window.removeEventListener(COLLECTION_FAVORITES_CHANGED, sync);
  }, [key, field, itemId]);

  const toggle = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (saving || itemId === -1) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/Crm/favorite-collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: Number(key), itemType, itemId, isFavorite: !favorite }),
      });
      if (!response.ok) throw new Error("Could not update favorite");
      const current = cache.get(key) || { listIds: [], viewIds: [] };
      cache.set(key, {
        ...current,
        [field]: favorite ? current[field].filter((id) => id !== itemId) : [...current[field], itemId],
      });
      window.dispatchEvent(new CustomEvent(COLLECTION_FAVORITES_CHANGED, { detail: { clientId: key, changed: true } }));
    } catch {
      // Keep the current star state if saving fails.
    } finally {
      setSaving(false);
    }
  };

  return <button type="button" onClick={toggle} disabled={saving}
    title={favorite ? "Remove from favorites" : "Add to favorites"}
    aria-label={favorite ? `Remove ${itemType} from favorites` : `Add ${itemType} to favorites`}
    aria-pressed={favorite} style={{ color: "#e8a600", fontSize: 20 }}>
    {favorite ? "★" : "☆"}
  </button>;
};

export default FavoriteCollectionStar;
