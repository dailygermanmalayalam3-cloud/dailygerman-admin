"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { VocabularyItem, VocabularyCategory, Level, Example } from "@/types";
import { Plus, Trash2, Edit3, ArrowLeft, Check, AlertCircle, FolderPlus, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2"];

interface WordEntryInput {
  id?: string;
  german_content: string;
  english_meaning: string;
  malayalam_meaning: string;
  sentence_german: string;
  sentence_english: string;
  sentence_malayalam: string;
}

export default function AdminVocabularyPage() {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [categories, setCategories] = useState<VocabularyCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Panels
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showAddWords, setShowAddWords] = useState(false);
  const [editingItem, setEditingItem] = useState<VocabularyItem | null>(null);

  // Category Manager State
  const [newCatName, setNewCatName] = useState("");
  const [newCatOrder, setNewCatOrder] = useState<number>(1);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Batch Word Adding State
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<Level>("A1");
  const [wordEntries, setWordEntries] = useState<WordEntryInput[]>([
    {
      german_content: "",
      english_meaning: "",
      malayalam_meaning: "",
      sentence_german: "",
      sentence_english: "",
      sentence_malayalam: "",
    },
  ]);

  // Filters for Existing List
  const [filterLevel, setFilterLevel] = useState<string>("All");
  const [filterCategory, setFilterCategory] = useState<string>("All");

  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load items and categories
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/vocabulary-list").then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
    ])
      .then(([vocabData, catData]) => {
        setItems(vocabData.items || []);
        const loadedCats: VocabularyCategory[] = catData.items || [];
        setCategories(loadedCats);
        if (loadedCats.length > 0) {
          setSelectedCategory(loadedCats[0].name);
          setNewCatOrder(loadedCats.length + 1);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ---------------- CATEGORY MANAGEMENT ----------------
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    // Check duplicate name (except when editing self)
    const duplicate = categories.find(
      (c) => c.name.toLowerCase() === newCatName.trim().toLowerCase() && c.id !== editingCatId
    );
    if (duplicate) {
      setStatusMsg({ type: "error", text: `Category "${newCatName.trim()}" already exists. Category names cannot be duplicate.` });
      return;
    }

    try {
      const payload = {
        ...(editingCatId ? { id: editingCatId } : {}),
        name: newCatName.trim(),
        order_index: Number(newCatOrder) || 1,
      };

      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.item) {
        setCategories((prev) => {
          const filtered = prev.filter((c) => c.id !== data.item.id);
          return [...filtered, data.item].sort((a, b) => a.order_index - b.order_index);
        });
        setStatusMsg({
          type: "success",
          text: editingCatId ? "Category updated successfully!" : "New category created successfully!",
        });
        setNewCatName("");
        setEditingCatId(null);
        setNewCatOrder(categories.length + 2);
      } else {
        throw new Error(data.error || "Failed to save category");
      }
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  const handleEditCategory = (cat: VocabularyCategory) => {
    setEditingCatId(cat.id);
    setNewCatName(cat.name);
    setNewCatOrder(cat.order_index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    const countWords = items.filter((i) => i.category === name).length;
    if (
      !confirm(
        `Are you sure you want to delete category "${name}"?${
          countWords > 0 ? ` WARNING: ${countWords} words currently belong to this category.` : ""
        }`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        setStatusMsg({ type: "success", text: `Category "${name}" deleted.` });
      } else {
        throw new Error("Failed to delete category");
      }
    } catch {
      setStatusMsg({ type: "error", text: "Could not delete category." });
    }
  };

  const handleUpdateCategoryOrder = async (cat: VocabularyCategory, newOrder: number) => {
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, name: cat.name, order_index: newOrder }),
      });
      if (res.ok) {
        setCategories((prev) =>
          prev
            .map((c) => (c.id === cat.id ? { ...c, order_index: newOrder } : c))
            .sort((a, b) => a.order_index - b.order_index)
        );
      }
    } catch {
      setStatusMsg({ type: "error", text: "Could not reorder category." });
    }
  };

  // ---------------- BATCH WORD MANAGEMENT ----------------
  const handleAddWordEntry = () => {
    setWordEntries((prev) => [
      ...prev,
      {
        german_content: "",
        english_meaning: "",
        malayalam_meaning: "",
        sentence_german: "",
        sentence_english: "",
        sentence_malayalam: "",
      },
    ]);
  };

  const handleRemoveWordEntry = (index: number) => {
    setWordEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleWordEntryChange = (index: number, field: keyof WordEntryInput, value: string) => {
    setWordEntries((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveAllWords = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!selectedCategory) {
      setStatusMsg({ type: "error", text: "Please select or create a category first." });
      return;
    }

    // Filter valid rows
    const validRows = wordEntries.filter((w) => w.german_content.trim() !== "");
    if (validRows.length === 0) {
      setStatusMsg({ type: "error", text: "Please enter at least one German word." });
      return;
    }

    const payloadWords = validRows.map((w) => {
      const examples: Example[] = [];
      if (w.sentence_german && w.sentence_german.trim()) {
        examples.push({
          german: w.sentence_german.trim(),
          english: w.sentence_english.trim(),
          malayalam: w.sentence_malayalam.trim(),
        });
      }

      return {
        ...(w.id ? { id: w.id } : {}),
        level: selectedLevel,
        category: selectedCategory,
        title: w.german_content.trim(),
        german_content: w.german_content.trim(),
        english_meaning: w.english_meaning.trim(),
        malayalam_meaning: w.malayalam_meaning.trim(),
        examples,
      };
    });

    try {
      const res = await fetch("/api/admin/vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: payloadWords }),
      });

      const data = await res.json();
      if (res.ok && data.items) {
        setItems((prev) => {
          const newIds = new Set(data.items.map((x: VocabularyItem) => x.id));
          return [...data.items, ...prev.filter((i) => !newIds.has(i.id))];
        });
        setStatusMsg({
          type: "success",
          text: `Successfully saved ${data.items.length} word(s) under "${selectedCategory}"!`,
        });

        // Reset entries
        setWordEntries([
          {
            german_content: "",
            english_meaning: "",
            malayalam_meaning: "",
            sentence_german: "",
            sentence_english: "",
            sentence_malayalam: "",
          },
        ]);
        setShowAddWords(false);
        setEditingItem(null);
      } else {
        throw new Error(data.error || "Failed to save words");
      }
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  // ---------------- SINGLE WORD EDIT ----------------
  const handleEditSingle = (item: VocabularyItem) => {
    setSelectedCategory(item.category);
    setSelectedLevel(item.level);
    setWordEntries([
      {
        id: item.id,
        german_content: item.german_content,
        english_meaning: item.english_meaning,
        malayalam_meaning: item.malayalam_meaning,
        sentence_german: item.examples?.[0]?.german || "",
        sentence_english: item.examples?.[0]?.english || "",
        sentence_malayalam: item.examples?.[0]?.malayalam || "",
      },
    ]);
    setEditingItem(item);
    setShowAddWords(true);
    setShowCategoryManager(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteWord = async (id: string) => {
    if (!confirm("Are you sure you want to delete this word?")) return;

    try {
      const res = await fetch(`/api/admin/vocabulary?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setStatusMsg({ type: "success", text: "Word deleted successfully." });
      } else {
        throw new Error("Failed to delete word");
      }
    } catch {
      setStatusMsg({ type: "error", text: "Could not delete word." });
    }
  };

  // Filtered list
  const filteredItems = items.filter((item) => {
    if (filterLevel !== "All" && item.level !== filterLevel) return false;
    if (filterCategory !== "All" && item.category !== filterCategory) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b-2 border-black pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-bold uppercase text-neutral-500 hover:text-black flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight mt-1 uppercase">
            Vocabulary & Categories
          </h1>
          <p className="text-xs font-semibold text-neutral-600 mt-0.5">
            Group words by category, customize category ordering, and batch add words.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => {
              setShowCategoryManager(!showCategoryManager);
              setShowAddWords(false);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 border-2 border-black bg-white text-black font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-neutral-100 transition-all cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-black" />
            <span>{showCategoryManager ? "Close Categories" : `Categories (${categories.length})`}</span>
          </button>

          <button
            onClick={() => {
              setShowAddWords(!showAddWords);
              setShowCategoryManager(false);
              setEditingItem(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black bg-[#ffe600] text-black font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddWords ? "Cancel" : "+ Add Words"}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
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

      {/* ---------------- CATEGORY MANAGER PANEL ---------------- */}
      {showCategoryManager && (
        <div className="border-2 border-black bg-neutral-50 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-6">
          <div className="flex items-center justify-between border-b-2 border-black pb-3">
            <div>
              <h2 className="text-lg font-black uppercase text-black flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-black" />
                Category Manager & Custom Ordering
              </h2>
              <p className="text-xs text-neutral-600 font-medium mt-0.5">
                Categories are common across all levels (A1, A2, B1, B2). Change order numbers however needed (e.g. 1 - Greetings, 2 - Personal Info).
              </p>
            </div>
            <button
              onClick={() => setShowCategoryManager(false)}
              className="text-xs font-black uppercase underline hover:text-neutral-600"
            >
              Close
            </button>
          </div>

          {/* Add / Edit Category Form */}
          <form onSubmit={handleSaveCategory} className="border-2 border-black bg-white p-4 space-y-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-xs font-black uppercase text-black">
              {editingCatId ? "Edit Category Name / Order" : "+ Add New Category"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase text-neutral-700 mb-1">
                  Category Name (Cannot be duplicate)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Greetings, Personal Info, Language & Communication..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-neutral-700 mb-1">
                  Order Index (1, 2, 3...)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newCatOrder}
                  onChange={(e) => setNewCatOrder(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border-2 border-black text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              {editingCatId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCatId(null);
                    setNewCatName("");
                    setNewCatOrder(categories.length + 1);
                  }}
                  className="px-3 py-1.5 border border-black text-xs font-bold uppercase"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                className="px-4 py-1.5 border-2 border-black bg-[#ffe600] text-black text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all cursor-pointer"
              >
                {editingCatId ? "Update Category" : "Save Category"}
              </button>
            </div>
          </form>

          {/* Categories List */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase text-neutral-700">
              Current Categories (Ordered by Order Index)
            </h3>

            {categories.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">No categories created yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.map((cat) => {
                  const wordsInCat = items.filter((i) => i.category === cat.name).length;
                  return (
                    <div
                      key={cat.id}
                      className="border border-black bg-white p-3 flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 flex items-center justify-center bg-[#ffe600] border border-black font-black text-xs text-black">
                          {cat.order_index}
                        </span>
                        <div>
                          <p className="font-black text-xs text-black">{cat.name}</p>
                          <span className="text-[10px] font-bold text-neutral-500">
                            {wordsInCat} {wordsInCat === 1 ? "word" : "words"} across levels
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateCategoryOrder(cat, Math.max(1, cat.order_index - 1))}
                          className="p-1 border border-black hover:bg-neutral-100"
                          title="Move up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateCategoryOrder(cat, cat.order_index + 1)}
                          className="p-1 border border-black hover:bg-neutral-100"
                          title="Move down"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditCategory(cat)}
                          className="p-1 border border-black hover:bg-[#ffe600]"
                          title="Edit Name/Order"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-1 border border-black hover:bg-red-500 hover:text-white"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- BATCH WORD ENTRY / EDIT FORM ---------------- */}
      {showAddWords && (
        <form
          onSubmit={handleSaveAllWords}
          className="border-2 border-black bg-white p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-6"
        >
          <div className="border-b-2 border-black pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-lg font-black uppercase text-black">
                {editingItem ? "Edit Vocabulary Word" : "+ Add Words under Category"}
              </h2>
              <p className="text-xs text-neutral-600 font-medium mt-0.5">
                Select the Category first, then level, and add one or multiple words under it. Example sentences are optional.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddWords(false);
                setEditingItem(null);
              }}
              className="text-xs font-black uppercase underline hover:text-neutral-600 self-start sm:self-auto"
            >
              Cancel
            </button>
          </div>

          {/* Step 1: Category & Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-neutral-50 border-2 border-black">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1 text-black">
                1. Select Category (Required)
              </label>
              {categories.length === 0 ? (
                <p className="text-xs text-red-600 font-bold">
                  No categories found. Please open Category Manager and create a category first!
                </p>
              ) : (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black bg-white text-sm font-black"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.order_index} - {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1 text-black">
                2. Select Level
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value as Level)}
                className="w-full px-3 py-2 border-2 border-black bg-white text-sm font-black"
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl} Deutsch
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 2: Word Entries */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-black">
                Words to Add ({wordEntries.length})
              </h3>
              {!editingItem && (
                <button
                  type="button"
                  onClick={handleAddWordEntry}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white hover:bg-[#ffe600] hover:text-black border border-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Another Word</span>
                </button>
              )}
            </div>

            <div className="space-y-4">
              {wordEntries.map((entry, idx) => (
                <div
                  key={idx}
                  className="border-2 border-black bg-white p-4 space-y-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                    <span className="text-[11px] font-black uppercase bg-[#ffe600] border border-black px-2 py-0.5 text-black">
                      Word #{idx + 1}
                    </span>
                    {wordEntries.length > 1 && !editingItem && (
                      <button
                        type="button"
                        onClick={() => handleRemoveWordEntry(idx)}
                        className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove Word
                      </button>
                    )}
                  </div>

                  {/* Trilingual Word Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-neutral-700 mb-1">
                        German Word / Phrase *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. der Tisch, Guten Tag"
                        value={entry.german_content}
                        onChange={(e) => handleWordEntryChange(idx, "german_content", e.target.value)}
                        className="w-full px-2.5 py-1.5 border-2 border-black text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-neutral-700 mb-1">
                        English Meaning *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. the table, Good day"
                        value={entry.english_meaning}
                        onChange={(e) => handleWordEntryChange(idx, "english_meaning", e.target.value)}
                        className="w-full px-2.5 py-1.5 border-2 border-black text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-neutral-700 mb-1">
                        Malayalam Meaning (മലയാളം) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. മേശ, ശുഭദിനം"
                        value={entry.malayalam_meaning}
                        onChange={(e) => handleWordEntryChange(idx, "malayalam_meaning", e.target.value)}
                        className="w-full px-2.5 py-1.5 border-2 border-black text-xs font-malayalam"
                      />
                    </div>
                  </div>

                  {/* Optional Example Sentence */}
                  <div className="pt-2 border-t border-dashed border-neutral-300">
                    <p className="text-[10px] font-black uppercase text-neutral-500 mb-1.5">
                      Optional Example Sentence (ഉദാഹരണ വാക്യം)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="German sentence containing word..."
                        value={entry.sentence_german}
                        onChange={(e) => handleWordEntryChange(idx, "sentence_german", e.target.value)}
                        className="px-2 py-1 border border-neutral-400 text-xs font-medium"
                      />
                      <input
                        type="text"
                        placeholder="English translation..."
                        value={entry.sentence_english}
                        onChange={(e) => handleWordEntryChange(idx, "sentence_english", e.target.value)}
                        className="px-2 py-1 border border-neutral-400 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Malayalam translation..."
                        value={entry.sentence_malayalam}
                        onChange={(e) => handleWordEntryChange(idx, "sentence_malayalam", e.target.value)}
                        className="px-2 py-1 border border-neutral-400 text-xs font-malayalam"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t-2 border-black">
            {!editingItem && (
              <button
                type="button"
                onClick={handleAddWordEntry}
                className="inline-flex items-center gap-1.5 px-3 py-2 border-2 border-black bg-neutral-100 hover:bg-neutral-200 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Another Word</span>
              </button>
            )}
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={() => {
                  setShowAddWords(false);
                  setEditingItem(null);
                }}
                className="px-4 py-2 border border-black text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 border-2 border-black bg-[#ffe600] text-black text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all cursor-pointer"
              >
                {editingItem ? "Update Word" : `Save All Words to "${selectedCategory}"`}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ---------------- EXISTING WORDS LIST ---------------- */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b-2 border-black pb-3">
          <h2 className="text-sm font-black uppercase tracking-wider text-black">
            Existing Words ({filteredItems.length} of {items.length})
          </h2>

          {/* Filter Controls */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="font-bold text-neutral-500 uppercase">Level:</span>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="px-2 py-1 border border-black bg-white font-bold"
              >
                <option value="All">All Levels</option>
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <span className="font-bold text-neutral-500 uppercase">Category:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-2 py-1 border border-black bg-white font-bold max-w-[180px] truncate"
              >
                <option value="All">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-neutral-500">Loading words...</p>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 border border-neutral-200 bg-neutral-50 p-6">
            <p className="text-neutral-600 text-sm">No words match the selected filters.</p>
          </div>
        ) : (
          <div className="border-2 border-black bg-white overflow-x-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-black text-white uppercase text-[11px] font-black">
                <tr>
                  <th className="p-3 border-r border-neutral-700">Level</th>
                  <th className="p-3 border-r border-neutral-700">Category</th>
                  <th className="p-3 border-r border-neutral-700">German Word</th>
                  <th className="p-3 border-r border-neutral-700">English Meaning</th>
                  <th className="p-3 border-r border-neutral-700">Malayalam Meaning</th>
                  <th className="p-3 border-r border-neutral-700">Optional Sentence</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="p-3 font-black border-r border-neutral-200">
                      <span className="px-2 py-0.5 bg-[#ffe600] border border-black text-black">
                        {item.level}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-neutral-800 border-r border-neutral-200 whitespace-nowrap">
                      {item.category}
                    </td>
                    <td className="p-3 font-bold text-black border-r border-neutral-200">
                      {item.german_content}
                    </td>
                    <td className="p-3 text-neutral-700 border-r border-neutral-200">
                      {item.english_meaning}
                    </td>
                    <td className="p-3 text-neutral-900 font-malayalam border-r border-neutral-200">
                      {item.malayalam_meaning}
                    </td>
                    <td className="p-3 border-r border-neutral-200 whitespace-nowrap">
                      {item.examples && item.examples.length > 0 && item.examples[0].german ? (
                        <div className="space-y-0.5 max-w-[200px]">
                          <p className="font-bold text-black truncate" title={item.examples[0].german}>
                            {item.examples[0].german}
                          </p>
                          <p className="text-[10px] text-neutral-500 truncate" title={item.examples[0].english}>
                            {item.examples[0].english}
                          </p>
                        </div>
                      ) : (
                        <span className="text-neutral-400 font-bold">-</span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditSingle(item)}
                          className="p-1.5 border border-black hover:bg-[#ffe600] transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-black" />
                        </button>
                        <button
                          onClick={() => handleDeleteWord(item.id)}
                          className="p-1.5 border border-black hover:bg-red-500 hover:text-white transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}