"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ReadingTopic, ReadingText, ReadingQuestion, Level } from "@/types";
import {
  Plus,
  Trash2,
  Edit3,
  ArrowLeft,
  Check,
  AlertCircle,
  BookOpen,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Layers,
  X,
} from "lucide-react";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2"];

export default function AdminReadingPage() {
  const [topics, setTopics] = useState<ReadingTopic[]>([]);
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
  const [activeTopic, setActiveTopic] = useState<ReadingTopic | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"texts" | "questions">("texts");

  // Reading Texts state
  const [texts, setTexts] = useState<ReadingText[]>([]);
  const [textsLoading, setTextsLoading] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textTitle, setTextTitle] = useState("");
  const [textGerman, setTextGerman] = useState("");
  const [textEnglish, setTextEnglish] = useState("");
  const [textMalayalam, setTextMalayalam] = useState("");
  const [textOrder, setTextOrder] = useState<number>(1);

  // Questions state
  const [questions, setQuestions] = useState<ReadingQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [qGerman, setQGerman] = useState("");
  const [qEnglish, setQEnglish] = useState("");
  const [qMalayalam, setQMalayalam] = useState("");
  const [qOptions, setQOptions] = useState<string[]>(["", "", "", ""]);
  const [qCorrectIndex, setQCorrectIndex] = useState<number>(0);
  const [qExplanation, setQExplanation] = useState("");
  const [qOrder, setQOrder] = useState<number>(1);

  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadTopics = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reading/topics");
      const data = await res.json();
      if (data.items) {
        setTopics(data.items.sort((a: ReadingTopic, b: ReadingTopic) => (a.order_index ?? 1) - (b.order_index ?? 1)));
      }
    } catch {
      console.error("Failed to load reading topics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const loadTopicContent = useCallback(async (topicId: string) => {
    setTextsLoading(true);
    setQuestionsLoading(true);
    try {
      const [tRes, qRes] = await Promise.all([
        fetch(`/api/admin/reading/texts?topic_id=${topicId}`).then((r) => r.json()),
        fetch(`/api/admin/reading/questions?topic_id=${topicId}`).then((r) => r.json()),
      ]);
      setTexts((tRes.items || []).sort((a: ReadingText, b: ReadingText) => (a.order_index ?? 1) - (b.order_index ?? 1)));
      setQuestions((qRes.items || []).sort((a: ReadingQuestion, b: ReadingQuestion) => (a.order_index ?? 1) - (b.order_index ?? 1)));
    } catch {
      setStatusMsg({ type: "error", text: "Failed to load topic texts and questions." });
    } finally {
      setTextsLoading(false);
      setQuestionsLoading(false);
    }
  }, []);

  const handleSelectTopic = (topic: ReadingTopic) => {
    setActiveTopic(topic);
    setEditingTextId(null);
    setEditingQId(null);
    setTextTitle("");
    setTextGerman("");
    setTextEnglish("");
    setTextMalayalam("");
    setQGerman("");
    setQEnglish("");
    setQMalayalam("");
    setQOptions(["", "", "", ""]);
    setQCorrectIndex(0);
    setQExplanation("");
    loadTopicContent(topic.id);
  };

  const resetTopicForm = () => {
    setTopicTitle("");
    setTopicSlug("");
    setTopicDesc("");
    setTopicOrder(topics.filter((t) => t.level === selectedLevel).length + 1);
    setEditingTopicId(null);
    setShowTopicForm(false);
  };

  const handleEditTopic = (topic: ReadingTopic) => {
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
      const res = await fetch("/api/admin/reading/topics", {
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

  const handleDeleteTopic = async (topic: ReadingTopic) => {
    if (!confirm(`Are you sure you want to delete "${topic.title}" and all its texts & questions?`)) return;
    try {
      const res = await fetch(`/api/admin/reading/topics?id=${topic.id}`, { method: "DELETE" });
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

  const handleMoveTopic = async (topic: ReadingTopic, direction: "up" | "down") => {
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
        fetch("/api/admin/reading/topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...topic, order_index: newCurrentOrder }),
        }),
        fetch("/api/admin/reading/topics", {
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

  // ----------------- READING TEXTS MANAGEMENT -----------------
  const handleSaveText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTopic) return;
    setStatusMsg(null);

    const payload = {
      id: editingTextId || undefined,
      topic_id: activeTopic.id,
      title: textTitle.trim(),
      content_german: textGerman.trim(),
      content_english: textEnglish.trim(),
      content_malayalam: textMalayalam.trim(),
      order_index: Number(textOrder),
    };

    try {
      const res = await fetch("/api/admin/reading/texts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save reading text");

      setStatusMsg({ type: "success", text: "Reading text saved successfully!" });
      setEditingTextId(null);
      setTextTitle("");
      setTextGerman("");
      setTextEnglish("");
      setTextMalayalam("");
      setTextOrder(texts.length + 2);
      loadTopicContent(activeTopic.id);
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  const handleEditText = (t: ReadingText) => {
    setEditingTextId(t.id);
    setTextTitle(t.title || "");
    setTextGerman(t.content_german);
    setTextEnglish(t.content_english || "");
    setTextMalayalam(t.content_malayalam || "");
    setTextOrder(t.order_index ?? 1);
  };

  const handleDeleteText = async (id: string) => {
    if (!confirm("Are you sure you want to delete this reading text?")) return;
    try {
      const res = await fetch(`/api/admin/reading/texts?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete reading text");
      setStatusMsg({ type: "success", text: "Reading text deleted." });
      if (activeTopic) loadTopicContent(activeTopic.id);
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  // ----------------- QUESTIONS MANAGEMENT -----------------
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTopic) return;
    setStatusMsg(null);

    const cleanedOptions = qOptions.map((o) => o.trim()).filter(Boolean);
    if (cleanedOptions.length < 2) {
      setStatusMsg({ type: "error", text: "Please enter at least 2 non-empty answer options." });
      return;
    }

    const payload = {
      id: editingQId || undefined,
      topic_id: activeTopic.id,
      question: qGerman.trim(),
      question_english: qEnglish.trim(),
      question_malayalam: qMalayalam.trim(),
      options: cleanedOptions,
      correct_option_index: Number(qCorrectIndex),
      explanation: qExplanation.trim(),
      order_index: Number(qOrder),
    };

    try {
      const res = await fetch("/api/admin/reading/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save question");

      setStatusMsg({ type: "success", text: "Question saved successfully!" });
      setEditingQId(null);
      setQGerman("");
      setQEnglish("");
      setQMalayalam("");
      setQOptions(["", "", "", ""]);
      setQCorrectIndex(0);
      setQExplanation("");
      setQOrder(questions.length + 2);
      loadTopicContent(activeTopic.id);
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  const handleEditQuestion = (q: ReadingQuestion) => {
    setEditingQId(q.id);
    setQGerman(q.question);
    setQEnglish(q.question_english || "");
    setQMalayalam(q.question_malayalam || "");
    const opts = [...q.options];
    while (opts.length < 4) opts.push("");
    setQOptions(opts);
    setQCorrectIndex(q.correct_option_index ?? 0);
    setQExplanation(q.explanation || "");
    setQOrder(q.order_index ?? 1);
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      const res = await fetch(`/api/admin/reading/questions?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete question");
      setStatusMsg({ type: "success", text: "Question deleted." });
      if (activeTopic) loadTopicContent(activeTopic.id);
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
              Reading Practice
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1 text-black dark:text-white">
            Reading Topics, Texts &amp; Questions
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            Manage German reading passages, comprehension questions with 4 answer options, and instant feedback.
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
              {editingTopicId ? "Edit Reading Topic" : `Add New ${selectedLevel} Reading Topic`}
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
                  Topic Title (e.g. 🏠 My Family / Meine Familie) *
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
                  placeholder="🏠 My Family"
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
                  placeholder="my-family"
                  className="w-full p-2.5 text-sm border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ffe600]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                  Short Description
                </label>
                <input
                  type="text"
                  value={topicDesc}
                  onChange={(e) => setTopicDesc(e.target.value)}
                  placeholder="Short reading texts describing family members and their daily routine."
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
              Click topic to manage content
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center border border-dashed border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-500">
              Loading topics...
            </div>
          ) : filteredTopics.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#141414] space-y-3">
              <p className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                No Reading topics for {selectedLevel} yet.
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
                const textCount = (topic.texts || []).length;
                const qCount = (topic.questions || []).length;

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
                              <BookOpen className="w-3 h-3" />
                              {textCount} {textCount === 1 ? "text" : "texts"}
                            </span>
                            <span className="text-[10px] font-black uppercase px-1.5 py-0.2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                              <HelpCircle className="w-3 h-3" />
                              {qCount} {qCount === 1 ? "question" : "questions"}
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

              {/* Sub-tabs: 📖 Reading Texts vs ❓ Comprehension Questions */}
              <div className="flex items-center gap-2 border-b-2 border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setActiveSubTab("texts")}
                  className={`px-4 py-2 text-xs font-black uppercase transition-all flex items-center gap-2 border-b-2 -mb-[2px] ${
                    activeSubTab === "texts"
                      ? "border-black dark:border-white text-black dark:text-white bg-neutral-100 dark:bg-neutral-800"
                      : "border-transparent text-neutral-500 hover:text-black dark:hover:text-white"
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-[#ffe600]" />
                  <span>Reading Texts ({texts.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab("questions")}
                  className={`px-4 py-2 text-xs font-black uppercase transition-all flex items-center gap-2 border-b-2 -mb-[2px] ${
                    activeSubTab === "questions"
                      ? "border-black dark:border-white text-black dark:text-white bg-neutral-100 dark:bg-neutral-800"
                      : "border-transparent text-neutral-500 hover:text-black dark:hover:text-white"
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-[#ffe600]" />
                  <span>4-Option Questions ({questions.length})</span>
                </button>
              </div>

              {/* TAB 1: READING TEXTS */}
              {activeSubTab === "texts" && (
                <div className="space-y-6">
                  {/* Form to Add / Edit Text */}
                  <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#181816] p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-[#ffe600]" />
                        {editingTextId ? "Edit Reading Text" : "Add Short German Paragraph / Text"}
                      </h3>
                      {editingTextId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTextId(null);
                            setTextTitle("");
                            setTextGerman("");
                            setTextEnglish("");
                            setTextMalayalam("");
                          }}
                          className="text-[11px] font-bold text-neutral-500 hover:text-black underline"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleSaveText} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                            Passage Title (Optional)
                          </label>
                          <input
                            type="text"
                            value={textTitle}
                            onChange={(e) => setTextTitle(e.target.value)}
                            placeholder="e.g. Lesetext 1: Meine Familie"
                            className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                            Order (#)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={textOrder}
                            onChange={(e) => setTextOrder(Number(e.target.value))}
                            className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                          German Text (Short Paragraph) *
                        </label>
                        <textarea
                          required
                          rows={5}
                          value={textGerman}
                          onChange={(e) => setTextGerman(e.target.value)}
                          placeholder="Hallo, ich bin Lukas. Ich bin 25 Jahre alt und wohne in Berlin..."
                          className="w-full p-3 text-xs sm:text-sm font-medium leading-relaxed border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ffe600]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                            English Translation (Optional)
                          </label>
                          <textarea
                            rows={3}
                            value={textEnglish}
                            onChange={(e) => setTextEnglish(e.target.value)}
                            placeholder="Hello, I am Lukas. I am 25 years old..."
                            className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                            Malayalam Translation (Optional)
                          </label>
                          <textarea
                            rows={3}
                            value={textMalayalam}
                            onChange={(e) => setTextMalayalam(e.target.value)}
                            placeholder="ഹലോ, ഞാൻ ലൂക്കാസ് ആണ്..."
                            className="w-full p-2 text-xs font-malayalam border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          className="px-4 py-2 text-xs font-black uppercase bg-[#ffe600] text-black border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5"
                        >
                          {editingTextId ? "Update Text" : "+ Save Reading Text"}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* List of Existing Texts */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-neutral-200 dark:border-neutral-800">
                      <span className="text-xs font-black uppercase text-black dark:text-white">
                        Saved Texts ({texts.length})
                      </span>
                    </div>

                    {textsLoading ? (
                      <div className="p-4 text-center text-xs text-neutral-500">Loading texts...</div>
                    ) : texts.length === 0 ? (
                      <div className="p-6 text-center border border-dashed border-neutral-300 dark:border-neutral-700 text-xs text-neutral-500 font-bold">
                        No reading texts added to this topic yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {texts.map((t, i) => (
                          <div
                            key={t.id}
                            className="border border-neutral-300 dark:border-neutral-700 bg-neutral-50/70 dark:bg-[#181816] p-4 space-y-2 hover:border-black"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.2 bg-black text-white text-[10px] font-mono">
                                  #{t.order_index ?? i + 1}
                                </span>
                                <h4 className="text-xs font-black text-black dark:text-white uppercase">
                                  {t.title || `Reading Text #${i + 1}`}
                                </h4>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEditText(t)}
                                  className="p-1 border border-neutral-300 dark:border-neutral-700 hover:border-black text-blue-600 text-[11px] font-bold px-2 flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3" /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteText(t.id)}
                                  className="p-1 border border-neutral-300 dark:border-neutral-700 hover:border-red-600 text-red-600 text-[11px] font-bold px-2 flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </div>
                            </div>

                            <p className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-relaxed whitespace-pre-wrap">
                              {t.content_german}
                            </p>

                            {(t.content_english || t.content_malayalam) && (
                              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 space-y-1 text-[11px]">
                                {t.content_english && (
                                  <p className="text-neutral-600 dark:text-neutral-400 font-medium">
                                    <strong className="uppercase font-bold text-neutral-500">EN:</strong> {t.content_english}
                                  </p>
                                )}
                                {t.content_malayalam && (
                                  <p className="text-amber-900 dark:text-amber-300 font-malayalam">
                                    <strong className="uppercase font-bold text-amber-700 dark:text-amber-400">മലയാളം:</strong> {t.content_malayalam}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: 4-OPTION COMPREHENSION QUESTIONS */}
              {activeSubTab === "questions" && (
                <div className="space-y-6">
                  {/* Form to Add / Edit Question */}
                  <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#181816] p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                      <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-[#ffe600]" />
                        {editingQId ? "Edit Question" : "Add 4-Option Question"}
                      </h3>
                      {editingQId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQId(null);
                            setQGerman("");
                            setQEnglish("");
                            setQMalayalam("");
                            setQOptions(["", "", "", ""]);
                            setQCorrectIndex(0);
                            setQExplanation("");
                          }}
                          className="text-[11px] font-bold text-neutral-500 hover:text-black underline"
                        >
                          Cancel Edit
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleSaveQuestion} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                            Question in German *
                          </label>
                          <input
                            type="text"
                            required
                            value={qGerman}
                            onChange={(e) => setQGerman(e.target.value)}
                            placeholder="e.g. Wo wohnt Lukas?"
                            className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                            Order (#)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={qOrder}
                            onChange={(e) => setQOrder(Number(e.target.value))}
                            className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                            Question in English (Optional)
                          </label>
                          <input
                            type="text"
                            value={qEnglish}
                            onChange={(e) => setQEnglish(e.target.value)}
                            placeholder="Where does Lukas live?"
                            className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                            Question in Malayalam (Optional)
                          </label>
                          <input
                            type="text"
                            value={qMalayalam}
                            onChange={(e) => setQMalayalam(e.target.value)}
                            placeholder="ലൂക്കാസ് എവിടെയാണ് താമസിക്കുന്നത്?"
                            className="w-full p-2 text-xs font-malayalam border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* 4 Answer Options */}
                      <div className="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                        <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block">
                          4 Answer Options (Select the radio button for the Correct Answer) *
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {qOptions.map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className={`p-2.5 border flex items-center gap-2.5 ${
                                qCorrectIndex === optIdx
                                  ? "border-green-600 bg-green-50 dark:bg-green-950/30"
                                  : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212]"
                              }`}
                            >
                              <input
                                type="radio"
                                name="correctOption"
                                checked={qCorrectIndex === optIdx}
                                onChange={() => setQCorrectIndex(optIdx)}
                                className="accent-green-600 cursor-pointer"
                                title="Mark as correct answer"
                              />
                              <span className="text-xs font-bold text-neutral-500 w-5">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              <input
                                type="text"
                                required={optIdx < 2}
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...qOptions];
                                  updated[optIdx] = e.target.value;
                                  setQOptions(updated);
                                }}
                                placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                className="w-full p-1.5 text-xs border border-neutral-200 dark:border-neutral-700 bg-transparent text-black dark:text-white focus:outline-none"
                              />
                              {qCorrectIndex === optIdx && (
                                <span className="text-[10px] font-black uppercase text-green-700 dark:text-green-400 shrink-0">
                                  ✓ Correct
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1 pt-1">
                        <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400">
                          Explanation shown after answer (Optional)
                        </label>
                        <input
                          type="text"
                          value={qExplanation}
                          onChange={(e) => setQExplanation(e.target.value)}
                          placeholder="Lukas wohnt laut Text in Berlin."
                          className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          className="px-4 py-2 text-xs font-black uppercase bg-[#ffe600] text-black border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5"
                        >
                          {editingQId ? "Update Question" : "+ Save Question"}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* List of Existing Questions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-neutral-200 dark:border-neutral-800">
                      <span className="text-xs font-black uppercase text-black dark:text-white">
                        Saved Questions ({questions.length})
                      </span>
                    </div>

                    {questionsLoading ? (
                      <div className="p-4 text-center text-xs text-neutral-500">Loading questions...</div>
                    ) : questions.length === 0 ? (
                      <div className="p-6 text-center border border-dashed border-neutral-300 dark:border-neutral-700 text-xs text-neutral-500 font-bold">
                        No questions added to this reading topic yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {questions.map((q, i) => (
                          <div
                            key={q.id}
                            className="border border-neutral-300 dark:border-neutral-700 bg-neutral-50/70 dark:bg-[#181816] p-4 space-y-3 hover:border-black"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.2 bg-black text-white text-[10px] font-mono">
                                  Q{q.order_index ?? i + 1}
                                </span>
                                <h4 className="text-xs sm:text-sm font-black text-black dark:text-white">
                                  {q.question}
                                </h4>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleEditQuestion(q)}
                                  className="p-1 border border-neutral-300 dark:border-neutral-700 hover:border-black text-blue-600 text-[11px] font-bold px-2 flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3" /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="p-1 border border-neutral-300 dark:border-neutral-700 hover:border-red-600 text-red-600 text-[11px] font-bold px-2 flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </div>
                            </div>

                            {/* Options Preview */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {q.options.map((opt, optIdx) => (
                                <div
                                  key={optIdx}
                                  className={`p-2 border flex items-center gap-2 ${
                                    optIdx === q.correct_option_index
                                      ? "border-green-600 bg-green-50 dark:bg-green-950/40 font-bold text-green-900 dark:text-green-200"
                                      : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121212] text-neutral-700 dark:text-neutral-300"
                                  }`}
                                >
                                  <span className="font-mono text-[10px]">{String.fromCharCode(65 + optIdx)}.</span>
                                  <span>{opt}</span>
                                  {optIdx === q.correct_option_index && (
                                    <span className="ml-auto text-[10px] font-black uppercase text-green-600">✓ Correct</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 p-12 text-center bg-neutral-50 dark:bg-[#141414] space-y-2">
              <BookOpen className="w-8 h-8 text-neutral-400 mx-auto" />
              <h3 className="text-sm font-black uppercase text-neutral-700 dark:text-neutral-300">
                No Topic Selected
              </h3>
              <p className="text-xs text-neutral-500">
                Select any reading topic from the left to manage its German paragraphs and 4-option quiz questions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
