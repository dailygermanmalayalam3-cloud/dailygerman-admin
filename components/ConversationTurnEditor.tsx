"use client";

import React, { useState } from "react";
import { DialogueTurn } from "@/types";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Volume2,
  Sparkles,
  Clipboard,
  Play,
  Pause,
  Loader2,
  Check,
} from "lucide-react";

interface ConversationTurnEditorProps {
  turns: DialogueTurn[];
  onChange: (turns: DialogueTurn[]) => void;
}

export function parseScriptToTurns(script: string): DialogueTurn[] {
  const lines = script.split("\n").map((l) => l.trim()).filter(Boolean);
  const result: DialogueTurn[] = [];

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 30) {
      const speaker = line.slice(0, colonIdx).trim();
      let rest = line.slice(colonIdx + 1).trim();

      // Check if line contains (English | Malayalam) format
      let english: string | undefined = undefined;
      let malayalam: string | undefined = undefined;

      const parenMatch = rest.match(/\((.*?)\)/);
      if (parenMatch) {
        const inside = parenMatch[1];
        if (inside.includes("|")) {
          const [en, ml] = inside.split("|").map((s) => s.trim());
          english = en;
          malayalam = ml;
        } else {
          english = inside;
        }
        rest = rest.replace(/\(.*?\)/, "").trim();
      }

      // Detect gender from speaker name/role
      const isFemale = /frau|kandidatin|anna|maria|nurse|schwester|pflegekraft|ärztin|rezeptionistin/i.test(
        speaker
      );
      const gender: "male" | "female" = isFemale ? "female" : "male";

      result.push({
        id: crypto.randomUUID(),
        speaker,
        gender,
        german: rest,
        english,
        malayalam,
      });
    } else if (result.length > 0) {
      // Continuation or translation line
      const last = result[result.length - 1];
      const isMalayalam = /[\u0D00-\u0D7F]/.test(line);
      if (isMalayalam) {
        last.malayalam = last.malayalam ? `${last.malayalam} ${line}` : line;
      } else {
        last.english = last.english ? `${last.english} ${line}` : line;
      }
    }
  }

  return result;
}

export default function ConversationTurnEditor({
  turns,
  onChange,
}: ConversationTurnEditorProps) {
  const [showQuickPaste, setShowQuickPaste] = useState(false);
  const [quickPasteText, setQuickPasteText] = useState("");
  const [synthesizingTurnId, setSynthesizingTurnId] = useState<string | null>(null);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const handleAddTurn = () => {
    const newTurn: DialogueTurn = {
      id: crypto.randomUUID(),
      speaker: turns.length > 0 ? (turns[turns.length - 1].speaker === "A" ? "B" : "A") : "Person A",
      gender: "male",
      german: "",
      english: "",
      malayalam: "",
    };
    onChange([...turns, newTurn]);
  };

  const handleUpdateTurn = (index: number, updates: Partial<DialogueTurn>) => {
    const updated = [...turns];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const handleDeleteTurn = (index: number) => {
    const updated = turns.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleMoveTurn = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= turns.length) return;
    const updated = [...turns];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    onChange(updated);
  };

  const handleApplyQuickPaste = () => {
    if (!quickPasteText.trim()) return;
    const parsed = parseScriptToTurns(quickPasteText);
    if (parsed.length > 0) {
      onChange([...turns, ...parsed]);
      setQuickPasteText("");
      setShowQuickPaste(false);
    }
  };

  const handleSynthesizeSingleTurn = async (turnIndex: number) => {
    const turn = turns[turnIndex];
    if (!turn.german.trim()) return;

    setSynthesizingTurnId(turn.id);
    try {
      const isFemale =
        turn.gender === "female" ||
        (!turn.gender &&
          /frau|kandidatin|anna|maria|nurse|schwester|pflegekraft|ärztin|rezeptionistin|patientin|mutter|tochter|kellnerin|verkäuferin/i.test(
            `${turn.speaker || ""} ${turn.speaker_role || ""}`
          ));
      const voiceName = isFemale ? "de-DE-Studio-C" : "de-DE-Studio-B";
      const res = await fetch("/api/admin/audio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: turn.german.trim(),
          prefix: "conversations",
          voiceName,
          speakingRate: 0.95,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.url) {
        handleUpdateTurn(turnIndex, { audio_url: data.url });
      }
    } catch (err) {
      console.error("Failed to synthesize turn audio:", err);
    } finally {
      setSynthesizingTurnId(null);
    }
  };

  const togglePlayAudio = (url: string) => {
    if (playingAudioUrl === url) {
      audioRef.current?.pause();
      setPlayingAudioUrl(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(() => {});
        setPlayingAudioUrl(url);
        audioRef.current.onended = () => setPlayingAudioUrl(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden Audio Element for Previews */}
      <audio ref={audioRef} className="hidden" />

      {/* Editor Header Bar */}
      <div className="flex items-center justify-between gap-2 border-b-2 border-black dark:border-neutral-700 pb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
            Dialogue Turns ({turns.length})
          </span>
          <span className="text-[10px] text-neutral-500 font-bold">
            Gender-aware voices &amp; trilingual support
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQuickPaste(!showQuickPaste)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-black dark:border-neutral-600 hover:bg-[#ffe600] hover:text-black transition-colors cursor-pointer"
          >
            <Clipboard className="w-3.5 h-3.5" />
            {showQuickPaste ? "Close Script Parser" : "Smart Quick-Paste"}
          </button>

          <button
            type="button"
            onClick={handleAddTurn}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-black uppercase bg-[#ffe600] text-black border border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Turn
          </button>
        </div>
      </div>

      {/* Quick-Paste Script Modal / Box */}
      {showQuickPaste && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Smart Script Quick-Paste Parser
            </h4>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
              Auto-detects speaker, gender &amp; translations
            </span>
          </div>

          <textarea
            rows={6}
            value={quickPasteText}
            onChange={(e) => setQuickPasteText(e.target.value)}
            placeholder={`Paste raw script dialogue, for example:\nPrüfer: Guten Tag! Bitte stellen Sie sich kurz vor.\n(Good day! Please introduce yourself briefly. | നമസ്കാരം! ദയവായി സ്വയം ചെറുതായി പരിചയപ്പെടുത്തൂ.)\nKandidat: Guten Tag! Mein Name ist Rahul Nair.\n(Good day! My name is Rahul Nair. | നമസ്കാരം! എന്റെ പേര് രാഹുൽ നായർ.)`}
            className="w-full p-2.5 text-xs font-mono border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowQuickPaste(false)}
              className="px-3 py-1 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:underline"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyQuickPaste}
              disabled={!quickPasteText.trim()}
              className="px-4 py-1.5 text-xs font-black uppercase bg-black text-white dark:bg-white dark:text-black border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 cursor-pointer"
            >
              Parse Script into Turns
            </button>
          </div>
        </div>
      )}

      {/* List of Turns */}
      {turns.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] space-y-2">
          <p className="text-xs font-bold text-neutral-500">
            No dialogue turns added yet.
          </p>
          <p className="text-[11px] text-neutral-400">
            Click <strong>&quot;Add Turn&quot;</strong> or use <strong>&quot;Smart Quick-Paste&quot;</strong> to parse a script.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {turns.map((turn, index) => {
            const isSynthesizing = synthesizingTurnId === turn.id;
            const isPlayingThisAudio = playingAudioUrl === turn.audio_url;

            return (
              <div
                key={turn.id || index}
                className="p-3.5 border-2 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#141414] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] space-y-2.5 transition-all hover:border-black dark:hover:border-neutral-500"
              >
                {/* Turn Header Controls */}
                <div className="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-black text-white text-[10px] font-mono font-bold">
                      #{index + 1}
                    </span>

                    {/* Speaker Name */}
                    <input
                      type="text"
                      value={turn.speaker}
                      onChange={(e) => handleUpdateTurn(index, { speaker: e.target.value })}
                      placeholder="Speaker (e.g. Prüfer, Kandidat)"
                      className="p-1 px-2 text-xs font-bold border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#1a1a1a] text-black dark:text-white w-36"
                    />

                    {/* Speaker Role */}
                    <input
                      type="text"
                      value={turn.speaker_role || ""}
                      onChange={(e) => handleUpdateTurn(index, { speaker_role: e.target.value })}
                      placeholder="Role (e.g. examiner)"
                      className="p-1 px-2 text-xs border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#1a1a1a] text-neutral-600 dark:text-neutral-300 w-28 hidden sm:inline-block"
                    />

                    {/* Gender Selector */}
                    <select
                      value={turn.gender || "male"}
                      onChange={(e) =>
                        handleUpdateTurn(index, { gender: e.target.value as "male" | "female" })
                      }
                      className="p-1 text-xs font-bold border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#1a1a1a] text-black dark:text-white"
                      title="Voice Gender for TTS Audio Synthesis"
                    >
                      <option value="male">♂ Male Voice</option>
                      <option value="female">♀ Female Voice</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Audio Status & Player */}
                    {turn.audio_url ? (
                      <button
                        type="button"
                        onClick={() => togglePlayAudio(turn.audio_url!)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-500 hover:bg-emerald-200 cursor-pointer"
                        title="Preview Audio MP3"
                      >
                        {isPlayingThisAudio ? (
                          <Pause className="w-3 h-3 fill-current" />
                        ) : (
                          <Play className="w-3 h-3 fill-current" />
                        )}
                        Audio MP3
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSynthesizeSingleTurn(index)}
                        disabled={isSynthesizing || !turn.german.trim()}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase bg-neutral-100 text-neutral-700 border border-neutral-400 hover:bg-[#ffe600] hover:text-black cursor-pointer disabled:opacity-50"
                        title="Generate studio MP3 for this turn"
                      >
                        {isSynthesizing ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Volume2 className="w-3 h-3" />
                        )}
                        Synthesize
                      </button>
                    )}

                    {/* Move Up/Down */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveTurn(index, "up")}
                      className="p-1 border border-neutral-200 dark:border-neutral-700 hover:border-black text-neutral-600 dark:text-neutral-400 disabled:opacity-30 cursor-pointer"
                      title="Move turn up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={index === turns.length - 1}
                      onClick={() => handleMoveTurn(index, "down")}
                      className="p-1 border border-neutral-200 dark:border-neutral-700 hover:border-black text-neutral-600 dark:text-neutral-400 disabled:opacity-30 cursor-pointer"
                      title="Move turn down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>

                    {/* Delete Turn */}
                    <button
                      type="button"
                      onClick={() => handleDeleteTurn(index)}
                      className="p-1 border border-neutral-200 dark:border-neutral-700 hover:border-red-600 text-red-600 text-[11px] cursor-pointer"
                      title="Delete turn"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* German Dialogue Line (Required) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-neutral-500">
                    German Line *
                  </label>
                  <input
                    type="text"
                    required
                    value={turn.german}
                    onChange={(e) => handleUpdateTurn(index, { german: e.target.value })}
                    placeholder="e.g. Guten Tag! Bitte stellen Sie sich kurz vor."
                    className="w-full p-2 text-xs sm:text-sm font-bold border border-black dark:border-neutral-700 bg-neutral-50/50 dark:bg-[#121212] text-black dark:text-white focus:outline-none"
                  />
                </div>

                {/* English & Malayalam Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">
                      English Translation (Optional)
                    </label>
                    <input
                      type="text"
                      value={turn.english || ""}
                      onChange={(e) => handleUpdateTurn(index, { english: e.target.value })}
                      placeholder="e.g. Good day! Please introduce yourself briefly."
                      className="w-full p-1.5 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-neutral-700 dark:text-neutral-300 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-neutral-500">
                      Malayalam Meaning (Optional)
                    </label>
                    <input
                      type="text"
                      value={turn.malayalam || ""}
                      onChange={(e) => handleUpdateTurn(index, { malayalam: e.target.value })}
                      placeholder="e.g. നമസ്കാരം! ദയവായി സ്വയം ചെറുതായി പരിചയപ്പെടുത്തൂ."
                      className="w-full p-1.5 text-xs font-malayalam border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
