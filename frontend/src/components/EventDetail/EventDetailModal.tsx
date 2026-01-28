"use client";

import React, { useState } from "react";
import { X, Edit2, Trash2, FileText, Calendar, Clock, AlertCircle, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { TimelineEvent } from "@/types/timeline.types";
import { LAYER_CONFIG } from "@/constants/timeline.constants";
import { cn } from "@/lib/utils";

interface EventDetailModalProps {
  event: TimelineEvent;
  onClose: () => void;
  onUpdate?: (event: TimelineEvent) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
}

export function EventDetailModal({
  event,
  onClose,
  onUpdate,
  onDelete,
}: EventDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editedTitle, setEditedTitle] = useState(event.title);
  const [editedDescription, setEditedDescription] = useState(event.description || "");

  const layerConfig = LAYER_CONFIG[event.layer];

  const handleUpdate = async () => {
    if (!onUpdate) return;

    try {
      await onUpdate({
        ...event,
        title: editedTitle,
        description: editedDescription,
        isUserCorrected: true,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update event:", error);
      alert("Failed to update event. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    const confirmed = window.confirm(
      "Are you sure you want to delete this timeline event? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await onDelete(event.id);
      onClose();
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert("Failed to delete event. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white dark:bg-neutral-900 rounded-xl shadow-2xl"
        >
          {/* Header */}
          <div className={cn(
            "flex items-start justify-between p-6 border-b-2",
            layerConfig.borderColor,
            layerConfig.bgColor,
            "bg-opacity-20 dark:bg-opacity-10"
          )}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "px-2 py-1 text-xs font-medium uppercase tracking-wide rounded",
                  layerConfig.bgColor,
                  layerConfig.color
                )}>
                  {layerConfig.label}
                </span>
                
                {event.isUserCorrected && (
                  <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded">
                    <Check className="w-3 h-3" />
                    Verified
                  </span>
                )}
                
                {!event.isUserCorrected && event.confidence < 0.7 && (
                  <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded">
                    <AlertCircle className="w-3 h-3" />
                    {Math.round(event.confidence * 100)}% confidence
                  </span>
                )}
              </div>

              {isEditing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 w-full bg-transparent border-b-2 border-blue-500 focus:outline-none"
                />
              ) : (
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {event.title}
                </h2>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-240px)]">
            {/* Date and time */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">
                  {format(new Date(event.date), 'MMMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                <Clock className="w-4 h-4" />
                <span className="font-medium">
                  {format(new Date(event.date), 'h:mm a')}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Description
              </h3>
              {isEditing ? (
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={4}
                  className="w-full p-3 text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 rounded-lg border-2 border-blue-500 focus:outline-none resize-none"
                  placeholder="Add a description..."
                />
              ) : (
                <p className="text-neutral-600 dark:text-neutral-400">
                  {event.description || "No description provided"}
                </p>
              )}
            </div>

            {/* Source documents */}
            {event.sourceIds && event.sourceIds.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Source Documents ({event.sourceIds.length})
                </h3>
                <div className="space-y-2">
                  {event.sourceIds.map((sourceId) => (
                    <div
                      key={sourceId}
                      className="flex items-center gap-2 p-2 bg-neutral-100 dark:bg-neutral-800 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-neutral-500" />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300 font-mono">
                        {sourceId.slice(0, 8)}...
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Additional Information
                </h3>
                <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3">
                  <pre className="text-xs text-neutral-600 dark:text-neutral-400 overflow-x-auto">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
            <div className="flex gap-2">
              {onUpdate && (
                isEditing ? (
                  <>
                    <button
                      onClick={handleUpdate}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setEditedTitle(event.title);
                        setEditedDescription(event.description || "");
                        setIsEditing(false);
                      }}
                      className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-neutral-100 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-neutral-100 rounded-lg font-medium transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                )
              )}
            </div>

            {onDelete && !isEditing && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
