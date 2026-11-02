import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Mail, X } from "lucide-react";
import API_BASE_URL from "../../config";
import "./UnsubscribeNotifications.css";

interface NotificationItem {
  id: number;
  contactId: number | null;
  contactName: string | null;
  email: string;
  source: "UnsubscribeByToken" | "OneClick";
  createdAt: string;
  isRead: boolean;
}

interface NotificationPage {
  items: NotificationItem[];
  unreadCount: number;
  hasMore: boolean;
  nextCursor: number | null;
}

const mergeItems = (existing: NotificationItem[], incoming: NotificationItem[]) => {
  const byId = new Map(existing.map(item => [item.id, item]));
  incoming.forEach(item => byId.set(item.id, item));
  return Array.from(byId.values()).sort((a, b) => b.id - a.id);
};

const notificationTime = (value: string) => {
  const utcValue = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
  const date = new Date(utcValue);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
};

const UnsubscribeNotifications: React.FC<{ clientId?: string; token: string | null }> = ({ clientId, token }) => {
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<{ items: NotificationItem[]; hasMore: boolean; cursor: number | null }>({ items: [], hasMore: false, cursor: null });
  const { items, hasMore, cursor } = feed;
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadEmailCount, setUnreadEmailCount] = useState<number | null>(null);
  const [emailCountError, setEmailCountError] = useState(false);
  const totalUnread = unreadCount + (unreadEmailCount ?? 0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingRead, setMarkingRead] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const bell = useRef<HTMLButtonElement>(null);
  const abort = useRef<AbortController | null>(null);
  const base = `${API_BASE_URL}/api/Notification?clientId=${encodeURIComponent(clientId || "")}`;

  const request = async (url: string, signal: AbortSignal, init?: RequestInit) => {
    const response = await fetch(url, { ...init, signal, headers: {
      Authorization: `Bearer ${token}`, Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    } });
    if (!response.ok) throw new Error("Could not load notifications. Please try again.");
    return response;
  };

  useEffect(() => {
    const controller = new AbortController();
    abort.current = controller;
    setLoadingMore(false);
    setMarkingRead(false);
    let pending = false;
    const load = async () => {
      if (!clientId || !token || pending || document.visibilityState === "hidden") {
        if (!clientId || !token) setLoading(false);
        return;
      }
      pending = true;
      try {
        const response = await request(base, controller.signal);
        const page: NotificationPage = await response.json();
        if (controller.signal.aborted) return;
        setFeed(previous => {
          // If more than a page arrived between polls, start at the new page
          // so pagination can fetch the gap rather than skipping notifications.
          const overlaps = previous.items.some(item => page.items.some(incoming => incoming.id === item.id));
          return overlaps ? { ...previous, items: mergeItems(previous.items, page.items) }
            : { items: page.items, hasMore: page.hasMore, cursor: page.nextCursor };
        });
        setUnreadCount(page.unreadCount);
        setError("");
      } catch {
        if (!controller.signal.aborted) setError("Could not load notifications. Please try again.");
      } finally {
        pending = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(load, 30000);
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", load);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", load);
    };
    // The header keys this component by account and token to isolate account state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, token, refresh]);

  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const loadUnreadEmails = async () => {
      if (!clientId || !token || pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const response = await request(`${API_BASE_URL}/api/Inbox/unread-count?clientId=${encodeURIComponent(clientId)}`, controller.signal);
        const data = await response.json();
        const count = data.grandTotalUnreadCount;
        if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid unread count");
        if (!controller.signal.aborted) {
          setUnreadEmailCount(count);
          setEmailCountError(false);
        }
      } catch {
        if (!controller.signal.aborted) {
          setUnreadEmailCount(null);
          setEmailCountError(true);
        }
      } finally { pending = false; }
    };
    void loadUnreadEmails();
    const timer = window.setInterval(loadUnreadEmails, 30000);
    window.addEventListener("focus", loadUnreadEmails);
    document.addEventListener("visibilitychange", loadUnreadEmails);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", loadUnreadEmails);
      document.removeEventListener("visibilitychange", loadUnreadEmails);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, token, refresh]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); bell.current?.focus(); }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const loadMore = async () => {
    const signal = abort.current?.signal;
    if (!signal || !cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await request(`${base}&beforeId=${cursor}`, signal);
      const page: NotificationPage = await response.json();
      if (signal.aborted) return;
      setFeed(previous => previous.cursor !== cursor ? previous : {
        items: mergeItems(previous.items, page.items), hasMore: page.hasMore, cursor: page.nextCursor,
      });
      setUnreadCount(page.unreadCount);
      setError("");
    } catch {
      if (!signal.aborted) setError("Could not load more notifications. Please try again.");
    } finally {
      if (!signal.aborted) setLoadingMore(false);
    }
  };

  const markAllRead = async () => {
    const signal = abort.current?.signal;
    const throughId = items[0]?.id;
    if (!signal || !throughId || markingRead) return;
    setMarkingRead(true);
    try {
      await request(base.replace("?", "/read?"), signal, {
        method: "POST", body: JSON.stringify({ throughId }),
      });
      if (signal.aborted) return;
      setFeed(previous => ({ ...previous, items: previous.items.map(item => item.id <= throughId ? { ...item, isRead: true } : item) }));
      setError("");
      setRefresh(value => value + 1);
    } catch {
      if (!signal.aborted) setError("Could not mark notifications as read. Please try again.");
    } finally {
      if (!signal.aborted) setMarkingRead(false);
    }
  };

  return <div className="unsubscribe-notifications" ref={wrapper}>
    <button type="button" className="unsubscribe-notifications__bell" ref={bell}
      aria-label={`Notifications${totalUnread ? `, ${totalUnread} unread` : ""}`}
      title="Notifications" aria-expanded={open} aria-controls="unsubscribe-notifications-panel"
      onClick={() => { setOpen(value => !value); if (!open) setRefresh(value => value + 1); }}>
      <Bell size={21} aria-hidden="true" />
      {totalUnread > 0 && <span className="unsubscribe-notifications__badge" aria-hidden="true">{totalUnread > 99 ? "99+" : totalUnread}</span>}
    </button>
    {open && <section id="unsubscribe-notifications-panel" className="unsubscribe-notifications__panel" aria-label="Notifications">
      <div className="unsubscribe-notifications__heading"><h2>Notifications</h2>
        <button type="button" aria-label="Close notifications" onClick={() => { setOpen(false); bell.current?.focus(); }}><X size={18} /></button>
      </div>
      <Link className="unsubscribe-notifications__emails" to="/main?tab=Mail&mailSubTab=Inbox" onClick={() => setOpen(false)}>
        <Mail size={19} aria-hidden="true" /><span>Unread emails</span>
        <strong>{unreadEmailCount !== null ? unreadEmailCount.toLocaleString() : emailCountError ? "Unavailable" : "Loading…"}</strong>
      </Link>
      {items.length > 0 && <div className="unsubscribe-notifications__toolbar"><span>Unsubscribed contacts</span>
        {unreadCount > 0 && items.length > 0 && <button type="button" disabled={markingRead} onClick={markAllRead}>{markingRead ? "Saving…" : "Mark all as read"}</button>}
      </div>}
      {error && <div className="unsubscribe-notifications__status" role="alert">{error} <button type="button" onClick={() => setRefresh(value => value + 1)}>Retry</button></div>}
      {loading && <p className="unsubscribe-notifications__status">Loading notifications…</p>}
      <ul className="unsubscribe-notifications__list">{items.map(item => <li key={item.id} className={item.isRead ? "" : "is-unread"}>
        <span className="unsubscribe-notifications__dot" aria-label={item.isRead ? "Read" : "Unread"} />
        <div><p><strong>{item.contactName || item.email}</strong> unsubscribed.</p>
          {item.contactName && <span className="unsubscribe-notifications__email">{item.email}</span>}
          <time dateTime={item.createdAt}>{notificationTime(item.createdAt)}</time>
        </div>
      </li>)}</ul>
      {hasMore && <button type="button" className="unsubscribe-notifications__more" disabled={loadingMore} onClick={loadMore}>{loadingMore ? "Loading…" : "Load more"}</button>}
    </section>}
  </div>;
};

export default UnsubscribeNotifications;
