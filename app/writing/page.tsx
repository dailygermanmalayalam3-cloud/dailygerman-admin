"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { WritingTopic, WritingSection, Level } from "@/types";
import {
  Plus,
  Trash2,
  Edit3,
  ArrowLeft,
  Check,
  AlertCircle,
  FileEdit,
  ChevronUp,
  ChevronDown,
  Layers,
  X,
} from "lucide-react";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2"];

const SECTION_TYPES = [
  { value: "task", label: "📝 Writing Task / Theme" },
  { value: "example", label: "✉️ Example Letter / Sample Text" },
  { value: "phrases", label: "💡 Useful Phrases / Redemittel" },
  { value: "instructions", label: "📋 Instructions / Guidelines" },
  { value: "general", label: "📄 General Material" },
];

export default function AdminWritingPage() {
  const [topics, setTopics] = useState<WritingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<Level>("A1");

  // Topic Form
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicSlug, setTopicSlug] = useState("");
  const [topicDesc, setTopicDesc] = useState("");
  const [topicOrder, setTopicOrder] = useState<number>(1);

  // Active Topic & Sections
  const [activeTopic, setActiveTopic] = useState<WritingTopic | null>(null);
  const [sections, setSections] = useState<WritingSection[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [secTitle, setSecTitle] = useState("");
  const [secType, setSecType] = useState<WritingSection["section_type"]>("task");
  const [secContent, setSecContent] = useState("");
  const [secMalayalam, setSecMalayalam] = useState("");
  const [secOrder, setSecOrder] = useState<number>(1);

  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadTopics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/writing/topics");
      const data = await res.json();
      if (data.items) {
        setTopics(data.items.sort((a: WritingTopic, b: WritingTopic) => (a.order_index ?? 1) - (b.order_index ?? 1)));
      }
    } catch {
      console.error("Failed to load writing topics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const loadSections = useCallback(async (topicId: string) => {
    setSectionsLoading(true);
    try {
      const res = await fetch(`/api/admin/writing/sections?topic_id=${topicId}`);
      const data = await res.json();
      if (data.items) {
        setSections(data.items.sort((a: WritingSection, b: WritingSection) => (a.order_index ?? 1) - (b.order_index ?? 1)));
      }
    } catch {
      setStatusMsg({ type: "error", text: "Failed to load writing sections." });
    } finally {
      setSectionsLoading(false);
    }
  }, []);

  const handleSelectTopic = (topic: WritingTopic) => {
    setActiveTopic(topic);
    setEditingSectionId(null);
    setSecTitle("");
    setSecType("task");
    setSecContent("");
    setSecMalayalam("");
    loadSections(topic.id);
  };

  const resetTopicForm = () => {
    setTopicTitle("");
    setTopicSlug("");
    setTopicDesc("");
    setTopicOrder(topics.filter((t) => t.level === selectedLevel).length + 1);
    setEditingTopicId(null);
    setShowTopicForm(false);
  };

  const handleEditTopic = (topic: WritingTopic) => {
    setSelectedLevel(topic.level);
    setTopicTitle(topic.title);
    setTopicSlug(topic.slug);
    setTopicDesc(topic.description || "");
    setTopicOrder(topic.order_index ?? 1);
    setEditingTopicId(topic.id);
    setShowTopicForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const generateSlug = (val: string) => {
    return val
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const payload = {
      id: editingTopicId || undefined,
      level: selectedLevel,
      title: topicTitle.trim(),
      slug: (topicSlug.trim() || generateSlug(topicTitle)),
      description: topicDesc.trim(),
      order_index: Number(topicOrder),
    };

    try {
      const res = await fetch("/api/admin/writing/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save topic");

      setStatusMsg({ type: "success", text: `Topic "${payload.title}" saved successfully!` });
      resetTopicForm();
      await loadTopics();

      if (activeTopic?.id === data.item.id) {
        setActiveTopic(data.item);
      }
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  const handleDeleteTopic = async (topic: WritingTopic) => {
    if (!confirm(`Are you sure you want to delete "${topic.title}" and all its sections?`)) return;
    try {
      const res = await fetch(`/api/admin/writing/topics?id=${topic.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete topic");

      if (activeTopic?.id === topic.id) {
        setActiveTopic(null);
      }
      setStatusMsg({ type: "success", text: `Topic "${topic.title}" deleted.` });
      loadTopics();
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  const handleMoveTopic = async (topic: WritingTopic, direction: "up" | "down") => {
    const levelTopics = topics.filter((t) => t.level === topic.level);
    const currentIndex = levelTopics.findIndex((t) => t.id === topic.id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= levelTopics.length) return;

    const currentOrder = topic.order_index ?? currentIndex + 1;
    const targetTopic = levelTopics[targetIndex];
    const targetOrder = targetTopic.order_index ?? targetIndex + 1;

    const newCurrentOrder = currentOrder === targetOrder ? (direction === "up" ? targetOrder - 1 : targetOrder + 1) : targetOrder;
    const newTargetOrder = currentOrder;

    try {
      await Promise.all([
        fetch("/api/admin/writing/topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...topic, order_index: newCurrentOrder }),
        }),
        fetch("/api/admin/writing/topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...targetTopic, order_index: newTargetOrder }),
        }),
      ]);
      loadTopics();
    } catch {
      setStatusMsg({ type: "error", text: "Failed to reorder topic." });
    }
  };

  // ----------------- SECTION MANAGEMENT -----------------
  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTopic) return;
    setStatusMsg(null);

    const payload = {
      id: editingSectionId || undefined,
      topic_id: activeTopic.id,
      title: secTitle.trim(),
      section_type: secType,
      content: secContent.trim(),
      explanation_malayalam: secMalayalam.trim(),
      order_index: Number(secOrder),
    };

    try {
      const res = await fetch("/api/admin/writing/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save writing section");

      setStatusMsg({ type: "success", text: "Writing section saved successfully!" });
      setEditingSectionId(null);
      setSecTitle("");
      setSecType("task");
      setSecContent("");
      setSecMalayalam("");
      setSecOrder(sections.length + 2);
      loadSections(activeTopic.id);
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  const handleEditSection = (s: WritingSection) => {
    setEditingSectionId(s.id);
    setSecTitle(s.title || "");
    setSecType(s.section_type || "general");
    setSecContent(s.content);
    setSecMalayalam(s.explanation_malayalam || "");
    setSecOrder(s.order_index ?? 1);
  };

  const handleDeleteSection = async (id: string) => {
    if (!confirm("Are you sure you want to delete this section?")) return;
    try {
      const res = await fetch(`/api/admin/writing/sections?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete section");
      setStatusMsg({ type: "success", text: "Section deleted." });
      if (activeTopic) loadSections(activeTopic.id);
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  const filteredTopics = topics.filter((t) => t.level === selectedLevel);

  return (
    <div className="space-y-8 pb-16">
      {/* Top Breadcrumb & Title */}
      <div className="border-b-2 border-black dark:border-white pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-black uppercase text-neutral-500 hover:text-black dark:hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <span className="text-neutral-400">/</span>
            <span className="text-xs font-black uppercase bg-[#ffe600] text-black px-2 py-0.5 border border-black">
              Writing Practice
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1 text-black dark:text-white">
            Writing Topics, Tasks &amp; Examples
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Manage writing themes, prompts/tasks, sample letters, and useful German phrases.
          </p>
        </div>

        <button
          onClick={() => {
            resetTopicForm();
            setTopicOrder(filteredTopics.length + 1);
            setShowTopicForm(true);
          }}
          className="flex items-center gap-2 bg-[#ffe600] text-black px-4 py-2 border-2 border-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Topic
        </button>
      </div>

      {/* Notification Banner */}
      {statusMsg && (
        <div
          className={`p-4 border-2 border-black flex items-center justify-between text-xs sm:text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
            statusMsg.type === "success"
              ? "bg-green-100 dark:bg-green-950 text-green-900 dark:text-green-100"
              : "bg-red-100 dark:bg-red-950 text-red-900 dark:text-red-100"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Level Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <span className="text-xs font-black uppercase text-neutral-500 mr-2 shrink-0">Level:</span>
        {LEVELS.map((lvl) => {
          const count = topics.filter((t) => t.level === lvl).length;
          const isSelected = selectedLevel === lvl;
          return (
            <button
              key={lvl}
              onClick={() => {
                setSelectedLevel(lvl);
                if (activeTopic && activeTopic.level !== lvl) {
                  setActiveTopic(null);
                }
              }}
              className={`px-4 py-2 text-xs font-black uppercase border transition-all flex items-center gap-2 shrink-0 ${
                isSelected
                  ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_#ffe600]"
                  : "bg-white dark:bg-[#141414] text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:border-black"
              }`}
            >
              <span>{lvl}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 border ${
                  isSelected
                    ? "bg-[#ffe600] text-black border-black"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Topic Add/Edit Form */}
      {showTopicForm && (
        <div className="border-2 border-black dark:border-white bg-[#fffdf0] dark:bg-[#181816] p-5 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-black/20 dark:border-neutral-700">
            <h3 className="text-base sm:text-lg font-black uppercase text-black dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#ffe600]" />
              {editingTopicId ? "Edit Writing Topic" : `Add New ${selectedLevel} Writing Topic`}
            </h3>
            <button
              type="button"
              onClick={resetTopicForm}
              className="p-1 border border-black dark:border-white text-xs font-black hover:bg-neutral-200 dark:hover:bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveTopic} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                  Topic Title (e.g. ✉️ Letter to a Friend / Brief an einen Freund) *
                </label>
                <input
                  type="text"
                  required
                  value={topicTitle}
                  onChange={(e) => {
                    setTopicTitle(e.target.value);
                    if (!editingTopicId && !topicSlug) {
                      setTopicSlug(generateSlug(e.target.value));
                    }
                  }}
                  placeholder="✉️ Letter to a Friend"
                  className="w-full p-2.5 text-sm border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ffe600]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                  Order Index (#)
                </label>
                <input
                  type="number"
                  min="1"
                  value={topicOrder}
                  onChange={(e) => setTopicOrder(Number(e.target.value))}
                  className="w-full p-2.5 text-sm border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ffe600]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  value={topicSlug}
                  onChange={(e) => setTopicSlug(generateSlug(e.target.value))}
                  placeholder="letter-to-a-friend"
                  className="w-full p-2.5 text-sm border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ffe600]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                  Short Description / Topic Instructions
                </label>
                <input
                  type="text"
                  value={topicDesc}
                  onChange={(e) => setTopicDesc(e.target.value)}
                  placeholder="Learn how to write an informal email or letter to a friend in German."
                  className="w-full p-2.5 text-sm border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ffe600]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetTopicForm}
                className="px-4 py-2 text-xs font-black uppercase border border-neutral-400 hover:border-black"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-black uppercase bg-[#ffe600] text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5"
              >
                {editingTopicId ? "Update Topic" : "Save Topic"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Topic List (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b-2 border-black dark:border-neutral-800">
            <h2 className="text-base font-black uppercase tracking-tight text-black dark:text-white">
              {selectedLevel} Topics ({filteredTopics.length})
            </h2>
            <span className="text-[11px] font-bold text-neutral-500">
              Click topic to manage sections
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center border border-dashed border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-500">
              Loading topics...
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#141414] space-y-3">
              <p className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                No Writing topics for {selectedLevel} yet.
              </p>
              <button
                onClick={() => {
                  resetTopicForm();
                  setShowTopicForm(true);
                }}
                className="text-xs font-black uppercase px-3 py-1.5 bg-[#ffe600] text-black border border-black"
              >
                + Create First Topic
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTopics.map((topic, index) => {
                const isActive = activeTopic?.id === topic.id;
                const secCount = (topic.sections || []).length;

                return (
                  <div
                    key={topic.id}
                    onClick={() => handleSelectTopic(topic)}
                    className={`border-2 cursor-pointer p-4 transition-all select-none ${
                      isActive
                        ? "border-black dark:border-white bg-[#fffdf0] dark:bg-[#1c1c1a] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_#ffe600]"
                        : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#141414] hover:border-black dark:hover:border-neutral-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 shrink-0 flex items-center justify-center bg-[#ffe600] border border-black font-black text-xs text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                          #{topic.order_index ?? index + 1}
                        </span>
                        <div>
                          <h3 className="text-sm font-black text-black dark:text-white leading-tight">
                            {topic.title}
                          </h3>
                          {topic.description && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5 font-medium">
                              {topic.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] font-black uppercase px-1.5 py-0.2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                              <FileEdit className="w-3 h-3" />
                              {secCount} {secCount === 1 ? "section" : "sections"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Move Up/Down & Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveTopic(topic, "up")}
                          className="p-1 border border-neutral-300 dark:border-neutral-700 hover:border-black disabled:opacity-30"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === filteredTopics.length - 1}
                          onClick={() => handleMoveTopic(topic, "down")}
                          className="p-1 border border-neutral-300 dark:border-neutral-700 hover:border-black disabled:opacity-30"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditTopic(topic)}
                          className="p-1 border border-neutral-300 dark:border-neutral-700 hover:border-black text-blue-600 dark:text-blue-400"
                          title="Edit Topic Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTopic(topic)}
                          className="p-1 border border-neutral-300 dark:border-neutral-700 hover:border-red-600 text-red-600"
                          title="Delete Topic"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Topic Content Workspace (7 Cols) */}
        <div className="lg:col-span-7">
          {activeTopic ? (
            <div className="border-2 border-black dark:border-white bg-white dark:bg-[#141414] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 sm:p-6 space-y-6">
              {/* Workspace Header */}
              <div className="border-b-2 border-black dark:border-neutral-800 pb-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-[#ffe600] text-black border border-black">
                      {activeTopic.level} Topic #{activeTopic.order_index}
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">
                      /{activeTopic.slug}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTopic(null)}
                    className="text-xs text-neutral-500 hover:text-black dark:hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <h2 className="text-xl font-black text-black dark:text-white uppercase tracking-tight">
                  {activeTopic.title}
                </h2>
                {activeTopic.description && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 font-medium">
                    {activeTopic.description}
                  </p>
                )}
              </div>

              {/* Sections Section */}
              <div className="space-y-6">
                {/* Form to Add or Edit Section */}
                <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#181816] p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-[#ffe600]" />
                      {editingSectionId ? "Edit Writing Section" : "Add Modular Writing Section"}
                    </h3>
                    {editingSectionId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSectionId(null);
                          setSecTitle("");
                          setSecType("task");
                          setSecContent("");
                          setSecMalayalam("");
                        }}
                        className="text-[11px] font-bold text-neutral-500 hover:text-black underline"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSaveSection} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                          Section Type *
                        </label>
                        <select
                          value={secType}
                          onChange={(e) => setSecType(e.target.value as WritingSection["section_type"])}
                          className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none"
                        >
                          {SECTION_TYPES.map((st) => (
                            <option key={st.value} value={st.value}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                          Section Title (Optional)
                        </label>
                        <input
                          type="text"
                          value={secTitle}
                          onChange={(e) => setSecTitle(e.target.value)}
                          placeholder="e.g. Musterbrief / Sample Letter"
                          className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                          Order (#)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={secOrder}
                          onChange={(e) => setSecOrder(Number(e.target.value))}
                          className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                        Content Area (Task, Sample Letter, Phrases, or Instructions) *
                      </label>
                      <textarea
                        required
                        rows={8}
                        value={secContent}
                        onChange={(e) => setSecContent(e.target.value)}
                        placeholder={`Lieber Stefan,\n\nwie geht es dir? Ich hoffe, es geht dir gut!\n\nIch schreibe dir aus Berlin...`}
                        className="w-full p-3 text-xs sm:text-sm font-medium leading-relaxed border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ffe600]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                        Malayalam Notes / Trilingual Instructions (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={secMalayalam}
                        onChange={(e) => setSecMalayalam(e.target.value)}
                        placeholder="കത്തെഴുതുമ്പോൾ ശ്രദ്ധിക്കേണ്ട പ്രധാന കാര്യങ്ങൾ..."
                        className="w-full p-2 text-xs font-malayalam border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-black uppercase bg-[#ffe600] text-black border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5"
                      >
                        {editingSectionId ? "Update Section" : "+ Save Writing Section"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* List of Existing Sections */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-neutral-200 dark:border-neutral-800">
                    <span className="text-xs font-black uppercase text-black dark:text-white">
                      Saved Writing Sections ({sections.length})
                    </span>
                    <span className="text-[11px] text-neutral-500 font-bold">
                      Independently editable &amp; deletable
                    </span>
                  </div>

                  {sectionsLoading ? (
                    <div className="p-4 text-center text-xs text-neutral-500">
                      Loading sections...
                    </div>
                  ) : sections.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-neutral-300 dark:border-neutral-700 text-xs text-neutral-500 font-bold">
                      No writing sections added yet. Add a Task, Sample Letter, or Phrases above!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sections.map((s, i) => (
                        <div
                          key={s.id}
                          className="border border-neutral-300 dark:border-neutral-700 bg-neutral-50/70 dark:bg-[#181816] p-4 space-y-2 hover:border-black"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.2 bg-black text-white text-[10px] font-mono">
                                #{s.order_index ?? i + 1}
                              </span>
                              <span className="px-2 py-0.5 bg-[#ffe600] text-black border border-black text-[10px] font-black uppercase">
                                {s.section_type || "general"}
                              </span>
                              <h4 className="text-xs font-black text-black dark:text-white uppercase">
                                {s.title || `Section #${i + 1}`}
                              </h4>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditSection(s)}
                                className="p-1 border border-neutral-300 dark:border-neutral-700 hover:border-black text-blue-600 text-[11px] font-bold px-2 flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSection(s.id)}
                                className="p-1 border border-neutral-300 dark:border-neutral-700 hover:border-red-600 text-red-600 text-[11px] font-bold px-2 flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            </div>
                          </div>

                          {/* Content Preview */}
                          <div className="bg-white dark:bg-[#121212] p-3 border border-neutral-200 dark:border-neutral-800 text-xs font-medium whitespace-pre-wrap text-neutral-800 dark:text-neutral-200 leading-relaxed max-h-48 overflow-y-auto">
                            {s.content}
                          </div>

                          {s.explanation_malayalam && (
                            <p className="text-[11px] text-amber-900 dark:text-amber-300 font-malayalam border-l-2 border-[#facc15] pl-2">
                              {s.explanation_malayalam}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 p-12 text-center bg-neutral-50 dark:bg-[#141414] space-y-2">
              <FileEdit className="w-8 h-8 text-neutral-400 mx-auto" />
              <h3 className="text-sm font-black uppercase text-neutral-700 dark:text-neutral-300">
                No Topic Selected
              </h3>
              <p className="text-xs text-neutral-500">
                Select any writing topic from the left to view, paste, and manage its writing tasks and sample letters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
