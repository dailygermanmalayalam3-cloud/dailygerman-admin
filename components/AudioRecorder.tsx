"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, RotateCcw, Trash2, UploadCloud, CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";

interface AudioRecorderProps {
  label: string;
  audioUrl?: string;
  prefix?: "vocab" | "sentence" | "medical" | "medical_word" | "medical_sentence" | string;
  textToSynthesize?: string;
  onAudioUploaded: (url: string) => void;
  onAudioRemoved?: () => void;
}

export default function AudioRecorder({
  label,
  audioUrl,
  prefix = "vocab",
  textToSynthesize,
  onAudioUploaded,
  onAudioRemoved,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(audioUrl || null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setLocalUrl(audioUrl || null);
    if (audioUrl && typeof window !== "undefined") {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio(audioUrl);
      } else if (audioPlayerRef.current.src !== audioUrl) {
        audioPlayerRef.current.src = audioUrl;
      }
      audioPlayerRef.current.preload = "auto";
    }
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  const getSupportedMimeType = () => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/wav",
    ];
    for (const t of types) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return "";
  };

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg("Microphone recording is not supported in this browser. Please use HTTPS or upload a file.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        });
        await handleUploadBlob(audioBlob);

        // Stop all mic tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(200); // 200ms slices
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.error("Microphone access error:", err);
      setErrorMsg(
        (err as Error).name === "NotAllowedError"
          ? "Microphone permission denied. Please allow microphone access in browser settings."
          : "Could not access microphone."
      );
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleUploadBlob = async (blob: Blob) => {
    setIsUploading(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", blob, `audio-${Date.now()}.${blob.type.includes("mp4") ? "mp4" : "webm"}`);
      formData.append("prefix", prefix);

      const res = await fetch("/api/admin/audio/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to upload audio.");
      }

      setLocalUrl(data.url);
      onAudioUploaded(data.url);
    } catch (err: unknown) {
      console.error("Audio upload failed:", err);
      setErrorMsg((err as Error).message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUploadBlob(file);
  };

  const handleGenerateAiAudio = async () => {
    const cleanText = textToSynthesize?.trim();
    if (!cleanText) {
      setErrorMsg("Please enter the German text before auto-generating pronunciation.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/audio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanText,
          prefix,
          voiceName: "de-DE-Neural2-F",
          speakingRate: 0.95,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate AI audio.");
      }

      setLocalUrl(data.url);
      onAudioUploaded(data.url);
    } catch (err: unknown) {
      console.error("AI audio generation failed:", err);
      setErrorMsg((err as Error).message || "AI audio generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (!localUrl) return;
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(localUrl);
      audioPlayerRef.current.onended = () => setIsPlaying(false);
      audioPlayerRef.current.onerror = () => {
        setIsPlaying(false);
        setErrorMsg("Failed to play audio.");
      };
    } else if (audioPlayerRef.current.src !== localUrl) {
      audioPlayerRef.current.src = localUrl;
    }

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  const handleRemove = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setLocalUrl(null);
    setIsPlaying(false);
    if (onAudioRemoved) onAudioRemoved();
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-2 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {label}
        </label>
        {localUrl && !isRecording && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/50">
            <CheckCircle2 className="w-3.5 h-3.5" /> Audio Attached
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* State 1: Active Recording */}
      {isRecording ? (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
            <span className="text-xs font-bold uppercase text-rose-700 dark:text-rose-300 tracking-wider">
              Recording: {formatSeconds(recordSeconds)}
            </span>
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white font-bold text-xs uppercase rounded-xl shadow-xs hover:bg-rose-700 transition-all cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" /> Stop &amp; Save
          </button>
        </div>
      ) : isGenerating ? (
        <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
          <span>Synthesizing German audio with Google AI...</span>
        </div>
      ) : isUploading ? (
        <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-slate-900 dark:text-white" />
          <span>Uploading audio to storage...</span>
        </div>
      ) : localUrl ? (
        /* State 2: Recorded & Attached */
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={togglePlay}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-xs shadow-xs hover:bg-indigo-700 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? "Pause" : "Play Preview"}
            </button>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate max-w-[160px] sm:max-w-[220px]">
              {localUrl.split("/").pop()}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {textToSynthesize !== undefined && (
              <button
                type="button"
                onClick={handleGenerateAiAudio}
                title="Regenerate pronunciation with Google AI"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 font-bold text-xs uppercase hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Re-generate AI
              </button>
            )}
            <button
              type="button"
              onClick={startRecording}
              title="Re-record voice note"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600/80 font-bold text-xs uppercase hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Re-record
            </button>
            <button
              type="button"
              onClick={handleRemove}
              title="Delete audio"
              className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* State 3: Empty / Not Recorded */
        <div className="flex flex-wrap items-center gap-2.5">
          {textToSynthesize !== undefined && (
            <button
              type="button"
              onClick={handleGenerateAiAudio}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase shadow-xs hover:shadow-md transition-all cursor-pointer"
              title="Auto-generate natural German pronunciation using Google Cloud Neural2 AI"
            >
              <Sparkles className="w-3.5 h-3.5" /> Auto-Generate AI Audio
            </button>
          )}

          <button
            type="button"
            onClick={startRecording}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" /> Record Audio
          </button>

          <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs uppercase hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition-all cursor-pointer">
            <UploadCloud className="w-3.5 h-3.5" /> Upload File
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      )}
    </div>
  );
}
