"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { VerbItem, VerbCategory, Level } from "@/types";
import {
  Zap,
  Plus,
  Trash2,
  Edit3,
  Search,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Sparkles,
  Layers,
  FolderPlus,
  RefreshCw,
  Check,
  AlertCircle,
  X,
  ExternalLink,
  Loader2,
} from "lucide-react";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2"];

interface VerbFormInput {
  infinitive_de: string;
  infinitive_en: string;
  infinitive_ml: string;
  praeteritum_de: string;
  praeteritum_en: string;
  praeteritum_ml: string;
  perfekt_de: string;
  perfekt_en: string;
  perfekt_ml: string;
  order_index?: number;
}

export default function AdminVerbsPage() {
  const [verbs, setVerbs] = useState<VerbItem[]>([]);
  const [categories, setCategories] = useState<VerbCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [selectedLevel, setSelectedLevel] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingVerb, setEditingVerb] = useState<VerbItem | null>(null);

  // Single Add / Edit Form State
  const [formLevel, setFormLevel] = useState<Level>("A1");
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formOrderIndex, setFormOrderIndex] = useState<number>(1);
  const [formInfinitiveDe, setFormInfinitiveDe] = useState("");
  const [formInfinitiveEn, setFormInfinitiveEn] = useState("");
  const [formInfinitiveMl, setFormInfinitiveMl] = useState("");
  const [formInfinitiveAudio, setFormInfinitiveAudio] = useState("");
  const [formPraeteritumDe, setFormPraeteritumDe] = useState("");
  const [formPraeteritumEn, setFormPraeteritumEn] = useState("");
  const [formPraeteritumMl, setFormPraeteritumMl] = useState("");
  const [formPraeteritumAudio, setFormPraeteritumAudio] = useState("");
  const [formPerfektDe, setFormPerfektDe] = useState("");
  const [formPerfektEn, setFormPerfektEn] = useState("");
  const [formPerfektMl, setFormPerfektMl] = useState("");
  const [formPerfektAudio, setFormPerfektAudio] = useState("");

  // Batch Form State
  const [batchLevel, setBatchLevel] = useState<Level>("A1");
  const [batchCategoryId, setBatchCategoryId] = useState<string>("");
  const [batchEntries, setBatchEntries] = useState<VerbFormInput[]>([
    {
      infinitive_de: "",
      infinitive_en: "",
      infinitive_ml: "",
      praeteritum_de: "",
      praeteritum_en: "",
      praeteritum_ml: "",
      perfekt_de: "",
      perfekt_en: "",
      perfekt_ml: "",
      order_index: 1,
    },
  ]);

  // Category Manager State
  const [catName, setCatName] = useState("");
  const [catOrder, setCatOrder] = useState<number>(1);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Audio Playback & Generation State
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const [synthesizingKey, setSynthesizingKey] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Status & Notification
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [verbsRes, catsRes] = await Promise.all([
        fetch("/api/admin/verbs"),
        fetch("/api/admin/verbs/categories"),
      ]);
      const verbsData = await verbsRes.json();
      const catsData = await catsRes.json();

      if (verbsRes.ok && verbsData.items) {
        setVerbs(verbsData.items);
      }
      if (catsRes.ok && catsData.items) {
        const sortedCats = catsData.items.sort((a: VerbCategory, b: VerbCategory) => a.order_index - b.order_index);
        setCategories(sortedCats);
        if (sortedCats.length > 0) {
          setFormCategoryId(sortedCats[0].id);
          setBatchCategoryId(sortedCats[0].id);
          setCatOrder(sortedCats.length + 1);
        }
      }
    } catch (err: unknown) {
      console.error("Failed to load verbs data:", err);
      setStatusMsg({ type: "error", text: "Failed to load verbs or categories from server." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Audio Playback
  const playAudio = (url: string) => {
    if (!url) return;
    if (playingAudioUrl === url && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingAudioUrl(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(url);
    audioPlayerRef.current = audio;
    setPlayingAudioUrl(url);
    audio.play().catch(() => setPlayingAudioUrl(null));
    audio.onended = () => setPlayingAudioUrl(null);
    audio.onerror = () => setPlayingAudioUrl(null);
  };

  // Instant Single Audio Synthesize
  const handleSynthesizeAudio = async (
    verbId: string,
    field: "infinitive" | "praeteritum" | "perfekt",
    text: string
  ) => {
    if (!text || !text.trim()) return;
    const actionKey = `${verbId}_${field}`;
    setSynthesizingKey(actionKey);

    try {
      const res = await fetch("/api/admin/audio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          prefix: `verbs/${field}`,
          voiceName: "de-DE-Neural2-F",
          speakingRate: 0.95,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Synthesis failed.");
      }

      const audioUrlField = `${field}_audio_url`;
      const updateRes = await fetch("/api/admin/verbs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: verbId,
          [audioUrlField]: data.url,
        }),
      });

      const updateData = await updateRes.json();
      if (!updateRes.ok || !updateData.success) {
        throw new Error(updateData.error || "Failed to update verb record with audio URL.");
      }

      setVerbs((prev) =>
        prev.map((v) => (v.id === verbId ? { ...v, [audioUrlField]: data.url } : v))
      );
      setStatusMsg({ type: "success", text: `Audio generated successfully for "${text}"!` });
    } catch (err: unknown) {
      console.error("Audio generation error:", err);
      setStatusMsg({ type: "error", text: (err as Error).message });
    } finally {
      setSynthesizingKey(null);
    }
  };

  // Open Edit Modal
  const openEditModal = (verb: VerbItem) => {
    setEditingVerb(verb);
    setFormLevel(verb.level);
    setFormCategoryId(verb.category_id);
    setFormOrderIndex(verb.order_index ?? 1);
    setFormInfinitiveDe(verb.infinitive_de);
    setFormInfinitiveEn(verb.infinitive_en);
    setFormInfinitiveMl(verb.infinitive_ml);
    setFormInfinitiveAudio(verb.infinitive_audio_url || "");
    setFormPraeteritumDe(verb.praeteritum_de);
    setFormPraeteritumEn(verb.praeteritum_en);
    setFormPraeteritumMl(verb.praeteritum_ml);
    setFormPraeteritumAudio(verb.praeteritum_audio_url || "");
    setFormPerfektDe(verb.perfekt_de);
    setFormPerfektEn(verb.perfekt_en);
    setFormPerfektMl(verb.perfekt_ml);
    setFormPerfektAudio(verb.perfekt_audio_url || "");
    setShowAddModal(true);
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingVerb(null);
    setFormLevel(selectedLevel !== "All" ? (selectedLevel as Level) : "A1");
    if (categories.length > 0) {
      setFormCategoryId(categories[0].id);
    }
    setFormOrderIndex(verbs.length + 1);
    setFormInfinitiveDe("");
    setFormInfinitiveEn("");
    setFormInfinitiveMl("");
    setFormInfinitiveAudio("");
    setFormPraeteritumDe("");
    setFormPraeteritumEn("");
    setFormPraeteritumMl("");
    setFormPraeteritumAudio("");
    setFormPerfektDe("");
    setFormPerfektEn("");
    setFormPerfektMl("");
    setFormPerfektAudio("");
    setShowAddModal(true);
  };

  // Save Single Verb
  const handleSaveVerb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInfinitiveDe.trim() || !formPraeteritumDe.trim() || !formPerfektDe.trim()) {
      setStatusMsg({ type: "error", text: "German forms for Infinitiv, Präteritum, and Perfekt are required." });
      return;
    }
    if (!formCategoryId) {
      setStatusMsg({ type: "error", text: "Please select a category." });
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        level: formLevel,
        category_id: formCategoryId,
        order_index: Number(formOrderIndex) || 1,
        infinitive_de: formInfinitiveDe.trim(),
        infinitive_en: formInfinitiveEn.trim(),
        infinitive_ml: formInfinitiveMl.trim(),
        infinitive_audio_url: formInfinitiveAudio.trim() || null,
        praeteritum_de: formPraeteritumDe.trim(),
        praeteritum_en: formPraeteritumEn.trim(),
        praeteritum_ml: formPraeteritumMl.trim(),
        praeteritum_audio_url: formPraeteritumAudio.trim() || null,
        perfekt_de: formPerfektDe.trim(),
        perfekt_en: formPerfektEn.trim(),
        perfekt_ml: formPerfektMl.trim(),
        perfekt_audio_url: formPerfektAudio.trim() || null,
      };

      let res;
      if (editingVerb) {
        payload.id = editingVerb.id;
        res = await fetch("/api/admin/verbs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/verbs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save verb.");
      }

      if (editingVerb) {
        setVerbs((prev) => prev.map((v) => (v.id === data.item.id ? data.item : v)));
        setStatusMsg({ type: "success", text: `Verb "${data.item.infinitive_de}" updated successfully!` });
      } else {
        setVerbs((prev) => [data.item, ...prev]);
        setStatusMsg({ type: "success", text: `Verb "${data.item.infinitive_de}" added successfully!` });
      }

      setShowAddModal(false);
    } catch (err: unknown) {
      console.error("Save verb error:", err);
      setStatusMsg({ type: "error", text: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Verb
  const handleDeleteVerb = async (verb: VerbItem) => {
    if (!confirm(`Are you sure you want to delete "${verb.infinitive_de}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/verbs?id=${verb.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete verb.");
      }

      setVerbs((prev) => prev.filter((v) => v.id !== verb.id));
      setStatusMsg({ type: "success", text: `Verb "${verb.infinitive_de}" deleted successfully!` });
    } catch (err: unknown) {
      console.error("Delete verb error:", err);
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  // Batch Add Verbs
  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchCategoryId) {
      setStatusMsg({ type: "error", text: "Please select a category for batch insertion." });
      return;
    }

    const validRows = batchEntries.filter(
      (r) => r.infinitive_de.trim() && r.praeteritum_de.trim() && r.perfekt_de.trim()
    );

    if (validRows.length === 0) {
      setStatusMsg({
        type: "error",
        text: "Please enter at least one complete verb (Infinitiv, Präteritum, and Perfekt).",
      });
      return;
    }

    setSubmitting(true);
    try {
      const verbsToInsert = validRows.map((r, i) => ({
        level: batchLevel,
        category_id: batchCategoryId,
        infinitive_de: r.infinitive_de.trim(),
        infinitive_en: r.infinitive_en.trim(),
        infinitive_ml: r.infinitive_ml.trim(),
        praeteritum_de: r.praeteritum_de.trim(),
        praeteritum_en: r.praeteritum_en.trim(),
        praeteritum_ml: r.praeteritum_ml.trim(),
        perfekt_de: r.perfekt_de.trim(),
        perfekt_en: r.perfekt_en.trim(),
        perfekt_ml: r.perfekt_ml.trim(),
        order_index: (r.order_index ?? 1) + i,
      }));

      const res = await fetch("/api/admin/verbs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verbs: verbsToInsert }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to batch save verbs.");
      }

      setVerbs((prev) => [...(data.items || []), ...prev]);
      setStatusMsg({
        type: "success",
        text: `Successfully added ${data.items.length} verbs! You can generate their audio via the Batch Audio Generator.`,
      });
      setShowBatchModal(false);
      setBatchEntries([
        {
          infinitive_de: "",
          infinitive_en: "",
          infinitive_ml: "",
          praeteritum_de: "",
          praeteritum_en: "",
          praeteritum_ml: "",
          perfekt_de: "",
          perfekt_en: "",
          perfekt_ml: "",
          order_index: 1,
        },
      ]);
    } catch (err: unknown) {
      console.error("Batch save error:", err);
      setStatusMsg({ type: "error", text: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  // Add Row in Batch
  const addBatchRow = () => {
    setBatchEntries((prev) => [
      ...prev,
      {
        infinitive_de: "",
        infinitive_en: "",
        infinitive_ml: "",
        praeteritum_de: "",
        praeteritum_en: "",
        praeteritum_ml: "",
        perfekt_de: "",
        perfekt_en: "",
        perfekt_ml: "",
        order_index: prev.length + 1,
      },
    ]);
  };

  const removeBatchRow = (index: number) => {
    setBatchEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const updateBatchRow = (index: number, key: keyof VerbFormInput, value: string | number) => {
    setBatchEntries((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    );
  };

  // Category Management
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    try {
      const payload: Record<string, unknown> = {
        name: catName.trim(),
        order_index: Number(catOrder) || 1,
      };
      if (editingCatId) {
        payload.id = editingCatId;
      }

      const res = await fetch("/api/admin/verbs/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save category.");
      }

      if (editingCatId) {
        setCategories((prev) =>
          prev.map((c) => (c.id === data.item.id ? data.item : c)).sort((a, b) => a.order_index - b.order_index)
        );
        setStatusMsg({ type: "success", text: "Category updated successfully!" });
      } else {
        setCategories((prev) =>
          [...prev, data.item].sort((a, b) => a.order_index - b.order_index)
        );
        setStatusMsg({ type: "success", text: "Category created successfully!" });
      }

      setCatName("");
      setEditingCatId(null);
      setCatOrder(categories.length + 2);
    } catch (err: unknown) {
      console.error("Save category error:", err);
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  const handleDeleteCategory = async (cat: VerbCategory) => {
    const attachedVerbs = verbs.filter((v) => v.category_id === cat.id);
    if (attachedVerbs.length > 0) {
      alert(`Cannot delete category "${cat.name}" because it still has ${attachedVerbs.length} attached verbs. Reassign or delete those verbs first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/verbs/categories?id=${cat.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete category.");
      }

      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      setStatusMsg({ type: "success", text: `Category "${cat.name}" deleted successfully!` });
    } catch (err: unknown) {
      console.error("Delete category error:", err);
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  // Filtered Verbs List
  const filteredVerbs = verbs.filter((verb) => {
    if (selectedLevel !== "All" && verb.level !== selectedLevel) return false;
    if (selectedCategory !== "All" && verb.category_id !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchInf =
        verb.infinitive_de.toLowerCase().includes(q) ||
        verb.infinitive_en.toLowerCase().includes(q) ||
        verb.infinitive_ml.toLowerCase().includes(q);
      const matchPraet =
        verb.praeteritum_de.toLowerCase().includes(q) ||
        verb.praeteritum_en.toLowerCase().includes(q) ||
        verb.praeteritum_ml.toLowerCase().includes(q);
      const matchPerf =
        verb.perfekt_de.toLowerCase().includes(q) ||
        verb.perfekt_en.toLowerCase().includes(q) ||
        verb.perfekt_ml.toLowerCase().includes(q);
      return matchInf || matchPraet || matchPerf;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner */}
      <div className="border-2 border-black dark:border-white p-5 sm:p-6 bg-white dark:bg-[#121212] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono font-black text-xs uppercase bg-[#ffe600] text-black px-2.5 py-0.5 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                Admin CMS
              </span>
              <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
                A1 · A2 · B1 · B2 Verbs Matrix
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
              <Zap className="w-7 h-7 text-amber-500 fill-amber-500" />
              German Verbs Directory
            </h1>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Manage German verb conjugations across Infinitiv, Präteritum, and Perfekt with automated AI speech generation and Malaylam/English translations.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#ffe600] text-black border-2 border-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Verb
            </button>
            <button
              type="button"
              onClick={() => setShowBatchModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#1a1a1a] border-2 border-black dark:border-white font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              Batch Add
            </button>
            <button
              type="button"
              onClick={() => setShowCategoryModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 border-2 border-black dark:border-neutral-700 font-bold text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              Categories ({categories.length})
            </button>
            <Link
              href="/audio"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 border-2 border-black dark:border-neutral-700 font-bold text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Audio AI Suite
            </Link>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div
          className={`p-3.5 border-2 flex items-center justify-between text-xs font-bold ${
            statusMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/40 border-red-500 text-red-800 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === "success" ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="p-1 hover:opacity-75 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filters & Search Control Bar */}
      <div className="p-4 bg-white dark:bg-[#141414] border-2 border-black dark:border-neutral-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Level Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-black uppercase text-neutral-400 mr-1 shrink-0">Level:</span>
          {["All", ...LEVELS].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSelectedLevel(lvl)}
              className={`px-3 py-1 text-xs font-black border transition-all cursor-pointer shrink-0 ${
                selectedLevel === lvl
                  ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:border-black"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Category Dropdown & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-white dark:bg-[#1a1a1a] border-2 border-black dark:border-neutral-700 text-xs font-bold"
          >
            <option value="All">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search verbs or meanings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white dark:bg-[#1a1a1a] border-2 border-black dark:border-neutral-700 text-xs font-bold placeholder:text-neutral-400 w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Main Verbs Table */}
      <div className="border-2 border-black dark:border-white bg-white dark:bg-[#121212] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-400" />
            <p className="text-xs font-bold text-neutral-500">Loading German verbs matrix...</p>
          </div>
        ) : filteredVerbs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Zap className="w-10 h-10 mx-auto text-neutral-300 dark:text-neutral-700" />
            <p className="text-base font-black">No verbs found</p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              No verbs matched your filter criteria. Try adjusting the level or category, or click &quot;Add Verb&quot; to create a new one.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-100 dark:bg-neutral-900 border-b-2 border-black dark:border-white">
                  <th className="p-3 font-mono font-black uppercase text-neutral-500 w-12 text-center">#</th>
                  <th className="p-3 font-mono font-black uppercase tracking-wider border-r border-neutral-300 dark:border-neutral-800 w-1/4">
                    1. Infinitiv
                  </th>
                  <th className="p-3 font-mono font-black uppercase tracking-wider border-r border-neutral-300 dark:border-neutral-800 w-1/4">
                    2. Präteritum
                  </th>
                  <th className="p-3 font-mono font-black uppercase tracking-wider border-r border-neutral-300 dark:border-neutral-800 w-1/4">
                    3. Perfekt
                  </th>
                  <th className="p-3 font-mono font-black uppercase tracking-wider w-1/5">
                    Category & Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-sans">
                {filteredVerbs.map((verb, index) => {
                  return (
                    <tr
                      key={verb.id}
                      className="hover:bg-neutral-50/80 dark:hover:bg-neutral-900/60 transition-colors"
                    >
                      {/* Index */}
                      <td className="p-3 text-center font-mono font-bold text-neutral-400">
                        {index + 1}
                      </td>

                      {/* Infinitiv Column */}
                      <td className="p-3.5 border-r border-neutral-200 dark:border-neutral-800 align-top space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-black text-sm text-neutral-900 dark:text-neutral-100 tracking-tight">
                            {verb.infinitive_de}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {verb.infinitive_audio_url ? (
                              <button
                                type="button"
                                onClick={() => playAudio(verb.infinitive_audio_url!)}
                                className={`p-1 border border-black dark:border-white rounded-none cursor-pointer ${
                                  playingAudioUrl === verb.infinitive_audio_url
                                    ? "bg-[#ffe600] text-black"
                                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200"
                                }`}
                                title="Play Infinitiv pronunciation"
                              >
                                {playingAudioUrl === verb.infinitive_audio_url ? (
                                  <Pause className="w-3 h-3" />
                                ) : (
                                  <Volume2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={synthesizingKey === `${verb.id}_infinitive`}
                                onClick={() =>
                                  handleSynthesizeAudio(verb.id, "infinitive", verb.infinitive_de)
                                }
                                className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 border border-amber-500 text-[10px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-200 cursor-pointer inline-flex items-center gap-0.5"
                                title="Synthesize AI Audio"
                              >
                                {synthesizingKey === `${verb.id}_infinitive` ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-2.5 h-2.5" />
                                )}
                                <span>TTS</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-300">
                          <span className="font-bold text-neutral-400 mr-1">EN:</span>
                          {verb.infinitive_en || "—"}
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                          <span className="font-bold text-neutral-400 mr-1">ML:</span>
                          {verb.infinitive_ml || "—"}
                        </div>
                      </td>

                      {/* Präteritum Column */}
                      <td className="p-3.5 border-r border-neutral-200 dark:border-neutral-800 align-top space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-black text-sm text-neutral-900 dark:text-neutral-100 tracking-tight">
                            {verb.praeteritum_de}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {verb.praeteritum_audio_url ? (
                              <button
                                type="button"
                                onClick={() => playAudio(verb.praeteritum_audio_url!)}
                                className={`p-1 border border-black dark:border-white rounded-none cursor-pointer ${
                                  playingAudioUrl === verb.praeteritum_audio_url
                                    ? "bg-[#ffe600] text-black"
                                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200"
                                }`}
                                title="Play Präteritum pronunciation"
                              >
                                {playingAudioUrl === verb.praeteritum_audio_url ? (
                                  <Pause className="w-3 h-3" />
                                ) : (
                                  <Volume2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={synthesizingKey === `${verb.id}_praeteritum`}
                                onClick={() =>
                                  handleSynthesizeAudio(verb.id, "praeteritum", verb.praeteritum_de)
                                }
                                className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 border border-amber-500 text-[10px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-200 cursor-pointer inline-flex items-center gap-0.5"
                                title="Synthesize AI Audio"
                              >
                                {synthesizingKey === `${verb.id}_praeteritum` ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-2.5 h-2.5" />
                                )}
                                <span>TTS</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-300">
                          <span className="font-bold text-neutral-400 mr-1">EN:</span>
                          {verb.praeteritum_en || "—"}
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                          <span className="font-bold text-neutral-400 mr-1">ML:</span>
                          {verb.praeteritum_ml || "—"}
                        </div>
                      </td>

                      {/* Perfekt Column */}
                      <td className="p-3.5 border-r border-neutral-200 dark:border-neutral-800 align-top space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-black text-sm text-neutral-900 dark:text-neutral-100 tracking-tight">
                            {verb.perfekt_de}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {verb.perfekt_audio_url ? (
                              <button
                                type="button"
                                onClick={() => playAudio(verb.perfekt_audio_url!)}
                                className={`p-1 border border-black dark:border-white rounded-none cursor-pointer ${
                                  playingAudioUrl === verb.perfekt_audio_url
                                    ? "bg-[#ffe600] text-black"
                                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200"
                                }`}
                                title="Play Perfekt pronunciation"
                              >
                                {playingAudioUrl === verb.perfekt_audio_url ? (
                                  <Pause className="w-3 h-3" />
                                ) : (
                                  <Volume2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={synthesizingKey === `${verb.id}_perfekt`}
                                onClick={() =>
                                  handleSynthesizeAudio(verb.id, "perfekt", verb.perfekt_de)
                                }
                                className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 border border-amber-500 text-[10px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-200 cursor-pointer inline-flex items-center gap-0.5"
                                title="Synthesize AI Audio"
                              >
                                {synthesizingKey === `${verb.id}_perfekt` ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-2.5 h-2.5" />
                                )}
                                <span>TTS</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-300">
                          <span className="font-bold text-neutral-400 mr-1">EN:</span>
                          {verb.perfekt_en || "—"}
                        </div>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                          <span className="font-bold text-neutral-400 mr-1">ML:</span>
                          {verb.perfekt_ml || "—"}
                        </div>
                      </td>

                      {/* Category & Actions */}
                      <td className="p-3.5 align-top space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono font-black text-[10px] px-1.5 py-0.5 bg-black text-white dark:bg-white dark:text-black">
                            {verb.level}
                          </span>
                          <span className="font-bold text-[10px] px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700">
                            {verb.category_name || "Uncategorized"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(verb)}
                            className="p-1.5 border border-black dark:border-white bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 cursor-pointer"
                            title="Edit verb"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVerb(verb)}
                            className="p-1.5 border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                            title="Delete verb"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- MODAL 1: ADD / EDIT VERB ---------------- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#121212] border-2 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] max-w-2xl w-full p-5 sm:p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b-2 border-black dark:border-neutral-700 pb-3">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                {editingVerb ? `Edit Verb: ${editingVerb.infinitive_de}` : "Add New German Verb"}
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:opacity-75 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVerb} className="space-y-4 text-xs">
              {/* Level & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold uppercase mb-1">Level *</label>
                  <select
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value as Level)}
                    className="w-full p-2 border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] font-bold"
                  >
                    {LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase mb-1">Category *</label>
                  <select
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    className="w-full p-2 border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] font-bold"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase mb-1">Order Index</label>
                  <input
                    type="number"
                    value={formOrderIndex}
                    onChange={(e) => setFormOrderIndex(parseInt(e.target.value) || 1)}
                    className="w-full p-2 border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] font-bold"
                  />
                </div>
              </div>

              {/* 1. Infinitiv Group */}
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 border border-black/30 dark:border-neutral-700 space-y-2">
                <span className="font-mono font-black uppercase text-[11px] text-amber-600 dark:text-amber-400">
                  1. Infinitiv (Basic Form)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold mb-0.5">German Form *</label>
                    <input
                      type="text"
                      placeholder="e.g. bleiben"
                      value={formInfinitiveDe}
                      onChange={(e) => setFormInfinitiveDe(e.target.value)}
                      className="w-full p-2 border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-0.5">English Meaning</label>
                    <input
                      type="text"
                      placeholder="e.g. to stay"
                      value={formInfinitiveEn}
                      onChange={(e) => setFormInfinitiveEn(e.target.value)}
                      className="w-full p-2 border border-black dark:border-neutral-700 bg-white dark:bg-[#121212]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-0.5">Malayalam Meaning</label>
                    <input
                      type="text"
                      placeholder="e.g. നില്ക്കുക"
                      value={formInfinitiveMl}
                      onChange={(e) => setFormInfinitiveMl(e.target.value)}
                      className="w-full p-2 border border-black dark:border-neutral-700 bg-white dark:bg-[#121212]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-[10px] text-neutral-500 mb-0.5">
                    Audio URL (optional, can be auto-generated later via Audio AI)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formInfinitiveAudio}
                    onChange={(e) => setFormInfinitiveAudio(e.target.value)}
                    className="w-full p-1.5 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-[11px] font-mono"
                  />
                </div>
              </div>

              {/* 2. Präteritum Group */}
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 border border-black/30 dark:border-neutral-700 space-y-2">
                <span className="font-mono font-black uppercase text-[11px] text-blue-600 dark:text-blue-400">
                  2. Präteritum (Simple Past)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold mb-0.5">German Form *</label>
                    <input
                      type="text"
                      placeholder="e.g. blieb"
                      value={formPraeteritumDe}
                      onChange={(e) => setFormPraeteritumDe(e.target.value)}
                      className="w-full p-2 border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-0.5">English Meaning</label>
                    <input
                      type="text"
                      placeholder="e.g. stayed"
                      value={formPraeteritumEn}
                      onChange={(e) => setFormPraeteritumEn(e.target.value)}
                      className="w-full p-2 border border-black dark:border-neutral-700 bg-white dark:bg-[#121212]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-0.5">Malayalam Meaning</label>
                    <input
                      type="text"
                      placeholder="e.g. നിന്നു"
                      value={formPraeteritumMl}
                      onChange={(e) => setFormPraeteritumMl(e.target.value)}
                      className="w-full p-2 border border-black dark:border-neutral-700 bg-white dark:bg-[#121212]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-[10px] text-neutral-500 mb-0.5">
                    Audio URL (optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formPraeteritumAudio}
                    onChange={(e) => setFormPraeteritumAudio(e.target.value)}
                    className="w-full p-1.5 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-[11px] font-mono"
                  />
                </div>
              </div>

              {/* 3. Perfekt Group */}
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 border border-black/30 dark:border-neutral-700 space-y-2">
                <span className="font-mono font-black uppercase text-[11px] text-emerald-600 dark:text-emerald-400">
                  3. Perfekt (Present Perfect)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold mb-0.5">German Form *</label>
                    <input
                      type="text"
                      placeholder="e.g. ist geblieben"
                      value={formPerfektDe}
                      onChange={(e) => setFormPerfektDe(e.target.value)}
                      className="w-full p-2 border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-0.5">English Meaning</label>
                    <input
                      type="text"
                      placeholder="e.g. has stayed"
                      value={formPerfektEn}
                      onChange={(e) => setFormPerfektEn(e.target.value)}
                      className="w-full p-2 border border-black dark:border-neutral-700 bg-white dark:bg-[#121212]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-0.5">Malayalam Meaning</label>
                    <input
                      type="text"
                      placeholder="e.g. നിന്നിട്ടുണ്ട്"
                      value={formPerfektMl}
                      onChange={(e) => setFormPerfektMl(e.target.value)}
                      className="w-full p-2 border border-black dark:border-neutral-700 bg-white dark:bg-[#121212]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-[10px] text-neutral-500 mb-0.5">
                    Audio URL (optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formPerfektAudio}
                    onChange={(e) => setFormPerfektAudio(e.target.value)}
                    className="w-full p-1.5 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212] text-[11px] font-mono"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-black dark:border-white font-bold cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#ffe600] text-black border-2 border-black font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer inline-flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingVerb ? "Update Verb" : "Save Verb"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL 2: BATCH ADD VERBS ---------------- */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#121212] border-2 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] max-w-4xl w-full p-5 sm:p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b-2 border-black dark:border-neutral-700 pb-3">
              <div>
                <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-500" />
                  Batch Add German Verbs
                </h2>
                <p className="text-xs text-neutral-500">
                  Quickly add multiple verbs to a category. Audio can then be generated automatically with 1-click in the Audio AI suite.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="p-1 hover:opacity-75 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="space-y-4 text-xs">
              {/* Batch Level & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-neutral-100 dark:bg-neutral-900 border border-black/20">
                <div>
                  <label className="block font-bold uppercase mb-1">Target Level *</label>
                  <select
                    value={batchLevel}
                    onChange={(e) => setBatchLevel(e.target.value as Level)}
                    className="w-full p-2 border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] font-bold"
                  >
                    {LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold uppercase mb-1">Target Category *</label>
                  <select
                    value={batchCategoryId}
                    onChange={(e) => setBatchCategoryId(e.target.value)}
                    className="w-full p-2 border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] font-bold"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rows List */}
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {batchEntries.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-300 dark:border-neutral-700 space-y-2 relative"
                  >
                    <div className="flex items-center justify-between text-[11px] font-black">
                      <span className="font-mono text-neutral-400">Verb #{idx + 1}</span>
                      {batchEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBatchRow(idx)}
                          className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* 3 Forms in 3 mini-rows */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Infinitiv (German) *"
                        value={row.infinitive_de}
                        onChange={(e) => updateBatchRow(idx, "infinitive_de", e.target.value)}
                        className="p-1.5 border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] font-bold"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Infinitiv (English)"
                        value={row.infinitive_en}
                        onChange={(e) => updateBatchRow(idx, "infinitive_en", e.target.value)}
                        className="p-1.5 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212]"
                      />
                      <input
                        type="text"
                        placeholder="Infinitiv (Malayalam)"
                        value={row.infinitive_ml}
                        onChange={(e) => updateBatchRow(idx, "infinitive_ml", e.target.value)}
                        className="p-1.5 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Präteritum (German) *"
                        value={row.praeteritum_de}
                        onChange={(e) => updateBatchRow(idx, "praeteritum_de", e.target.value)}
                        className="p-1.5 border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] font-bold"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Präteritum (English)"
                        value={row.praeteritum_en}
                        onChange={(e) => updateBatchRow(idx, "praeteritum_en", e.target.value)}
                        className="p-1.5 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212]"
                      />
                      <input
                        type="text"
                        placeholder="Präteritum (Malayalam)"
                        value={row.praeteritum_ml}
                        onChange={(e) => updateBatchRow(idx, "praeteritum_ml", e.target.value)}
                        className="p-1.5 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Perfekt (German) *"
                        value={row.perfekt_de}
                        onChange={(e) => updateBatchRow(idx, "perfekt_de", e.target.value)}
                        className="p-1.5 border border-black dark:border-neutral-700 bg-white dark:bg-[#121212] font-bold"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Perfekt (English)"
                        value={row.perfekt_en}
                        onChange={(e) => updateBatchRow(idx, "perfekt_en", e.target.value)}
                        className="p-1.5 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212]"
                      />
                      <input
                        type="text"
                        placeholder="Perfekt (Malayalam)"
                        value={row.perfekt_ml}
                        onChange={(e) => updateBatchRow(idx, "perfekt_ml", e.target.value)}
                        className="p-1.5 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#121212]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={addBatchRow}
                  className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 border border-black dark:border-neutral-700 font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Another Verb Row
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBatchModal(false)}
                    className="px-4 py-2 border border-black dark:border-white font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#ffe600] text-black border-2 border-black font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer inline-flex items-center gap-1.5"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save All Verbs
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL 3: MANAGE CATEGORIES ---------------- */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#121212] border-2 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] max-w-xl w-full p-5 sm:p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b-2 border-black dark:border-neutral-700 pb-3">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-amber-500" />
                Manage Verb Categories
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCatId(null);
                  setCatName("");
                }}
                className="p-1 hover:opacity-75 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add / Edit Category Form */}
            <form onSubmit={handleSaveCategory} className="p-3 bg-neutral-100 dark:bg-neutral-900 border border-black/20 space-y-3 text-xs">
              <span className="font-mono font-black uppercase text-[11px] text-neutral-600 dark:text-neutral-400">
                {editingCatId ? "Edit Category" : "Add New Category"}
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="Category Name (e.g. Modalverben)"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full p-2 border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] font-bold"
                    required
                  />
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="Order"
                    value={catOrder}
                    onChange={(e) => setCatOrder(parseInt(e.target.value) || 1)}
                    className="w-full p-2 border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] font-bold"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                {editingCatId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCatId(null);
                      setCatName("");
                      setCatOrder(categories.length + 1);
                    }}
                    className="px-3 py-1 border border-neutral-400 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#ffe600] text-black border border-black font-black uppercase text-xs shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                >
                  {editingCatId ? "Update Category" : "Add Category"}
                </button>
              </div>
            </form>

            {/* Existing Categories List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <span className="font-mono font-black uppercase text-[11px] text-neutral-400">
                Existing Categories ({categories.length})
              </span>
              {categories.map((cat) => {
                const count = verbs.filter((v) => v.category_id === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[10px] text-neutral-400">
                        #{cat.order_index}
                      </span>
                      <span className="font-bold">{cat.name}</span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        ({count} {count === 1 ? "verb" : "verbs"})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setCatName(cat.name);
                          setCatOrder(cat.order_index);
                        }}
                        className="p-1 border border-black dark:border-white bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 cursor-pointer"
                        title="Edit category"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1 border border-red-500 text-red-500 hover:bg-red-50 cursor-pointer"
                        title="Delete category"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
