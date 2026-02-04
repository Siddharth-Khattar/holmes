"use client";

import { useState } from "react";
import { X, Download, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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

export function RedactModal({ isOpen, onClose, file }: RedactModalProps) {
  const [showRedactionInput, setShowRedactionInput] = useState(false);
  const [redactionDescription, setRedactionDescription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasRedacted, setHasRedacted] = useState(false);
  const [redactedContent, setRedactedContent] = useState<string | null>(null);

  const handleRedactionSubmit = async () => {
    if (!redactionDescription.trim()) return;

    setIsProcessing(true);

    // Simulate processing delay based on file type
    const processingTime =
      {
        image: 1500,
        video: 3000,
        pdf: 2000,
        audio: 2500,
      }[file.type] || 2000;

    await new Promise((resolve) => setTimeout(resolve, processingTime));

    // Generate dummy redacted content based on file type
    setRedactedContent(generateRedactedContent(file.type, file.url));
    setHasRedacted(true);
    setIsProcessing(false);
  };

  const handleDownloadRedacted = () => {
    // In a real implementation, this would download the redacted file
    alert(`Downloading redacted version of ${file.name}`);
  };

  const handleClose = () => {
    // Reset state when closing
    setShowRedactionInput(false);
    setRedactionDescription("");
    setIsProcessing(false);
    setHasRedacted(false);
    setRedactedContent(null);
    onClose();
  };

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
                {/* Titles Row - Above Images */}
                <div className="flex-none flex border-b border-warm-gray/15 dark:border-stone/15">
                  {/* Left Title */}
                  <div className="flex-1 px-4 py-2 border-r border-warm-gray/15 dark:border-stone/15 bg-warm-gray/5 dark:bg-stone/5">
                    <h3 className="text-sm font-medium text-foreground">
                      Original File
                    </h3>
                  </div>

                  {/* Right Title */}
                  <div className="flex-1 px-4 py-2 bg-warm-gray/5 dark:bg-stone/5">
                    <h3 className="text-sm font-medium text-foreground">
                      {hasRedacted ? "Redacted Preview" : "Redaction Controls"}
                    </h3>
                  </div>
                </div>

                {/* Images Row - Side by Side */}
                <div className="flex flex-1 overflow-hidden gap-2">
                  {/* Left Half - Original File */}
                  <div className="flex-1 overflow-hidden">
                    <FilePreview file={file} />
                  </div>

                  {/* Right Half - Redacted Preview or Controls */}
                  <div className="flex-1 overflow-hidden">
                    {hasRedacted && redactedContent ? (
                      <FilePreview
                        file={{ ...file, url: redactedContent }}
                        isRedacted
                      />
                    ) : !showRedactionInput ? (
                      <div className="flex-1 flex items-center justify-center h-full">
                        <button
                          onClick={() => setShowRedactionInput(true)}
                          className="flex items-center space-x-3 px-6 py-4 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border-2 border-purple-500/30 hover:border-purple-500/50 transition-all"
                        >
                          <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          <span className="text-lg font-medium text-purple-700 dark:text-purple-300">
                            Start Redaction
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center h-full p-4">
                        <div className="w-full max-w-md space-y-3">
                          <div className="text-center text-muted-foreground mb-4">
                            <Sparkles className="w-10 h-10 mx-auto mb-2 text-purple-500" />
                            <p className="text-sm">Redacted preview will appear above</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Describe what to redact
                            </label>
                            <textarea
                              value={redactionDescription}
                              onChange={(e) =>
                                setRedactionDescription(e.target.value)
                              }
                              placeholder="E.g., 'Blur all faces and license plates'"
                              className="w-full h-20 px-3 py-2 rounded-lg border border-warm-gray/15 dark:border-stone/15 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 resize-none text-sm"
                              disabled={isProcessing}
                            />
                          </div>
                          <button
                            onClick={handleRedactionSubmit}
                            disabled={!redactionDescription.trim() || isProcessing}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white font-medium transition-colors text-sm"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Processing...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                <span>Apply Redaction</span>
                              </>
                            )}
                          </button>
                          {isProcessing && (
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground mb-2">
                                Analyzing and applying redactions...
                              </p>
                              <div className="w-full bg-warm-gray/20 dark:bg-stone/20 rounded-full h-1.5">
                                <motion.div
                                  initial={{ width: "0%" }}
                                  animate={{ width: "100%" }}
                                  transition={{ duration: 2 }}
                                  className="bg-purple-600 h-1.5 rounded-full"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Download Button Row - Centered Below Images */}
                {hasRedacted && redactedContent && (
                  <div className="flex-none flex justify-center border-t border-warm-gray/15 dark:border-stone/15 px-6 py-3">
                    <button
                      onClick={handleDownloadRedacted}
                      className="w-full max-w-md flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Redacted File</span>
                    </button>
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

// File Preview Component
function FilePreview({
  file,
  isRedacted = false,
}: {
  file: { type: string; url: string; name: string };
  isRedacted?: boolean;
}) {
  switch (file.type) {
    case "image":
      return (
        <div className="relative w-full h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={file.url}
            alt={file.name}
            className="w-full h-full object-contain"
            style={{ display: "block" }}
          />
          {isRedacted && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-purple-600 text-white text-xs font-medium">
              Redacted
            </div>
          )}
        </div>
      );

    case "video":
      return (
        <div className="relative w-full h-full">
          <video
            src={file.url}
            controls
            className="w-full h-full object-contain"
          />
          {isRedacted && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-purple-600 text-white text-xs font-medium">
              Redacted
            </div>
          )}
        </div>
      );

    case "pdf":
      return (
        <div className="relative w-full h-full">
          <iframe src={file.url} className="w-full h-full" title={file.name} />
          {isRedacted && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-purple-600 text-white text-xs font-medium">
              Redacted
            </div>
          )}
        </div>
      );

    case "audio":
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4 p-4">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-purple-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
          <audio src={file.url} controls className="w-full max-w-md" />
          {isRedacted && (
            <div className="px-2 py-1 rounded-full bg-purple-600 text-white text-xs font-medium">
              Audio Redacted
            </div>
          )}
        </div>
      );

    default:
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>Preview not available for this file type</p>
        </div>
      );
  }
}

// Generate dummy redacted content
function generateRedactedContent(
  fileType: string,
  originalUrl: string,
): string {
  // In a real implementation, this would return the actual redacted file URL
  // For now, we'll use modified versions or placeholders to simulate redaction
  switch (fileType) {
    case "image":
      // Add blur effect to simulate redaction
      if (originalUrl.includes("unsplash")) {
        return originalUrl + "&blur=50";
      }
      return "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=600&fit=crop&blur=30";

    case "video":
      // Use a different video to simulate redacted version
      return "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";

    case "pdf":
      // Return a simple PDF with "REDACTED" text
      return "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMyAwIG9iago8PC9UeXBlL1BhZ2UvTWVkaWFCb3hbMCAwIDYxMiA3OTJdL1BhcmVudCAyIDAgUi9SZXNvdXJjZXM8PC9Gb250PDwvRjEgNCAwIFI+Pj4+L0NvbnRlbnRzIDUgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvVHlwZS9Gb250L1N1YnR5cGUvVHlwZTEvQmFzZUZvbnQvSGVsdmV0aWNhLUJvbGQ+PgplbmRvYmoKNSAwIG9iago8PC9MZW5ndGggMTIwPj4Kc3RyZWFtCkJUCi9GMSA0OCBUZgoxMDAgNzAwIFRkCihSRURBQ1RFRCkgVGoKMCAtNTAgVGQKL0YxIDI0IFRmCihTZW5zaXRpdmUgaW5mb3JtYXRpb24gaGFzIGJlZW4gcmVtb3ZlZCkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2NiAwMDAwMCBuIAowMDAwMDAwMTI1IDAwMDAwIG4gCjAwMDAwMDAyNDQgMDAwMDAgbiAKMDAwMDAwMDMyNSAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgNi9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjQ5NAolJUVPRgo=";

    case "audio":
      // Use a different audio file to simulate redacted version
      return "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3";

    default:
      return originalUrl;
  }
}
