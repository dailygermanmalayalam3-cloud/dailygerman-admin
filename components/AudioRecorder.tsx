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
    <div className="space-y-1.5 p-3 border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
        {localUrl && !isRecording && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Audio Attached
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-1.5 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-bold">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* State 1: Active Recording */}
      {isRecording ? (
        <div className="flex items-center justify-between gap-3 p-3 bg-red-50 dark:bg-red-950/40 border-2 border-red-500">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
            <span className="text-xs font-black uppercase text-red-700 dark:text-red-300 tracking-wider">
              Recording: {formatSeconds(recordSeconds)}
            </span>
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white font-black text-xs uppercase border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-700 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" /> Stop & Save
          </button>
        </div>
      ) : isGenerating ? (
        <div className="flex items-center justify-center gap-2 py-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
          <span>Synthesizing German audio with Google AI...</span>
        </div>
      ) : isUploading ? (
        <div className="flex items-center justify-center gap-2 py-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-700 dark:text-neutral-300">
          <Loader2 className="w-4 h-4 animate-spin text-black dark:text-white" />
          <span>Uploading audio to storage...</span>
        </div>
      ) : localUrl ? (
        /* State 2: Recorded & Attached */
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white dark:bg-[#141414] border border-black dark:border-neutral-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(250,204,21,0.2)]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#ffe600] text-black border border-black font-black text-xs uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-none cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? "Pause" : "Play Preview"}
            </button>
            <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 truncate max-w-[160px] sm:max-w-[220px]">
              {localUrl.split("/").pop()}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {textToSynthesize !== undefined && (
              <button
                type="button"
                onClick={handleGenerateAiAudio}
                title="Regenerate pronunciation with Google AI"
                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold text-xs uppercase hover:border-black dark:hover:border-white cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Re-generate AI
              </button>
            )}
            <button
              type="button"
              onClick={startRecording}
              title="Re-record voice note"
              className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 font-bold text-xs uppercase hover:border-black dark:hover:border-white cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Re-record
            </button>
            <button
              type="button"
              onClick={handleRemove}
              title="Delete audio"
              className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 border border-transparent hover:border-red-500 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* State 3: Empty / Not Recorded */
        <div className="flex flex-wrap items-center gap-2">
          {textToSynthesize !== undefined && (
            <button
              type="button"
              onClick={handleGenerateAiAudio}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border border-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
              title="Auto-generate natural German pronunciation using Google Cloud Neural2 AI"
            >
              <Sparkles className="w-3.5 h-3.5" /> Auto-Generate AI Audio
            </button>
          )}

          <button
            type="button"
            onClick={startRecording}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ffe600] text-black border border-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" /> Record Audio
          </button>

          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 font-bold text-xs uppercase hover:border-black dark:hover:border-white transition-all cursor-pointer">
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
