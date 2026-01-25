// ABOUTME: Client component that listens for auth events across tabs
// ABOUTME: Handles logout sync via BroadcastChannel

"use client";

import { useEffect } from "react";
import { getOrCreateTabId } from "@/lib/tab-id";

export function AuthListener() {
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window))
      return;

    const tabId = getOrCreateTabId();

    const bc = new BroadcastChannel("auth");
    bc.onmessage = (event) => {
      if (event.data?.type === "logout") {
        // Ignore messages from the same tab; local logout owns navigation.
        if (tabId && event.data?.senderTabId === tabId) return;

        // Cross-tab logout should be a hard navigation to avoid app-router pending states.
        window.location.assign("/");
      }
    };

    return () => bc.close();
  }, []);

  return null;
}
