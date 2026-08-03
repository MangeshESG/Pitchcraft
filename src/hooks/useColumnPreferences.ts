import { useCallback, useEffect, useRef, useState } from "react";
import {
  ColumnPreference,
  fetchColumnPreferences,
  resetColumnPreferences,
  saveColumnPreferences,
} from "../api/columnPreferences";

/** The shape DynamicContactsTable emits from `onColumnsChange`. */
export interface ColumnLike {
  key: string;
  label?: string;
  visible: boolean;
}

/** Layout written before the DB existed — migrated once, then ignored. */
const LEGACY_SELECTION_KEY = "contactlist_selected_columns";
/** Local mirror of the server layout, so the table renders without a flash. */
const LAYOUT_CACHE_KEY = "contactlist_column_layout";
const SAVE_DEBOUNCE_MS = 600;

const cacheKeyFor = (clientId: string | number) => `${LAYOUT_CACHE_KEY}_${clientId}`;

const readCachedLayout = (clientId: string | number): ColumnPreference[] => {
  try {
    const raw = localStorage.getItem(cacheKeyFor(clientId));
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCachedLayout = (clientId: string | number, layout: ColumnPreference[]) => {
  try {
    localStorage.setItem(cacheKeyFor(clientId), JSON.stringify(layout));
  } catch {
    /* quota or private mode — the server copy is the source of truth anyway */
  }
};

/** Reads the pre-DB localStorage selection so an existing user keeps their columns. */
const readLegacySelection = (): string[] => {
  try {
    const raw = localStorage.getItem(LEGACY_SELECTION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    return parsed.filter((k): k is string => typeof k === "string" && k !== "checkbox");
  } catch {
    return [];
  }
};

/**
 * Each list view auto-generates its own column set, so the table doing the
 * saving only knows part of the layout. Columns the stored layout has but this
 * table doesn't are put back at the position they already held — otherwise a
 * save from a narrow view would wipe another view's columns.
 */
const mergeWithUnknownColumns = (
  incoming: ColumnPreference[],
  previous: ColumnPreference[]
): ColumnPreference[] => {
  const incomingKeys = new Set(incoming.map((c) => c.columnKey));
  // Filtering `previous` keeps these in ascending stored position.
  const missing = previous.filter((p) => !incomingKeys.has(p.columnKey));

  if (missing.length === 0) return incoming;

  const result = [...incoming];

  missing.forEach((column) => {
    const previousIndex = previous.findIndex((p) => p.columnKey === column.columnKey);
    result.splice(Math.min(previousIndex, result.length), 0, column);
  });

  return result.map((column, index) => ({ ...column, sortOrder: index }));
};

interface Options {
  /** Maps a custom attribute's field_name to its crm_custom_fields.id. */
  customFieldIdByName?: Record<string, number>;
  onError?: (message: string) => void;
}

/**
 * Client-level column layout (show/hide + sequence), persisted in the DB and
 * shared by every list view, segment and saved view of the client.
 */
export const useColumnPreferences = (
  clientId: string | number | undefined,
  { customFieldIdByName, onError }: Options = {}
) => {
  const [layout, setLayout] = useState<ColumnPreference[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  /**
   * The legacy selection when this session migrated one. A legacy selection
   * listed only the *visible* columns, so it has to act as the default set too
   * — otherwise a column the user had hidden would come back on this one load.
   */
  const [migratedLegacySelection, setMigratedLegacySelection] = useState<string[] | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<ColumnPreference[] | null>(null);
  // The layout as last known, so a save can re-attach columns this table lacks.
  const layoutRef = useRef<ColumnPreference[]>([]);
  layoutRef.current = layout;
  // Read inside the debounced flush so a late-arriving custom-field list is used.
  const customFieldIdByNameRef = useRef(customFieldIdByName);
  customFieldIdByNameRef.current = customFieldIdByName;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // ---------- Load ----------
  useEffect(() => {
    if (!clientId) {
      setLayout([]);
      setIsLoaded(false);
      return;
    }

    let cancelled = false;

    // Paint the cached layout first; the server response replaces it.
    const cached = readCachedLayout(clientId);
    if (cached.length > 0) setLayout(cached);

    (async () => {
      try {
        const { hasSavedLayout, columns } = await fetchColumnPreferences(clientId);
        if (cancelled) return;

        if (hasSavedLayout) {
          setLayout(columns);
          writeCachedLayout(clientId, columns);
          setIsLoaded(true);
          return;
        }

        // Nothing stored server-side yet — carry the old localStorage
        // selection up so returning users keep the columns they had.
        const legacy = readLegacySelection();

        if (legacy.length > 0) {
          const migrated: ColumnPreference[] = legacy.map((key, index) => ({
            columnKey: key,
            label: null,
            isVisible: true,
            sortOrder: index,
            customFieldId: customFieldIdByNameRef.current?.[key] ?? null,
          }));

          setLayout(migrated);
          setMigratedLegacySelection(legacy);
          writeCachedLayout(clientId, migrated);

          try {
            await saveColumnPreferences(clientId, migrated);
            localStorage.removeItem(LEGACY_SELECTION_KEY);
          } catch {
            /* retried on the user's next column change */
          }
        } else {
          setLayout([]);
        }

        if (!cancelled) setIsLoaded(true);
      } catch (error) {
        if (cancelled) return;
        // Offline or API down: keep whatever the cache gave us.
        console.warn("Column layout could not be loaded:", error);
        setIsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // ---------- Save ----------
  const flush = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending || !clientId) return;

    pendingRef.current = null;

    try {
      await saveColumnPreferences(clientId, pending);
    } catch (error) {
      console.warn("Column layout could not be saved:", error);
      onErrorRef.current?.("Column layout could not be saved. It will apply on this device only.");
    }
  }, [clientId]);

  /**
   * Records the layout in the order given — position in the array is the
   * column sequence. Applied to local state at once, pushed to the server on a
   * short debounce so a burst of toggles or a drag is one request.
   */
  const saveLayout = useCallback(
    (columns: ColumnLike[]) => {
      if (!clientId) return;

      const incoming: ColumnPreference[] = columns
        .filter((c) => c.key && c.key !== "checkbox")
        .map((c, index) => ({
          columnKey: c.key,
          label: c.label ?? null,
          isVisible: !!c.visible,
          sortOrder: index,
          customFieldId: customFieldIdByNameRef.current?.[c.key] ?? null,
        }));

      const next = mergeWithUnknownColumns(incoming, layoutRef.current);

      setLayout(next);
      writeCachedLayout(clientId, next);
      pendingRef.current = next;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
    },
    [clientId, flush]
  );

  const resetLayout = useCallback(async () => {
    if (!clientId) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    pendingRef.current = null;

    setLayout([]);
    writeCachedLayout(clientId, []);

    try {
      await resetColumnPreferences(clientId);
    } catch (error) {
      console.warn("Column layout could not be reset:", error);
      onErrorRef.current?.("Column layout could not be reset on the server.");
    }
  }, [clientId]);

  // Don't lose a debounced save on unmount / navigation.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      void flush();
    };
  }, [flush]);

  return { layout, isLoaded, saveLayout, resetLayout, migratedLegacySelection };
};

export default useColumnPreferences;
