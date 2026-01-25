// ABOUTME: Logout hook with multi-tab sync and feedback
// ABOUTME: Uses BroadcastChannel for cross-tab logout

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";

export function useLogout() {
  const router = useRouter();

  const logout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          toast.success("Logged out successfully");

          // Multi-tab sync
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("auth");
            bc.postMessage({ type: "logout" });
            bc.close();
          }
        },
      },
    });

    // Redirect after signOut completes (not inside callback)
    router.push("/");
  };

  return { logout };
}
