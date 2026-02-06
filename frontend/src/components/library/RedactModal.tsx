// ABOUTME: Modal component for PDF redaction with AI-powered content identification.
// ABOUTME: Integrates with backend redaction API to apply black box redactions.

"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { X, Download, Sparkles, Loader2, AlertCircle, CheckCircle, FileText, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  redactPdf,
  redactImage,
  base64ToDataUrl,
  base64ToImageDataUrl,
  downloadBlob,
  type RedactionResponse,
  type ImageRedactionResponse,
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
type RedactionMethod = "blur" | "pixelate";

export function RedactModal({ isOpen, onClose, file }: RedactModalProps) {
  const [showRedactionInput, setShowRedactionInput] = useState(false);
  const [redactionPrompt, setRedactionPrompt] = useState("");
  const [redactionMethod, setRedactionMethod] = useState<RedactionMethod>("blur");
  const [status, setStatus] = useState<RedactionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [redactionResult, setRedactionResult] = useState<RedactionResponse | null>(null);
  const [imageRedactionResult, setImageRedactionResult] = useState<ImageRedactionResponse | null>(null);
  const [redactedPdfUrl, setRedactedPdfUrl] = useState<string | null>(null);
  const [redactedImageUrl, setRedactedImageUrl] = useState<string | null>(null);
  // Visualization image is available but not currently displayed in the UI
  // const [visualizationImageUrl, setVisualizationImageUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const isPdf = file.type === "pdf";
  const isImage = file.type === "image";

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
          redactionMethod,
        );

        setImageRedactionResult(result);
        setRedactedImageUrl(base64ToImageDataUrl(result.censored_image));
        // Visualization image available but not currently displayed
        // setVisualizationImageUrl(base64ToImageDataUrl(result.visualization_image));
        setStatus("success");
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "An unexpected error occurred during redaction";
      setStatus("error");
      setErrorMessage(message);
    }
  }, [file.url, file.name, redactionPrompt, redactionMethod, isPdf, isImage]);

  const handleDownloadRedacted = useCallback(async () => {
    if (!redactionResult && !imageRedactionResult) return;

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
      }
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download the redacted file. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }, [redactionResult, imageRedactionResult, file.name, isPdf, isImage]);

  const handleClose = useCallback(() => {
    // Reset state when closing
    setShowRedactionInput(false);
    setRedactionPrompt("");
    setRedactionMethod("blur");
    setStatus("idle");
    setErrorMessage(null);
    setRedactionResult(null);
    setImageRedactionResult(null);
    setRedactedPdfUrl(null);
    setRedactedImageUrl(null);
    // setVisualizationImageUrl(null);
    onClose();
  }, [onClose]);

  const handleRetry = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
    setRedactionResult(null);
    setImageRedactionResult(null);
    setRedactedPdfUrl(null);
    setRedactedImageUrl(null);
    // setVisualizationImageUrl(null);
  }, []);

  // Only PDFs and images are supported
  if (!isPdf && !isImage) {
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
                  Redaction is currently only supported for PDF and image files.
                  {file.type === "video" && " Video redaction coming soon."}
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="bg-background border border-warm-gray/15 dark:border-stone/15 rounded-xl shadow-2xl overflow-hidden"
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
                      Original {isPdf ? "File" : "Image"}
                    </h3>
                  </div>
                  <div className="flex-1 px-4 py-2 bg-warm-gray/5 dark:bg-stone/5">
                    <h3 className="text-sm font-medium text-foreground">
                      {status === "success" ? `${isPdf ? "Redacted" : "Censored"} Preview` : "Redaction Controls"}
                    </h3>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Left Half - Original File/Image */}
                  <div className="flex-1 border-r border-warm-gray/15 dark:border-stone/15 overflow-hidden">
                    {isPdf ? (
                      <iframe
                        src={file.url}
                        className="w-full h-full"
                        title={`Original: ${file.name}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-warm-gray/5 dark:bg-stone/5 p-4 relative">
                        <Image
                          src={file.url}
                          alt={`Original: ${file.name}`}
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                    )}
                  </div>

                  {/* Right Half - Redaction Controls or Preview */}
                  <div className="flex-1 overflow-hidden flex flex-col">
                    {status === "success" && (redactedPdfUrl || redactedImageUrl) ? (
                      /* Redacted Preview */
                      <div className="flex-1 relative">
                        {isPdf && redactedPdfUrl ? (
                          <iframe
                            src={redactedPdfUrl}
                            className="w-full h-full"
                            title={`Redacted: ${file.name}`}
                          />
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
                            ) : (
                              <ImageIcon className="w-5 h-5 text-purple-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            Processing {isPdf ? "Redaction" : "Censorship"}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            {isPdf 
                              ? "Analyzing document and applying redactions..."
                              : "Analyzing image and applying censorship..."}
                          </p>
                          <div className="w-full max-w-xs mx-auto bg-warm-gray/20 dark:bg-stone/20 rounded-full h-1.5 overflow-hidden">
                            <motion.div
                              initial={{ width: "0%" }}
                              animate={{ width: "100%" }}
                              transition={{
                                duration: 10,
                                ease: "linear",
                              }}
                              className="bg-purple-600 h-1.5 rounded-full"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-4">
                            This may take 10-30 seconds depending on {isPdf ? "document" : "image"} size
                          </p>
                        </div>
                      </div>
                    ) : !showRedactionInput ? (
                      /* Initial State - Start Button */
                      <div className="flex-1 flex items-center justify-center">
                        <button
                          onClick={() => setShowRedactionInput(true)}
                          className="flex items-center space-x-3 px-6 py-4 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border-2 border-purple-500/30 hover:border-purple-500/50 transition-all"
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
                              Describe the information to {isPdf ? "redact" : "censor"} in plain language
                            </p>
                          </div>

                          <div>
                            <textarea
                              value={redactionPrompt}
                              onChange={(e) => setRedactionPrompt(e.target.value)}
                              placeholder={
                                isPdf
                                  ? "E.g., 'Redact all personal names, phone numbers, and email addresses' or 'Redact the word Agentic Marketplace'"
                                  : "E.g., 'Blur all faces' or 'Blur the whole body of the woman with the shortest hair'"
                              }
                              className="w-full h-28 px-4 py-3 rounded-lg border border-warm-gray/15 dark:border-stone/15 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 resize-none text-sm"
                              autoFocus
                            />
                          </div>

                          {/* Method selection for images */}
                          {isImage && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-foreground">
                                Censorship Method
                              </label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setRedactionMethod("blur")}
                                  className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                                    redactionMethod === "blur"
                                      ? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                                      : "border-warm-gray/15 dark:border-stone/15 text-muted-foreground hover:bg-warm-gray/10 dark:hover:bg-stone/10"
                                  }`}
                                >
                                  Blur
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRedactionMethod("pixelate")}
                                  className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                                    redactionMethod === "pixelate"
                                      ? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                                      : "border-warm-gray/15 dark:border-stone/15 text-muted-foreground hover:bg-warm-gray/10 dark:hover:bg-stone/10"
                                  }`}
                                >
                                  Pixelate
                                </button>
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
                              <span>Apply {isPdf ? "Redaction" : "Censorship"}</span>
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
                              <strong>How it works:</strong> {isPdf 
                                ? "Our AI analyzes the document to find matching content, then draws black boxes over the text to censor it while preserving the document structure."
                                : "Our AI analyzes the image to find matching content, then applies blur or pixelation to censor it while preserving the image structure."}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Bar - Download Button */}
                {status === "success" && (redactionResult || imageRedactionResult) && (
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
                              {redactionResult.redaction_count === 1 ? "item" : "items"}
                            </span>
                            {redactionResult.targets.length > 0 && (
                              <span className="text-muted-foreground ml-2">
                                on {new Set(redactionResult.targets.map((t: RedactionTarget) => t.page)).size} page(s)
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
                              {imageRedactionResult.segments_censored === 1 ? "segment" : "segments"}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              ({imageRedactionResult.segments_found} found)
                            </span>
                            {imageRedactionResult.categories_selected.length > 0 && (
                              <span className="text-muted-foreground ml-2">
                                • {imageRedactionResult.categories_selected.join(", ")}
                              </span>
                            )}
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
                        <span>Download {isPdf ? "Redacted PDF" : "Censored Image"}</span>
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
