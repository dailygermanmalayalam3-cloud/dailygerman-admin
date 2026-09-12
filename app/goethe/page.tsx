"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GoetheMaterial, Level, GoetheSection } from "@/types";
import { Plus, Trash2, Edit3, ArrowLeft, Check, AlertCircle } from "lucide-react";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2"];
const SECTIONS: GoetheSection[] = ["Sprechen", "Lesen", "Schreiben", "Hören"];

export default function AdminGoethePage() {
  const [items, setItems] = useState<GoetheMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    level: "A1" as Level,
    section: "Sprechen" as GoetheSection,
    title: "",
    description: "",
    content: "",
    tips: "",
  });

  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/goethe-list")
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setFormData({
      level: "A1",
      section: "Sprechen",
      title: "",
      description: "",
      content: "",
      tips: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (mat: GoetheMaterial) => {
    setFormData({
      level: mat.level,
      section: mat.section,
      title: mat.title,
      description: mat.description,
      content: mat.content,
      tips: mat.tips || "",
    });
    setEditingId(mat.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Exam Prep material?")) return;

    try {
      const res = await fetch(`/api/admin/goethe?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setStatusMsg({ type: "success", text: "Material deleted." });
      }
    } catch {
      setStatusMsg({ type: "error", text: "Failed to delete material." });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const payload = {
      ...(editingId ? { id: editingId } : {}),
      ...formData,
    };

    try {
      const res = await fetch("/api/admin/goethe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.item) {
        if (editingId) {
          setItems((prev) => prev.map((i) => (i.id === editingId ? data.item : i)));
          setStatusMsg({ type: "success", text: "Exam Prep material updated!" });
        } else {
          setItems((prev) => [...prev, data.item]);
          setStatusMsg({ type: "success", text: "New Exam Prep material created!" });
        }
        resetForm();
      } else {
        throw new Error(data.error || "Failed to save");
      }
    } catch (err: unknown) {
      setStatusMsg({ type: "error", text: (err as Error).message });
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-b-2 border-black pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-xs font-bold uppercase text-neutral-500 hover:text-black flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight mt-1">
            Manage Exam Prep Materials
          </h1>
        </div>

        <button
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 border-2 border-black bg-[#ffe600] text-black font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? "Cancel" : "Add Exam Prep Material"}</span>
        </button>
      </div>

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

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border-2 border-black bg-white p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-4"
        >
          <h2 className="text-lg font-black uppercase text-black border-b border-black pb-2">
            {editingId ? "Edit Exam Prep Material" : "Add New Exam Prep Material"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">Level</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as Level })}
                className="w-full px-3 py-2 border-2 border-black bg-white text-sm font-bold"
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">Exam Section</label>
              <select
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value as GoetheSection })}
                className="w-full px-3 py-2 border-2 border-black bg-white text-sm font-bold"
              >
                {SECTIONS.map((sec) => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">Material Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Teil 1: Sich vorstellen & Buchstabieren"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">Description / Goal</label>
            <input
              type="text"
              required
              placeholder="e.g. Introducing yourself and spelling your name"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">Content / Exam Exercise Details</label>
            <textarea
              rows={4}
              required
              placeholder="Detailed guidelines, sample questions, instructions..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">Exam Tip / പരീക്ഷാ ടിപ്പ് (Optional)</label>
            <textarea
              rows={2}
              placeholder="Practical advice for Malayalam speakers..."
              value={formData.tips}
              onChange={(e) => setFormData({ ...formData, tips: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black text-sm font-malayalam"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-black text-xs font-bold uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 border-2 border-black bg-[#ffe600] text-black text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all cursor-pointer"
            >
              {editingId ? "Update Material" : "Save Material"}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-xs text-neutral-500">Loading materials...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-12 border border-neutral-200 bg-neutral-50 p-6">
            <p className="text-neutral-600 text-sm">No Exam Prep materials found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((mat) => (
              <div
                key={mat.id}
                className="border-2 border-black bg-white p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-xs font-black bg-[#ffe600] border border-black text-black">
                      {mat.level}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-black bg-black text-white uppercase">
                      {mat.section}
                    </span>
                    <h3 className="text-base font-black text-black">{mat.title}</h3>
                  </div>
                  <p className="text-xs text-neutral-600 mb-2">{mat.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(mat)}
                    className="p-1.5 border border-black hover:bg-[#ffe600] transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-black" />
                  </button>
                  <button
                    onClick={() => handleDelete(mat.id)}
                    className="p-1.5 border border-black hover:bg-red-500 hover:text-white transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}