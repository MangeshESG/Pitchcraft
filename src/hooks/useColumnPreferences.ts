import { useCallback, useEffect, useRef, useState } from "react";
import {
  ColumnPreference,
  ColumnPreferenceScope,
  fetchColumnPreferences,
  resetColumnPreferences,
  saveColumnPreferences,
} from "../api/columnPreferences";

export interface ColumnLike {
  key: string;
  label?: string;
  visible: boolean;
}

const EMPTY_LAYOUT: ColumnPreference[] = [];
const SAVE_DEBOUNCE_MS = 600;
const cacheKeyFor = (clientId: string | number, scope: ColumnPreferenceScope) =>
  `contactlist_column_layout_${clientId}_${scope.scopeType}_${scope.scopeId}`;

const readCachedLayout = (key: string): ColumnPreference[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return Array.isArray(parsed) ? parsed : EMPTY_LAYOUT;
  } catch {
    return EMPTY_LAYOUT;
  }
};

const writeCachedLayout = (key: string, layout: ColumnPreference[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(layout));
  } catch {
    // The server remains the source of truth when storage is unavailable.
  }
};

// Serialize writes to a scope, including across unmount/remount. In particular,
// a delayed save must finish before a reset or a newer save for the same item.
const writes = new Map<string, Promise<void>>();
const enqueueWrite = (key: string, operation: () => Promise<void>) => {
  const next = (writes.get(key) ?? Promise.resolve()).catch(() => {}).then(operation);
  writes.set(key, next);
  const cleanup = () => { if (writes.get(key) === next) writes.delete(key); };
  void next.then(cleanup, cleanup);
  return next;
};

// Keep columns absent from the current result set (for example after filtering).
const mergeWithUnknownColumns = (
  incoming: ColumnPreference[],
  previous: ColumnPreference[]
): ColumnPreference[] => {
  const incomingKeys = new Set(incoming.map((c) => c.columnKey));
  const result = [...incoming];
  previous.forEach((column, index) => {
    if (!incomingKeys.has(column.columnKey)) {
      result.splice(Math.min(index, result.length), 0, column);
    }
  });
  return result.map((column, index) => ({ ...column, sortOrder: index }));
};

interface Options {
  scope: ColumnPreferenceScope | null;
  customFieldIdByName?: Record<string, number>;
  onError?: (message: string) => void;
}

/** An independent layout per client and individual list, segment or saved view. */
export const useColumnPreferences = (
  clientId: string | number | undefined,
  { scope, customFieldIdByName, onError }: Options
) => {
  const scopeType = scope?.scopeType;
  const scopeId = scope?.scopeId;
  const key = clientId && scope ? cacheKeyFor(clientId, scope) : "";
  const [state, setState] = useState<{ key: string; layout: ColumnPreference[]; loaded: boolean }>({
    key: "", layout: EMPTY_LAYOUT, loaded: false,
  });
  const layout = state.key === key ? state.layout : EMPTY_LAYOUT;
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const revisionRef = useRef(0);
  const optionsRef = useRef({ customFieldIdByName, onError });
  optionsRef.current = { customFieldIdByName, onError };
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ key: string; clientId: string | number; scope: ColumnPreferenceScope; columns: ColumnPreference[] } | null>(null);

  const flush = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    try {
      await enqueueWrite(pending.key, () =>
        saveColumnPreferences(pending.clientId, pending.columns, pending.scope));
    } catch (error) {
      console.warn("Column layout could not be saved:", error);
      optionsRef.current.onError?.("Column layout could not be saved. It will apply on this device only.");
    }
  }, []);

  useEffect(() => {
    if (!key || !clientId || !scopeType || scopeId === undefined) return;
    let cancelled = false;
    const revision = revisionRef.current;
    setState({ key, layout: readCachedLayout(key), loaded: false });
    const target = { scopeType, scopeId };
    void (async () => {
      try {
        await writes.get(key)?.catch(() => {});
        const { columns } = await fetchColumnPreferences(clientId, target);
        if (cancelled || revision !== revisionRef.current) return;
        setState({ key, layout: columns, loaded: true });
        writeCachedLayout(key, columns);
      } catch (error) {
        if (cancelled || revision !== revisionRef.current) return;
        console.warn("Column layout could not be loaded:", error);
        setState((previous) => previous.key === key ? { ...previous, loaded: true } : previous);
      }
    })();
    return () => { cancelled = true; };
  }, [key, clientId, scopeType, scopeId]);

  const saveLayout = useCallback((columns: ColumnLike[]) => {
    if (!key || !clientId || !scopeType || scopeId === undefined) return;
    const incoming = columns.filter((c) => c.key && c.key !== "checkbox").map((c, index) => ({
      columnKey: c.key,
      label: c.label ?? null,
      isVisible: !!c.visible,
      sortOrder: index,
      customFieldId: optionsRef.current.customFieldIdByName?.[c.key] ?? null,
    }));
    const next = mergeWithUnknownColumns(incoming, layoutRef.current);
    revisionRef.current += 1;
    layoutRef.current = next;
    setState({ key, layout: next, loaded: true });
    writeCachedLayout(key, next);
    pendingRef.current = { key, clientId, scope: { scopeType, scopeId }, columns: next };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { void flush(); }, SAVE_DEBOUNCE_MS);
  }, [key, clientId, scopeType, scopeId, flush]);

  const resetLayout = useCallback(async () => {
    if (!key || !clientId || !scopeType || scopeId === undefined) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    pendingRef.current = null;
    revisionRef.current += 1;
    layoutRef.current = EMPTY_LAYOUT;
    setState({ key, layout: EMPTY_LAYOUT, loaded: true });
    writeCachedLayout(key, EMPTY_LAYOUT);
    try {
      await enqueueWrite(key, () => resetColumnPreferences(clientId, { scopeType, scopeId }));
    } catch (error) {
      console.warn("Column layout could not be reset:", error);
      optionsRef.current.onError?.("Column layout could not be reset on the server.");
    }
  }, [key, clientId, scopeType, scopeId]);

  // The pending payload owns its original target, even when navigation changes scope.
  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    void flush();
  }, [key, flush]);

  return { layout, isLoaded: state.key === key && state.loaded, saveLayout, resetLayout };
};

export default useColumnPreferences;
