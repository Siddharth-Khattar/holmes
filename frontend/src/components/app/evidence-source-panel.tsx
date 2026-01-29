"use client";

import { useState } from "react";
import {
  X,
  Minimize2,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  File,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Play,
} from "lucide-react";
import type { Evidence, EvidenceType } from "@/types/knowledge-graph";

interface EvidenceSourcePanelProps {
  evidence: Evidence;
  isMinimized: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
}

const EVIDENCE_ICONS: Record<
  EvidenceType,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  text: FileText,
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: File,
};

// Mock data for different evidence types
const getMockEvidenceData = (evidence: Evidence) => {
  switch (evidence.type) {
    case "document":
      return {
        fileName: "bank_statements_2023.pdf",
        pageCount: 156,
        currentPage: 47,
        findings: [
          {
            id: 1,
            text: "$2.34M on Mar 15 to Cayman account",
            highlighted: true,
          },
          { id: 2, text: "$890K on Apr 3", highlighted: false },
          { id: 3, text: "$1.2M on May 22", highlighted: false },
          { id: 4, text: "$450K on Jun 8", highlighted: false },
        ],
        content:
          "... regular account activity until March 15th when a wire transfer of $2,340,000 was initiated to account #CH93-0076-2011-6238-5295-7 (Cayman Islands). This transfer was flagged by compliance as requiring additional documentation per...",
        highlights: [
          { text: "Amount: $2,340,000", position: { x: 120, y: 200 } },
          { text: "Signature matches J. Doe", position: { x: 120, y: 450 } },
        ],
      };
    case "video":
      return {
        fileName: "warehouse_footage.mp4",
        duration: "04:12",
        currentTime: "02:34",
        keyMoments: [
          { time: "02:34", label: "Subject enters building", active: true },
          { time: "02:41", label: "Subject carrying boxes", active: false },
          {
            time: "03:15",
            label: "Vehicle arrives (plate: ABC-123)",
            active: false,
          },
          {
            time: "03:28",
            label: "Subject exits with second person",
            active: false,
          },
        ],
      };
    case "image":
      return {
        fileName: "receipt_scan_001.jpg",
        highlights: [
          { text: "Amount: $15,000", position: { x: 150, y: 300 } },
          { text: "Signature: J.D.", position: { x: 150, y: 450 } },
        ],
        findings: [
          "Amount: $15,000",
          "Signature matches J. Doe",
          "Date: 03/14/2023",
          "Vendor: ACME Supplies Inc",
        ],
      };
    case "audio":
      return {
        fileName: "board_meeting.mp3",
        duration: "45:30",
        currentTime: "12:15",
        transcript: [
          {
            time: "12:10",
            speaker: "John Doe",
            text: "We need to discuss the offshore accounts...",
          },
          {
            time: "12:15",
            speaker: "Jane Smith",
            text: "The Cayman transfers are complete.",
            highlighted: true,
          },
          {
            time: "12:20",
            speaker: "Robert Chen",
            text: "What about the documentation?",
          },
        ],
      };
    default:
      return null;
  }
};

export function EvidenceSourcePanel({
  evidence,
  isMinimized,
  onClose,
  onToggleMinimize,
}: EvidenceSourcePanelProps) {
  const [zoom, setZoom] = useState(100);
  const mockData = getMockEvidenceData(evidence);
  const IconComponent = EVIDENCE_ICONS[evidence.type];

  if (isMinimized) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center gap-4 p-4 border-r cursor-pointer hover:bg-stone/5 transition-colors"
        style={{
          backgroundColor: "var(--color-jet)",
          borderColor: "rgba(138, 138, 130, 0.15)",
          width: "60px",
        }}
        onClick={onToggleMinimize}
      >
        <div className="flex flex-col items-center gap-2">
          <IconComponent size={24} className="text-stone" />
          <div
            className="text-xs text-stone writing-mode-vertical"
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
            }}
          >
            Source Panel
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col border-r"
      style={{
        backgroundColor: "var(--color-jet)",
        borderColor: "rgba(138, 138, 130, 0.15)",
      }}
    >
      {/* Header */}
      <div
        className="flex-none px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: "rgba(138, 138, 130, 0.15)" }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <IconComponent size={18} className="text-stone flex-shrink-0" />
          <h3 className="text-sm font-medium text-smoke truncate">
            Source Panel
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleMinimize}
            className="p-1.5 rounded hover:bg-stone/10 transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4 text-stone" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-stone/10 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-stone" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* View Controls */}
        <div
          className="p-4 border-b"
          style={{ borderColor: "rgba(138, 138, 130, 0.15)" }}
        >
          <div className="text-xs text-stone mb-2">VIEW CONTROLS</div>
          <div className="text-xs text-smoke mb-1">
            Source:{" "}
            <span className="font-mono">
              {mockData?.fileName || evidence.title}
            </span>
          </div>
        </div>

        {/* Document View */}
        {evidence.type === "document" && mockData && (
          <div className="p-4 space-y-4">
            {/* Document Header */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-charcoal/50 border border-stone/10">
              <div className="flex items-center gap-2">
                <File className="w-4 h-4 text-stone" />
                <span className="text-xs text-smoke font-mono">
                  {mockData.fileName}
                </span>
              </div>
              <span className="text-xs text-stone">
                Page {mockData.currentPage} of {mockData.pageCount}
              </span>
            </div>

            {/* Document Content Preview */}
            <div className="p-4 rounded-lg bg-charcoal/30 border border-stone/10 min-h-[300px]">
              <div className="text-xs text-smoke leading-relaxed whitespace-pre-wrap">
                {mockData.content}
              </div>

              {/* Highlighted sections */}
              <div className="mt-4 space-y-2">
                {mockData.highlights?.map((highlight, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-accent/10 border border-accent/30"
                  >
                    <div className="text-xs text-accent font-medium">
                      {highlight.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button className="flex items-center gap-1 px-3 py-1.5 rounded bg-charcoal/50 hover:bg-charcoal text-xs text-smoke">
                <ChevronLeft className="w-3 h-3" />
                Prev Finding
              </button>
              <span className="text-xs text-stone">
                Finding 1 of {mockData.findings.length}
              </span>
              <button className="flex items-center gap-1 px-3 py-1.5 rounded bg-charcoal/50 hover:bg-charcoal text-xs text-smoke">
                Next Finding
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                className="p-1.5 rounded bg-charcoal/50 hover:bg-charcoal"
              >
                <ZoomOut className="w-3 h-3 text-stone" />
              </button>
              <span className="text-xs text-stone w-12 text-center">
                {zoom}%
              </span>
              <button
                onClick={() => setZoom(Math.min(200, zoom + 10))}
                className="p-1.5 rounded bg-charcoal/50 hover:bg-charcoal"
              >
                <ZoomIn className="w-3 h-3 text-stone" />
              </button>
            </div>
          </div>
        )}

        {/* Video View */}
        {evidence.type === "video" && mockData && (
          <div className="p-4 space-y-4">
            {/* Video Header */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-charcoal/50 border border-stone/10">
              <Video className="w-4 h-4 text-stone" />
              <span className="text-xs text-smoke font-mono">
                {mockData.fileName}
              </span>
            </div>

            {/* Video Player Placeholder */}
            <div className="aspect-video rounded-lg bg-charcoal/30 border border-stone/10 flex items-center justify-center">
              <div className="text-center">
                <Play className="w-12 h-12 text-stone mx-auto mb-2" />
                <div className="text-sm text-smoke font-mono">
                  {mockData.currentTime}
                </div>
              </div>
            </div>

            {/* Video Controls */}
            <div className="flex items-center gap-2">
              <button className="p-2 rounded bg-accent/20 hover:bg-accent/30">
                <Play className="w-4 h-4 text-accent" />
              </button>
              <div className="flex-1 h-1 bg-charcoal/50 rounded-full overflow-hidden">
                <div className="h-full bg-accent" style={{ width: "60%" }} />
              </div>
              <span className="text-xs text-stone font-mono">
                {mockData.currentTime} / {mockData.duration}
              </span>
            </div>

            {/* Key Moments */}
            <div>
              <div className="text-xs text-stone mb-2">KEY MOMENTS:</div>
              <div className="space-y-2">
                {mockData.keyMoments.map((moment, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                      moment.active
                        ? "bg-accent/10 border-accent/30"
                        : "bg-charcoal/30 border-stone/10 hover:bg-charcoal/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-mono ${
                          moment.active ? "text-accent" : "text-stone"
                        }`}
                      >
                        {moment.active ? "●" : "○"} {moment.time}
                      </span>
                      <span className="text-xs text-smoke">{moment.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button className="flex items-center gap-1 px-3 py-1.5 rounded bg-charcoal/50 hover:bg-charcoal text-xs text-smoke">
                <ChevronLeft className="w-3 h-3" />
                Prev Moment
              </button>
              <span className="text-xs text-stone">
                Moment 1 of {mockData.keyMoments.length}
              </span>
              <button className="flex items-center gap-1 px-3 py-1.5 rounded bg-charcoal/50 hover:bg-charcoal text-xs text-smoke">
                Next Moment
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Image View */}
        {evidence.type === "image" && mockData && (
          <div className="p-4 space-y-4">
            {/* Image Header */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-charcoal/50 border border-stone/10">
              <ImageIcon className="w-4 h-4 text-stone" />
              <span className="text-xs text-smoke font-mono">
                {mockData.fileName}
              </span>
            </div>

            {/* Image Preview */}
            <div className="rounded-lg bg-charcoal/30 border border-stone/10 p-4 min-h-[300px] flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-full max-w-sm p-6 rounded-lg bg-charcoal/50 border border-stone/20">
                  <div className="text-sm text-stone mb-4">
                    ACME SUPPLIES INC
                  </div>
                  <div className="text-xs text-stone mb-2">
                    Date: 03/14/2023
                  </div>
                  <div className="p-3 rounded bg-accent/10 border border-accent/30 mb-2">
                    <div className="text-lg text-accent font-bold">
                      Total: $15,000.00 ●
                    </div>
                  </div>
                  <div className="p-3 rounded bg-accent/10 border border-accent/30">
                    <div className="text-sm text-accent">Signature: J.D. ●</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Highlights */}
            <div>
              <div className="text-xs text-stone mb-2">HIGHLIGHTS:</div>
              <div className="space-y-2">
                {mockData.findings.map((finding, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg bg-charcoal/30 border border-stone/10"
                  >
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span className="text-xs text-smoke">{finding}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                className="p-1.5 rounded bg-charcoal/50 hover:bg-charcoal"
              >
                <ZoomOut className="w-3 h-3 text-stone" />
              </button>
              <span className="text-xs text-stone w-12 text-center">
                {zoom}%
              </span>
              <button
                onClick={() => setZoom(Math.min(200, zoom + 10))}
                className="p-1.5 rounded bg-charcoal/50 hover:bg-charcoal"
              >
                <ZoomIn className="w-3 h-3 text-stone" />
              </button>
              <button className="px-3 py-1.5 rounded bg-charcoal/50 hover:bg-charcoal text-xs text-smoke">
                Toggle Highlights
              </button>
            </div>
          </div>
        )}

        {/* Audio View */}
        {evidence.type === "audio" && mockData && (
          <div className="p-4 space-y-4">
            {/* Audio Header */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-charcoal/50 border border-stone/10">
              <Music className="w-4 h-4 text-stone" />
              <span className="text-xs text-smoke font-mono">
                {mockData.fileName}
              </span>
            </div>

            {/* Audio Player */}
            <div className="p-6 rounded-lg bg-charcoal/30 border border-stone/10">
              <div className="text-center mb-4">
                <Music className="w-16 h-16 text-stone mx-auto mb-2" />
                <div className="text-sm text-smoke font-mono">
                  {mockData.currentTime} / {mockData.duration}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 rounded bg-accent/20 hover:bg-accent/30">
                  <Play className="w-4 h-4 text-accent" />
                </button>
                <div className="flex-1 h-1 bg-charcoal/50 rounded-full overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: "27%" }} />
                </div>
              </div>
            </div>

            {/* Transcript */}
            <div>
              <div className="text-xs text-stone mb-2">TRANSCRIPT:</div>
              <div className="space-y-2">
                {mockData.transcript.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      entry.highlighted
                        ? "bg-accent/10 border-accent/30"
                        : "bg-charcoal/30 border-stone/10"
                    }`}
                  >
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs text-stone font-mono">
                        {entry.time}
                      </span>
                      <span className="text-xs text-accent font-medium">
                        {entry.speaker}
                      </span>
                    </div>
                    <div className="text-xs text-smoke">{entry.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Text/Default View */}
        {evidence.type === "text" && (
          <div className="p-4 space-y-4">
            <div className="p-4 rounded-lg bg-charcoal/30 border border-stone/10">
              <div className="text-xs text-smoke leading-relaxed">
                {evidence.content || "No content available"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
