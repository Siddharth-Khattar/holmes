// ABOUTME: Audio recorder component for Sherlock's Diary.
// ABOUTME: Uses MediaRecorder API to capture audio notes with visual feedback.

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx } from "clsx";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, durationSeconds: number) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function AudioRecorder({
  onRecordingComplete,
  onError,
  disabled = false,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<
    "prompt" | "granted" | "denied" | "checking"
  >("checking");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Check microphone permission on mount
  useEffect(() => {
    async function checkPermission() {
      try {
        // Try to get permission status via Permissions API (if supported)
        if (navigator.permissions) {
          const result = await navigator.permissions.query({
            name: "microphone" as PermissionName,
          });
          setPermissionStatus(result.state as "prompt" | "granted" | "denied");

          result.onchange = () => {
            setPermissionStatus(
              result.state as "prompt" | "granted" | "denied",
            );
          };
        } else {
          // Permissions API not supported, assume prompt
          setPermissionStatus("prompt");
        }
      } catch {
        // Permissions API might not support microphone query
        setPermissionStatus("prompt");
      }
    }

    checkPermission();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionStatus("granted");

      // Determine best audio format
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
      } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
        mimeType = "audio/ogg";
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const durationSeconds = Math.round(
          (Date.now() - startTimeRef.current) / 1000,
        );
        onRecordingComplete(blob, durationSeconds);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000); // Collect data in 1s chunks
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setDuration(0);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
      if ((err as DOMException).name === "NotAllowedError") {
        setPermissionStatus("denied");
        onError?.(
          "Microphone access denied. Please enable it in your browser settings.",
        );
      } else {
        onError?.("Failed to start recording. Please try again.");
      }
    }
  }, [onRecordingComplete, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (permissionStatus === "checking") {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (permissionStatus === "denied") {
    return (
      <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
        <AlertCircle className="w-6 h-6 text-red-500" />
        <p className="text-sm text-center text-red-500">
          Microphone access denied. Please enable it in your browser settings.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Recording Indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-3 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-3 h-3 rounded-full bg-red-500"
            />
            <span className="text-sm font-medium tabular-nums text-red-500">
              {formatDuration(duration)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Record/Stop Button */}
      <motion.button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        whileTap={{ scale: 0.95 }}
        className={clsx(
          "relative flex items-center justify-center w-16 h-16 rounded-full",
          "transition-all duration-200",
          disabled && "opacity-50 cursor-not-allowed",
          isRecording
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-gradient-to-br from-accent to-accent-muted hover:shadow-lg",
        )}
        style={{
          backgroundColor: isRecording ? undefined : "var(--primary)",
          color: isRecording ? undefined : "var(--primary-foreground)",
        }}
      >
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div
              key="stop"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Square className="w-6 h-6 fill-current" />
            </motion.div>
          ) : (
            <motion.div
              key="mic"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Mic className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse animation when recording */}
        {isRecording && (
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500"
            animate={{
              scale: [1, 1.3],
              opacity: [0.5, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "easeOut",
            }}
          />
        )}
      </motion.button>

      <p className="text-xs text-muted-foreground text-center">
        {isRecording ? "Tap to stop recording" : "Tap to start recording"}
      </p>
    </div>
  );
}
