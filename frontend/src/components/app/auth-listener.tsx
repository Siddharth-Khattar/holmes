// ABOUTME: Client component that listens for auth events across tabs
// ABOUTME: Handles logout sync via BroadcastChannel

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AuthListener() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window))
      return;

    const bc = new BroadcastChannel("auth");
    bc.onmessage = (event) => {
      if (event.data?.type === "logout") {
        router.push("/");
        router.refresh();
      }
    };

    return () => bc.close();
  }, [router]);

  return null;
}
