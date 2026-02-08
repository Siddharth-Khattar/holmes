// ABOUTME: Main Sherlock's Diary notebook component.
// ABOUTME: Features a right sidebar for creating notes with audio recorder and text editor.

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
    Mic,
    BookOpen,
    PenLine,
    X,
    Loader2,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Square,
    Play,
    Pause,
    Save,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx } from "clsx";
import Link from "next/link";
import { useNotes } from "@/hooks/useNotes";
import { NoteCard } from "./NoteCard";

type SidebarMode = "closed" | "select" | "record" | "text";

interface NotebookProps {
    caseId: string;
    caseName?: string;
}

export function Notebook({ caseId, caseName }: NotebookProps) {
    const [sidebarMode, setSidebarMode] = useState<SidebarMode>("closed");
    const [textContent, setTextContent] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioLevels, setAudioLevels] = useState<number[]>(new Array(20).fill(5));

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const {
        notes,
        isLoading,
        error,
        createText,
        createAudio,
        remove,
        generateMeta,
        exportAsEvidence,
        getAudio,
        clearError,
        isGenerating,
    } = useNotes(caseId);

    // Cleanup audio URL on unmount or when audioBlob changes
    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [audioUrl]);

    // Use a ref to track recording state for the animation loop
    const isRecordingRef = useRef(false);

    useEffect(() => {
        isRecordingRef.current = isRecording;
    }, [isRecording]);

    const startWaveformAnimation = useCallback(() => {
        const animate = () => {
            if (analyserRef.current && isRecordingRef.current) {
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);

                // Sample 20 points from the frequency data
                const levels: number[] = [];
                const step = Math.floor(dataArray.length / 20);
                for (let i = 0; i < 20; i++) {
                    const value = dataArray[i * step];
                    // Normalize to 5-50 range for visual bars
                    levels.push(Math.max(5, Math.min(50, (value / 255) * 55 + 5)));
                }
                setAudioLevels(levels);

                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };
        animationFrameRef.current = requestAnimationFrame(animate);
    }, []);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Set up audio analyzer for waveform
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
            });

            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach((track) => track.stop());
                audioContext.close();
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start(100);
            setIsRecording(true);
            isRecordingRef.current = true; // Update ref immediately
            setRecordingDuration(0);
            setAudioBlob(null);
            setAudioUrl(null);

            // Start duration timer
            timerRef.current = setInterval(() => {
                setRecordingDuration((prev) => prev + 1);
            }, 1000);

            // Start waveform animation
            startWaveformAnimation();
        } catch (err) {
            console.error("Failed to start recording:", err);
        }
    }, [startWaveformAnimation]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            // Reset levels to idle state
            setAudioLevels(new Array(20).fill(5));
        }
    }, [isRecording]);

    const playAudio = useCallback(() => {
        if (audioUrl && audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play();
                setIsPlaying(true);
            }
        }
    }, [audioUrl, isPlaying]);

    const handleSaveRecording = useCallback(async () => {
        if (!audioBlob) return;

        setIsSaving(true);
        try {
            const note = await createAudio(audioBlob, recordingDuration);
            if (note) {
                // Reset and close
                setAudioBlob(null);
                setAudioUrl(null);
                setRecordingDuration(0);
                setSidebarMode("closed");
            }
        } finally {
            setIsSaving(false);
        }
    }, [audioBlob, recordingDuration, createAudio]);

    const handleSaveTextNote = useCallback(async () => {
        if (!textContent.trim()) return;

        setIsSaving(true);
        try {
            const note = await createText(textContent.trim());
            if (note) {
                setTextContent("");
                setSidebarMode("closed");
            }
        } finally {
            setIsSaving(false);
        }
    }, [textContent, createText]);

    const handleExport = useCallback(
        async (noteId: string) => {
            await exportAsEvidence(noteId);
        },
        [exportAsEvidence]
    );

    const handleDelete = useCallback(
        async (noteId: string) => {
            await remove(noteId);
        },
        [remove]
    );

    const handleGenerateMetadata = useCallback(
        async (noteId: string) => {
            await generateMeta(noteId);
        },
        [generateMeta]
    );

    const handleGetAudioUrl = useCallback(
        async (noteId: string) => {
            return await getAudio(noteId);
        },
        [getAudio]
    );

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const toggleSidebar = () => {
        if (sidebarMode === "closed") {
            setSidebarMode("select");
        } else {
            // Reset state when closing
            setTextContent("");
            setAudioBlob(null);
            setAudioUrl(null);
            setRecordingDuration(0);
            if (isRecording) {
                stopRecording();
            }
            setSidebarMode("closed");
        }
    };

    const handleSelectRecord = () => {
        setSidebarMode("record");
    };

    const handleSelectText = () => {
        setSidebarMode("text");
    };

    const handleBackToSelect = () => {
        if (isRecording) {
            stopRecording();
        }
        setTextContent("");
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingDuration(0);
        setSidebarMode("select");
    };

    return (
        <div
            className="flex h-full min-h-screen"
            style={{ backgroundColor: "var(--background)" }}
        >
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header
                    className="sticky top-0 z-40 px-6 py-4 border-b"
                    style={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                    }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link
                                href={`/cases/${caseId}`}
                                className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-muted"
                            >
                                <ChevronLeft className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
                            </Link>
                            <div>
                                <h1
                                    className="font-serif text-xl font-semibold"
                                    style={{ color: "var(--foreground)" }}
                                >
                                    {"Sherlock's Diary"}
                                </h1>
                                {caseName && (
                                    <p
                                        className="text-sm"
                                        style={{ color: "var(--muted-foreground)" }}
                                    >
                                        {caseName}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Error Banner */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-6 py-3 bg-red-500/10 border-b border-red-500/20"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-red-500">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span className="text-sm">{error}</span>
                                </div>
                                <button
                                    onClick={clearError}
                                    className="p-1 rounded hover:bg-red-500/10"
                                >
                                    <X className="w-4 h-4 text-red-500" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Notes List */}
                <main className="flex-1 overflow-y-auto px-6 py-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            <p className="mt-3 text-sm text-muted-foreground">Loading notes...</p>
                        </div>
                    ) : notes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <BookOpen
                                className="w-16 h-16 mb-4"
                                style={{ color: "var(--muted-foreground)" }}
                            />
                            <h3
                                className="text-xl font-medium mb-2"
                                style={{ color: "var(--foreground)" }}
                            >
                                No notes yet
                            </h3>
                            <p
                                className="text-sm max-w-[300px] mb-6"
                                style={{ color: "var(--muted-foreground)" }}
                            >
                                Start capturing your thoughts and recordings for this investigation.
                            </p>
                            <button
                                onClick={() => setSidebarMode("select")}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all"
                                style={{
                                    backgroundColor: "var(--primary)",
                                    color: "var(--primary-foreground)",
                                }}
                            >
                                <PenLine className="w-5 h-5" />
                                Create your first note
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4 max-w-4xl">
                            {notes.map((note) => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    onExport={handleExport}
                                    onDelete={handleDelete}
                                    onGenerateMetadata={handleGenerateMetadata}
                                    onGetAudioUrl={handleGetAudioUrl}
                                    isGeneratingMetadata={isGenerating(note.id)}
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Right Sidebar Toggle */}
            <button
                onClick={toggleSidebar}
                className={clsx(
                    "fixed right-0 top-1/2 -translate-y-1/2 z-50",
                    "flex items-center justify-center w-10 h-24 rounded-l-xl",
                    "transition-all shadow-lg",
                    sidebarMode !== "closed" && "opacity-0 pointer-events-none"
                )}
                style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                }}
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Right Sidebar */}
            <AnimatePresence>
                {sidebarMode !== "closed" && (
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 z-50 w-96 flex flex-col shadow-2xl"
                        style={{
                            backgroundColor: "var(--card)",
                            borderLeft: "1px solid var(--border)",
                        }}
                    >
                        {/* Sidebar Header */}
                        <div
                            className="flex items-center justify-between px-4 py-4 border-b"
                            style={{ borderColor: "var(--border)" }}
                        >
                            <div className="flex items-center gap-2">
                                {sidebarMode !== "select" && (
                                    <button
                                        onClick={handleBackToSelect}
                                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
                                    </button>
                                )}
                                <h2
                                    className="font-semibold text-lg"
                                    style={{ color: "var(--foreground)" }}
                                >
                                    {sidebarMode === "select" && "New Note"}
                                    {sidebarMode === "record" && "Voice Recording"}
                                    {sidebarMode === "text" && "Text Note"}
                                </h2>
                            </div>
                            <button
                                onClick={toggleSidebar}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <X className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
                            </button>
                        </div>

                        {/* Sidebar Content */}
                        <div className="flex-1 overflow-y-auto">
                            <AnimatePresence mode="wait">
                                {/* Mode Selection */}
                                {sidebarMode === "select" && (
                                    <motion.div
                                        key="select"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="p-6 space-y-4"
                                    >
                                        <p
                                            className="text-sm text-center mb-6"
                                            style={{ color: "var(--muted-foreground)" }}
                                        >
                                            Choose how you want to create your note
                                        </p>

                                        {/* Audio Recording Button */}
                                        <button
                                            onClick={handleSelectRecord}
                                            className="w-full p-6 rounded-2xl border-2 transition-all hover:border-purple-500 hover:bg-purple-500/5 group"
                                            style={{ borderColor: "var(--border)" }}
                                        >
                                            <div className="flex flex-col items-center gap-4">
                                                <div
                                                    className="w-20 h-20 rounded-full flex items-center justify-center bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors"
                                                >
                                                    <Mic className="w-10 h-10 text-purple-500" />
                                                </div>
                                                <div className="text-center">
                                                    <h3
                                                        className="font-semibold text-lg mb-1"
                                                        style={{ color: "var(--foreground)" }}
                                                    >
                                                        Voice Recording
                                                    </h3>
                                                    <p
                                                        className="text-sm"
                                                        style={{ color: "var(--muted-foreground)" }}
                                                    >
                                                        Record your observations
                                                    </p>
                                                </div>
                                            </div>
                                        </button>

                                        {/* Text Note Button */}
                                        <button
                                            onClick={handleSelectText}
                                            className="w-full p-6 rounded-2xl border-2 transition-all hover:border-blue-500 hover:bg-blue-500/5 group"
                                            style={{ borderColor: "var(--border)" }}
                                        >
                                            <div className="flex flex-col items-center gap-4">
                                                <div
                                                    className="w-20 h-20 rounded-full flex items-center justify-center bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors"
                                                >
                                                    <PenLine className="w-10 h-10 text-blue-500" />
                                                </div>
                                                <div className="text-center">
                                                    <h3
                                                        className="font-semibold text-lg mb-1"
                                                        style={{ color: "var(--foreground)" }}
                                                    >
                                                        Text Note
                                                    </h3>
                                                    <p
                                                        className="text-sm"
                                                        style={{ color: "var(--muted-foreground)" }}
                                                    >
                                                        Write down your thoughts
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    </motion.div>
                                )}

                                {/* Audio Recording Mode */}
                                {sidebarMode === "record" && (
                                    <motion.div
                                        key="record"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="flex flex-col items-center justify-center p-6 h-full min-h-[500px]"
                                    >
                                        {/* Waveform Visualizer */}
                                        <div className="flex items-center justify-center gap-1 h-24 mb-8">
                                            {audioLevels.map((level, i) => (
                                                <motion.div
                                                    key={i}
                                                    className="w-2 rounded-full bg-purple-500"
                                                    animate={{
                                                        height: level,
                                                        opacity: isRecording ? 1 : 0.4,
                                                    }}
                                                    transition={{
                                                        duration: 0.1,
                                                        ease: "easeOut",
                                                    }}
                                                />
                                            ))}
                                        </div>

                                        {/* Duration */}
                                        <div
                                            className="text-4xl font-mono font-bold mb-8"
                                            style={{ color: "var(--foreground)" }}
                                        >
                                            {formatDuration(recordingDuration)}
                                        </div>

                                        {/* Recording Controls */}
                                        <div className="flex items-center gap-6">
                                            {!audioBlob ? (
                                                // Record/Stop Button
                                                <motion.button
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={isRecording ? stopRecording : startRecording}
                                                    className={clsx(
                                                        "w-24 h-24 rounded-full flex items-center justify-center",
                                                        "transition-all shadow-lg",
                                                        isRecording
                                                            ? "bg-red-500 hover:bg-red-600"
                                                            : "bg-purple-500 hover:bg-purple-600"
                                                    )}
                                                >
                                                    {isRecording ? (
                                                        <Square className="w-10 h-10 text-white fill-white" />
                                                    ) : (
                                                        <Mic className="w-10 h-10 text-white" />
                                                    )}
                                                </motion.button>
                                            ) : (
                                                // Playback and Save
                                                <>
                                                    <motion.button
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={playAudio}
                                                        className="w-16 h-16 rounded-full flex items-center justify-center bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
                                                    >
                                                        {isPlaying ? (
                                                            <Pause className="w-8 h-8 text-purple-500" />
                                                        ) : (
                                                            <Play className="w-8 h-8 text-purple-500 ml-1" />
                                                        )}
                                                    </motion.button>

                                                    <motion.button
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={handleSaveRecording}
                                                        disabled={isSaving}
                                                        className={clsx(
                                                            "w-20 h-20 rounded-full flex items-center justify-center",
                                                            "bg-green-500 hover:bg-green-600 transition-colors shadow-lg",
                                                            isSaving && "opacity-50"
                                                        )}
                                                    >
                                                        {isSaving ? (
                                                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                                                        ) : (
                                                            <Save className="w-8 h-8 text-white" />
                                                        )}
                                                    </motion.button>

                                                    <motion.button
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => {
                                                            setAudioBlob(null);
                                                            setAudioUrl(null);
                                                            setRecordingDuration(0);
                                                        }}
                                                        className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 transition-colors"
                                                    >
                                                        <X className="w-8 h-8 text-red-500" />
                                                    </motion.button>
                                                </>
                                            )}
                                        </div>

                                        {/* Status Text */}
                                        <p
                                            className="mt-8 text-sm"
                                            style={{ color: "var(--muted-foreground)" }}
                                        >
                                            {!audioBlob && !isRecording && "Tap to start recording"}
                                            {isRecording && "Recording in progress..."}
                                            {audioBlob && "Review and save your recording"}
                                        </p>

                                        {/* Hidden audio element for playback */}
                                        {audioUrl && (
                                            <audio
                                                ref={audioRef}
                                                src={audioUrl}
                                                onEnded={() => setIsPlaying(false)}
                                            />
                                        )}
                                    </motion.div>
                                )}

                                {/* Text Note Mode */}
                                {sidebarMode === "text" && (
                                    <motion.div
                                        key="text"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="flex flex-col h-full p-4"
                                    >
                                        <textarea
                                            value={textContent}
                                            onChange={(e) => setTextContent(e.target.value)}
                                            placeholder="Start typing your note..."
                                            autoFocus
                                            className={clsx(
                                                "flex-1 min-h-[400px] w-full p-4 rounded-xl resize-none",
                                                "text-base leading-relaxed",
                                                "focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            )}
                                            style={{
                                                backgroundColor: "var(--background)",
                                                color: "var(--foreground)",
                                                border: "1px solid var(--border)",
                                            }}
                                        />

                                        <button
                                            onClick={handleSaveTextNote}
                                            disabled={!textContent.trim() || isSaving}
                                            className={clsx(
                                                "mt-4 w-full py-4 rounded-xl font-medium transition-all",
                                                "flex items-center justify-center gap-2",
                                                "disabled:opacity-50 disabled:cursor-not-allowed"
                                            )}
                                            style={{
                                                backgroundColor: "var(--primary)",
                                                color: "var(--primary-foreground)",
                                            }}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-5 h-5" />
                                                    Save Note
                                                </>
                                            )}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Overlay when sidebar is open */}
            <AnimatePresence>
                {sidebarMode !== "closed" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={toggleSidebar}
                        className="fixed inset-0 z-40 bg-black/50"
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
