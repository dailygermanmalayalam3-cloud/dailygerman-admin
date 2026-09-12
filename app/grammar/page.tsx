"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { GrammarTopic, GrammarVideo, GrammarExercise, Level } from "@/types";
import {
  Plus,
  Trash2,
  Edit3,
  ArrowLeft,
  Check,
  AlertCircle,
  Video,
  FileText,
  ChevronUp,
  ChevronDown,
  Layers,
  ExternalLink,
  X,
} from "lucide-react";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2"];

export default function AdminGrammarPage() {
  const [items, setItems] = useState<GrammarTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<Level>("A1");

  // Topic Form State
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicOrder, setTopicOrder] = useState<number>(1);
  const [topicShortDesc, setTopicShortDesc] = useState("");
  const [topicMalayalam, setTopicMalayalam] = useState("");
  const [topicContent, setTopicContent] = useState("");

  // Selected Topic Workspace
  const [activeTopic, setActiveTopic] = useState<GrammarTopic | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"videos" | "exercises">("videos");

  // Videos State for Active Topic
  const [videos, setVideos] = useState<GrammarVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDesc, setVideoDesc] = useState("");
  const [videoOrder, setVideoOrder] = useState<number>(1);

  // Exercises State for Active Topic
  const [exercises, setExercises] = useState<GrammarExercise[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exerciseTitle, setExerciseTitle] = useState("");
  const [exerciseContent, setExerciseContent] = useState("");
  const [exerciseSolution, setExerciseSolution] = useState("");
  const [exerciseOrder, setExerciseOrder] = useState<number>(1);

  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch topics
  const loadTopics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/grammar-list");
      const data = await res.json();
      if (data.items) {
        setItems(data.items.sort((a: GrammarTopic, b: GrammarTopic) => (a.order_index ?? 1) - (b.order_index ?? 1)));
      }
    } catch {
      console.error("Failed to load grammar topics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  // Load videos and exercises when an active topic is selected
  const loadTopicContent = useCallback(async (topicId: string) => {
    setVideosLoading(true);
    setExercisesLoading(true);
    try {
      const [vRes, eRes] = await Promise.all([
        fetch(`/api/admin/grammar/videos?topic_id=${topicId}`).then((r) => r.json()),
        fetch(`/api/admin/grammar/exercises?topic_id=${topicId}`).then((r) => r.json()),
      ]);
      setVideos((vRes.items || []).sort((a: GrammarVideo, b: GrammarVideo) => (a.order_index ?? 1) - (b.order_index ?? 1)));
      setExercises((eRes.items || []).sort((a: GrammarExercise, b: GrammarExercise) => (a.order_index ?? 1) - (b.order_index ?? 1)));
    } catch {
      setStatusMsg({ type: "error", text: "Failed to load topic videos and exercises." });
    } finally {
      setVideosLoading(false);
      setExercisesLoading(false);
    }
  }, []);

  const handleSelectTopic = (topic: GrammarTopic) => {
    setActiveTopic(topic);
    setEditingVideoId(null);
    setEditingExerciseId(null);
    setVideoUrl("");
    setVideoTitle("");
    setVideoDesc("");
    setExerciseTitle("");
    setExerciseContent("");
    setExerciseSolution("");
    loadTopicContent(topic.id);
  };

  // ----------------- TOPIC MANAGEMENT -----------------
  const resetTopicForm = () => {
    setTopicTitle("");
    setTopicOrder(items.filter((i) => i.level === selectedLevel).length + 1);
    setTopicShortDesc("");
    setTopicMalayalam("");
    setTopicContent("");
    setEditingTopicId(null);
    setShowTopicForm(false);
  };

  const handleEditTopic = (topic: GrammarTopic) => {
    setSelectedLevel(topic.level);
    setTopicTitle(topic.title);
    setTopicOrder(topic.order_index ?? 1);
    setTopicShortDesc(topic.short_description || "");
    setTopicMalayalam(topic.explanation_malayalam || "");
    setTopicContent(topic.content || "");
    setEditingTopicId(topic.id);
    setShowTopicForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const payload = {
      ...(editingTopicId ? { id: editingTopicId } : {}),
      level: selectedLevel,
      title: topicTitle.trim(),
      order_index: Number(topicOrder) || 1,
      short_description: topicShortDesc.trim(),
      explanation_malayalam: topicMalayalam.trim(),
      content: topicContent.trim(),
    };

    try {
      const res = await fetch("/api/admin/grammar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.item) {
        setItems((prev) => {
          const filtered = prev.filter((i) => i.id !== data.item.id);
          return [...filtered, data.item].sort((a, b) => (a.order_index ?? 1) - (b.order_index ?? 1));
        });
        if (activeTopic?.id === data.item.id) {
          setActiveTopic(data.item);
        }
        setStatusMsg({
          type: "success",
          text: editingTopicId ? "Grammar topic updated!" : "New grammar topic created!",
        });
        resetTopicForm();
      } else {
        throw new Error(data.error || "Failed to save topic");
      }
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  const handleUpdateTopicOrder = async (topic: GrammarTopic, newOrder: number) => {
    try {
      const res = await fetch("/api/admin/grammar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...topic, order_index: newOrder }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev
            .map((t) => (t.id === topic.id ? { ...t, order_index: newOrder } : t))
            .sort((a, b) => (a.order_index ?? 1) - (b.order_index ?? 1))
        );
      }
    } catch {
      setStatusMsg({ type: "error", text: "Could not reorder topic." });
    }
  };

  const handleDeleteTopic = async (id: string) => {
    if (!confirm("Are you sure you want to delete this grammar topic and all its attached videos and exercises?")) return;

    try {
      const res = await fetch(`/api/admin/grammar?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        if (activeTopic?.id === id) setActiveTopic(null);
        setStatusMsg({ type: "success", text: "Grammar topic deleted." });
      } else {
        throw new Error("Failed to delete topic");
      }
    } catch {
      setStatusMsg({ type: "error", text: "Failed to delete grammar topic." });
    }
  };

  // ----------------- VIDEO MANAGEMENT -----------------
  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTopic) return;
    setStatusMsg(null);

    const payload = {
      ...(editingVideoId ? { id: editingVideoId } : {}),
      topic_id: activeTopic.id,
      video_url: videoUrl.trim(),
      title: videoTitle.trim(),
      description: videoDesc.trim(),
      order_index: Number(videoOrder) || 1,
    };

    try {
      const res = await fetch("/api/admin/grammar/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.item) {
        setVideos((prev) => {
          const filtered = prev.filter((v) => v.id !== data.item.id);
          return [...filtered, data.item].sort((a, b) => (a.order_index ?? 1) - (b.order_index ?? 1));
        });
        setEditingVideoId(null);
        setVideoUrl("");
        setVideoTitle("");
        setVideoDesc("");
        setVideoOrder(videos.length + 2);
        setStatusMsg({ type: "success", text: "Grammar video saved successfully!" });
      } else {
        throw new Error(data.error || "Failed to save video");
      }
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  const handleEditVideo = (v: GrammarVideo) => {
    setEditingVideoId(v.id);
    setVideoUrl(v.video_url);
    setVideoTitle(v.title || "");
    setVideoDesc(v.description || "");
    setVideoOrder(v.order_index ?? 1);
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return;
    try {
      const res = await fetch(`/api/admin/grammar/videos?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== id));
        setStatusMsg({ type: "success", text: "Video deleted successfully." });
      } else {
        throw new Error("Failed to delete video");
      }
    } catch {
      setStatusMsg({ type: "error", text: "Could not delete video." });
    }
  };

  const handleUpdateVideoOrder = async (video: GrammarVideo, newOrder: number) => {
    try {
      const res = await fetch("/api/admin/grammar/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...video, order_index: newOrder }),
      });
      if (res.ok) {
        setVideos((prev) =>
          prev
            .map((v) => (v.id === video.id ? { ...v, order_index: newOrder } : v))
            .sort((a, b) => (a.order_index ?? 1) - (b.order_index ?? 1))
        );
      }
    } catch {
      setStatusMsg({ type: "error", text: "Could not reorder video." });
    }
  };

  // ----------------- EXERCISE / WORKOUT MANAGEMENT -----------------
  const handleSaveExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTopic) return;
    setStatusMsg(null);

    const payload = {
      ...(editingExerciseId ? { id: editingExerciseId } : {}),
      topic_id: activeTopic.id,
      title: exerciseTitle.trim(),
      content: exerciseContent.trim(),
      solution: exerciseSolution.trim(),
      order_index: Number(exerciseOrder) || 1,
    };

    try {
      const res = await fetch("/api/admin/grammar/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.item) {
        setExercises((prev) => {
          const filtered = prev.filter((ex) => ex.id !== data.item.id);
          return [...filtered, data.item].sort((a, b) => (a.order_index ?? 1) - (b.order_index ?? 1));
        });
        setEditingExerciseId(null);
        setExerciseTitle("");
        setExerciseContent("");
        setExerciseSolution("");
        setExerciseOrder(exercises.length + 2);
        setStatusMsg({ type: "success", text: "Exercise workout saved successfully!" });
      } else {
        throw new Error(data.error || "Failed to save exercise");
      }
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  const handleEditExercise = (ex: GrammarExercise) => {
    setEditingExerciseId(ex.id);
    setExerciseTitle(ex.title || "");
    setExerciseContent(ex.content);
    setExerciseSolution(ex.solution || "");
    setExerciseOrder(ex.order_index ?? 1);
  };

  const handleDeleteExercise = async (id: string) => {
    if (!confirm("Are you sure you want to delete this exercise workout?")) return;
    try {
      const res = await fetch(`/api/admin/grammar/exercises?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setExercises((prev) => prev.filter((ex) => ex.id !== id));
        setStatusMsg({ type: "success", text: "Exercise deleted successfully." });
      } else {
        throw new Error("Failed to delete exercise");
      }
    } catch {
      setStatusMsg({ type: "error", text: "Could not delete exercise." });
    }
  };

  const handleUpdateExerciseOrder = async (ex: GrammarExercise, newOrder: number) => {
    try {
      const res = await fetch("/api/admin/grammar/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ex, order_index: newOrder }),
      });
      if (res.ok) {
        setExercises((prev) =>
          prev
            .map((item) => (item.id === ex.id ? { ...item, order_index: newOrder } : item))
            .sort((a, b) => (a.order_index ?? 1) - (b.order_index ?? 1))
        );
      }
    } catch {
      setStatusMsg({ type: "error", text: "Could not reorder exercise." });
    }
  };

  // Filter topics for the current level tab
  const levelTopics = items.filter((t) => t.level === selectedLevel);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-xs font-bold uppercase text-neutral-500 hover:text-black flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight mt-1 uppercase">
            Manage German Grammar
          </h1>
          <p className="text-xs text-neutral-600 font-bold mt-0.5">
            Organize topics by level and manage independent videos and exercise workouts for each topic.
          </p>
        </div>

        <button
          onClick={() => {
            if (showTopicForm) resetTopicForm();
            else {
              setTopicOrder(levelTopics.length + 1);
              setShowTopicForm(true);
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black bg-[#ffe600] text-black font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{showTopicForm ? "Cancel" : "+ Add Grammar Topic"}</span>
        </button>
      </div>

      {/* Global Status Banner */}
      {statusMsg && (
        <div
          className={`p-3 text-xs font-bold border flex items-center gap-2 ${
            statusMsg.type === "success"
              ? "bg-green-50 border-green-600 text-green-900"
              : "bg-red-50 border-red-600 text-red-900"
          }`}
        >
          {statusMsg.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Topic Add/Edit Form */}
      {showTopicForm && (
        <form
          onSubmit={handleSaveTopic}
          className="border-2 border-black bg-white p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-4"
        >
          <div className="flex items-center justify-between border-b-2 border-black pb-2">
            <h2 className="text-sm font-black uppercase text-black">
              {editingTopicId ? "Edit Grammar Topic" : "Create New Grammar Topic"}
            </h2>
            <button
              type="button"
              onClick={resetTopicForm}
              className="text-xs font-bold text-neutral-500 hover:text-black cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">Level *</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as Level)}
                className="w-full px-3 py-2 border-2 border-black bg-white text-xs font-black"
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl} Deutsch
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">Topic Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Personal Pronouns, Verb Conjugation"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1">Display Order # *</label>
              <input
                type="number"
                min={1}
                required
                value={topicOrder}
                onChange={(e) => setTopicOrder(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border-2 border-black text-xs font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1">
              Short Description (English / Overview)
            </label>
            <input
              type="text"
              placeholder="e.g. Learn nominative personal pronouns (ich, du, er, sie, es...)"
              value={topicShortDesc}
              onChange={(e) => setTopicShortDesc(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1">
              Malayalam Explanation (വിവരണം)
            </label>
            <textarea
              rows={2}
              placeholder="മലയാളത്തിലുള്ള വ്യാകരണ വിശദീകരണം..."
              value={topicMalayalam}
              onChange={(e) => setTopicMalayalam(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black text-xs font-malayalam"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1">
              Optional Grammar Notes / Tables / Rules
            </label>
            <textarea
              rows={3}
              placeholder="Grammar rules, conjugation tables, or summary notes (optional)..."
              value={topicContent}
              onChange={(e) => setTopicContent(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black text-xs font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetTopicForm}
              className="px-4 py-2 border border-black text-xs font-bold uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 border-2 border-black bg-[#ffe600] text-black text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all cursor-pointer"
            >
              {editingTopicId ? "Update Topic" : "Save Topic"}
            </button>
          </div>
        </form>
      )}

      {/* Level Selector Tabs */}
      <div className="flex items-center gap-2 border-b-2 border-black pb-2">
        <span className="text-xs font-black uppercase text-neutral-500 mr-2">Level:</span>
        {LEVELS.map((lvl) => {
          const isSelected = selectedLevel === lvl;
          const count = items.filter((t) => t.level === lvl).length;
          return (
            <button
              key={lvl}
              onClick={() => {
                setSelectedLevel(lvl);
                if (activeTopic && activeTopic.level !== lvl) {
                  setActiveTopic(null);
                }
              }}
              className={`px-4 py-1.5 text-xs font-black uppercase border-2 transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#ffe600] text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white text-neutral-700 border-neutral-300 hover:border-black"
              }`}
            >
              {lvl} ({count})
            </button>
          );
        })}
      </div>

      {/* Topics Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-black">
            {selectedLevel} Grammar Topics ({levelTopics.length})
          </h2>
          <span className="text-xs text-neutral-500 font-bold">
            Select a topic below to manage its videos and exercise workouts
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-neutral-500">Loading grammar topics...</p>
        ) : levelTopics.length === 0 ? (
          <div className="text-center py-12 border border-neutral-200 bg-neutral-50 p-6">
            <p className="text-neutral-600 text-sm font-bold">No grammar topics found for {selectedLevel}.</p>
            <button
              onClick={() => {
                setTopicOrder(1);
                setShowTopicForm(true);
              }}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-bold uppercase hover:bg-[#ffe600] hover:text-black transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add First Topic
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {levelTopics.map((topic) => {
              const isSelected = activeTopic?.id === topic.id;
              return (
                <div
                  key={topic.id}
                  className={`border-2 border-black p-4 bg-white transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? "ring-4 ring-[#ffe600] shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]"
                      : "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center bg-[#ffe600] border border-black font-black text-xs text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                          {topic.order_index ?? 1}
                        </span>
                        <span className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-black text-white">
                          {topic.level}
                        </span>
                      </div>

                      {/* Quick Reorder & Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateTopicOrder(topic, Math.max(1, (topic.order_index ?? 1) - 1))}
                          className="p-1 border border-black hover:bg-neutral-100 cursor-pointer"
                          title="Move up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateTopicOrder(topic, (topic.order_index ?? 1) + 1)}
                          className="p-1 border border-black hover:bg-neutral-100 cursor-pointer"
                          title="Move down"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleEditTopic(topic)}
                          className="p-1 border border-black hover:bg-[#ffe600] transition-colors cursor-pointer"
                          title="Edit Topic"
                        >
                          <Edit3 className="w-3 h-3 text-black" />
                        </button>
                        <button
                          onClick={() => handleDeleteTopic(topic.id)}
                          className="p-1 border border-black hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                          title="Delete Topic"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-black text-black tracking-tight">{topic.title}</h3>
                    {topic.short_description && (
                      <p className="text-xs text-neutral-600 mt-1 line-clamp-2">{topic.short_description}</p>
                    )}
                    {topic.explanation_malayalam && (
                      <p className="text-xs text-amber-950 font-malayalam bg-[#fffbeb] p-2 border-l-2 border-[#facc15] mt-2 line-clamp-2">
                        {topic.explanation_malayalam}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectTopic(topic)}
                    className={`w-full py-2 px-3 border-2 border-black text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-black text-white"
                        : "bg-[#ffe600] text-black hover:bg-black hover:text-white"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{isSelected ? "Active Topic Workspace (Selected)" : "Manage Videos & Exercises →"}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Topic Workspace: Videos & Exercises */}
      {activeTopic && (
        <div className="border-4 border-black bg-neutral-50 p-5 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-6">
          {/* Active Topic Banner */}
          <div className="bg-white border-2 border-black p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 flex items-center justify-center bg-[#ffe600] border-2 border-black font-black text-sm text-black">
                #{activeTopic.order_index ?? 1}
              </span>
              <div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-black text-white mr-2">
                  {activeTopic.level} Grammar
                </span>
                <h3 className="text-lg font-black text-black inline-block">{activeTopic.title}</h3>
                <p className="text-xs text-neutral-500 font-bold mt-0.5">
                  Manage independent videos and workout exercises below.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTopic(null)}
              className="self-start sm:self-center p-1.5 border border-black hover:bg-neutral-200 text-xs font-bold uppercase flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Close Topic
            </button>
          </div>

          {/* Sub-Tabs: Videos vs Exercises */}
          <div className="flex items-center gap-2 border-b-2 border-black pb-2">
            <button
              onClick={() => setActiveSubTab("videos")}
              className={`flex items-center gap-2 px-4 py-2 border-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeSubTab === "videos"
                  ? "bg-[#ffe600] text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white text-neutral-700 border-neutral-300 hover:border-black"
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>🎥 Videos ({videos.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab("exercises")}
              className={`flex items-center gap-2 px-4 py-2 border-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeSubTab === "exercises"
                  ? "bg-[#ffe600] text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white text-neutral-700 border-neutral-300 hover:border-black"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>📝 Exercises / Workout ({exercises.length})</span>
            </button>
          </div>

          {/* ----------------- SUB-TAB: VIDEOS ----------------- */}
          {activeSubTab === "videos" && (
            <div className="space-y-6">
              {/* Add / Edit Video Form */}
              <form
                onSubmit={handleSaveVideo}
                className="border-2 border-black bg-white p-4 sm:p-5 space-y-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                  <h4 className="text-xs font-black uppercase text-black flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 text-black" />
                    <span>{editingVideoId ? "Edit Grammar Video" : "Add New Grammar Video"}</span>
                  </h4>
                  {editingVideoId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingVideoId(null);
                        setVideoUrl("");
                        setVideoTitle("");
                        setVideoDesc("");
                        setVideoOrder(videos.length + 1);
                      }}
                      className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-neutral-700 mb-1">
                      YouTube / Video Link *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="w-full px-2.5 py-1.5 border-2 border-black text-xs font-mono"
                    />
                    <span className="text-[10px] text-neutral-500 font-medium">
                      Supports standard YouTube, Shorts, youtu.be, Vimeo, or MP4 URLs.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-neutral-700 mb-1">
                      Video Order # *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={videoOrder}
                      onChange={(e) => setVideoOrder(parseInt(e.target.value) || 1)}
                      className="w-full px-2.5 py-1.5 border-2 border-black text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-neutral-700 mb-1">
                      Video Title (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lesson Explanation: Personal Pronouns"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 border-2 border-black text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-neutral-700 mb-1">
                      Short Description / Timestamps (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Watch this 5-min clip before attempting the exercises"
                      value={videoDesc}
                      onChange={(e) => setVideoDesc(e.target.value)}
                      className="w-full px-2.5 py-1.5 border-2 border-black text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-neutral-200">
                  <button
                    type="submit"
                    className="px-4 py-2 border-2 border-black bg-[#ffe600] text-black text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all cursor-pointer"
                  >
                    {editingVideoId ? "Update Video" : "+ Add Video"}
                  </button>
                </div>
              </form>

              {/* Videos List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-700">
                  Attached Videos ({videos.length})
                </h4>

                {videosLoading ? (
                  <p className="text-xs text-neutral-500">Loading videos...</p>
                ) : videos.length === 0 ? (
                  <div className="text-center py-8 border border-neutral-300 bg-white p-4">
                    <p className="text-xs text-neutral-600 font-bold">
                      No video links added to &quot;{activeTopic.title}&quot; yet.
                    </p>
                    <p className="text-[11px] text-neutral-500">Paste your YouTube link above to add one.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {videos.map((v) => (
                      <div
                        key={v.id}
                        className="border-2 border-black bg-white p-3.5 flex items-center justify-between gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 flex items-center justify-center bg-[#ffe600] border border-black font-black text-xs text-black shrink-0">
                            {v.order_index ?? 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-black truncate">
                              {v.title || "Grammar Video"}
                            </p>
                            <a
                              href={v.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-mono truncate"
                            >
                              <span className="truncate">{v.video_url}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                            {v.description && (
                              <p className="text-[10px] text-neutral-500 mt-0.5 truncate">{v.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateVideoOrder(v, Math.max(1, (v.order_index ?? 1) - 1))}
                            className="p-1 border border-black hover:bg-neutral-100 cursor-pointer"
                            title="Move up"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateVideoOrder(v, (v.order_index ?? 1) + 1)}
                            className="p-1 border border-black hover:bg-neutral-100 cursor-pointer"
                            title="Move down"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleEditVideo(v)}
                            className="p-1 border border-black hover:bg-[#ffe600] transition-colors cursor-pointer"
                            title="Edit Video"
                          >
                            <Edit3 className="w-3 h-3 text-black" />
                          </button>
                          <button
                            onClick={() => handleDeleteVideo(v.id)}
                            className="p-1 border border-black hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                            title="Delete Video"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ----------------- SUB-TAB: EXERCISES / WORKOUT ----------------- */}
          {activeSubTab === "exercises" && (
            <div className="space-y-6">
              {/* Add / Edit Exercise Form */}
              <form
                onSubmit={handleSaveExercise}
                className="border-2 border-black bg-white p-4 sm:p-5 space-y-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                  <h4 className="text-xs font-black uppercase text-black flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-black" />
                    <span>{editingExerciseId ? "Edit Exercise Workout" : "Add New Exercise Workout"}</span>
                  </h4>
                  {editingExerciseId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingExerciseId(null);
                        setExerciseTitle("");
                        setExerciseContent("");
                        setExerciseSolution("");
                        setExerciseOrder(exercises.length + 1);
                      }}
                      className="text-[11px] font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold uppercase text-neutral-700 mb-1">
                      Exercise Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Workout 1: Ergänzen Sie die Personalpronomen"
                      value={exerciseTitle}
                      onChange={(e) => setExerciseTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 border-2 border-black text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-neutral-700 mb-1">
                      Exercise Order # *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={exerciseOrder}
                      onChange={(e) => setExerciseOrder(parseInt(e.target.value) || 1)}
                      className="w-full px-2.5 py-1.5 border-2 border-black text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-700 mb-1">
                    Exercise Content / Practice Workout Material *
                  </label>
                  <textarea
                    rows={6}
                    required
                    placeholder="Type or paste the complete exercise questions and practice material here:&#10;1. Hallo, wie heißt ___? (du / Sie)&#10;2. Das ist Herr Müller. ___ kommt aus Berlin.&#10;3. ..."
                    value={exerciseContent}
                    onChange={(e) => setExerciseContent(e.target.value)}
                    className="w-full px-2.5 py-2 border-2 border-black text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-700 mb-1">
                    Answer Key / Solution (Optional - Can be viewed by learners)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="1. du&#10;2. Er&#10;..."
                    value={exerciseSolution}
                    onChange={(e) => setExerciseSolution(e.target.value)}
                    className="w-full px-2.5 py-2 border-2 border-black text-xs font-mono"
                  />
                </div>

                <div className="flex justify-end pt-2 border-t border-neutral-200">
                  <button
                    type="submit"
                    className="px-4 py-2 border-2 border-black bg-[#ffe600] text-black text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all cursor-pointer"
                  >
                    {editingExerciseId ? "Update Exercise" : "+ Add Exercise Workout"}
                  </button>
                </div>
              </form>

              {/* Exercises List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-700">
                  Attached Exercise Workouts ({exercises.length})
                </h4>

                {exercisesLoading ? (
                  <p className="text-xs text-neutral-500">Loading exercises...</p>
                ) : exercises.length === 0 ? (
                  <div className="text-center py-8 border border-neutral-300 bg-white p-4">
                    <p className="text-xs text-neutral-600 font-bold">
                      No exercise workouts added to &quot;{activeTopic.title}&quot; yet.
                    </p>
                    <p className="text-[11px] text-neutral-500">Paste your exercise questions above to add one.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {exercises.map((ex) => (
                      <div
                        key={ex.id}
                        className="border-2 border-black bg-white p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 flex items-center justify-center bg-[#ffe600] border border-black font-black text-xs text-black">
                              {ex.order_index ?? 1}
                            </span>
                            <h5 className="text-xs font-black text-black uppercase">
                              {ex.title || "Grammar Exercise"}
                            </h5>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateExerciseOrder(ex, Math.max(1, (ex.order_index ?? 1) - 1))}
                              className="p-1 border border-black hover:bg-neutral-100 cursor-pointer"
                              title="Move up"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateExerciseOrder(ex, (ex.order_index ?? 1) + 1)}
                              className="p-1 border border-black hover:bg-neutral-100 cursor-pointer"
                              title="Move down"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleEditExercise(ex)}
                              className="p-1 border border-black hover:bg-[#ffe600] transition-colors cursor-pointer"
                              title="Edit Exercise"
                            >
                              <Edit3 className="w-3 h-3 text-black" />
                            </button>
                            <button
                              onClick={() => handleDeleteExercise(ex.id)}
                              className="p-1 border border-black hover:bg-red-500 hover:text-white transition-colors cursor-pointer"
                              title="Delete Exercise"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="bg-neutral-50 p-2.5 border border-neutral-300 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {ex.content}
                        </div>

                        {ex.solution && (
                          <div className="bg-[#fffbeb] p-2 border-l-2 border-[#facc15] text-[11px]">
                            <span className="font-bold text-amber-900 block mb-0.5 uppercase">Solution Key:</span>
                            <p className="font-mono text-neutral-800 whitespace-pre-wrap">{ex.solution}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}