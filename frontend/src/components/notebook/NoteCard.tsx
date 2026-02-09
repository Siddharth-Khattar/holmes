// ABOUTME: Note card component for Sherlock's Diary directory view.
// ABOUTME: Displays note with title, subtitle, type badge, expandable content, and direct export button.

"use client";

import { useState, useRef, useEffect } from "react";
import {
  FileText,
  Music,
  Upload,
  Trash2,
  Sparkles,
  Play,
  Pause,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx } from "clsx";
import type { NoteResponse } from "@/lib/api/notes";

interface NoteCardProps {
  note: NoteResponse;
  onExport: (noteId: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
  onGenerateMetadata: (noteId: string) => Promise<void>;
  onGetAudioUrl: (noteId: string) => Promise<string | null>;
  onClick?: () => void;
  isGeneratingMetadata?: boolean;
}

export function NoteCard({
  note,
  onExport,
  onDelete,
  onGenerateMetadata,
  onGetAudioUrl,
  isGeneratingMetadata = false,
}: NoteCardProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (note.is_exported) return;

    setIsExporting(true);
    try {
      await onExport(note.id);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this note? This cannot be undone.")) return;

    setIsDeleting(true);
    try {
      await onDelete(note.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRegenerateMetadata = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onGenerateMetadata(note.id);
  };

  const handlePlayAudio = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (note.type !== "AUDIO") return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (!audioUrl) {
      setIsLoadingAudio(true);
      try {
        const url = await onGetAudioUrl(note.id);
        if (url) {
          setAudioUrl(url);
          // Create and play audio
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => setIsPlaying(false);
          audio.onerror = () => {
            console.error("Failed to load audio");
            setIsPlaying(false);
          };
          await audio.play();
          setIsPlaying(true);
        }
      } finally {
        setIsLoadingAudio(false);
      }
    } else if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
  };

  // Use title or fallback
  const title =
    note.title ||
    (note.type === "TEXT" ? "Untitled Text Note" : "Audio Recording");

  // Subtitle fallback
  const subtitle =
    note.subtitle ||
    (note.type === "TEXT" && note.content
      ? note.content.slice(0, 100) + (note.content.length > 100 ? "..." : "")
      : note.audio_duration_seconds
        ? `Duration: ${formatDuration(note.audio_duration_seconds)}`
        : "Audio note");

  const isGenerating = isGeneratingMetadata;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={clsx(
        "relative group rounded-xl cursor-pointer",
        "border transition-all duration-200",
        "hover:shadow-md",
      )}
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      {/* Main content area */}
      <div className="p-4" onClick={handleCardClick}>
        <div className="flex items-start gap-3">
          {/* Type Icon */}
          <div
            className={clsx(
              "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
              note.type === "TEXT"
                ? "bg-blue-500/10 text-blue-500"
                : "bg-purple-500/10 text-purple-500",
            )}
          >
            {note.type === "TEXT" ? (
              <FileText className="w-5 h-5" />
            ) : (
              <Music className="w-5 h-5" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {/* Title with generating indicator */}
                <div className="flex items-center gap-2">
                  <h3
                    className="font-medium truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    {isGenerating ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                        <span className="text-muted-foreground">
                          Generating title...
                        </span>
                      </span>
                    ) : (
                      title
                    )}
                  </h3>
                  {/* Regenerate button - only show on hover if has content */}
                  {!isGenerating &&
                    (note.content || note.audio_storage_path) && (
                      <button
                        onClick={handleRegenerateMetadata}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                        title="Regenerate title with AI"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      </button>
                    )}
                </div>
                <p
                  className="text-sm mt-0.5 line-clamp-2"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {subtitle}
                </p>
              </div>

              {/* Expand indicator */}
              <div className="flex items-center gap-2">
                {/* Audio Play Button */}
                {note.type === "AUDIO" && (
                  <button
                    onClick={handlePlayAudio}
                    disabled={isLoadingAudio}
                    className={clsx(
                      "flex items-center justify-center w-8 h-8 rounded-full",
                      "transition-colors",
                      isPlaying
                        ? "bg-purple-500 text-white"
                        : "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
                      isLoadingAudio && "opacity-50",
                    )}
                  >
                    {isLoadingAudio ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </button>
                )}

                {/* Expand/Collapse icon */}
                <div
                  className="flex items-center justify-center w-6 h-6 rounded"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                {/* Note Type Badge */}
                <span
                  className={clsx(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    note.type === "TEXT"
                      ? "bg-blue-500/10 text-blue-500"
                      : "bg-purple-500/10 text-purple-500",
                  )}
                >
                  {note.type === "TEXT" ? "Text Note" : "Audio Note"}
                </span>

                {/* Date */}
                <span
                  className="text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {formatDate(note.created_at)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Exported Badge */}
                {note.is_exported ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-500">
                    <Check className="w-3 h-3" />
                    Exported
                  </span>
                ) : (
                  /* Direct Export Button */
                  <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className={clsx(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium",
                      "transition-all duration-200",
                      "bg-primary/10 text-primary hover:bg-primary/20",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                    )}
                    title="Export to Evidence Library"
                  >
                    {isExporting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    Export
                  </button>
                )}

                {/* Delete Button - shown on hover */}
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={clsx(
                    "flex items-center justify-center w-7 h-7 rounded-lg",
                    "transition-all duration-200",
                    "opacity-0 group-hover:opacity-100",
                    "text-red-500 hover:bg-red-500/10",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                  title="Delete note"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-2 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              {note.type === "TEXT" ? (
                <div
                  className="text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto"
                  style={{ color: "var(--foreground)" }}
                >
                  {note.content || (
                    <span style={{ color: "var(--muted-foreground)" }}>
                      No content
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Audio player */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePlayAudio}
                      disabled={isLoadingAudio}
                      className={clsx(
                        "flex items-center justify-center w-12 h-12 rounded-full",
                        "transition-colors",
                        isPlaying
                          ? "bg-purple-500 text-white"
                          : "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20",
                        isLoadingAudio && "opacity-50",
                      )}
                    >
                      {isLoadingAudio ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5" />
                      )}
                    </button>
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        {isPlaying ? "Playing..." : "Click to play audio"}
                      </p>
                      {note.audio_duration_seconds && (
                        <p
                          className="text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          Duration:{" "}
                          {formatDuration(note.audio_duration_seconds)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Transcription */}
                  {note.content ? (
                    <div
                      className="mt-4 p-4 rounded-lg border border-border/50"
                      style={{ backgroundColor: "var(--muted)" }}
                    >
                      <h4
                        className="text-xs font-semibold mb-2 uppercase tracking-wider"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        Transcript
                      </h4>
                      <p
                        className="text-sm leading-relaxed whitespace-pre-wrap"
                        style={{ color: "var(--foreground)" }}
                      >
                        {note.content}
                      </p>
                    </div>
                  ) : (
                    <p
                      className="text-xs italic mt-2"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {isGeneratingMetadata
                        ? "Transcribing audio..."
                        : "No transcription available"}
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
