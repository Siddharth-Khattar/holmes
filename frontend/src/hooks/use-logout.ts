// ABOUTME: Logout hook with multi-tab sync and feedback
// ABOUTME: Uses BroadcastChannel for cross-tab logout

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";
import { getOrCreateTabId } from "@/lib/tab-id";

export function useLogout() {
  const router = useRouter();

  const logout = async () => {
    const senderTabId = getOrCreateTabId();

    try {
      await signOut({
        fetchOptions: {
          credentials: "include",
          onSuccess: () => {
            toast.success("Logged out successfully");

            // Multi-tab sync
            if (typeof window !== "undefined" && "BroadcastChannel" in window) {
              const bc = new BroadcastChannel("auth");
              bc.postMessage({ type: "logout", senderTabId });
              bc.close();
            }
          },
        },
      });
    } catch {
      toast.error("Logout failed. Please try again.");
    }

    // Prefer soft navigation, but keep a robust fallback if the app router hangs.
    router.replace("/");
    router.refresh();

    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        if (window.location.pathname.startsWith("/cases")) {
          window.location.assign("/");
        }
      }, 350);
    }
  };

  return { logout };
}
