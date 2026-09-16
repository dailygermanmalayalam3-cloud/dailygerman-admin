"use client";

import React, { useState, useEffect } from "react";
import {
  MedicalCategory,
  MedicalWord,
  MedicalConversationTopic,
  MedicalConversation,
} from "@/types";
import {
  Stethoscope,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  MessageSquare,
  ArrowRight,
  BookOpen,
  FolderPlus,
  RefreshCw,
} from "lucide-react";
import AudioRecorder from "@/components/AudioRecorder";

export default function AdminMedicalPage() {
  const [activeTab, setActiveTab] = useState<"words" | "conversations">("words");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Data states
  const [categories, setCategories] = useState<MedicalCategory[]>([]);
  const [words, setWords] = useState<MedicalWord[]>([]);
  const [topics, setTopics] = useState<MedicalConversationTopic[]>([]);
  const [conversations, setConversations] = useState<MedicalConversation[]>([]);

  // Selection / Filter states
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");

  // Category Form state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MedicalCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("🩺");
  const [catDescription, setCatDescription] = useState("");
  const [catOrder, setCatOrder] = useState(1);

  // Word Form state
  const [showWordModal, setShowWordModal] = useState(false);
  const [editingWord, setEditingWord] = useState<MedicalWord | null>(null);
  const [wordCatId, setWordCatId] = useState("");
  const [wordGerman, setWordGerman] = useState("");
  const [wordEnglish, setWordEnglish] = useState("");
  const [wordMalayalam, setWordMalayalam] = useState("");
  const [wordArticle, setWordArticle] = useState("");
  const [wordPlural, setWordPlural] = useState("");
  const [wordExGerman, setWordExGerman] = useState("");
  const [wordExEnglish, setWordExEnglish] = useState("");
  const [wordExMalayalam, setWordExMalayalam] = useState("");
  const [wordAudioUrl, setWordAudioUrl] = useState("");
  const [wordSentenceAudioUrl, setWordSentenceAudioUrl] = useState("");
  const [wordOrder, setWordOrder] = useState(1);

  // Topic Form state
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<MedicalConversationTopic | null>(null);
  const [topicTitle, setTopicTitle] = useState("");
  const [topicSlug, setTopicSlug] = useState("");
  const [topicIcon, setTopicIcon] = useState("🏥");
  const [topicDesc, setTopicDesc] = useState("");
  const [topicOrder, setTopicOrder] = useState(1);

  // Conversation Form state
  const [showConvModal, setShowConvModal] = useState(false);
  const [editingConv, setEditingConv] = useState<MedicalConversation | null>(null);
  const [convTopicId, setConvTopicId] = useState("");
  const [convTitle, setConvTitle] = useState("Hospital Dialogue");
  const [convText, setConvText] = useState("");
  const [convMalayalam, setConvMalayalam] = useState("");
  const [convOrder, setConvOrder] = useState(1);

  // Fetch all initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [catRes, wordRes, topRes, convRes] = await Promise.all([
        fetch("/api/admin/medical/categories").then((r) => r.json()),
        fetch("/api/admin/medical/words").then((r) => r.json()),
        fetch("/api/admin/medical/topics").then((r) => r.json()),
        fetch("/api/admin/medical/conversations").then((r) => r.json()),
      ]);

      if (catRes.success) setCategories(catRes.items || []);
      if (wordRes.success) setWords(wordRes.items || []);
      if (topRes.success) setTopics(topRes.items || []);
      if (convRes.success) setConversations(convRes.items || []);

      if (catRes.items && catRes.items.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(catRes.items[0].id);
      }
      if (topRes.items && topRes.items.length > 0 && !selectedTopicId) {
        setSelectedTopicId(topRes.items[0].id);
      }
    } catch (err: unknown) {
      setErrorMsg("Failed to load medical data: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // ---------------- CATEGORY CRUD ----------------
  const openCategoryModal = (cat?: MedicalCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCatName(cat.name);
      setCatIcon(cat.icon || "🩺");
      setCatDescription(cat.description || "");
      setCatOrder(cat.order_index);
    } else {
      setEditingCategory(null);
      setCatName("");
      setCatIcon("🩺");
      setCatDescription("");
      setCatOrder(categories.length + 1);
    }
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/medical/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCategory?.id,
          name: catName,
          icon: catIcon,
          description: catDescription,
          order_index: catOrder,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      notifySuccess(`Category "${catName}" saved.`);
      setShowCategoryModal(false);
      loadData();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}" and all its words?`)) return;
    try {
      const res = await fetch(`/api/admin/medical/categories?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      notifySuccess(`Deleted category "${name}".`);
      loadData();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    }
  };

  // ---------------- WORD CRUD ----------------
  const openWordModal = (word?: MedicalWord) => {
    if (word) {
      setEditingWord(word);
      setWordCatId(word.category_id);
      setWordGerman(word.german);
      setWordEnglish(word.english);
      setWordMalayalam(word.malayalam || "");
      setWordArticle(word.article || "");
      setWordPlural(word.plural || "");
      setWordExGerman(word.example_german || "");
      setWordExEnglish(word.example_english || "");
      setWordExMalayalam(word.example_malayalam || "");
      setWordAudioUrl(word.audio_url || "");
      setWordSentenceAudioUrl(word.sentence_audio_url || "");
      setWordOrder(word.order_index ?? 1);
    } else {
      setEditingWord(null);
      setWordCatId(selectedCategoryId || categories[0]?.id || "");
      setWordGerman("");
      setWordEnglish("");
      setWordMalayalam("");
      setWordArticle("");
      setWordPlural("");
      setWordExGerman("");
      setWordExEnglish("");
      setWordExMalayalam("");
      setWordAudioUrl("");
      setWordSentenceAudioUrl("");
      const currentCatWords = words.filter((w) => w.category_id === (selectedCategoryId || categories[0]?.id));
      setWordOrder(currentCatWords.length + 1);
    }
    setShowWordModal(true);
  };

  const handleSaveWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wordCatId || !wordGerman.trim() || !wordEnglish.trim()) {
      alert("Please enter Category, German word, and English meaning.");
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/medical/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingWord?.id,
          category_id: wordCatId,
          german: wordGerman,
          english: wordEnglish,
          malayalam: wordMalayalam,
          article: wordArticle,
          plural: wordPlural,
          example_german: wordExGerman,
          example_english: wordExEnglish,
          example_malayalam: wordExMalayalam,
          order_index: wordOrder,
          audio_url: wordAudioUrl || undefined,
          sentence_audio_url: wordSentenceAudioUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      notifySuccess(`Saved medical word "${wordGerman}".`);
      setShowWordModal(false);
      loadData();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWord = async (id: string, german: string) => {
    if (!confirm(`Delete word "${german}"?`)) return;
    try {
      const res = await fetch(`/api/admin/medical/words?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      notifySuccess(`Deleted "${german}".`);
      loadData();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    }
  };

  // ---------------- TOPIC CRUD ----------------
  const openTopicModal = (top?: MedicalConversationTopic) => {
    if (top) {
      setEditingTopic(top);
      setTopicTitle(top.title);
      setTopicSlug(top.slug);
      setTopicIcon(top.icon || "🏥");
      setTopicDesc(top.description || "");
      setTopicOrder(top.order_index ?? 1);
    } else {
      setEditingTopic(null);
      setTopicTitle("");
      setTopicSlug("");
      setTopicIcon("🏥");
      setTopicDesc("");
      setTopicOrder(topics.length + 1);
    }
    setShowTopicModal(true);
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim() || !topicSlug.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/medical/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTopic?.id,
          title: topicTitle,
          slug: topicSlug,
          icon: topicIcon,
          description: topicDesc,
          order_index: topicOrder,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      notifySuccess(`Hospital Situation "${topicTitle}" saved.`);
      setShowTopicModal(false);
      loadData();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTopic = async (id: string, title: string) => {
    if (!confirm(`Delete hospital situation "${title}" and all dialogues?`)) return;
    try {
      const res = await fetch(`/api/admin/medical/topics?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      notifySuccess(`Deleted situation "${title}".`);
      if (selectedTopicId === id) {
        setSelectedTopicId("");
      }
      if (editingTopic?.id === id) {
        setEditingTopic(null);
      }
      loadData();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    }
  };

  // ---------------- CONVERSATION CRUD ----------------
  const openConvModal = (conv?: MedicalConversation) => {
    if (conv) {
      setEditingConv(conv);
      setConvTopicId(conv.topic_id);
      setConvTitle(conv.title || "Hospital Dialogue");
      setConvText(conv.conversation_text);
      setConvMalayalam(conv.explanation_malayalam || "");
      setConvOrder(conv.order_index ?? 1);
    } else {
      setEditingConv(null);
      setConvTopicId(selectedTopicId || topics[0]?.id || "");
      setConvTitle("Hospital Dialogue");
      setConvText("");
      setConvMalayalam("");
      const currentTopicConvs = conversations.filter((c) => c.topic_id === (selectedTopicId || topics[0]?.id));
      setConvOrder(currentTopicConvs.length + 1);
    }
    setShowConvModal(true);
  };

  const handleSaveConv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convTopicId || !convText.trim()) {
      alert("Please select Situation and paste continuous dialogue.");
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/medical/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingConv?.id,
          topic_id: convTopicId,
          title: convTitle,
          conversation_text: convText,
          explanation_malayalam: convMalayalam,
          order_index: convOrder,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      notifySuccess("Hospital dialogue saved.");
      setShowConvModal(false);
      loadData();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConv = async (id: string) => {
    if (!confirm("Delete this dialogue?")) return;
    try {
      const res = await fetch(`/api/admin/medical/conversations?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      notifySuccess("Deleted dialogue.");
      loadData();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    }
  };

  // Filtered lists
  const filteredWords = selectedCategoryId
    ? words.filter((w) => w.category_id === selectedCategoryId)
    : words;

  const filteredConvs = selectedTopicId
    ? conversations.filter((c) => c.topic_id === selectedTopicId)
    : conversations;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-[#ffe600] border border-black font-black text-xs text-black uppercase">
              Specialized Track
            </span>
            <span className="text-xs font-bold text-neutral-500 uppercase">
              Healthcare &amp; Hospital
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-black dark:text-white uppercase tracking-tight">
            Medical German Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 font-medium">
            Manage Medical German Words (Categories &amp; Terminology) and Useful Hospital Conversations
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-black dark:border-neutral-700 bg-white dark:bg-[#141414] text-xs font-black uppercase text-black dark:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ffe600] hover:text-black transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-green-50 dark:bg-green-950/40 border-2 border-green-600 text-green-800 dark:text-green-300 text-xs font-bold flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border-2 border-red-600 text-red-800 dark:text-red-300 text-xs font-bold flex items-center justify-between">
          <span>✗ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Tabs: Medical German Words vs Useful Conversations in Hospital */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab("words")}
          className={`p-4 border-2 text-left transition-all flex items-center justify-between ${
            activeTab === "words"
              ? "border-black dark:border-neutral-500 bg-[#ffe600] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              : "border-black dark:border-neutral-700 bg-white dark:bg-[#141414] text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🩺</span>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight">
                1. Medical German Words
              </h2>
              <p className="text-xs font-bold opacity-80">
                {categories.length} Categories • {words.length} Vocabulary Words
              </p>
            </div>
          </div>
          <ArrowRight
            className={`w-5 h-5 transition-transform ${activeTab === "words" ? "rotate-90 sm:rotate-0" : ""}`}
          />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("conversations")}
          className={`p-4 border-2 text-left transition-all flex items-center justify-between ${
            activeTab === "conversations"
              ? "border-black dark:border-neutral-500 bg-[#ffe600] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              : "border-black dark:border-neutral-700 bg-white dark:bg-[#141414] text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight">
                2. Useful Conversations in Hospital
              </h2>
              <p className="text-xs font-bold opacity-80">
                {topics.length} Situations • {conversations.length} Continuous Dialogues
              </p>
            </div>
          </div>
          <ArrowRight
            className={`w-5 h-5 transition-transform ${activeTab === "conversations" ? "rotate-90 sm:rotate-0" : ""}`}
          />
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. MEDICAL GERMAN WORDS WORKSPACE                              */}
      {/* ============================================================== */}
      {activeTab === "words" && (
        <div className="space-y-6">
          {/* Top Actions: Add Category, Add Word */}
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase text-neutral-500">
                Filter Category:
              </span>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="p-1.5 text-xs font-bold border border-black dark:border-neutral-700 bg-white dark:bg-[#141414] text-black dark:text-white"
              >
                <option value="">All Categories ({words.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.order_index} {c.icon} {c.name} ({words.filter((w) => w.category_id === c.id).length})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openCategoryModal()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-black dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-xs font-black uppercase text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Manage Categories</span>
              </button>
              <button
                type="button"
                onClick={() => openWordModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#ffe600] border-2 border-black font-black text-xs uppercase text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ffea33] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Word</span>
              </button>
            </div>
          </div>

          {/* Words List Table */}
          <div className="border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#141414] overflow-x-auto shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(250,204,21,0.2)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-black dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 font-black uppercase text-black dark:text-white">
                  <th className="p-3 w-14">#</th>
                  <th className="p-3">German Medical Word</th>
                  <th className="p-3">English Meaning</th>
                  <th className="p-3">Malayalam (Optional)</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {filteredWords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-500 font-medium">
                      No medical words found in this category. Click &quot;Add Word&quot; above to add one.
                    </td>
                  </tr>
                ) : (
                  filteredWords.map((w, idx) => {
                    const cat = categories.find((c) => c.id === w.category_id);
                    return (
                      <tr
                        key={w.id}
                        className="hover:bg-[#fffdf0] dark:hover:bg-neutral-900/60 transition-colors"
                      >
                        <td className="p-3 font-bold text-neutral-500">
                          #{w.order_index ?? idx + 1}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {w.article && (
                              <span className="px-1.5 py-0.2 bg-black text-white text-[10px] font-black uppercase">
                                {w.article}
                              </span>
                            )}
                            <span className="font-black text-sm text-black dark:text-white">
                              {w.german}
                            </span>
                            {w.audio_url && (
                              <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-400 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                                🔊 Word Audio
                              </span>
                            )}
                            {w.sentence_audio_url && (
                              <span className="px-1.5 py-0.5 bg-sky-100 dark:bg-sky-950/60 border border-sky-400 text-sky-800 dark:text-sky-300 text-[10px] font-bold">
                                🔊 Sentence Audio
                              </span>
                            )}
                          </div>
                          {w.example_german && (
                            <p className="text-[11px] text-neutral-500 italic mt-0.5 line-clamp-1">
                              &quot;{w.example_german}&quot;
                            </p>
                          )}
                        </td>
                        <td className="p-3 font-bold text-neutral-800 dark:text-neutral-200">
                          {w.english}
                        </td>
                        <td className="p-3 font-malayalam font-semibold text-neutral-700 dark:text-neutral-300">
                          {w.malayalam || "—"}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                            {cat?.icon} {cat?.name || "General"}
                          </span>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openWordModal(w)}
                              className="p-1 border border-neutral-300 dark:border-neutral-700 hover:bg-[#ffe600] hover:text-black text-neutral-700 dark:text-neutral-300 transition-colors"
                              title="Edit Word"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteWord(w.id, w.german)}
                              className="p-1 border border-neutral-300 dark:border-neutral-700 hover:bg-red-600 hover:text-white text-neutral-700 dark:text-neutral-300 transition-colors"
                              title="Delete Word"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. USEFUL CONVERSATIONS IN HOSPITAL WORKSPACE                  */}
      {/* ============================================================== */}
      {activeTab === "conversations" && (
        <div className="space-y-6">
          {/* Top Actions */}
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase text-neutral-500">
                Hospital Situation:
              </span>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="p-1.5 text-xs font-bold border border-black dark:border-neutral-700 bg-white dark:bg-[#141414] text-black dark:text-white"
              >
                <option value="">All Situations ({conversations.length})</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.order_index} {t.icon} {t.title} ({conversations.filter((c) => c.topic_id === t.id).length})
                  </option>
                ))}
              </select>

              {selectedTopicId && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const currentTopic = topics.find((t) => t.id === selectedTopicId);
                      if (currentTopic) openTopicModal(currentTopic);
                    }}
                    className="p-1.5 border border-neutral-300 dark:border-neutral-700 hover:bg-[#ffe600] hover:text-black text-neutral-700 dark:text-neutral-300 transition-colors"
                    title="Edit Selected Situation"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const currentTopic = topics.find((t) => t.id === selectedTopicId);
                      if (currentTopic) handleDeleteTopic(currentTopic.id, currentTopic.title);
                    }}
                    className="p-1.5 border border-neutral-300 dark:border-neutral-700 hover:bg-red-600 hover:text-white text-neutral-700 dark:text-neutral-300 transition-colors"
                    title="Delete Selected Situation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openTopicModal()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-black dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-xs font-black uppercase text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Manage Situations</span>
              </button>
              <button
                type="button"
                onClick={() => openConvModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#ffe600] border-2 border-black font-black text-xs uppercase text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ffea33] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Dialogue</span>
              </button>
            </div>
          </div>

          {/* Dialogues List */}
          <div className="space-y-4">
            {filteredConvs.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#141414] space-y-2">
                <p className="font-black text-sm text-black dark:text-white">
                  No dialogue added for this situation yet.
                </p>
                <p className="text-xs text-neutral-500">
                  Click &quot;Add Dialogue&quot; above to paste continuous German conversation with English and Malayalam translations.
                </p>
              </div>
            ) : (
              filteredConvs.map((c, cIdx) => {
                const top = topics.find((t) => t.id === c.topic_id);
                return (
                  <div
                    key={c.id}
                    className="border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#141414] p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(250,204,21,0.2)] space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center bg-[#ffe600] border border-black font-black text-xs text-black">
                          #{c.order_index ?? cIdx + 1}
                        </span>
                        <h3 className="font-black text-sm sm:text-base uppercase text-black dark:text-white">
                          {c.title || "Hospital Dialogue"}
                        </h3>
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">
                          {top?.icon} {top?.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openConvModal(c)}
                          className="px-2 py-1 text-xs font-bold border border-neutral-300 dark:border-neutral-700 hover:bg-[#ffe600] hover:text-black transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteConv(c.id)}
                          className="px-2 py-1 text-xs font-bold border border-neutral-300 dark:border-neutral-700 hover:bg-red-600 hover:text-white transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="bg-neutral-50 dark:bg-neutral-900 p-3 font-mono text-xs whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200">
                      {c.conversation_text}
                    </div>

                    {c.explanation_malayalam && (
                      <div className="text-xs font-malayalam text-neutral-600 dark:text-neutral-400 bg-[#fffbeb] dark:bg-neutral-900/60 p-2 border-l-2 border-[#ffe600]">
                        {c.explanation_malayalam}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT WORD                                         */}
      {/* ============================================================== */}
      {showWordModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="border-2 border-black dark:border-white bg-white dark:bg-[#151515] p-6 max-w-lg w-full space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <h3 className="text-base font-black uppercase text-black dark:text-white">
                {editingWord ? "Edit Medical Word" : "Add Medical German Word"}
              </h3>
              <button onClick={() => setShowWordModal(false)}>
                <X className="w-5 h-5 text-neutral-500 hover:text-black dark:hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveWord} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                  Medical Category *
                </label>
                <select
                  required
                  value={wordCatId}
                  onChange={(e) => setWordCatId(e.target.value)}
                  className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white font-bold"
                >
                  <option value="">Select Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                    Article (Optional)
                  </label>
                  <select
                    value={wordArticle}
                    onChange={(e) => setWordArticle(e.target.value)}
                    className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white"
                  >
                    <option value="">None</option>
                    <option value="der">der (m)</option>
                    <option value="die">die (f)</option>
                    <option value="das">das (n)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                    German Medical Word *
                  </label>
                  <input
                    required
                    value={wordGerman}
                    onChange={(e) => setWordGerman(e.target.value)}
                    placeholder="e.g. das Stethoskop, der Blutdruck"
                    className="w-full p-2 text-xs font-bold border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                  English Meaning *
                </label>
                <input
                  required
                  value={wordEnglish}
                  onChange={(e) => setWordEnglish(e.target.value)}
                  placeholder="e.g. stethoscope, blood pressure"
                  className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                  Malayalam Meaning (Optional)
                </label>
                <input
                  value={wordMalayalam}
                  onChange={(e) => setWordMalayalam(e.target.value)}
                  placeholder="e.g. രക്തസമ്മർദ്ദം, സ്റ്റെതസ്കോപ്പ്"
                  className="w-full p-2 text-xs font-malayalam border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                    Plural Form (Optional)
                  </label>
                  <input
                    value={wordPlural}
                    onChange={(e) => setWordPlural(e.target.value)}
                    placeholder="e.g. die Stethoskope"
                    className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                    Order Index (#)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={wordOrder}
                    onChange={(e) => setWordOrder(Number(e.target.value))}
                    className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block">
                  Clinical Example Sentence (Optional)
                </label>
                <input
                  value={wordExGerman}
                  onChange={(e) => setWordExGerman(e.target.value)}
                  placeholder="German: Der Arzt hört mit dem Stethoskop die Lunge ab."
                  className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white"
                />
                <input
                  value={wordExEnglish}
                  onChange={(e) => setWordExEnglish(e.target.value)}
                  placeholder="English: The doctor listens to the lungs with the stethoscope."
                  className="w-full p-2 text-xs border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white"
                />
              </div>

              {/* Audio Pronunciation Voice Recording (Medical Word & Clinical Sentence) */}
              <div className="pt-2 border-t border-dashed border-neutral-300 dark:border-neutral-700 grid grid-cols-1 md:grid-cols-2 gap-3">
                <AudioRecorder
                  label="🎤 Medical Word Audio"
                  audioUrl={wordAudioUrl}
                  prefix="medical_word"
                  onAudioUploaded={(url) => setWordAudioUrl(url)}
                  onAudioRemoved={() => setWordAudioUrl("")}
                />
                <AudioRecorder
                  label="🎤 Clinical Sentence Audio"
                  audioUrl={wordSentenceAudioUrl}
                  prefix="medical_sentence"
                  onAudioUploaded={(url) => setWordSentenceAudioUrl(url)}
                  onAudioRemoved={() => setWordSentenceAudioUrl("")}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowWordModal(false)}
                  className="px-4 py-2 border border-black dark:border-neutral-700 text-xs font-bold uppercase hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#ffe600] border-2 border-black text-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ffea33]"
                >
                  {saving ? "Saving..." : editingWord ? "Update Word" : "Add Word"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: MANAGE CATEGORIES                                      */}
      {/* ============================================================== */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="border-2 border-black dark:border-white bg-white dark:bg-[#151515] p-6 max-w-lg w-full space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <h3 className="text-base font-black uppercase text-black dark:text-white">
                {editingCategory ? "Edit Category" : "Add Medical Category"}
              </h3>
              <button onClick={() => setShowCategoryModal(false)}>
                <X className="w-5 h-5 text-neutral-500 hover:text-black dark:hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                    Icon
                  </label>
                  <input
                    value={catIcon}
                    onChange={(e) => setCatIcon(e.target.value)}
                    placeholder="🩺"
                    className="w-full p-2 text-center text-sm border border-black dark:border-neutral-700 bg-white dark:bg-[#121212]"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                    Category Name *
                  </label>
                  <input
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="e.g. Medical Equipment (Geräte)"
                    className="w-full p-2 text-xs font-bold border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                  Description
                </label>
                <input
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  placeholder="e.g. Clinical devices and medical tools"
                  className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                  Order Index (#)
                </label>
                <input
                  type="number"
                  min="1"
                  value={catOrder}
                  onChange={(e) => setCatOrder(Number(e.target.value))}
                  className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#ffe600] border-2 border-black text-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ffea33]"
                >
                  {saving ? "Saving..." : editingCategory ? "Update Category" : "Add Category"}
                </button>
              </div>
            </form>

            {/* List of existing categories */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
              <h4 className="text-xs font-black uppercase text-neutral-500">
                Existing Categories ({categories.length})
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="p-2 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs bg-neutral-50 dark:bg-neutral-900"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold">#{c.order_index}</span>
                      <span>{c.icon}</span>
                      <span className="font-black">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openCategoryModal(c)}
                        className="p-1 border border-neutral-300 dark:border-neutral-700 hover:bg-[#ffe600] hover:text-black"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(c.id, c.name)}
                        className="p-1 border border-neutral-300 dark:border-neutral-700 hover:bg-red-600 hover:text-white"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT SITUATION TOPIC                              */}
      {/* ============================================================== */}
      {showTopicModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="border-2 border-black dark:border-white bg-white dark:bg-[#151515] p-6 max-w-lg w-full space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <h3 className="text-base font-black uppercase text-black dark:text-white">
                {editingTopic ? "Edit Hospital Situation" : "Manage Hospital Situations"}
              </h3>
              <button onClick={() => setShowTopicModal(false)}>
                <X className="w-5 h-5 text-neutral-500 hover:text-black dark:hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveTopic} className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                    Icon
                  </label>
                  <input
                    value={topicIcon}
                    onChange={(e) => setTopicIcon(e.target.value)}
                    placeholder="🏥"
                    className="w-full p-2 text-center text-sm border border-black dark:border-neutral-700 bg-white dark:bg-[#121212]"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                    Situation Title *
                  </label>
                  <input
                    required
                    value={topicTitle}
                    onChange={(e) => {
                      setTopicTitle(e.target.value);
                      if (!editingTopic) {
                        setTopicSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-|-$/g, "")
                        );
                      }
                    }}
                    placeholder="e.g. At the Reception, With the Doctor"
                    className="w-full p-2 text-xs font-bold border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                  Slug *
                </label>
                <input
                  required
                  value={topicSlug}
                  onChange={(e) => setTopicSlug(e.target.value)}
                  placeholder="e.g. at-the-reception, with-the-doctor"
                  className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={topicDesc}
                  onChange={(e) => setTopicDesc(e.target.value)}
                  placeholder="Patient arrival, admission check, insurance cards..."
                  className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                  Order Index (#)
                </label>
                <input
                  type="number"
                  min="1"
                  value={topicOrder}
                  onChange={(e) => setTopicOrder(Number(e.target.value))}
                  className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {editingTopic ? (
                  <button
                    type="button"
                    onClick={() => openTopicModal()}
                    className="text-xs font-bold text-neutral-500 hover:text-black dark:hover:text-white underline"
                  >
                    + Switch to Add New Situation
                  </button>
                ) : (
                  <div />
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#ffe600] border-2 border-black text-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ffea33]"
                >
                  {saving ? "Saving..." : editingTopic ? "Update Situation" : "Add Situation"}
                </button>
              </div>
            </form>

            {/* List of existing situations */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
              <h4 className="text-xs font-black uppercase text-neutral-500">
                Existing Hospital Situations ({topics.length})
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {topics.map((t) => (
                  <div
                    key={t.id}
                    className="p-2 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs bg-neutral-50 dark:bg-neutral-900"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold shrink-0">#{t.order_index}</span>
                      <span className="shrink-0">{t.icon}</span>
                      <span className="font-black truncate">{t.title}</span>
                      <span className="text-[10px] text-neutral-400 shrink-0">
                        ({conversations.filter((c) => c.topic_id === t.id).length} dialogues)
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openTopicModal(t)}
                        className="p-1 border border-neutral-300 dark:border-neutral-700 hover:bg-[#ffe600] hover:text-black"
                        title="Edit Situation"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTopic(t.id, t.title)}
                        className="p-1 border border-neutral-300 dark:border-neutral-700 hover:bg-red-600 hover:text-white"
                        title="Delete Situation"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT DIALOGUE                                     */}
      {/* ============================================================== */}
      {showConvModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="border-2 border-black dark:border-white bg-white dark:bg-[#151515] p-6 max-w-xl w-full space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <h3 className="text-base font-black uppercase text-black dark:text-white">
                {editingConv ? "Edit Hospital Dialogue" : "Add Hospital Dialogue"}
              </h3>
              <button onClick={() => setShowConvModal(false)}>
                <X className="w-5 h-5 text-neutral-500 hover:text-black dark:hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveConv} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                    Hospital Situation *
                  </label>
                  <select
                    required
                    value={convTopicId}
                    onChange={(e) => setConvTopicId(e.target.value)}
                    className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white font-bold"
                  >
                    <option value="">Select Situation...</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.icon} {t.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                    Order Index (#)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={convOrder}
                    onChange={(e) => setConvOrder(Number(e.target.value))}
                    className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                  Dialogue Title
                </label>
                <input
                  value={convTitle}
                  onChange={(e) => setConvTitle(e.target.value)}
                  placeholder="e.g. Anmeldung an der Krankenhaus-Rezeption"
                  className="w-full p-2 text-xs border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                  Continuous Trilingual Conversation *
                </label>
                <textarea
                  required
                  rows={8}
                  value={convText}
                  onChange={(e) => setConvText(e.target.value)}
                  placeholder={`Rezeptionistin: Guten Morgen! Wie kann ich Ihnen helfen?\nGood Morning! How can I help you?\nസുപ്രഭാതം! ഞാൻ നിങ്ങളെ എങ്ങനെയാണ് സഹായിക്കേണ്ടത്?\nPatient: Guten Morgen. Ich habe einen Termin bei Dr. Weber.\nGood Morning. I have an appointment with Dr. Weber.\nസുപ്രഭാതം. എനിക്ക് ഡോക്ടർ വെബറുമായി ഒരു അപ്പോയിന്റ്മെന്റ് ഉണ്ട്.`}
                  className="w-full p-2.5 text-xs font-mono leading-relaxed border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white"
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  Tip: Format each exchange as <strong>Speaker: German line</strong>, followed by the English line and Malayalam line.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-neutral-600 dark:text-neutral-400 block mb-1">
                  Malayalam Context (Optional)
                </label>
                <textarea
                  rows={2}
                  value={convMalayalam}
                  onChange={(e) => setConvMalayalam(e.target.value)}
                  placeholder="ആശുപത്രി റിസപ്ഷനിലെ അപ്പോയിന്റ്മെന്റ് സംഭാഷണം..."
                  className="w-full p-2 text-xs font-malayalam border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] text-black dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowConvModal(false)}
                  className="px-4 py-2 border border-black dark:border-neutral-700 text-xs font-bold uppercase hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#ffe600] border-2 border-black text-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ffea33]"
                >
                  {saving ? "Saving..." : editingConv ? "Update Dialogue" : "Add Dialogue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
