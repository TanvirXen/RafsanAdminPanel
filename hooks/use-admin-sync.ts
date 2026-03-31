"use client";

import { useEffect, useRef } from "react";

export type AdminSyncResource =
  | "*"
  | "admin-users"
  | "banners"
  | "brands"
  | "contact"
  | "events"
  | "newsletter"
  | "notable-events"
  | "payments"
  | "registrations"
  | "settings"
  | "shots"
  | "shows"
  | "timeline";

type AdminSyncMessage = {
  resources: AdminSyncResource[];
  source: string;
  timestamp: number;
};

const ADMIN_SYNC_STORAGE_KEY = "admin:sync";
const ADMIN_SYNC_TAB_ID_KEY = "admin:sync:tab-id";
const ADMIN_SYNC_CHANNEL = "admin:sync";

let channel: BroadcastChannel | null = null;
let fallbackTabId: string | null = null;

function getTabId() {
  if (typeof window === "undefined") {
    return "server";
  }

  let tabId: string | null = null;

  try {
    tabId = window.sessionStorage.getItem(ADMIN_SYNC_TAB_ID_KEY);
  } catch {
    tabId = fallbackTabId;
  }

  if (!tabId) {
    tabId =
      window.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    fallbackTabId = tabId;

    try {
      window.sessionStorage.setItem(ADMIN_SYNC_TAB_ID_KEY, tabId);
    } catch {
      // Ignore storage write failures and keep the in-memory id.
    }
  }

  return tabId;
}

function getChannel() {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }

  if (!channel) {
    channel = new BroadcastChannel(ADMIN_SYNC_CHANNEL);
  }

  return channel;
}

function normalizeResources(
  resources: AdminSyncResource | AdminSyncResource[]
) : AdminSyncResource[] {
  const list = Array.isArray(resources) ? resources : [resources];
  return Array.from(
    new Set<AdminSyncResource>(list.length ? list : ["*"])
  );
}

function matchesResources(
  watched: Set<AdminSyncResource>,
  incoming: AdminSyncResource[]
) {
  return (
    watched.has("*") ||
    incoming.includes("*") ||
    incoming.some((resource) => watched.has(resource))
  );
}

export function broadcastAdminSync(
  resources: AdminSyncResource | AdminSyncResource[]
) {
  if (typeof window === "undefined") return;

  const message: AdminSyncMessage = {
    resources: normalizeResources(resources),
    source: getTabId(),
    timestamp: Date.now(),
  };

  try {
    window.localStorage.setItem(
      ADMIN_SYNC_STORAGE_KEY,
      JSON.stringify(message)
    );
  } catch {
    // Ignore storage failures and fall back to BroadcastChannel where possible.
  }

  getChannel()?.postMessage(message);
}

export function useAdminSync(
  resources: AdminSyncResource | AdminSyncResource[],
  onSync: () => void
) {
  const normalizedResources = normalizeResources(resources);
  const resourceKey = normalizedResources.slice().sort().join("|");
  const watchedResourcesRef = useRef(new Set<AdminSyncResource>(normalizedResources));
  const onSyncRef = useRef(onSync);

  watchedResourcesRef.current = new Set(normalizedResources);
  onSyncRef.current = onSync;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const currentTabId = getTabId();

    const handleSync = (message?: AdminSyncMessage | null) => {
      if (!message || message.source === currentTabId) return;
      if (!matchesResources(watchedResourcesRef.current, message.resources)) {
        return;
      }

      onSyncRef.current();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== ADMIN_SYNC_STORAGE_KEY || !event.newValue) return;

      try {
        handleSync(JSON.parse(event.newValue) as AdminSyncMessage);
      } catch {
        // Ignore malformed storage payloads.
      }
    };

    const syncChannel = getChannel();
    const handleMessage = (event: MessageEvent) => {
      handleSync(event.data as AdminSyncMessage);
    };

    window.addEventListener("storage", handleStorage);
    syncChannel?.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      syncChannel?.removeEventListener("message", handleMessage);
    };
  }, [resourceKey]);
}
