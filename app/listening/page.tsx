"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ListeningTopic, ListeningAudio, ListeningQuestion, Level } from "@/types";
import {
  Plus,
  Trash2,
  Edit3,
  ArrowLeft,
  Check,
  AlertCircle,
  Headphones,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Layers,
  X,
  Volume2,
} from "lucide-react";
import AudioRecorder from "@/components/AudioRecorder";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2"];

export default function AdminListeningPage() {
  const [topics, setTopics] = useState<ListeningTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<Level>("A1");

  // Topic Form
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicSlug, setTopicSlug] = useState("");
  const [topicDesc, setTopicDesc] = useState("");
  const [topicOrder, setTopicOrder] = useState<number>(1);

  // Active Topic & Sub-tabs
  const [activeTopic, setActiveTopic] = useState<ListeningTopic | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"audios" | "questions">("audios");

  // Listening Audios state
  const [audios, setAudios] = useState<ListeningAudio[]>([]);
  const [audiosLoading, setAudiosLoading] = useState(false);
  const [editingAudioId, setEditingAudioId] = useState<string | null>(null);
  const [audioTitle, setAudioTitle] = useState("");
  const [audioGerman, setAudioGerman] = useState("");
  const [audioEnglish, setAudioEnglish] = useState("");
  const [audioMalayalam, setAudioMalayalam] = useState("");
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [audioOrder, setAudioOrder] = useState<number>(1);

  // Questions state
  const [questions, setQuestions] = useState<ListeningQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [qGerman, setQGerman] = useState("");
  const [qEnglish, setQEnglish] = useState("");
  const [qMalayalam, setQMalayalam] = useState("");
  const [qOptions, setQOptions] = useState<string[]>(["", "", "", ""]);
  const [qCorrectIndex, setQCorrectIndex] = useState<number>(0);
  const [qExplanation, setQExplanation] = useState("");
  const [qOrder, setQOrder] = useState<number>(1);
  const [qAudioId, setQAudioId] = useState<string>("");

  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadTopics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/listening/topics");
      const data = await res.json();
      if (data.items) {
        setTopics(data.items.sort((a: ListeningTopic, b: ListeningTopic) => (a.order_index ?? 1) - (b.order_index ?? 1)));
      }
    } catch {
      console.error("Failed to load listening topics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const loadTopicContent = useCallback(async (topicId: string) => {
    setAudiosLoading(true);
    setQuestionsLoading(true);
    try {
      const [aRes, qRes] = await Promise.all([
        fetch(`/api/admin/listening/audios?topic_id=${topicId}`).then((r) => r.json()),
        fetch(`/api/admin/listening/questions?topic_id=${topicId}`).then((r) => r.json()),
      ]);
      setAudios((aRes.items || []).sort((a: ListeningAudio, b: ListeningAudio) => (a.order_index ?? 1) - (b.order_index ?? 1)));
      setQuestions((qRes.items || []).sort((a: ListeningQuestion, b: ListeningQuestion) => (a.order_index ?? 1) - (b.order_index ?? 1)));
    } catch {
      setStatusMsg({ type: "error", text: "Failed to load topic audios and questions." });
    } finally {
      setAudiosLoading(false);
      setQuestionsLoading(false);
    }
  }, []);

  const handleSelectTopic = (t: ListeningTopic) => {
    setActiveTopic(t);
    loadTopicContent(t.id);
    resetAudioForm();
    resetQForm();
  };

  const handleLevelChange = (lvl: Level) => {
    setSelectedLevel(lvl);
    setActiveTopic(null);
  };

  const filteredTopics = topics.filter((t) => t.level === selectedLevel);

  // Auto-slug generator
  const handleTitleChange = (val: string) => {
    setTopicTitle(val);
    if (!editingTopicId) {
      const genSlug = val
        .toLowerCase()
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/ß/g, "ss")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setTopicSlug(genSlug);
    }
  };

  // Save Topic
  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim() || !topicSlug.trim()) {
      setStatusMsg({ type: "error", text: "Title and slug are required." });
      return;
    }

    try {
      const payload: Partial<ListeningTopic> = {
        id: editingTopicId || undefined,
        level: selectedLevel,
        title: topicTitle.trim(),
        slug: topicSlug.trim(),
        description: topicDesc.trim() || undefined,
        order_index: Number(topicOrder) || 1,
      };

      const res = await fetch("/api/admin/listening/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Save failed");

      setStatusMsg({ type: "success", text: "Topic saved successfully!" });
      setShowTopicForm(false);
      setEditingTopicId(null);
      setTopicTitle("");
      setTopicSlug("");
      setTopicDesc("");
      loadTopics();
      if (activeTopic && activeTopic.id === data.item.id) {
        setActiveTopic(data.item);
      }
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  const handleEditTopic = (t: ListeningTopic) => {
    setEditingTopicId(t.id);
    setTopicTitle(t.title);
    setTopicSlug(t.slug);
    setTopicDesc(t.description || "");
    setTopicOrder(t.order_index ?? 1);
    setShowTopicForm(true);
  };

  const handleDeleteTopic = async (id: string) => {
    if (!confirm("Are you sure you want to delete this listening topic? All linked audios and questions will be deleted.")) return;
    try {
      const res = await fetch(`/api/admin/listening/topics?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setStatusMsg({ type: "success", text: "Topic deleted." });
      if (activeTopic?.id === id) setActiveTopic(null);
      loadTopics();
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  // Audios Form
  const resetAudioForm = () => {
    setEditingAudioId(null);
    setAudioTitle("");
    setAudioGerman("");
    setAudioEnglish("");
    setAudioMalayalam("");
    setAudioUrl("");
    setAudioOrder(audios.length + 1);
  };

  const handleEditAudio = (a: ListeningAudio) => {
    setEditingAudioId(a.id);
    setAudioTitle(a.title || "");
    setAudioGerman(a.content_german);
    setAudioEnglish(a.content_english || "");
    setAudioMalayalam(a.content_malayalam || "");
    setAudioUrl(a.audio_url || "");
    setAudioOrder(a.order_index ?? 1);
  };

  const handleSaveAudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTopic) return;
    if (!audioGerman.trim()) {
      setStatusMsg({ type: "error", text: "German audio content is required." });
      return;
    }

    try {
      const payload: Partial<ListeningAudio> = {
        id: editingAudioId || undefined,
        topic_id: activeTopic.id,
        title: audioTitle.trim() || undefined,
        content_german: audioGerman.trim(),
        content_english: audioEnglish.trim() || undefined,
        content_malayalam: audioMalayalam.trim() || undefined,
        audio_url: audioUrl.trim() || null,
        order_index: Number(audioOrder) || 1,
      };

      const res = await fetch("/api/admin/listening/audios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Save failed");

      setStatusMsg({ type: "success", text: "Audio passage saved successfully!" });
      resetAudioForm();
      loadTopicContent(activeTopic.id);
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  const handleDeleteAudio = async (id: string) => {
    if (!confirm("Are you sure you want to delete this audio passage?")) return;
    try {
      const res = await fetch(`/api/admin/listening/audios?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setStatusMsg({ type: "success", text: "Audio passage deleted." });
      if (activeTopic) loadTopicContent(activeTopic.id);
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  // Questions Form
  const resetQForm = () => {
    setEditingQId(null);
    setQGerman("");
    setQEnglish("");
    setQMalayalam("");
    setQOptions(["", "", "", ""]);
    setQCorrectIndex(0);
    setQExplanation("");
    setQAudioId("");
    setQOrder(questions.length + 1);
  };

  const handleEditQ = (q: ListeningQuestion) => {
    setEditingQId(q.id);
    setQGerman(q.question);
    setQEnglish(q.question_english || "");
    setQMalayalam(q.question_malayalam || "");
    const opts = [...q.options];
    while (opts.length < 4) opts.push("");
    setQOptions(opts);
    setQCorrectIndex(q.correct_option_index ?? 0);
    setQExplanation(q.explanation || "");
    setQAudioId(q.listening_audio_id || "");
    setQOrder(q.order_index ?? 1);
  };

  const handleSaveQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTopic) return;
    if (!qGerman.trim()) {
      setStatusMsg({ type: "error", text: "Question text is required." });
      return;
    }

    const cleanOptions = qOptions.map((o) => o.trim()).filter((o) => o.length > 0);
    if (cleanOptions.length < 2) {
      setStatusMsg({ type: "error", text: "Provide at least 2 answer options." });
      return;
    }

    try {
      const payload: Partial<ListeningQuestion> = {
        id: editingQId || undefined,
        topic_id: activeTopic.id,
        listening_audio_id: qAudioId.trim() || null,
        question: qGerman.trim(),
        question_english: qEnglish.trim() || undefined,
        question_malayalam: qMalayalam.trim() || undefined,
        options: cleanOptions,
        correct_option_index: Number(qCorrectIndex),
        explanation: qExplanation.trim() || undefined,
        order_index: Number(qOrder) || 1,
      };

      const res = await fetch("/api/admin/listening/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Save failed");

      setStatusMsg({ type: "success", text: "Quiz question saved!" });
      resetQForm();
      loadTopicContent(activeTopic.id);
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  const handleDeleteQ = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      const res = await fetch(`/api/admin/listening/questions?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setStatusMsg({ type: "success", text: "Question deleted." });
      if (activeTopic) loadTopicContent(activeTopic.id);
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b-2 border-black dark:border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <Headphones className="w-6 h-6 text-black dark:text-white" />
            Listening Module (Hören)
          </h1>
          <p className="text-xs text-neutral-500 font-bold mt-0.5">
            Manage audio comprehension topics, speech dialogues, and quiz questions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/audio"
            className="px-3 py-1.5 bg-[#ffe600] border-2 border-black font-black text-xs uppercase flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-black"
          >
            <Volume2 className="w-3.5 h-3.5" /> Batch Audio Generator
          </Link>
          <button
            onClick={() => {
              resetAudioForm();
              resetQForm();
              setEditingTopicId(null);
              setTopicTitle("");
              setTopicSlug("");
              setTopicDesc("");
              setTopicOrder(filteredTopics.length + 1);
              setShowTopicForm(true);
            }}
            className="px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black font-black text-xs uppercase flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> New Topic
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 border-2 flex items-center justify-between text-xs font-bold ${
            statusMsg.type === "success"
              ? "border-green-600 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
              : "border-red-600 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Level Tabs */}
      <div className="flex gap-2 border-b border-neutral-300 dark:border-neutral-800 pb-2">
        {LEVELS.map((lvl) => (
          <button
            key={lvl}
            onClick={() => handleLevelChange(lvl)}
            className={`px-4 py-1.5 font-black text-xs uppercase border-2 transition-all cursor-pointer ${
              selectedLevel === lvl
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:border-black"
            }`}
          >
            {lvl}
          </button>
        ))}
      </div>

      {/* Main Grid: Left Topics List, Right Topic Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Topics */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-black dark:border-neutral-800 pb-2">
            <h2 className="text-sm font-black uppercase tracking-wider">
              {selectedLevel} Topics ({filteredTopics.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs font-bold text-neutral-400">Loading topics...</div>
          ) : filteredTopics.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-400">
              No listening topics found for {selectedLevel}. Click &quot;New Topic&quot; to create one.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTopics.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTopic(t)}
                  className={`p-3 border-2 transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    activeTopic?.id === t.id
                      ? "border-black bg-[#ffe600] text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                      : "border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-black dark:hover:border-white"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-1 bg-black/10 text-black dark:text-white rounded">
                        #{t.order_index ?? 1}
                      </span>
                      <h3 className="font-bold text-xs truncate">{t.title}</h3>
                    </div>
                    <p className="text-[10px] text-neutral-500 font-mono truncate mt-0.5">/{t.slug}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditTopic(t);
                      }}
                      className="p-1 hover:bg-black/10 rounded cursor-pointer"
                      title="Edit Topic Info"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTopic(t.id);
                      }}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-950 text-red-600 rounded cursor-pointer"
                      title="Delete Topic"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Topic Detail, Audios, and Questions */}
        <div className="md:col-span-2 space-y-4">
          {activeTopic ? (
            <div className="space-y-4">
              {/* Active Topic Banner */}
              <div className="p-4 border-2 border-black dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="px-2 py-0.5 bg-[#ffe600] text-black font-black text-[10px] uppercase border border-black">
                      {activeTopic.level} Listening Topic
                    </span>
                    <h2 className="text-lg font-black text-black dark:text-white mt-1">
                      {activeTopic.title}
                    </h2>
                    {activeTopic.description && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        {activeTopic.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`http://localhost:3000/listening/${activeTopic.slug}`}
                      target="_blank"
                      className="text-[11px] font-black uppercase text-blue-600 hover:underline"
                    >
                      View on Learner App ↗
                    </Link>
                  </div>
                </div>

                {/* Sub tabs: Audios vs Questions */}
                <div className="flex gap-2 border-t border-neutral-200 dark:border-neutral-800 mt-4 pt-3">
                  <button
                    onClick={() => setActiveSubTab("audios")}
                    className={`px-3 py-1 font-black text-xs uppercase border flex items-center gap-1.5 cursor-pointer ${
                      activeSubTab === "audios"
                        ? "bg-black text-white dark:bg-white dark:text-black border-black"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-300"
                    }`}
                  >
                    <Headphones className="w-3.5 h-3.5" /> Audio Passages ({audios.length})
                  </button>
                  <button
                    onClick={() => setActiveSubTab("questions")}
                    className={`px-3 py-1 font-black text-xs uppercase border flex items-center gap-1.5 cursor-pointer ${
                      activeSubTab === "questions"
                        ? "bg-black text-white dark:bg-white dark:text-black border-black"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-300"
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> Quiz Questions ({questions.length})
                  </button>
                </div>
              </div>

              {/* Subtab 1: Audio Passages */}
              {activeSubTab === "audios" && (
                <div className="space-y-4">
                  {/* Audio Form */}
                  <form
                    onSubmit={handleSaveAudio}
                    className="p-4 border-2 border-black dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-black text-xs uppercase tracking-wider">
                        {editingAudioId ? "Edit Audio Passage" : "Add Audio Passage"}
                      </h3>
                      {editingAudioId && (
                        <button
                          type="button"
                          onClick={resetAudioForm}
                          className="text-[10px] font-bold text-neutral-500 hover:text-black cursor-pointer"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase mb-1">Passage Title (Optional)</label>
                        <input
                          type="text"
                          value={audioTitle}
                          onChange={(e) => setAudioTitle(e.target.value)}
                          placeholder="e.g. Durchsage: ICE 582 nach Frankfurt"
                          className="w-full p-2 border text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase mb-1">Order Index</label>
                        <input
                          type="number"
                          value={audioOrder}
                          onChange={(e) => setAudioOrder(Number(e.target.value))}
                          className="w-full p-2 border text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-black dark:text-white mb-1">
                        German Spoken Content (Required) *
                      </label>
                      <textarea
                        rows={3}
                        value={audioGerman}
                        onChange={(e) => setAudioGerman(e.target.value)}
                        placeholder="Achtung an alle Fahrgäste am Hauptbahnhof München..."
                        className="w-full p-2 border text-xs font-bold leading-relaxed"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase mb-1">English Translation</label>
                        <textarea
                          rows={2}
                          value={audioEnglish}
                          onChange={(e) => setAudioEnglish(e.target.value)}
                          placeholder="Attention all passengers..."
                          className="w-full p-2 border text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase mb-1">Malayalam Translation</label>
                        <textarea
                          rows={2}
                          value={audioMalayalam}
                          onChange={(e) => setAudioMalayalam(e.target.value)}
                          placeholder="എല്ലാ യാത്രക്കാരുടെയും ശ്രദ്ധയ്ക്ക്..."
                          className="w-full p-2 border text-xs font-malayalam"
                        />
                      </div>
                    </div>

                    {/* Integrated Audio Recorder / TTS / URL */}
                    <div className="border border-neutral-300 dark:border-neutral-700 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded">
                      <label className="block text-[10px] font-black uppercase text-black dark:text-white mb-2">
                        Pronunciation / Audio File
                      </label>
                      <AudioRecorder
                        label="🎤 Listening Passage German Audio"
                        audioUrl={audioUrl}
                        prefix="listening"
                        textToSynthesize={audioGerman}
                        onAudioUploaded={setAudioUrl}
                        onAudioRemoved={() => setAudioUrl("")}
                      />
                      <input
                        type="text"
                        value={audioUrl}
                        onChange={(e) => setAudioUrl(e.target.value)}
                        placeholder="Or paste direct audio URL..."
                        className="w-full p-1.5 mt-2 border text-[11px] font-mono text-neutral-600 bg-white dark:bg-neutral-900"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black font-black text-xs uppercase cursor-pointer"
                      >
                        {editingAudioId ? "Update Audio" : "Save Audio"}
                      </button>
                    </div>
                  </form>

                  {/* Audios List */}
                  <div className="space-y-3">
                    {audiosLoading ? (
                      <div className="p-6 text-center text-xs text-neutral-400">Loading passages...</div>
                    ) : audios.length === 0 ? (
                      <div className="p-6 text-center border-2 border-dashed border-neutral-300 text-xs text-neutral-400">
                        No audio passages added yet.
                      </div>
                    ) : (
                      audios.map((a) => (
                        <div
                          key={a.id}
                          className="p-4 border-2 border-black dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2"
                        >
                          <div className="flex items-center justify-between border-b pb-1.5">
                            <span className="font-black text-xs uppercase flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-800 text-[10px] font-mono">
                                #{a.order_index ?? 1}
                              </span>
                              {a.title || "Untitled Passage"}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditAudio(a)}
                                className="p-1 hover:bg-neutral-100 rounded text-neutral-600 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteAudio(a.id)}
                                className="p-1 hover:bg-red-100 text-red-600 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs font-bold leading-relaxed whitespace-pre-line text-black dark:text-white">
                            {a.content_german}
                          </p>

                          {a.content_english && (
                            <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                              <span className="font-bold">EN:</span> {a.content_english}
                            </p>
                          )}

                          {a.content_malayalam && (
                            <p className="text-[11px] font-malayalam text-neutral-800 dark:text-neutral-200">
                              <span className="font-bold">ML:</span> {a.content_malayalam}
                            </p>
                          )}

                          {a.audio_url && (
                            <div className="pt-2 border-t flex items-center gap-2">
                              <audio controls src={a.audio_url} className="h-7 w-full max-w-sm" />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Subtab 2: Quiz Questions */}
              {activeSubTab === "questions" && (
                <div className="space-y-4">
                  {/* Question Form */}
                  <form
                    onSubmit={handleSaveQ}
                    className="p-4 border-2 border-black dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-black text-xs uppercase tracking-wider">
                        {editingQId ? "Edit Quiz Question" : "Add Quiz Question"}
                      </h3>
                      {editingQId && (
                        <button
                          type="button"
                          onClick={resetQForm}
                          className="text-[10px] font-bold text-neutral-500 hover:text-black cursor-pointer"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-black uppercase text-black dark:text-white mb-1">
                          Question (German) *
                        </label>
                        <input
                          type="text"
                          value={qGerman}
                          onChange={(e) => setQGerman(e.target.value)}
                          placeholder="Wohin fährt der Zug?"
                          className="w-full p-2 border text-xs font-bold"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase mb-1">Order Index</label>
                        <input
                          type="number"
                          value={qOrder}
                          onChange={(e) => setQOrder(Number(e.target.value))}
                          className="w-full p-2 border text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase mb-1">English Translation</label>
                        <input
                          type="text"
                          value={qEnglish}
                          onChange={(e) => setQEnglish(e.target.value)}
                          placeholder="Where does the train go?"
                          className="w-full p-2 border text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase mb-1">Malayalam Translation</label>
                        <input
                          type="text"
                          value={qMalayalam}
                          onChange={(e) => setQMalayalam(e.target.value)}
                          placeholder="ട്രെയിൻ എവിടേക്കാണ് പോകുന്നത്?"
                          className="w-full p-2 border text-xs font-malayalam"
                        />
                      </div>
                    </div>

                    {/* Answer Options */}
                    <div>
                      <label className="block text-[10px] font-black uppercase text-black dark:text-white mb-1.5">
                        Answer Options (Select the correct radio button)
                      </label>
                      <div className="space-y-2">
                        {qOptions.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correct_option"
                              checked={qCorrectIndex === oIdx}
                              onChange={() => setQCorrectIndex(oIdx)}
                              className="w-4 h-4 cursor-pointer text-black"
                              title="Mark as correct"
                            />
                            <span className="text-xs font-bold w-4 text-neutral-400">{oIdx + 1}.</span>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...qOptions];
                                newOpts[oIdx] = e.target.value;
                                setQOptions(newOpts);
                              }}
                              placeholder={`Option ${oIdx + 1}`}
                              className={`flex-1 p-1.5 border text-xs ${
                                qCorrectIndex === oIdx ? "border-green-600 bg-green-50/50 dark:bg-green-950/20" : ""
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase mb-1">
                        Explanation (Shown after answering)
                      </label>
                      <textarea
                        rows={2}
                        value={qExplanation}
                        onChange={(e) => setQExplanation(e.target.value)}
                        placeholder="Der Zug fährt nach Frankfurt über Stuttgart."
                        className="w-full p-2 border text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black font-black text-xs uppercase cursor-pointer"
                      >
                        {editingQId ? "Update Question" : "Save Question"}
                      </button>
                    </div>
                  </form>

                  {/* Questions List */}
                  <div className="space-y-3">
                    {questionsLoading ? (
                      <div className="p-6 text-center text-xs text-neutral-400">Loading questions...</div>
                    ) : questions.length === 0 ? (
                      <div className="p-6 text-center border-2 border-dashed border-neutral-300 text-xs text-neutral-400">
                        No quiz questions created yet.
                      </div>
                    ) : (
                      questions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="p-4 border-2 border-black dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2"
                        >
                          <div className="flex items-center justify-between border-b pb-1.5">
                            <span className="font-black text-xs uppercase flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 bg-[#ffe600] text-black text-[10px] font-mono border border-black">
                                Q{idx + 1}
                              </span>
                              {q.question}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditQ(q)}
                                className="p-1 hover:bg-neutral-100 rounded text-neutral-600 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteQ(q.id)}
                                className="p-1 hover:bg-red-100 text-red-600 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            {q.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className={`p-2 border text-xs font-medium flex items-center gap-2 ${
                                  optIdx === q.correct_option_index
                                    ? "border-green-600 bg-green-50 text-green-900 font-bold dark:bg-green-950 dark:text-green-200"
                                    : "border-neutral-200 text-neutral-600 dark:border-neutral-800 dark:text-neutral-400"
                                }`}
                              >
                                <span>{optIdx === q.correct_option_index ? "✓" : "•"}</span>
                                <span>{opt}</span>
                              </div>
                            ))}
                          </div>

                          {q.explanation && (
                            <p className="text-[11px] text-neutral-500 font-medium italic pt-1">
                              💡 Explanation: {q.explanation}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900">
              <Headphones className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
              <p className="text-sm font-black uppercase text-neutral-500">
                Select a topic on the left to manage its audio passages and quiz questions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Topic Create / Edit Modal */}
      {showTopicForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border-2 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-base font-black uppercase tracking-tight">
                {editingTopicId ? "Edit Listening Topic" : `New ${selectedLevel} Listening Topic`}
              </h2>
              <button onClick={() => setShowTopicForm(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTopic} className="space-y-3">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Title *</label>
                <input
                  type="text"
                  value={topicTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Goethe A1 Hören: Durchsagen am Hauptbahnhof"
                  className="w-full p-2 border-2 border-black dark:border-neutral-700 text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Slug (URL identifier) *</label>
                <input
                  type="text"
                  value={topicSlug}
                  onChange={(e) => setTopicSlug(e.target.value)}
                  placeholder="e.g. goethe-a1-hoeren-durchsagen"
                  className="w-full p-2 border-2 border-black dark:border-neutral-700 text-xs font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={topicDesc}
                  onChange={(e) => setTopicDesc(e.target.value)}
                  placeholder="Short description of the listening audio topic..."
                  className="w-full p-2 border-2 border-black dark:border-neutral-700 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Order Index</label>
                <input
                  type="number"
                  value={topicOrder}
                  onChange={(e) => setTopicOrder(Number(e.target.value))}
                  className="w-full p-2 border-2 border-black dark:border-neutral-700 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowTopicForm(false)}
                  className="px-4 py-2 border-2 border-neutral-300 font-black text-xs uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black font-black text-xs uppercase cursor-pointer"
                >
                  Save Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
