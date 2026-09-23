"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Volume2,
  Sparkles,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PlayCircle,
  Square,
  Radio,
  FileAudio,
  Activity,
  Layers,
  Zap,
  MessageSquare,
  BookOpen,
  Headphones,
} from "lucide-react";

interface AudioStats {
  vocabWords: { total: number; missing: number; generated: number };
  vocabSentences: { total: number; missing: number; generated: number };
  medicalWords: { total: number; missing: number; generated: number };
  medicalSentences: { total: number; missing: number; generated: number };
  verbInfinitives?: { total: number; missing: number; generated: number };
  verbPraeteritums?: { total: number; missing: number; generated: number };
  verbPerfekts?: { total: number; missing: number; generated: number };
  verbsAll?: { total: number; missing: number; generated: number };
  conversationTurns?: { total: number; missing: number; generated: number };
  readingTexts?: { total: number; missing: number; generated: number };
  goetheMaterials?: {
    total: number;
    missing: number;
    generated: number;
    hoerenTotal?: number;
    hoerenMissing?: number;
  };
}

export default function AudioGeneratorPage() {
  const [stats, setStats] = useState<AudioStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Configuration
  const [selectedVoice, setSelectedVoice] = useState("de-DE-Neural2-F");
  const [speakingRate, setSpeakingRate] = useState(0.95);

  // Test Synthesis Player
  const [testText, setTestText] = useState("Willkommen bei Daily German");
  const [testAudioUrl, setTestAudioUrl] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isPlayingTest, setIsPlayingTest] = useState(false);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  // Batch Generation State
  const [batchTarget, setBatchTarget] = useState<
    | "vocab_words"
    | "vocab_sentences"
    | "medical_words"
    | "medical_sentences"
    | "verb_infinitives"
    | "verb_praeteritums"
    | "verb_perfekts"
    | "verbs_all"
    | "conversation_turns"
    | "reading_texts"
    | "goethe_materials"
  >("vocab_words");
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const isBatchRunningRef = useRef(false);
  const [batchLogs, setBatchLogs] = useState<string[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [batchError, setBatchError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await fetch("/api/admin/audio/generate-batch");
      const data = await res.json();
      if (res.ok && data.success) {
        setStats(data.stats);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch audio stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Single test synthesis
  const handleTestSynthesis = async () => {
    if (!testText.trim()) return;
    setIsTesting(true);
    setBatchError(null);
    try {
      const res = await fetch("/api/admin/audio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: testText.trim(),
          prefix: "vocab",
          voiceName: selectedVoice,
          speakingRate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to synthesize audio.");
      }

      setTestAudioUrl(data.url);
      if (testAudioRef.current) {
        testAudioRef.current.src = data.url;
        testAudioRef.current.play().catch(() => {});
        setIsPlayingTest(true);
      }
    } catch (err: unknown) {
      setBatchError((err as Error).message);
    } finally {
      setIsTesting(false);
    }
  };

  const toggleTestPlayback = () => {
    if (!testAudioUrl) return;
    if (!testAudioRef.current) {
      testAudioRef.current = new Audio(testAudioUrl);
      testAudioRef.current.onended = () => setIsPlayingTest(false);
    }
    if (isPlayingTest) {
      testAudioRef.current.pause();
      setIsPlayingTest(false);
    } else {
      testAudioRef.current.play().catch(() => setIsPlayingTest(false));
      setIsPlayingTest(true);
    }
  };

  // Start Batch
  const handleStartBatch = async () => {
    if (isBatchRunning) return;

    let targetTotal = 0;
    if (stats) {
      if (batchTarget === "vocab_words") targetTotal = stats.vocabWords.missing;
      else if (batchTarget === "vocab_sentences") targetTotal = stats.vocabSentences.missing;
      else if (batchTarget === "medical_words") targetTotal = stats.medicalWords.missing;
      else if (batchTarget === "medical_sentences") targetTotal = stats.medicalSentences.missing;
      else if (batchTarget === "verb_infinitives") targetTotal = stats.verbInfinitives?.missing || 0;
      else if (batchTarget === "verb_praeteritums") targetTotal = stats.verbPraeteritums?.missing || 0;
      else if (batchTarget === "verb_perfekts") targetTotal = stats.verbPerfekts?.missing || 0;
      else if (batchTarget === "verbs_all") targetTotal = stats.verbsAll?.missing || 0;
      else if (batchTarget === "conversation_turns") targetTotal = stats.conversationTurns?.missing || 0;
      else if (batchTarget === "reading_texts") targetTotal = stats.readingTexts?.missing || 0;
      else if (batchTarget === "goethe_materials") targetTotal = stats.goetheMaterials?.missing || 0;
    }

    if (targetTotal === 0) {
      setBatchError(`No missing audio for ${batchTarget.replace("_", " ")}! All items have audio.`);
      return;
    }

    setIsBatchRunning(true);
    isBatchRunningRef.current = true;
    setBatchError(null);
    setProcessedCount(0);
    setTotalToProcess(targetTotal);
    setBatchLogs([`🚀 Starting batch generation for ${batchTarget}... (Target: ${targetTotal} items)`]);

    let totalDone = 0;

    try {
      while (isBatchRunningRef.current) {
        const res = await fetch("/api/admin/audio/generate-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: batchTarget,
            limit: 10,
            voiceName: selectedVoice,
            speakingRate,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Batch generation request failed.");
        }

        if (data.processed === 0) {
          if (data.remaining !== undefined && data.remaining > 0) {
            setBatchLogs((prev) => [
              `⚠️ Stopped: ${data.remaining} items remain ungenerated. Some items may have missing or invalid text. Check logs above.`,
              ...prev,
            ]);
            setBatchError(`${data.remaining} items could not be generated.`);
          } else {
            setBatchLogs((prev) => [`✅ Finished! All items in ${batchTarget} now have audio.`, ...prev]);
          }
          break;
        }

        totalDone += data.processed;
        setProcessedCount(totalDone);
        if (data.remaining !== undefined) {
          setTotalToProcess(totalDone + data.remaining);
        }

        const newLogs = (data.items || []).map(
          (item: { text: string }) => `✓ Generated: "${item.text}"`
        );
        setBatchLogs((prev) => [...newLogs, ...prev]);

        if (data.errors && data.errors.length > 0) {
          setBatchLogs((prev) => [
            ...data.errors.map((e: string) => `⚠️ Error: ${e}`),
            ...prev,
          ]);
        }

        if (data.remaining === 0) {
          setBatchLogs((prev) => [`✅ Finished! All items in ${batchTarget} now have audio.`, ...prev]);
          break;
        }

        // Brief delay between batches to respect server limits
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch (err: unknown) {
      setBatchError((err as Error).message || "Batch generation encountered an error.");
      setBatchLogs((prev) => [`❌ Error: ${(err as Error).message}`, ...prev]);
    } finally {
      setIsBatchRunning(false);
      isBatchRunningRef.current = false;
      await fetchStats();
    }
  };

  const handleStopBatch = () => {
    isBatchRunningRef.current = false;
    setIsBatchRunning(false);
    setBatchLogs((prev) => ["⏹️ Batch process stopped by admin.", ...prev]);
  };

  const calcPercentage = (generated: number, total: number) => {
    if (!total || total === 0) return 100;
    return Math.min(Math.round((generated / total) * 100), 100);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Top Banner */}
      <div className="border-2 border-black dark:border-white p-5 sm:p-6 bg-white dark:bg-[#121212] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono font-black text-xs uppercase bg-[#ffe600] text-black px-2.5 py-0.5 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                AI Pronunciation Suite
              </span>
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                Google Cloud Neural2 (de-DE)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              German Audio Pronunciation Generator
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 mt-1 max-w-2xl">
              Synthesize natural German audio for vocabulary words, example sentences, and medical terms.
              Audio files are automatically uploaded to Supabase Storage and connected to database records.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchStats}
            disabled={loadingStats}
            className="self-start md:self-auto inline-flex items-center gap-1.5 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-black dark:border-neutral-700 font-bold text-xs uppercase hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? "animate-spin" : ""}`} />
            Refresh Inventory
          </button>
        </div>
      </div>

      {/* Free Tier Notice */}
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-600 text-emerald-900 dark:text-emerald-200 flex items-start gap-3 text-xs sm:text-sm">
        <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-black">Google Cloud Permanent Free Tier Protection</p>
          <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300">
            Google Cloud provides <strong>1,000,000 characters free every month</strong> for Neural2 voices.
            Generating pronunciations for all ~530 dictionary words and sentences requires only <strong>~11,000 characters (~1.1% of quota)</strong>.
          </p>
        </div>
      </div>

      {/* Live Inventory Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Vocab Words */}
        <div className="p-4 bg-white dark:bg-[#141414] border-2 border-black dark:border-neutral-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
              Vocab Words
            </span>
            <FileAudio className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black">
              {stats ? stats.vocabWords.generated : 0}
            </span>
            <span className="text-xs font-bold text-neutral-500">
              / {stats ? stats.vocabWords.total : 0}
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 mt-3 overflow-hidden border border-black/20">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{
                width: `${
                  stats
                    ? calcPercentage(stats.vocabWords.generated, stats.vocabWords.total)
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-2">
            {stats ? stats.vocabWords.missing : 0} missing audio
          </p>
        </div>

        {/* 2. Vocab Sentences */}
        <div className="p-4 bg-white dark:bg-[#141414] border-2 border-black dark:border-neutral-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
              Vocab Sentences
            </span>
            <Layers className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black">
              {stats ? stats.vocabSentences.generated : 0}
            </span>
            <span className="text-xs font-bold text-neutral-500">
              / {stats ? stats.vocabSentences.total : 0}
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 mt-3 overflow-hidden border border-black/20">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{
                width: `${
                  stats
                    ? calcPercentage(
                        stats.vocabSentences.generated,
                        stats.vocabSentences.total
                      )
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-2">
            {stats ? stats.vocabSentences.missing : 0} missing audio
          </p>
        </div>

        {/* 3. Medical Words */}
        <div className="p-4 bg-white dark:bg-[#141414] border-2 border-black dark:border-neutral-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
              Medical Words
            </span>
            <Activity className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black">
              {stats ? stats.medicalWords.generated : 0}
            </span>
            <span className="text-xs font-bold text-neutral-500">
              / {stats ? stats.medicalWords.total : 0}
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 mt-3 overflow-hidden border border-black/20">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{
                width: `${
                  stats
                    ? calcPercentage(
                        stats.medicalWords.generated,
                        stats.medicalWords.total
                      )
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-2">
            {stats ? stats.medicalWords.missing : 0} missing audio
          </p>
        </div>

        {/* 4. Medical Sentences */}
        <div className="p-4 bg-white dark:bg-[#141414] border-2 border-black dark:border-neutral-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
              Medical Sentences
            </span>
            <Radio className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black">
              {stats ? stats.medicalSentences.generated : 0}
            </span>
            <span className="text-xs font-bold text-neutral-500">
              / {stats ? stats.medicalSentences.total : 0}
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 mt-3 overflow-hidden border border-black/20">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{
                width: `${
                  stats
                    ? calcPercentage(
                        stats.medicalSentences.generated,
                        stats.medicalSentences.total
                      )
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-2">
            {stats ? stats.medicalSentences.missing : 0} missing audio
          </p>
        </div>

        {/* 5. Verb Infinitives */}
        <div className="p-4 bg-white dark:bg-[#141414] border-2 border-black dark:border-neutral-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
              Verb Infinitiv
            </span>
            <Zap className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black">
              {stats?.verbInfinitives ? stats.verbInfinitives.generated : 0}
            </span>
            <span className="text-xs font-bold text-neutral-500">
              / {stats?.verbInfinitives ? stats.verbInfinitives.total : 0}
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 mt-3 overflow-hidden border border-black/20">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{
                width: `${
                  stats?.verbInfinitives
                    ? calcPercentage(stats.verbInfinitives.generated, stats.verbInfinitives.total)
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-2">
            {stats?.verbInfinitives ? stats.verbInfinitives.missing : 0} missing audio
          </p>
        </div>

        {/* 6. Verb Präteritum */}
        <div className="p-4 bg-white dark:bg-[#141414] border-2 border-black dark:border-neutral-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
              Verb Präteritum
            </span>
            <Zap className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black">
              {stats?.verbPraeteritums ? stats.verbPraeteritums.generated : 0}
            </span>
            <span className="text-xs font-bold text-neutral-500">
              / {stats?.verbPraeteritums ? stats.verbPraeteritums.total : 0}
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 mt-3 overflow-hidden border border-black/20">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{
                width: `${
                  stats?.verbPraeteritums
                    ? calcPercentage(stats.verbPraeteritums.generated, stats.verbPraeteritums.total)
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-2">
            {stats?.verbPraeteritums ? stats.verbPraeteritums.missing : 0} missing audio
          </p>
        </div>

        {/* 7. Verb Perfekt */}
        <div className="p-4 bg-white dark:bg-[#141414] border-2 border-black dark:border-neutral-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
              Verb Perfekt
            </span>
            <Zap className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black">
              {stats?.verbPerfekts ? stats.verbPerfekts.generated : 0}
            </span>
            <span className="text-xs font-bold text-neutral-500">
              / {stats?.verbPerfekts ? stats.verbPerfekts.total : 0}
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 mt-3 overflow-hidden border border-black/20">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{
                width: `${
                  stats?.verbPerfekts
                    ? calcPercentage(stats.verbPerfekts.generated, stats.verbPerfekts.total)
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-2">
            {stats?.verbPerfekts ? stats.verbPerfekts.missing : 0} missing audio
          </p>
        </div>

        {/* 8. Conversation Dialogues */}
        <div className="p-4 bg-white dark:bg-[#141414] border-2 border-black dark:border-neutral-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
              Conversation Dialogues
            </span>
            <MessageSquare className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black">
              {stats?.conversationTurns ? stats.conversationTurns.generated : 0}
            </span>
            <span className="text-xs font-bold text-neutral-500">
              / {stats?.conversationTurns ? stats.conversationTurns.total : 0}
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 mt-3 overflow-hidden border border-black/20">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{
                width: `${
                  stats?.conversationTurns
                    ? calcPercentage(stats.conversationTurns.generated, stats.conversationTurns.total)
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-2">
            {stats?.conversationTurns ? stats.conversationTurns.missing : 0} missing audio
          </p>
        </div>

        {/* 9. Reading Passages */}
        <div className="p-4 bg-white dark:bg-[#141414] border-2 border-black dark:border-neutral-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
              Reading Passages
            </span>
            <BookOpen className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black">
              {stats?.readingTexts ? stats.readingTexts.generated : 0}
            </span>
            <span className="text-xs font-bold text-neutral-500">
              / {stats?.readingTexts ? stats.readingTexts.total : 0}
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 mt-3 overflow-hidden border border-black/20">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{
                width: `${
                  stats?.readingTexts
                    ? calcPercentage(stats.readingTexts.generated, stats.readingTexts.total)
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-2">
            {stats?.readingTexts ? stats.readingTexts.missing : 0} missing audio
          </p>
        </div>

        {/* 10. Goethe / Listening Materials */}
        <div className="p-4 bg-white dark:bg-[#141414] border-2 border-black dark:border-neutral-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-500">
              Goethe & Listening
            </span>
            <Headphones className="w-4 h-4 text-neutral-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black">
              {stats?.goetheMaterials ? stats.goetheMaterials.generated : 0}
            </span>
            <span className="text-xs font-bold text-neutral-500">
              / {stats?.goetheMaterials ? stats.goetheMaterials.total : 0}
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 mt-3 overflow-hidden border border-black/20">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{
                width: `${
                  stats?.goetheMaterials
                    ? calcPercentage(stats.goetheMaterials.generated, stats.goetheMaterials.total)
                    : 0
                }%`,
              }}
            />
          </div>
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-2">
            {stats?.goetheMaterials ? stats.goetheMaterials.missing : 0} missing ({stats?.goetheMaterials?.hoerenMissing ?? 0} Hören)
          </p>
        </div>
      </div>

      {/* Voice Configuration & Real-Time Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Box */}
        <div className="lg:col-span-1 p-5 bg-white dark:bg-[#141414] border-2 border-black dark:border-neutral-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider border-b-2 border-black dark:border-neutral-700 pb-2">
            Voice Settings
          </h2>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">Voice Profile</label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full p-2 border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] text-xs font-bold"
            >
              <option value="de-DE-Neural2-F">de-DE-Neural2-F (Female - Crisp, Recommended)</option>
              <option value="de-DE-Neural2-B">de-DE-Neural2-B (Male - Deep, Natural)</option>
              <option value="de-DE-Neural2-C">de-DE-Neural2-C (Female - Soft)</option>
              <option value="de-DE-Neural2-D">de-DE-Neural2-D (Male - Expressive)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              Speaking Cadence ({speakingRate}x)
            </label>
            <select
              value={speakingRate}
              onChange={(e) => setSpeakingRate(parseFloat(e.target.value))}
              className="w-full p-2 border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] text-xs font-bold"
            >
              <option value={0.9}>0.90x (Deliberate & Slow for beginners)</option>
              <option value={0.95}>0.95x (Recommended - Clear language learning cadence)</option>
              <option value={1.0}>1.00x (Standard native speed)</option>
            </select>
          </div>
        </div>

        {/* Live Audio Tester */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-[#141414] border-2 border-black dark:border-neutral-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider border-b-2 border-black dark:border-neutral-700 pb-2">
            Interactive German Audio Tester
          </h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Enter any German word or sentence to test..."
              className="flex-1 p-2.5 border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] text-sm font-medium"
            />
            <button
              type="button"
              onClick={handleTestSynthesis}
              disabled={isTesting || !testText.trim()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#ffe600] text-black border-2 border-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Synthesizing...
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" /> Synthesize & Test
                </>
              )}
            </button>
          </div>

          {testAudioUrl && (
            <div className="p-3 bg-neutral-100 dark:bg-neutral-800/60 border border-black dark:border-neutral-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleTestPlayback}
                  className="p-2 bg-black text-white dark:bg-white dark:text-black rounded-full hover:scale-105 transition-transform"
                >
                  {isPlayingTest ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <div className="text-xs">
                  <p className="font-black text-emerald-700 dark:text-emerald-400">Audio Preview Ready</p>
                  <p className="text-neutral-500 font-mono truncate max-w-xs sm:max-w-md">{testAudioUrl}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Batch Generation Control Hub */}
      <div className="p-5 sm:p-6 bg-white dark:bg-[#141414] border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black dark:border-neutral-700 pb-3">
          <div>
            <h2 className="text-lg font-black tracking-tight">Batch Audio Generator Hub</h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Run automated batch processing across all missing records. Automatically updates the database and triggers instant site revalidation.
            </p>
          </div>
          {isBatchRunning && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-950/60 border border-amber-500 text-amber-800 dark:text-amber-300 font-mono font-bold text-xs uppercase animate-pulse">
              <Activity className="w-4 h-4" /> Processing in Progress
            </div>
          )}
        </div>

        {batchError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border-2 border-red-500 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{batchError}</span>
          </div>
        )}

        {/* Batch Target Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { id: "vocab_words", title: "Vocab Words", count: stats?.vocabWords.missing || 0 },
            { id: "vocab_sentences", title: "Vocab Sentences", count: stats?.vocabSentences.missing || 0 },
            { id: "medical_words", title: "Medical Words", count: stats?.medicalWords.missing || 0 },
            { id: "medical_sentences", title: "Medical Sentences", count: stats?.medicalSentences.missing || 0 },
            { id: "verb_infinitives", title: "Verb Infinitiv", count: stats?.verbInfinitives?.missing || 0 },
            { id: "verb_praeteritums", title: "Verb Präteritum", count: stats?.verbPraeteritums?.missing || 0 },
            { id: "verb_perfekts", title: "Verb Perfekt", count: stats?.verbPerfekts?.missing || 0 },
            { id: "verbs_all", title: "All Verbs (Combined)", count: stats?.verbsAll?.missing || 0 },
            { id: "conversation_turns", title: "Conversation Dialogues", count: stats?.conversationTurns?.missing || 0 },
            { id: "reading_texts", title: "Reading Passages", count: stats?.readingTexts?.missing || 0 },
            { id: "goethe_materials", title: "Exam Prep & Listening", count: stats?.goetheMaterials?.missing || 0 },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={isBatchRunning}
              onClick={() => setBatchTarget(item.id as any)}
              className={`p-3 text-left border-2 transition-all cursor-pointer ${
                batchTarget === item.id
                  ? "border-black bg-[#ffe600] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:border-black dark:hover:border-white"
              }`}
            >
              <div className="text-xs font-black uppercase">{item.title}</div>
              <div className="text-lg font-black mt-1">{item.count} Missing</div>
            </button>
          ))}
        </div>

        {/* Progress Bar (when active or completed) */}
        {totalToProcess > 0 && (
          <div className="space-y-1.5 p-4 bg-neutral-100 dark:bg-neutral-800/50 border border-black dark:border-neutral-700">
            <div className="flex justify-between text-xs font-black">
              <span>Batch Progress:</span>
              <span>
                {processedCount} / {totalToProcess} ({calcPercentage(processedCount, totalToProcess)}%)
              </span>
            </div>
            <div className="w-full bg-neutral-300 dark:bg-neutral-700 h-3 overflow-hidden border border-black">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{
                  width: `${calcPercentage(processedCount, totalToProcess)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {!isBatchRunning ? (
            <button
              type="button"
              onClick={handleStartBatch}
              className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-black font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
            >
              <PlayCircle className="w-4 h-4" /> Start Generating for Selected Target
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopBatch}
              className="inline-flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white border-2 border-black font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" /> Stop Batch Process
            </button>
          )}
        </div>

        {/* Live Execution Logs */}
        {batchLogs.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500">
              Live Activity Log
            </h3>
            <div className="p-3 bg-black text-emerald-400 font-mono text-xs max-h-56 overflow-y-auto space-y-1 border border-neutral-700">
              {batchLogs.map((log, idx) => (
                <div key={idx} className="leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
