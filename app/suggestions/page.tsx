"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Suggestion, SuggestionStatus } from "@/types";
import {
  Lightbulb,
  Search,
  RefreshCw,
  Mail,
  Calendar,
  Monitor,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Archive,
  ArrowRight,
} from "lucide-react";

export default function AdminSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Detail Modal
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<SuggestionStatus>("unread");
  const [savingDetail, setSavingDetail] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);

  const fetchSuggestions = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/suggestions");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuggestions(data.items || []);
    } catch (err: unknown) {
      setErrorMsg("Failed to load suggestions: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Metrics
  const metrics = useMemo(() => {
    return {
      total: suggestions.length,
      unread: suggestions.filter((s) => s.status === "unread").length,
      inProgress: suggestions.filter((s) => s.status === "in_progress").length,
      resolved: suggestions.filter((s) => s.status === "resolved").length,
    };
  }, [suggestions]);

  // Filtered and Searched list
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = s.name.toLowerCase().includes(query);
        const matchEmail = s.email.toLowerCase().includes(query);
        const matchSubject = (s.subject || "").toLowerCase().includes(query);
        const matchText = s.suggestion.toLowerCase().includes(query);
        const matchIp = (s.ip_address || "").toLowerCase().includes(query);
        const matchFp = (s.device_fingerprint || "").toLowerCase().includes(query);
        return matchName || matchEmail || matchSubject || matchText || matchIp || matchFp;
      }
      return true;
    });
  }, [suggestions, statusFilter, searchQuery]);

  // Quick Status Update
  const handleQuickStatusChange = async (id: string, newStatus: SuggestionStatus) => {
    try {
      const res = await fetch("/api/admin/suggestions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setSuggestions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
      );
      if (selectedSuggestion && selectedSuggestion.id === id) {
        setSelectedSuggestion((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      notifySuccess(`Status updated to "${newStatus}".`);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    }
  };

  // Save Modal Details (Notes and Status)
  const handleSaveDetail = async () => {
    if (!selectedSuggestion) return;
    setSavingDetail(true);
    try {
      const res = await fetch("/api/admin/suggestions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedSuggestion.id,
          status: updatingStatus,
          admin_notes: editingNotes,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setSuggestions((prev) =>
        prev.map((s) =>
          s.id === selectedSuggestion.id
            ? { ...s, status: updatingStatus, admin_notes: editingNotes }
            : s
        )
      );
      setSelectedSuggestion((prev) =>
        prev ? { ...prev, status: updatingStatus, admin_notes: editingNotes } : null
      );
      notifySuccess("Suggestion updated successfully.");
      setSelectedSuggestion(null);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setSavingDetail(false);
    }
  };

  // Delete Suggestion
  const handleDelete = async (id: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete suggestion from "${userName}"?`)) return;
    try {
      const res = await fetch(`/api/admin/suggestions?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      if (selectedSuggestion?.id === id) setSelectedSuggestion(null);
      notifySuccess("Suggestion deleted.");
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    }
  };

  const openDetailModal = (s: Suggestion) => {
    setSelectedSuggestion(s);
    setUpdatingStatus(s.status);
    setEditingNotes(s.admin_notes || "");
    // If it was unread, automatically mark as read
    if (s.status === "unread") {
      handleQuickStatusChange(s.id, "read");
    }
  };

  const handleCopyFingerprint = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFingerprint(true);
      setTimeout(() => setCopiedFingerprint(false), 2000);
    } catch {}
  };

  const statusBadge = (status: SuggestionStatus) => {
    switch (status) {
      case "unread":
        return (
          <span className="px-2 py-0.5 bg-[#ffe600] border border-black text-black font-black text-[10px] uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            ● Unread
          </span>
        );
      case "read":
        return (
          <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-400 text-neutral-700 dark:text-neutral-300 font-bold text-[10px] uppercase">
            Read
          </span>
        );
      case "in_progress":
        return (
          <span className="px-2 py-0.5 bg-sky-100 dark:bg-sky-950/60 border border-sky-400 text-sky-800 dark:text-sky-300 font-black text-[10px] uppercase">
            In Progress
          </span>
        );
      case "resolved":
        return (
          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-400 text-emerald-800 dark:text-emerald-300 font-black text-[10px] uppercase">
            ✓ Resolved
          </span>
        );
      case "archived":
        return (
          <span className="px-2 py-0.5 bg-neutral-200 dark:bg-neutral-800 border border-neutral-400 text-neutral-500 font-bold text-[10px] uppercase">
            Archived
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border-b-2 border-black dark:border-white pb-4 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-[#ffe600] px-2.5 py-0.5 border border-black text-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              Community Feedback
            </span>
            <span className="text-xs font-bold text-neutral-500 uppercase">
              User Suggestions &amp; Bug Reports
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase">
            User Suggestions Hub
          </h1>
          <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mt-1">
            Review, track, and manage ideas submitted by learners on the Daily German website.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSuggestions}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-black uppercase px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 border border-black dark:border-neutral-700 hover:bg-[#ffe600] hover:text-black transition-colors self-start cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 bg-red-100 dark:bg-red-950/40 border-2 border-red-600 text-red-800 dark:text-red-300 text-xs font-bold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-green-100 dark:bg-green-950/40 border-2 border-green-600 text-green-800 dark:text-green-300 text-xs font-bold flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border-2 border-black dark:border-neutral-700 p-4 bg-white dark:bg-[#141414] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(250,204,21,0.2)]">
          <span className="text-[10px] font-black uppercase text-neutral-500 block mb-1">
            Total Suggestions
          </span>
          <p className="text-2xl sm:text-3xl font-black">{metrics.total}</p>
        </div>

        <div className="border-2 border-black dark:border-neutral-700 p-4 bg-[#fffdf0] dark:bg-[#1c1c10] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(250,204,21,0.2)]">
          <span className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-400 block mb-1">
            Unread
          </span>
          <p className="text-2xl sm:text-3xl font-black text-amber-900 dark:text-[#ffe600]">
            {metrics.unread}
          </p>
        </div>

        <div className="border-2 border-black dark:border-neutral-700 p-4 bg-sky-50 dark:bg-sky-950/20 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(250,204,21,0.2)]">
          <span className="text-[10px] font-black uppercase text-sky-800 dark:text-sky-300 block mb-1">
            In Progress
          </span>
          <p className="text-2xl sm:text-3xl font-black text-sky-800 dark:text-sky-300">
            {metrics.inProgress}
          </p>
        </div>

        <div className="border-2 border-black dark:border-neutral-700 p-4 bg-emerald-50 dark:bg-emerald-950/20 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(250,204,21,0.2)]">
          <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 block mb-1">
            Resolved
          </span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-800 dark:text-emerald-300">
            {metrics.resolved}
          </p>
        </div>
      </div>

      {/* Control Bar: Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["all", "unread", "read", "in_progress", "resolved", "archived"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs font-black uppercase border transition-all cursor-pointer ${
                statusFilter === st
                  ? "bg-[#ffe600] text-black border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
              }`}
            >
              {st === "all" ? "All" : st.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, text..."
            className="w-full pl-8 pr-3 py-1.5 text-xs font-medium border border-black dark:border-neutral-700 bg-white dark:bg-[#141414]"
          />
        </div>
      </div>

      {/* Suggestions Table */}
      <div className="border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#141414] overflow-x-auto shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(250,204,21,0.2)]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b-2 border-black dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 font-black uppercase text-black dark:text-white">
              <th className="p-3 w-28">Status</th>
              <th className="p-3">User &amp; Contact</th>
              <th className="p-3">Topic &amp; Suggestion</th>
              <th className="p-3">Device / IP Info</th>
              <th className="p-3">Date</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredSuggestions.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-neutral-500 font-medium">
                  {loading
                    ? "Loading suggestions..."
                    : "No suggestions matching the current filter or search criteria."}
                </td>
              </tr>
            ) : (
              filteredSuggestions.map((s) => (
                <tr
                  key={s.id}
                  className={`hover:bg-[#fffdf0] dark:hover:bg-neutral-900/60 transition-colors ${
                    s.status === "unread" ? "bg-amber-50/40 dark:bg-amber-950/10 font-semibold" : ""
                  }`}
                >
                  <td className="p-3 whitespace-nowrap align-top">
                    {statusBadge(s.status)}
                  </td>

                  {/* User & Contact */}
                  <td className="p-3 align-top min-w-[160px]">
                    <p className="font-black text-sm text-black dark:text-white">{s.name}</p>
                    <a
                      href={`mailto:${s.email}`}
                      className="inline-flex items-center gap-1 text-[11px] text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:underline mt-0.5"
                    >
                      <Mail className="w-3 h-3" />
                      <span>{s.email}</span>
                    </a>
                  </td>

                  {/* Topic & Suggestion */}
                  <td className="p-3 align-top max-w-md">
                    <span className="inline-block px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                      {s.subject || "General Suggestion"}
                    </span>
                    <p className="text-xs text-neutral-800 dark:text-neutral-200 line-clamp-2 leading-relaxed">
                      {s.suggestion}
                    </p>
                    {s.admin_notes && (
                      <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-400 mt-1 italic">
                        Note: {s.admin_notes}
                      </p>
                    )}
                  </td>

                  {/* Device / Machine ID */}
                  <td className="p-3 align-top whitespace-nowrap text-[11px] text-neutral-600 dark:text-neutral-400">
                    <p className="font-mono font-bold text-black dark:text-white">
                      IP: {s.ip_address || "unknown"}
                    </p>
                    {s.device_fingerprint && (
                      <p className="font-mono text-[10px] text-neutral-500 mt-0.5">
                        ID: {s.device_fingerprint.slice(0, 10)}...
                      </p>
                    )}
                  </td>

                  {/* Date */}
                  <td className="p-3 align-top whitespace-nowrap text-[11px] text-neutral-500">
                    {s.created_at
                      ? new Date(s.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </td>

                  {/* Actions */}
                  <td className="p-3 align-top text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openDetailModal(s)}
                        className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 border border-black dark:border-neutral-700 text-[11px] font-black uppercase hover:bg-[#ffe600] hover:text-black transition-colors"
                        title="View Full Details"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id, s.name)}
                        className="p-1 border border-neutral-300 dark:border-neutral-700 hover:bg-red-600 hover:text-white text-neutral-600 dark:text-neutral-400 transition-colors"
                        title="Delete Suggestion"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ============================================================== */}
      {/* MODAL: DETAIL & REVIEW WORKSPACE                               */}
      {/* ============================================================== */}
      {selectedSuggestion && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="border-2 border-black dark:border-white bg-white dark:bg-[#141414] p-6 max-w-2xl w-full space-y-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-black dark:border-neutral-700 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center bg-[#ffe600] border border-black text-black font-black text-xs">
                  <Lightbulb className="w-3.5 h-3.5" />
                </span>
                <h3 className="text-base font-black uppercase tracking-tight">
                  User Suggestion Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedSuggestion(null)}
                className="p-1 text-neutral-500 hover:text-black dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sender Overview Card */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border border-black dark:border-neutral-700 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-neutral-500 block mb-0.5">
                    Sender Name
                  </span>
                  <p className="font-black text-sm">{selectedSuggestion.name}</p>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-neutral-500 block mb-0.5">
                    Email Address
                  </span>
                  <a
                    href={`mailto:${selectedSuggestion.email}?subject=Regarding your Daily German suggestion`}
                    className="inline-flex items-center gap-1 font-bold text-black dark:text-[#ffe600] hover:underline"
                  >
                    <span>{selectedSuggestion.email}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-neutral-500 block mb-0.5">
                    Topic / Category
                  </span>
                  <p className="font-bold">{selectedSuggestion.subject || "General Suggestion"}</p>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-neutral-500 block mb-0.5">
                    Submitted Date &amp; Time
                  </span>
                  <p className="font-medium text-neutral-700 dark:text-neutral-300">
                    {selectedSuggestion.created_at
                      ? new Date(selectedSuggestion.created_at).toLocaleString()
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Machine ID / Anti-Abuse Security Metadata */}
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-neutral-500 block mb-0.5">
                    Client IP Address
                  </span>
                  <p className="font-mono font-bold text-[11px]">
                    {selectedSuggestion.ip_address || "unknown"}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-neutral-500 block mb-0.5">
                    Deterministic Machine ID
                  </span>
                  <div className="flex items-center gap-1.5">
                    <p className="font-mono font-bold text-[11px] truncate">
                      {selectedSuggestion.device_fingerprint || "unknown"}
                    </p>
                    {selectedSuggestion.device_fingerprint && (
                      <button
                        type="button"
                        onClick={() => handleCopyFingerprint(selectedSuggestion.device_fingerprint || "")}
                        className="p-1 border border-neutral-300 hover:bg-neutral-200 text-neutral-700 shrink-0"
                        title="Copy Machine ID"
                      >
                        {copiedFingerprint ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Full Suggestion Message */}
            <div className="space-y-1.5">
              <span className="text-xs font-black uppercase text-neutral-500 block">
                User Suggestion Text
              </span>
              <div className="p-4 bg-white dark:bg-[#121212] border-2 border-black dark:border-neutral-700 font-medium text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-text">
                {selectedSuggestion.suggestion}
              </div>
            </div>

            {/* Status Update Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-neutral-500 block">
                Status
              </label>
              <select
                value={updatingStatus}
                onChange={(e) => setUpdatingStatus(e.target.value as SuggestionStatus)}
                className="w-full p-2 text-xs font-bold border border-black dark:border-neutral-700 bg-white dark:bg-[#121212]"
              >
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Admin Internal Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-neutral-500 block">
                Internal Admin Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="Add private notes, planned changes, or team follow-up thoughts..."
                className="w-full p-2.5 text-xs font-medium border border-black dark:border-neutral-700 bg-white dark:bg-[#121212]"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <a
                href={`mailto:${selectedSuggestion.email}?subject=Re: Your suggestion on Daily German Malayalam&body=Hi ${selectedSuggestion.name},%0D%0A%0D%0AThank you for sharing your suggestion with us:%0D%0A"${encodeURIComponent(selectedSuggestion.suggestion)}"%0D%0A%0D%0A`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-black dark:border-neutral-700 text-xs font-bold uppercase hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Reply by Email</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSuggestion(null)}
                  className="px-4 py-2 border border-black dark:border-neutral-700 text-xs font-bold uppercase hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDetail}
                  disabled={savingDetail}
                  className="px-5 py-2 bg-[#ffe600] border-2 border-black text-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ffea33]"
                >
                  {savingDetail ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
