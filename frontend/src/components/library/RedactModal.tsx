// ABOUTME: Modal component for PDF, image, and video redaction with AI-powered content identification.
// ABOUTME: Integrates with backend redaction API to apply censorship/redactions.

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import {
  X,
  Download,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Image as ImageIcon,
  Music,
  Video as VideoIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  redactPdf,
  redactImage,
  redactVideo,
  redactAudio,
  base64ToDataUrl,
  base64ToImageDataUrl,
  base64ToVideoDataUrl,
  base64ToAudioDataUrl,
  downloadBlob,
  type RedactionResponse,
  type ImageRedactionResponse,
  type VideoRedactionResponse,
  type AudioRedactionResponse,
  type RedactionTarget,
} from "@/lib/api/redaction";

interface RedactModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    id: string;
    name: string;
    type: "pdf" | "video" | "audio" | "image";
    url: string;
  };
}

type RedactionStatus = "idle" | "processing" | "success" | "error";
type RedactionMethod = "blur" | "pixelate" | "blackbox";

// Particle positions for the scan overlay: [left%, delay, duration]
const SCAN_PARTICLES: [number, string, string][] = [
  [12, "0s", "2.8s"],
  [30, "0.5s", "3.2s"],
  [50, "1.0s", "2.6s"],
  [70, "0.3s", "3.0s"],
  [88, "1.2s", "2.9s"],
];

/**
 * GPU-composited scanning overlay shown on the original file during
 * redaction processing. All animations use transform/opacity only
 * (no layout-triggering properties) for smooth 60fps rendering.
 */
function ScanOverlay({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  // Read container height on mount via effect (refs cannot be accessed during render)
  const [height, setHeight] = useState(600);
  useEffect(() => {
    if (containerRef.current) {
      setHeight(containerRef.current.offsetHeight);
    }
  }, [containerRef]);

  return (
    <div
      className="absolute inset-0 pointer-events-none z-10"
      style={{ "--scan-height": `${height}px` } as React.CSSProperties}
    >
      {/* Subtle dark tint */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Shimmer sweep - single GPU layer */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 will-change-transform opacity-[0.06]"
          style={{
            background:
              "linear-gradient(90deg, transparent 30%, rgba(168,85,247,0.5) 50%, transparent 70%)",
            animation: "scan-shimmer 2.5s ease-in-out infinite",
          }}
        />
      </div>

      {/* Scanning line - uses translateY instead of top */}
      <div
        className="absolute top-0 left-0 right-0 will-change-transform"
        style={{ animation: "scan-sweep 3s ease-in-out infinite" }}
      >
        {/* Glow trail */}
        <div className="h-16 bg-linear-to-t from-purple-500/15 to-transparent" />
        {/* Core line */}
        <div className="h-0.5 bg-purple-500 shadow-[0_0_12px_3px_rgba(168,85,247,0.4)]" />
      </div>

      {/* Floating particles - 5 elements, transform-only animation */}
      {SCAN_PARTICLES.map(([left, delay, duration], i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-purple-400/80 will-change-transform"
          style={{
            left: `${left}%`,
            top: "50%",
            boxShadow: "0 0 4px 1px rgba(192,132,252,0.5)",
            animation: `scan-particle ${duration} ${delay} ease-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function RedactModal({ isOpen, onClose, file }: RedactModalProps) {
  const originalPanelRef = useRef<HTMLDivElement>(null);
  const [showRedactionInput, setShowRedactionInput] = useState(false);
  const [redactionPrompt, setRedactionPrompt] = useState("");
  const [redactionMethod, setRedactionMethod] =
    useState<RedactionMethod>("blur");
  const [status, setStatus] = useState<RedactionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [redactionResult, setRedactionResult] =
    useState<RedactionResponse | null>(null);
  const [imageRedactionResult, setImageRedactionResult] =
    useState<ImageRedactionResponse | null>(null);
  const [videoRedactionResult, setVideoRedactionResult] =
    useState<VideoRedactionResponse | null>(null);
  const [audioRedactionResult, setAudioRedactionResult] =
    useState<AudioRedactionResponse | null>(null);
  const [redactedPdfUrl, setRedactedPdfUrl] = useState<string | null>(null);
  const [redactedImageUrl, setRedactedImageUrl] = useState<string | null>(null);
  const [redactedVideoUrl, setRedactedVideoUrl] = useState<string | null>(null);
  const [redactedAudioUrl, setRedactedAudioUrl] = useState<string | null>(null);
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);
  // Visualization image is available but not currently displayed in the UI
  // const [visualizationImageUrl, setVisualizationImageUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const isPdf = file.type === "pdf";
  const isImage = file.type === "image";
  const isVideo = file.type === "video";
  const isAudio = file.type === "audio";

  useEffect(() => {
    setIsMediaLoaded(false);
  }, [file.url]);

  const handleRedactionSubmit = useCallback(async () => {
    if (!redactionPrompt.trim()) return;

    setStatus("processing");
    setErrorMessage(null);

    try {
      if (isPdf) {
        // PDF redaction
        const result = await redactPdf(
          file.url,
          redactionPrompt,
          file.name,
          false, // visual covering, not permanent
        );

        setRedactionResult(result);
        setRedactedPdfUrl(base64ToDataUrl(result.redacted_pdf));
        setStatus("success");
      } else if (isImage) {
        // Image redaction
        const result = await redactImage(
          file.url,
          redactionPrompt,
          file.name,
          redactionMethod as "blur" | "pixelate",
        );

        setImageRedactionResult(result);
        setRedactedImageUrl(base64ToImageDataUrl(result.censored_image));
        // Visualization image available but not currently displayed
        // setVisualizationImageUrl(base64ToImageDataUrl(result.visualization_image));
        setStatus("success");
      } else if (isVideo) {
        // Video redaction
        const result = await redactVideo(
          file.url,
          redactionPrompt,
          file.name,
          redactionMethod,
        );

        setVideoRedactionResult(result);
        setRedactedVideoUrl(base64ToVideoDataUrl(result.censored_video));
        setStatus("success");
      } else if (isAudio) {
        // Audio redaction
        const result = await redactAudio(file.url, redactionPrompt, file.name);

        setAudioRedactionResult(result);
        // Determine MIME type from output format
        const mimeType =
          result.output_format === "wav"
            ? "audio/wav"
            : result.output_format === "ogg"
              ? "audio/ogg"
              : result.output_format === "flac"
                ? "audio/flac"
                : "audio/mpeg";
        setRedactedAudioUrl(
          base64ToAudioDataUrl(result.censored_audio, mimeType),
        );
        setStatus("success");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during redaction";
      setStatus("error");
      setErrorMessage(message);
    }
  }, [
    file.url,
    file.name,
    redactionPrompt,
    redactionMethod,
    isPdf,
    isImage,
    isVideo,
    isAudio,
  ]);

  const handleDownloadRedacted = useCallback(async () => {
    if (
      !redactionResult &&
      !imageRedactionResult &&
      !videoRedactionResult &&
      !audioRedactionResult
    )
      return;

    setIsDownloading(true);
    try {
      if (isPdf && redactionResult) {
        // Download PDF
        const base64Data = redactionResult.redacted_pdf;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/pdf" });
        const outputName = file.name.replace(".pdf", "_redacted.pdf");
        downloadBlob(blob, outputName);
      } else if (isImage && imageRedactionResult) {
        // Download Image
        const base64Data = imageRedactionResult.censored_image;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "image/jpeg" });

        // Generate output filename
        const nameParts = file.name.split(".");
        const ext = nameParts.length > 1 ? nameParts.pop() : "jpg";
        const baseName = nameParts.join(".");
        const outputName = `${baseName}_censored.${ext}`;
        downloadBlob(blob, outputName);
      } else if (isVideo && videoRedactionResult) {
        // Download Video
        const base64Data = videoRedactionResult.censored_video;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "video/mp4" });

        // Generate output filename
        const nameParts = file.name.split(".");
        const ext = nameParts.length > 1 ? nameParts.pop() : "mp4";
        const baseName = nameParts.join(".");
        const outputName = `${baseName}_censored.${ext}`;

        downloadBlob(blob, outputName);
      } else if (isAudio && audioRedactionResult) {
        // Download Audio
        const base64Data = audioRedactionResult.censored_audio;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Determine MIME type
        const mimeType =
          audioRedactionResult.output_format === "wav"
            ? "audio/wav"
            : audioRedactionResult.output_format === "ogg"
              ? "audio/ogg"
              : audioRedactionResult.output_format === "flac"
                ? "audio/flac"
                : "audio/mpeg";
        const blob = new Blob([bytes], { type: mimeType });

        // Generate output filename
        const nameParts = file.name.split(".");
        const ext =
          audioRedactionResult.output_format ||
          (nameParts.length > 1 ? nameParts.pop() : "mp3");
        const baseName = nameParts.join(".");
        const outputName = `${baseName}_censored.${ext}`;

        downloadBlob(blob, outputName);
      }
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download the redacted file. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }, [
    redactionResult,
    imageRedactionResult,
    videoRedactionResult,
    audioRedactionResult,
    file.name,
    isPdf,
    isImage,
    isVideo,
    isAudio,
  ]);

  const handleClose = useCallback(() => {
    // Reset state when closing
    setShowRedactionInput(false);
    setRedactionPrompt("");
    setRedactionMethod("blur");
    setStatus("idle");
    setErrorMessage(null);
    setRedactionResult(null);
    setImageRedactionResult(null);
    setVideoRedactionResult(null);
    setAudioRedactionResult(null);
    setRedactedPdfUrl(null);
    setRedactedImageUrl(null);
    setRedactedVideoUrl(null);
    setRedactedAudioUrl(null);
    // setVisualizationImageUrl(null);
    onClose();
  }, [onClose]);

  const handleRetry = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
    setRedactionResult(null);
    setImageRedactionResult(null);
    setVideoRedactionResult(null);
    setAudioRedactionResult(null);
    setRedactedPdfUrl(null);
    setRedactedImageUrl(null);
    setRedactedVideoUrl(null);
    setRedactedAudioUrl(null);
    // setVisualizationImageUrl(null);
  }, []);

  // Only PDFs, images, videos, and audio are supported
  if (!isPdf && !isImage && !isVideo && !isAudio) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="bg-background border border-warm-gray/15 dark:border-stone/15 rounded-xl shadow-2xl p-8 max-w-md text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Redaction Not Available
                </h2>
                <p className="text-muted-foreground mb-6">
                  Redaction is currently only supported for PDF, image, and
                  video files.
                  {file.type === "audio" && " Audio redaction coming soon."}
                </p>
                <button
                  onClick={handleClose}
                  className="px-6 py-2 rounded-lg bg-warm-gray/10 hover:bg-warm-gray/20 dark:bg-stone/10 dark:hover:bg-stone/20 text-foreground transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="bg-(--card) border border-(--border) rounded-xl shadow-2xl overflow-hidden"
              style={{
                width: "min(1400px, 90vw)",
                height: "min(800px, 85vh)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-warm-gray/15 dark:border-stone/15">
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  <h2 className="text-lg font-semibold text-foreground">
                    Redact & Download
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {file.name}
                  </span>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-warm-gray/12 dark:hover:bg-stone/15 transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="flex flex-col h-[calc(100%-73px)]">
                {/* Titles Row */}
                <div className="flex-none flex border-b border-warm-gray/15 dark:border-stone/15">
                  <div className="flex-1 px-4 py-2 border-r border-warm-gray/15 dark:border-stone/15 bg-warm-gray/5 dark:bg-stone/5">
                    <h3 className="text-sm font-medium text-foreground">
                      Original{" "}
                      {isPdf
                        ? "File"
                        : isVideo
                          ? "Video"
                          : isAudio
                            ? "Audio"
                            : "Image"}
                    </h3>
                  </div>
                  <div className="flex-1 px-4 py-2 bg-warm-gray/5 dark:bg-stone/5">
                    <h3 className="text-sm font-medium text-foreground">
                      {status === "success"
                        ? `${isPdf ? "Redacted" : "Censored"} Preview`
                        : "Redaction Controls"}
                    </h3>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-1 overflow-hidden min-h-0">
                  {/* Left Half - Original File/Image */}
                  <div
                    ref={originalPanelRef}
                    className="flex-1 border-r border-warm-gray/15 dark:border-stone/15 overflow-hidden relative min-h-0"
                  >
                    {!file.url ? (
                      /* URL still loading — show skeleton */
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-warm-gray/5 dark:bg-stone/5">
                        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                        <span className="text-sm text-muted-foreground">
                          Loading {isPdf ? "document" : "image"}...
                        </span>
                      </div>
                    ) : isPdf ? (
                      <iframe
                        src={file.url}
                        className="w-full h-full"
                        title={`Original: ${file.name}`}
                        onLoad={() => setIsMediaLoaded(true)}
                      />
                    ) : isVideo ? (
                      <div className="w-full h-full flex items-center justify-center bg-warm-gray/5 dark:bg-stone/5 p-4 overflow-hidden">
                        <video
                          src={file.url}
                          onLoadedData={() => setIsMediaLoaded(true)}
                          controls
                          className="max-w-full max-h-full object-contain"
                          title={`Original: ${file.name}`}
                        />
                      </div>
                    ) : isAudio ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-warm-gray/5 dark:bg-stone/5 p-8">
                        <div className="w-24 h-24 rounded-full bg-purple-500/10 flex items-center justify-center mb-6">
                          <Music className="w-12 h-12 text-purple-500" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          {file.name}
                        </p>
                        <audio
                          src={file.url}
                          onLoadedData={() => setIsMediaLoaded(true)}
                          controls
                          className="w-full max-w-md"
                          title={`Original: ${file.name}`}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-warm-gray/5 dark:bg-stone/5 p-4 relative">
                        <Image
                          src={file.url}
                          alt={`Original: ${file.name}`}
                          fill
                          className="object-contain"
                          unoptimized
                          onLoad={() => setIsMediaLoaded(true)}
                        />
                      </div>
                    )}

                    {/* Scanning overlay while processing - GPU-composited CSS animations */}
                    {status === "processing" && (
                      <ScanOverlay containerRef={originalPanelRef} />
                    )}
                  </div>

                  {/* Right Half - Redaction Controls or Preview */}
                  <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                    {status === "success" &&
                      (redactedPdfUrl ||
                        redactedImageUrl ||
                        redactedVideoUrl ||
                        redactedAudioUrl) ? (
                      /* Redacted Preview */
                      <div className="flex-1 relative min-h-0 overflow-hidden">
                        {isPdf && redactedPdfUrl ? (
                          <iframe
                            src={redactedPdfUrl}
                            className="w-full h-full"
                            title={`Redacted: ${file.name}`}
                          />
                        ) : isVideo && redactedVideoUrl ? (
                          <div className="w-full h-full flex items-center justify-center bg-warm-gray/5 dark:bg-stone/5 p-4 overflow-hidden">
                            <video
                              src={redactedVideoUrl}
                              controls
                              autoPlay
                              loop
                              className="max-w-full max-h-full object-contain"
                              title={`Censored: ${file.name}`}
                            />
                          </div>
                        ) : isAudio && redactedAudioUrl ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-warm-gray/5 dark:bg-stone/5 p-8">
                            <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                              <Music className="w-12 h-12 text-green-500" />
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                              Censored Audio
                            </p>
                            <audio
                              src={redactedAudioUrl}
                              controls
                              className="w-full max-w-md"
                              title={`Censored: ${file.name}`}
                            />
                            {audioRedactionResult?.transcript && (
                              <div className="mt-6 w-full max-w-md">
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  Transcript:
                                </p>
                                <div className="max-h-32 overflow-y-auto text-xs text-muted-foreground bg-background/50 rounded-lg p-3 border border-warm-gray/10">
                                  {audioRedactionResult.transcript}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : isImage && redactedImageUrl ? (
                          <div className="w-full h-full flex items-center justify-center bg-warm-gray/5 dark:bg-stone/5 p-4 relative">
                            <Image
                              src={redactedImageUrl}
                              alt={`Censored: ${file.name}`}
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                        ) : null}
                        <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-purple-600 text-white text-xs font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {isPdf ? "Redacted" : "Censored"}
                        </div>
                      </div>
                    ) : status === "error" ? (
                      /* Error State */
                      <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center max-w-md">
                          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            Redaction Failed
                          </h3>
                          <p className="text-sm text-muted-foreground mb-6">
                            {errorMessage}
                          </p>
                          <button
                            onClick={handleRetry}
                            className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
                          >
                            Try Again
                          </button>
                        </div>
                      </div>
                    ) : status === "processing" ? (
                      /* Processing State */
                      <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center max-w-md">
                          <div className="relative mb-6">
                            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto" />
                            {isPdf ? (
                              <FileText className="w-5 h-5 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            ) : isVideo ? (
                              <VideoIcon className="w-5 h-5 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            ) : isAudio ? (
                              <Music className="w-5 h-5 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            Processing {isPdf ? "Redaction" : "Censorship"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {isPdf
                              ? "Analyzing document and applying redactions..."
                              : isVideo
                                ? "Analyzing video and applying censorship... This may take 2-10 minutes."
                                : isAudio
                                  ? "Transcribing audio and applying beep censorship..."
                                  : "Analyzing image and applying censorship..."}
                          </p>
                          {!isVideo && (
                            <p className="text-xs text-muted-foreground mt-4">
                              This may take 10-30 seconds depending on{" "}
                              {isPdf ? "document" : "image"} size
                            </p>
                          )}
                        </div>
                      </div>
                    ) : !showRedactionInput ? (
                      /* Initial State - Start Button */
                      <div className="flex-1 flex items-center justify-center">
                        <button
                          onClick={() => setShowRedactionInput(true)}
                          disabled={!isMediaLoaded}
                          className="flex items-center space-x-3 px-6 py-4 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border-2 border-purple-500/30 hover:border-purple-500/50 transition-all disabled:opacity-50 disabled:blur-sm disabled:cursor-not-allowed"
                        >
                          <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          <span className="text-lg font-medium text-purple-700 dark:text-purple-300">
                            Start {isPdf ? "Redaction" : "Censorship"}
                          </span>
                        </button>
                      </div>
                    ) : (
                      /* Input State - Prompt Form */
                      <div className="flex-1 flex items-center justify-center p-6">
                        <div className="w-full max-w-md space-y-4">
                          <div className="text-center mb-6">
                            <Sparkles className="w-10 h-10 mx-auto mb-3 text-purple-500" />
                            <h3 className="text-lg font-semibold text-foreground mb-1">
                              What should we {isPdf ? "redact" : "censor"}?
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Describe the information to{" "}
                              {isPdf ? "redact" : "censor"} in plain language
                            </p>
                          </div>

                          <div>
                            <textarea
                              value={redactionPrompt}
                              onChange={(e) =>
                                setRedactionPrompt(e.target.value)
                              }
                              placeholder={
                                isPdf
                                  ? "E.g., 'Redact all personal names, phone numbers, and email addresses' or 'Redact the word Agentic Marketplace'"
                                  : isAudio
                                    ? "E.g., 'Censor all mentions of names and addresses' or 'Beep out any profanity or offensive language'"
                                    : "E.g., 'Blur all faces' or 'Blur the whole body of the woman with the shortest hair'"
                              }
                              className="w-full h-28 px-4 py-3 rounded-lg border border-warm-gray/15 dark:border-stone/15 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 resize-none text-sm"
                              autoFocus
                            />
                          </div>

                          {/* Method selection for images and videos */}
                          {(isImage || isVideo) && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-foreground">
                                Censorship Method
                              </label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setRedactionMethod("blur")}
                                  className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${redactionMethod === "blur"
                                    ? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                                    : "border-warm-gray/15 dark:border-stone/15 text-muted-foreground hover:bg-warm-gray/10 dark:hover:bg-stone/10"
                                    }`}
                                >
                                  Blur
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRedactionMethod("pixelate")}
                                  className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${redactionMethod === "pixelate"
                                    ? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                                    : "border-warm-gray/15 dark:border-stone/15 text-muted-foreground hover:bg-warm-gray/10 dark:hover:bg-stone/10"
                                    }`}
                                >
                                  Pixelate
                                </button>
                                {isVideo && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRedactionMethod("blackbox")
                                    }
                                    className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${redactionMethod === "blackbox"
                                      ? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                                      : "border-warm-gray/15 dark:border-stone/15 text-muted-foreground hover:bg-warm-gray/10 dark:hover:bg-stone/10"
                                      }`}
                                  >
                                    Blackbox
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <button
                              onClick={handleRedactionSubmit}
                              disabled={!redactionPrompt.trim()}
                              className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white font-medium transition-colors"
                            >
                              <Sparkles className="w-4 h-4" />
                              <span>
                                Apply {isPdf ? "Redaction" : "Censorship"}
                              </span>
                            </button>
                            <button
                              onClick={() => setShowRedactionInput(false)}
                              className="w-full px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-warm-gray/10 dark:hover:bg-stone/10 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>

                          <div className="pt-4 border-t border-warm-gray/15 dark:border-stone/15">
                            <p className="text-xs text-muted-foreground">
                              <strong>How it works:</strong>{" "}
                              {isPdf
                                ? "Our AI analyzes the document to find matching content, then draws black boxes over the text to censor it while preserving the document structure."
                                : isVideo
                                  ? "Our AI analyzes the video frame-by-frame to find matching content, then applies blur, pixelation, or black boxes to censor it throughout the video."
                                  : isAudio
                                    ? "Our AI transcribes the audio to find matching content, then replaces those segments with a beep sound while preserving the rest of the audio."
                                    : "Our AI analyzes the image to find matching content, then applies blur or pixelation to censor it while preserving the image structure."}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Bar - Download Button */}
                {status === "success" &&
                  (redactionResult ||
                    imageRedactionResult ||
                    videoRedactionResult ||
                    audioRedactionResult) && (
                    <div className="flex-none border-t border-warm-gray/15 dark:border-stone/15 px-6 py-4 bg-warm-gray/5 dark:bg-stone/5">
                      <div className="flex items-center justify-between max-w-4xl mx-auto">
                        <div className="text-sm">
                          {isPdf && redactionResult ? (
                            <>
                              <span className="text-muted-foreground">
                                Redacted{" "}
                                <span className="font-semibold text-foreground">
                                  {redactionResult.redaction_count}
                                </span>{" "}
                                {redactionResult.redaction_count === 1
                                  ? "item"
                                  : "items"}
                              </span>
                              {redactionResult.targets.length > 0 && (
                                <span className="text-muted-foreground ml-2">
                                  on{" "}
                                  {
                                    new Set(
                                      redactionResult.targets.map(
                                        (t: RedactionTarget) => t.page,
                                      ),
                                    ).size
                                  }{" "}
                                  page(s)
                                </span>
                              )}
                            </>
                          ) : isImage && imageRedactionResult ? (
                            <>
                              <span className="text-muted-foreground">
                                Censored{" "}
                                <span className="font-semibold text-foreground">
                                  {imageRedactionResult.segments_censored}
                                </span>{" "}
                                {imageRedactionResult.segments_censored === 1
                                  ? "segment"
                                  : "segments"}
                              </span>
                              <span className="text-muted-foreground ml-2">
                                ({imageRedactionResult.segments_found} found)
                              </span>
                              {imageRedactionResult.categories_selected.length >
                                0 && (
                                  <span className="text-muted-foreground ml-2">
                                    •{" "}
                                    {imageRedactionResult.categories_selected.join(
                                      ", ",
                                    )}
                                  </span>
                                )}
                            </>
                          ) : isVideo && videoRedactionResult ? (
                            <>
                              <span className="text-muted-foreground">
                                Censored{" "}
                                <span className="font-semibold text-foreground">
                                  {videoRedactionResult.segments_censored}
                                </span>{" "}
                                {videoRedactionResult.segments_censored === 1
                                  ? "segment"
                                  : "segments"}
                              </span>
                              <span className="text-muted-foreground ml-2">
                                ({videoRedactionResult.segments_found} found)
                              </span>
                            </>
                          ) : isAudio && audioRedactionResult ? (
                            <>
                              <span className="text-muted-foreground">
                                Censored{" "}
                                <span className="font-semibold text-foreground">
                                  {audioRedactionResult.segments_censored}
                                </span>{" "}
                                {audioRedactionResult.segments_censored === 1
                                  ? "segment"
                                  : "segments"}
                              </span>
                              <span className="text-muted-foreground ml-2">
                                ({audioRedactionResult.segments_found} found)
                              </span>
                            </>
                          ) : null}
                        </div>
                        <button
                          onClick={handleDownloadRedacted}
                          disabled={isDownloading}
                          className="flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-medium transition-colors"
                        >
                          {isDownloading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          <span>
                            Download{" "}
                            {isPdf
                              ? "Redacted PDF"
                              : isVideo
                                ? "Censored Video"
                                : isAudio
                                  ? "Censored Audio"
                                  : "Censored Image"}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
