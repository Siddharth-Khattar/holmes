"use client";

import { Upload } from "lucide-react";

export default function UploadPage() {
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
        <Upload className="w-8 h-8 text-(--muted-foreground)" />
      </div>
      <h3 className="text-lg font-medium text-(--foreground) mb-2">
        No files yet
      </h3>
      <p className="text-(--muted-foreground) text-sm max-w-md mx-auto mb-6">
        Upload evidence documents to start your investigation. Holmes will
        analyze and extract insights from your files.
      </p>
      <p className="text-(--muted-foreground)/60 text-xs">
        File upload coming in Phase 3
      </p>
    </div>
  );
}
