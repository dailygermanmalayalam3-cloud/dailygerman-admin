"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MockExam, MockExamQuestion, Level } from "@/types";
import {
  Plus,
  Trash2,
  Edit3,
  ArrowLeft,
  Check,
  AlertCircle,
  HelpCircle,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2"];

export default function AdminMockExamsPage() {
  const [exams, setExams] = useState<MockExam[]>([]);
  const [questions, setQuestions] = useState<MockExamQuestion[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"exams" | "questions">("exams");

  // Exam Form State
  const [showExamForm, setShowExamForm] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examFormData, setExamFormData] = useState<{
    title: string;
    slug: string;
    level: Level;
    module: "lesen" | "hoeren" | "schreiben" | "sprechen";
    description: string;
    duration_minutes: number;
    passing_percentage: number;
    total_questions: number;
    is_published: boolean;
  }>({
    title: "",
    slug: "",
    level: "A1",
    module: "lesen",
    description: "",
    duration_minutes: 25,
    passing_percentage: 60,
    total_questions: 15,
    is_published: true,
  });

  // Question Form State
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionFormData, setQuestionFormData] = useState({
    exam_id: "",
    teil_number: 1,
    question_index: 1,
    passage_text: "",
    image_url: "",
    question_text: "",
    options_raw: "richtig: Richtig\nfalsch: Falsch",
    correct_option_id: "richtig",
    explanation_malayalam: "",
    explanation_english: "",
    points: 1,
  });

  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/mock-list");
      const data = await res.json();
      const loadedExams = data.exams || [];
      const loadedQuestions = data.questions || [];
      setExams(loadedExams);
      setQuestions(loadedQuestions);
      if (loadedExams.length > 0 && !selectedExamId) {
        setSelectedExamId(loadedExams[0].id);
      }
    } catch {
      setStatusMsg({ type: "error", text: "Failed to load mock exams data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Exam Form Handlers
  const resetExamForm = () => {
    setExamFormData({
      title: "",
      slug: "",
      level: "A1",
      module: "lesen",
      description: "",
      duration_minutes: 25,
      passing_percentage: 60,
      total_questions: 15,
      is_published: true,
    });
    setEditingExamId(null);
    setShowExamForm(false);
  };

  const handleEditExam = (exam: MockExam) => {
    setExamFormData({
      title: exam.title,
      slug: exam.slug,
      level: exam.level,
      module: exam.module,
      description: exam.description || "",
      duration_minutes: exam.duration_minutes,
      passing_percentage: exam.passing_percentage,
      total_questions: exam.total_questions,
      is_published: exam.is_published,
    });
    setEditingExamId(exam.id);
    setShowExamForm(true);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    try {
      const payload = {
        ...(editingExamId ? { id: editingExamId } : {}),
        ...examFormData,
      };
      const res = await fetch("/api/admin/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save exam");
      setStatusMsg({ type: "success", text: "Exam saved successfully." });
      resetExamForm();
      fetchData();
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  const handleDeleteExam = async (id: string, slug: string) => {
    if (!confirm("Are you sure you want to delete this mock exam and its questions?")) return;
    try {
      const res = await fetch(`/api/admin/mock?id=${id}&slug=${slug}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete exam");
      setStatusMsg({ type: "success", text: "Mock exam deleted." });
      fetchData();
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  // Question Form Handlers
  const resetQuestionForm = () => {
    setQuestionFormData({
      exam_id: selectedExamId,
      teil_number: 1,
      question_index: 1,
      passage_text: "",
      image_url: "",
      question_text: "",
      options_raw: "richtig: Richtig\nfalsch: Falsch",
      correct_option_id: "richtig",
      explanation_malayalam: "",
      explanation_english: "",
      points: 1,
    });
    setEditingQuestionId(null);
    setShowQuestionForm(false);
  };

  const handleEditQuestion = (q: MockExamQuestion) => {
    const rawOptions = (q.options || [])
      .map((opt) => `${opt.id}: ${opt.text}`)
      .join("\n");

    setQuestionFormData({
      exam_id: q.exam_id,
      teil_number: q.teil_number || 1,
      question_index: q.question_index || 1,
      passage_text: q.passage_text || "",
      image_url: q.image_url || "",
      question_text: q.question_text || "",
      options_raw: rawOptions,
      correct_option_id: q.correct_option_id || "",
      explanation_malayalam: q.explanation_malayalam || "",
      explanation_english: q.explanation_english || "",
      points: q.points || 1,
    });
    setEditingQuestionId(q.id);
    setShowQuestionForm(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    try {
      const parsedOptions = questionFormData.options_raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split(":");
          if (parts.length >= 2) {
            return { id: parts[0].trim(), text: parts.slice(1).join(":").trim() };
          }
          return { id: line.toLowerCase().replace(/\s+/g, "_"), text: line };
        });

      const targetExam = exams.find((ex) => ex.id === questionFormData.exam_id);

      const payload = {
        ...(editingQuestionId ? { id: editingQuestionId } : {}),
        exam_id: questionFormData.exam_id,
        level: targetExam?.level || "A1",
        teil_number: Number(questionFormData.teil_number),
        question_index: Number(questionFormData.question_index),
        passage_text: questionFormData.passage_text || null,
        image_url: questionFormData.image_url || null,
        question_text: questionFormData.question_text,
        options: parsedOptions,
        correct_option_id: questionFormData.correct_option_id.trim(),
        explanation_malayalam: questionFormData.explanation_malayalam || null,
        explanation_english: questionFormData.explanation_english || null,
        points: Number(questionFormData.points),
      };

      const res = await fetch("/api/admin/mock/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save question");
      setStatusMsg({ type: "success", text: "Question saved successfully." });
      resetQuestionForm();
      fetchData();
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      const res = await fetch(`/api/admin/mock/questions?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete question");
      setStatusMsg({ type: "success", text: "Question deleted." });
      fetchData();
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  const filteredQuestions = selectedExamId
    ? questions.filter((q) => q.exam_id === selectedExamId)
    : questions;

  const currentSelectedExam = exams.find((e) => e.id === selectedExamId);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50">
                Goethe Simulator
              </span>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Exam Management
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1">
              Goethe Mock Exams & Question Bank
            </h1>
          </div>
        </div>

        {/* Global Action Pill */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeTab === "exams") {
                resetExamForm();
                setShowExamForm(true);
              } else {
                resetQuestionForm();
                setShowQuestionForm(true);
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === "exams" ? "New Mock Exam" : "Add Question"}</span>
          </button>
        </div>
      </div>

      {/* Status Alert */}
      {statusMsg && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            statusMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900/50"
              : "bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900/50"
          }`}
        >
          {statusMsg.type === "success" ? (
            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("exams")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "exams"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Mock Exam Sets ({exams.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("questions")}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === "questions"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Question Bank ({questions.length})</span>
        </button>
      </div>

      {/* TAB 1: EXAM SETS */}
      {activeTab === "exams" && (
        <div className="space-y-6">
          {/* Exam Form Modal / Card */}
          {showExamForm && (
            <form
              onSubmit={handleSaveExam}
              className="p-6 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-4"
            >
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingExamId ? "Edit Mock Exam" : "Create New Mock Exam"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Level
                  </label>
                  <select
                    value={examFormData.level}
                    onChange={(e) => setExamFormData({ ...examFormData, level: e.target.value as Level })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Exam Title
                  </label>
                  <input
                    type="text"
                    required
                    value={examFormData.title}
                    onChange={(e) => setExamFormData({ ...examFormData, title: e.target.value })}
                    placeholder="e.g. Goethe-Zertifikat A1 Lesen Modellsatz"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Slug (URL Key)
                  </label>
                  <input
                    type="text"
                    required
                    value={examFormData.slug}
                    onChange={(e) => setExamFormData({ ...examFormData, slug: e.target.value })}
                    placeholder="goethe-a1-lesen-modellsatz-01"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={examFormData.duration_minutes}
                    onChange={(e) => setExamFormData({ ...examFormData, duration_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Passing %
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={examFormData.passing_percentage}
                    onChange={(e) => setExamFormData({ ...examFormData, passing_percentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Total Questions
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={examFormData.total_questions}
                    onChange={(e) => setExamFormData({ ...examFormData, total_questions: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={examFormData.description}
                  onChange={(e) => setExamFormData({ ...examFormData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer"
                >
                  Save Exam
                </button>
                <button
                  type="button"
                  onClick={resetExamForm}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Exams List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.map((exam) => {
              const qCount = questions.filter((q) => q.exam_id === exam.id).length;
              return (
                <div
                  key={exam.id}
                  className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 text-xs font-extrabold uppercase rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                          {exam.level}
                        </span>
                        <span className="text-xs uppercase font-bold text-slate-400">
                          {exam.module}
                        </span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50">
                        {qCount} Questions in Pool
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                      {exam.title}
                    </h3>
                    <p className="text-xs font-mono text-slate-500 mb-3">
                      /{exam.slug}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                      {exam.description || "No description provided."}
                    </p>
                    <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {exam.duration_minutes} Mins
                      </span>
                      <span>Target: {exam.total_questions} Qs</span>
                      <span>Pass: {exam.passing_percentage}%</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setActiveTab("questions");
                      }}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      View Questions →
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditExam(exam)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title="Edit exam"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteExam(exam.id, exam.slug)}
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                        title="Delete exam"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: QUESTIONS POOL */}
      {activeTab === "questions" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold uppercase text-slate-500">
                Filter by Exam:
              </label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="">All Exams ({questions.length} total questions)</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.level} - {ex.title}
                  </option>
                ))}
              </select>
            </div>
            {currentSelectedExam && (
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                Showing {filteredQuestions.length} questions for {currentSelectedExam.level}
              </span>
            )}
          </div>

          {/* Question Form Modal / Card */}
          {showQuestionForm && (
            <form
              onSubmit={handleSaveQuestion}
              className="p-6 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-4"
            >
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingQuestionId ? "Edit Question" : "Add New Authentic Goethe Question"}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Target Exam
                  </label>
                  <select
                    required
                    value={questionFormData.exam_id}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, exam_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    <option value="">Select Exam</option>
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.level} - {ex.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Teil Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    required
                    value={questionFormData.teil_number}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, teil_number: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Original Question Index
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={questionFormData.question_index}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, question_index: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Passage / Notice Text (German Text Prompt)
                </label>
                <textarea
                  rows={3}
                  value={questionFormData.passage_text}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, passage_text: e.target.value })}
                  placeholder="German email, advertisement, notice board sign, or reading article..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Question Text / Statement
                </label>
                <input
                  type="text"
                  required
                  value={questionFormData.question_text}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, question_text: e.target.value })}
                  placeholder="e.g. Ralf macht eine Party am Samstag."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Options (1 per line, format `id: Label`)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={questionFormData.options_raw}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, options_raw: e.target.value })}
                    placeholder="richtig: Richtig&#10;falsch: Falsch"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Correct Option ID (Exact Match)
                  </label>
                  <input
                    type="text"
                    required
                    value={questionFormData.correct_option_id}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, correct_option_id: e.target.value })}
                    placeholder="richtig or a"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Malayalam Diagnostic Explanation
                  </label>
                  <textarea
                    rows={2}
                    value={questionFormData.explanation_malayalam}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, explanation_malayalam: e.target.value })}
                    placeholder="ഉത്തരം ശരിയാകാനുള്ള കാരണം മലയാളത്തിൽ വ്യക്തമാക്കുക..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    English Explanation
                  </label>
                  <textarea
                    rows={2}
                    value={questionFormData.explanation_english}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, explanation_english: e.target.value })}
                    placeholder="Explanation in English..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all cursor-pointer"
                >
                  Save Question
                </button>
                <button
                  type="button"
                  onClick={resetQuestionForm}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Questions List */}
          <div className="space-y-4">
            {filteredQuestions.map((q) => {
              const matchingExam = exams.find((e) => e.id === q.exam_id);
              return (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs font-extrabold rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        {matchingExam?.level || "Goethe"} Teil {q.teil_number} • Q{q.question_index}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {matchingExam?.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditQuestion(q)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        title="Edit question"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                        title="Delete question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {q.passage_text && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 whitespace-pre-line font-serif italic">
                      {q.passage_text}
                    </div>
                  )}

                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {q.question_text}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {(q.options || []).map((opt) => {
                      const isCorrect = opt.id === q.correct_option_id;
                      return (
                        <span
                          key={opt.id}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
                            isCorrect
                              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-bold"
                              : "bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {isCorrect && "✓ "}
                          {opt.id}: {opt.text}
                        </span>
                      );
                    })}
                  </div>

                  {q.explanation_malayalam && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">വിശദീകരണം:</span>{" "}
                      {q.explanation_malayalam}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
