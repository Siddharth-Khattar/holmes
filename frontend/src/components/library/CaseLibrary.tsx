"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  FileText,
  Video,
  Music,
  Image as ImageIcon,
  Eye,
  Download,
  Trash2,
  MoreVertical,
  AlertTriangle,
  Upload,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  listFiles,
  getDownloadUrl,
  deleteFile,
  FileResponse,
} from "@/lib/api/files";
import { useFileUpload } from "@/hooks/useFileUpload";

// Types for UI display
type SupportedFileType = "pdf" | "video" | "audio" | "image";
type FileCategory = "all" | "evidence" | "legal" | "strategy" | "reference";
type FileStatus = "ready" | "processing" | "conflict" | "error";

interface ConflictInfo {
  type: "duplicate" | "contradiction" | "version";
  message: string;
  existingFile?: string;
  suggestions: string[];
}

interface LibraryFile {
  id: string;
  name: string;
  type: SupportedFileType;
  size: number;
  url: string;
  category: FileCategory;
  status: FileStatus;
  processingProgress?: number;
  conflictInfo?: ConflictInfo;
  uploadedAt: Date;
}

interface CaseLibraryProps {
  caseId: string;
  caseName?: string;
}

/**
 * Map backend file category to frontend category.
 * Backend uses: DOCUMENT, IMAGE, VIDEO, AUDIO
 * Frontend uses: evidence (default), legal, strategy, reference
 */
function mapCategory(backendCategory: string): FileCategory {
  // For now, map all backend categories to "evidence"
  // In the future, category could be stored as file metadata
  void backendCategory;
  return "evidence";
}

/**
 * Map backend file status to frontend status.
 */
function mapStatus(backendStatus: string): FileStatus {
  switch (backendStatus) {
    case "UPLOADING":
    case "QUEUED":
    case "PROCESSING":
      return "processing";
    case "UPLOADED":
    case "ANALYZED":
      return "ready";
    case "ERROR":
      return "error";
    default:
      return "ready";
  }
}

/**
 * Map backend MIME type to frontend file type.
 */
function mapFileType(mimeType: string): SupportedFileType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "pdf"; // Default to pdf for documents
}

/**
 * Convert backend FileResponse to frontend LibraryFile format.
 */
function mapToLibraryFile(file: FileResponse): LibraryFile {
  const libraryFile: LibraryFile = {
    id: file.id,
    name: file.original_filename,
    type: mapFileType(file.mime_type),
    size: file.size_bytes,
    url: "", // URL will be fetched on demand via signed URL
    category: mapCategory(file.category),
    status: mapStatus(file.status),
    uploadedAt: new Date(file.created_at),
  };

  // Add conflict info if this is a duplicate
  if (file.duplicate_of) {
    libraryFile.status = "conflict";
    libraryFile.conflictInfo = {
      type: "duplicate",
      message: `This file is a duplicate of an existing file`,
      suggestions: ["View Original", "Keep Both", "Remove Duplicate"],
    };
  }

  return libraryFile;
}

export function CaseLibrary({ caseId, caseName }: CaseLibraryProps) {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // File upload hook
  const {
    isUploading,
    currentFile,
    error: uploadError,
    upload,
    clearError,
  } = useFileUpload(caseId);

  // Fetch files on mount
  useEffect(() => {
    async function fetchFiles() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await listFiles(caseId);
        setFiles(response.files.map(mapToLibraryFile));
      } catch (err) {
        setLoadError(
          err instanceof Error ? err.message : "Failed to load files",
        );
        // Keep empty array on error - graceful degradation
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFiles();
  }, [caseId]);

  // Refresh file list
  const refreshFiles = useCallback(async () => {
    try {
      const response = await listFiles(caseId);
      setFiles(response.files.map(mapToLibraryFile));
    } catch (err) {
      console.error("Failed to refresh files:", err);
    }
  }, [caseId]);

  // File type icon mapping
  const getFileIcon = useCallback((type: SupportedFileType) => {
    switch (type) {
      case "pdf":
        return <FileText className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      case "audio":
        return <Music className="w-4 h-4" />;
      case "image":
        return <ImageIcon className="w-4 h-4" />;
    }
  }, []);

  // Format file size
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }, []);

  // Get status indicator
  const getStatusIndicator = useCallback((file: LibraryFile) => {
    switch (file.status) {
      case "ready":
        return (
          <div className="flex items-center space-x-1 text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm">Ready</span>
          </div>
        );
      case "processing":
        return (
          <div className="flex items-center space-x-2">
            <div className="w-16 bg-stone/20 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${file.processingProgress || 0}%` }}
              />
            </div>
            <span className="text-sm text-blue-600">
              {file.processingProgress || 0}%
            </span>
          </div>
        );
      case "conflict":
        return (
          <div className="flex items-center space-x-1 text-amber-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Conflict</span>
          </div>
        );
      case "error":
        return (
          <div className="flex items-center space-x-1 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Error</span>
          </div>
        );
    }
  }, []);

  // Filter files
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesCategory =
        selectedCategory === "all" || file.category === selectedCategory;
      const matchesSearch = file.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [files, selectedCategory, searchQuery]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        clearError();
        await upload(droppedFiles);
        // Refresh file list after upload
        await refreshFiles();
      }
    },
    [upload, refreshFiles, clearError],
  );

  // File actions
  const handleViewFile = useCallback((file: LibraryFile) => {
    console.log("View file:", file);
    // TODO: Open in source panel
  }, []);

  const handleDownloadFile = useCallback(
    async (file: LibraryFile) => {
      try {
        const url = await getDownloadUrl(caseId, file.id);
        window.open(url, "_blank");
      } catch (err) {
        console.error("Failed to get download URL:", err);
        alert("Failed to download file. Please try again.");
      }
    },
    [caseId],
  );

  const handleDeleteFile = useCallback(
    async (file: LibraryFile) => {
      if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) {
        return;
      }

      try {
        await deleteFile(caseId, file.id);
        // Remove from local state
        setFiles((prev) => prev.filter((f) => f.id !== file.id));
      } catch (err) {
        console.error("Failed to delete file:", err);
        alert("Failed to delete file. Please try again.");
      }
    },
    [caseId],
  );

  // Category badge color
  const getCategoryColor = (category: FileCategory) => {
    switch (category) {
      case "evidence":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "legal":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "strategy":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "reference":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      default:
        return "bg-stone/20 text-stone";
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div
        className="flex-none px-6 py-4 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-2xl font-medium"
              style={{ color: "var(--foreground)" }}
            >
              Evidence Library
            </h1>
            {caseName && (
              <p
                className="text-sm mt-1"
                style={{ color: "var(--muted-foreground)" }}
              >
                {caseName}
              </p>
            )}
          </div>
          <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {filteredFiles.length}{" "}
                {filteredFiles.length === 1 ? "file" : "files"}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upload Status */}
      <AnimatePresence>
        {(isUploading || uploadError) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-none mx-6 mt-4"
          >
            {isUploading && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="text-sm text-blue-800 dark:text-blue-300">
                    Uploading: {currentFile}
                  </span>
                </div>
              </div>
            )}
            {uploadError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-sm text-red-800 dark:text-red-300">
                      {uploadError}
                    </span>
                  </div>
                  <button
                    onClick={clearError}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Load Error */}
      <AnimatePresence>
        {loadError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-none mx-6 mt-4"
          >
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-800 dark:text-red-300">
                  {loadError}
                </span>
                <button
                  onClick={refreshFiles}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  Retry
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag & Drop Zone */}
      <div
        className="flex-none mx-6 mt-6"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-500/10"
              : "border-stone/30 hover:border-stone/50"
          } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
        >
          <Upload
            className="w-8 h-8 mx-auto mb-2"
            style={{
              color: isDragging ? "#3b82f6" : "var(--muted-foreground)",
            }}
          />
          <p
            className="text-sm"
            style={{
              color: isDragging ? "#3b82f6" : "var(--muted-foreground)",
            }}
          >
            {isUploading
              ? "Upload in progress..."
              : "Drag & drop files to add to case"}
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex-none px-6 py-4 space-y-4">
        {/* Category Filters */}
        <div className="flex items-center gap-2">
          <Filter
            className="w-4 h-4"
            style={{ color: "var(--muted-foreground)" }}
          />
          <span
            className="text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            Filter:
          </span>
          {(
            [
              "all",
              "evidence",
              "legal",
              "strategy",
              "reference",
            ] as FileCategory[]
          ).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                selectedCategory === category
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              }`}
              style={{
                backgroundColor:
                  selectedCategory === category
                    ? "var(--accent)"
                    : "transparent",
                color:
                  selectedCategory === category
                    ? "var(--accent-foreground)"
                    : "var(--muted-foreground)",
              }}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--muted-foreground)" }}
          />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border transition-colors"
            style={{
              backgroundColor: "var(--background)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>
      </div>

      {/* Conflict Alert */}
      <AnimatePresence>
        {filteredFiles.some((f) => f.status === "conflict") && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-none mx-6 mb-4"
          >
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-amber-900 dark:text-amber-300 mb-2">
                    Attention Required (
                    {
                      filteredFiles.filter((f) => f.status === "conflict")
                        .length
                    }
                    )
                  </h3>
                  {filteredFiles
                    .filter((f) => f.status === "conflict")
                    .map((file) => (
                      <div key={file.id} className="mb-3 last:mb-0">
                        <div className="font-medium text-sm text-amber-900 dark:text-amber-300">
                          {file.name} - CONFLICT DETECTED
                        </div>
                        <div className="text-sm text-amber-800 dark:text-amber-400 mt-1">
                          {file.conflictInfo?.message}
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                          {file.conflictInfo?.suggestions.map(
                            (suggestion, index) => (
                              <button
                                key={index}
                                className="px-3 py-1 text-xs rounded bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                              >
                                {suggestion}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <p style={{ color: "var(--muted-foreground)" }}>
              {files.length === 0
                ? "No files uploaded yet. Drag & drop files above to get started."
                : "No files match your search criteria."}
            </p>
          </div>
        ) : (
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: "var(--border)" }}
          >
            <table className="w-full">
              <thead>
                <tr
                  className="border-b text-left text-xs uppercase tracking-wide"
                  style={{
                    backgroundColor: "var(--muted)",
                    borderColor: "var(--border)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  <th className="px-4 py-3 font-medium">File Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((file, index) => (
                  <motion.tr
                    key={file.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b hover:bg-muted/50 transition-colors"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className="shrink-0"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {getFileIcon(file.type)}
                        </div>
                        <div>
                          <div
                            className="text-sm font-medium"
                            style={{ color: "var(--foreground)" }}
                          >
                            {file.name}
                          </div>
                          <div
                            className="text-xs"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            {formatFileSize(file.size)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(file.category)}`}
                      >
                        {file.category.charAt(0).toUpperCase() +
                          file.category.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4">{getStatusIndicator(file)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewFile(file)}
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                          title="View file"
                        >
                          <Eye
                            className="w-4 h-4"
                            style={{ color: "var(--muted-foreground)" }}
                          />
                        </button>
                        <button
                          onClick={() => handleDownloadFile(file)}
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                          title="Download file"
                        >
                          <Download
                            className="w-4 h-4"
                            style={{ color: "var(--muted-foreground)" }}
                          />
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file)}
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                          title="Delete file"
                        >
                          <Trash2
                            className="w-4 h-4"
                            style={{ color: "var(--muted-foreground)" }}
                          />
                        </button>
                        <button
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                          title="More options"
                        >
                          <MoreVertical
                            className="w-4 h-4"
                            style={{ color: "var(--muted-foreground)" }}
                          />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex-none px-6 py-3 border-t text-xs"
        style={{
          borderColor: "var(--border)",
          color: "var(--muted-foreground)",
        }}
      >
        <p>
          Quick Analysis Modal: Click <Eye className="inline w-3 h-3" /> on any
          file to open detailed analysis
        </p>
      </div>
    </div>
  );
}
