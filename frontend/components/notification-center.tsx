"use client";

import Link from "next/link";
import {
  createContext,
  startTransition,
  useEffect,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { formatDateTime, formatNotificationDay } from "@/lib/format";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { MarkNotificationsViewedResponse, Notification, NotificationListResponse } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const POLL_INTERVAL_MS = 30_000;
const TOAST_LIFETIME_MS = 4_500;
const supabase = createSupabaseBrowserClient();

type NotificationCenterValue = {
  notifications: Notification[];
  unreadCount: number;
  refresh: () => Promise<void>;
  markAllViewed: () => Promise<void>;
};

const NotificationCenterContext = createContext<NotificationCenterValue | null>(null);

type ToastNotification = Notification & { toastId: string };

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const initializedRef = useRef(false);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const activeToastIdsRef = useRef<Set<string>>(new Set());

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new Error(error.message);
    }
    return data.session?.access_token ?? null;
  }

  function resetState() {
    initializedRef.current = false;
    knownIdsRef.current = new Set();
    activeToastIdsRef.current = new Set();
    setNotifications([]);
    setUnreadCount(0);
    setToasts([]);
  }

  async function refresh() {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      resetState();
      return;
    }

    const response = await fetch(`${API_BASE_URL}/notifications?limit=20`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Could not load notifications.");
    }

    const body = (await response.json()) as NotificationListResponse;
    const nextIds = new Set(body.notifications.map((notification) => notification.id));

    if (initializedRef.current) {
      const freshNotifications = body.notifications.filter(
        (notification) => !knownIdsRef.current.has(notification.id) && !activeToastIdsRef.current.has(notification.id),
      );
      if (freshNotifications.length > 0) {
        setToasts((current) => [
          ...freshNotifications.map((notification) => {
            activeToastIdsRef.current.add(notification.id);
            return { ...notification, toastId: notification.id };
          }),
          ...current,
        ]);
      }
    } else {
      initializedRef.current = true;
    }

    knownIdsRef.current = nextIds;
    startTransition(() => {
      setNotifications(body.notifications);
      setUnreadCount(body.unread_count);
    });
  }

  async function markAllViewed() {
    const accessToken = await getAccessToken();
    if (!accessToken || unreadCount === 0) {
      return;
    }

    const response = await fetch(`${API_BASE_URL}/notifications/view-all`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Could not mark notifications as viewed.");
    }

    const body = (await response.json()) as MarkNotificationsViewedResponse;
    startTransition(() => {
      setUnreadCount(0);
      setNotifications((current) =>
        current.map((notification) =>
          notification.viewed_at ? notification : { ...notification, viewed_at: body.viewed_at },
        ),
      );
    });
  }

  useEffect(() => {
    void refresh().catch(() => {
      resetState();
    });

    const interval = window.setInterval(() => {
      void refresh().catch(() => undefined);
    }, POLL_INTERVAL_MS);

    const handleFocus = () => {
      void refresh().catch(() => undefined);
    };

    window.addEventListener("focus", handleFocus);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        resetState();
        return;
      }
      void refresh().catch(() => undefined);
    });

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToasts((current) => {
        const [toastToRemove, ...rest] = current;
        if (toastToRemove) {
          activeToastIdsRef.current.delete(toastToRemove.id);
        }
        return rest;
      });
    }, TOAST_LIFETIME_MS);

    return () => window.clearTimeout(timeout);
  }, [toasts]);

  const value: NotificationCenterValue = {
    notifications,
    unreadCount,
    refresh,
    markAllViewed,
  };

  return (
    <NotificationCenterContext.Provider value={value}>
      {children}
      <div className="notification-toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((notification) => (
          <Link key={notification.toastId} href={notification.cta_href} className="notification-toast">
            <strong>LabLink notification</strong>
            <span>{notification.message}</span>
            <small>{formatDateTime(notification.created_at)}</small>
          </Link>
        ))}
      </div>
    </NotificationCenterContext.Provider>
  );
}

export function useNotificationCenter() {
  const context = useContext(NotificationCenterContext);
  if (!context) {
    throw new Error("Notification center is not available.");
  }
  return context;
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllViewed } = useNotificationCenter();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const groupedNotifications = useMemo(() => {
    const groups = new Map<string, Notification[]>();
    for (const notification of notifications) {
      const key = formatNotificationDay(notification.created_at);
      const current = groups.get(key) ?? [];
      current.push(notification);
      groups.set(key, current);
    }
    return Array.from(groups.entries());
  }, [notifications]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        void closePanel();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen, unreadCount]);

  async function closePanel() {
    setIsOpen(false);
    if (unreadCount > 0) {
      await markAllViewed().catch(() => undefined);
    }
  }

  function handleToggle() {
    if (isOpen) {
      void closePanel();
      return;
    }
    setIsOpen(true);
  }

  return (
    <div className="notification-bell" ref={rootRef}>
      <button
        type="button"
        className="notification-bell-button"
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.25a4.75 4.75 0 0 0-4.75 4.75v1.08c0 .95-.28 1.88-.81 2.66l-1.13 1.69a2.25 2.25 0 0 0 1.87 3.5h9.64a2.25 2.25 0 0 0 1.87-3.5l-1.13-1.69a4.76 4.76 0 0 1-.81-2.66V8A4.75 4.75 0 0 0 12 3.25m-2.47 15.5a2.5 2.5 0 0 0 4.94 0z" />
        </svg>
        {unreadCount > 0 ? <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>

      {isOpen ? (
        <div className="notification-panel" role="dialog" aria-label="Notifications">
          <div className="notification-panel-header">
            <strong>Notifications</strong>
          </div>
          {groupedNotifications.length === 0 ? (
            <p className="notification-empty">No notifications yet.</p>
          ) : (
            <div className="notification-groups">
              {groupedNotifications.map(([day, items]) => (
                <section key={day} className="notification-group">
                  <h3>{day}</h3>
                  <div className="notification-list">
                    {items.map((notification) => (
                      <Link
                        key={notification.id}
                        href={notification.cta_href}
                        className={`notification-item${notification.viewed_at ? "" : " notification-item-unread"}`}
                        onClick={() => {
                          void closePanel();
                        }}
                      >
                        <span>{notification.message}</span>
                        <small>{formatDateTime(notification.created_at)}</small>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
