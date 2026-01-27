"use client";

import { Terminal } from "lucide-react";

export default function CommandCenterPage() {
  return (
    <div
      className="rounded-xl p-12 text-center"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
        style={{ backgroundColor: "var(--muted)" }}
      >
        <Terminal className="w-8 h-8 text-(--muted-foreground)" />
      </div>
      <h3 className="text-lg font-medium text-(--foreground) mb-2">
        Command Center
      </h3>
      <p className="text-(--muted-foreground) text-sm max-w-md mx-auto">
        Coming soon - Your central hub for case management and investigation control.
      </p>
    </div>
  );
}
