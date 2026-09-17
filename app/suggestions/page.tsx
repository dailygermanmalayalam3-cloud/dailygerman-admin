"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Suggestion, SuggestionStatus, BlacklistedUser } from "@/types";
import {
  Lightbulb,
  Search,
  RefreshCw,
  Mail,
  Trash2,
  X,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Users,
  List,
  Ban,
  ShieldAlert,
  ShieldCheck,
  Plus,
} from "lucide-react";

export default function AdminSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [blacklistedUsers, setBlacklistedUsers] = useState<BlacklistedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // View Modes: "grouped" (default) | "flat" | "blacklist"
  const [viewMode, setViewMode] = useState<"grouped" | "flat" | "blacklist">("grouped");

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Accordion state for grouped view (set of group keys)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Detail Modal
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<SuggestionStatus>("unread");
  const [savingDetail, setSavingDetail] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState<string | null>(null);
  const [copiedPoliceDossier, setCopiedPoliceDossier] = useState(false);

  // Blacklist Modal
  const [blacklistModalTarget, setBlacklistModalTarget] = useState<{
    user_name?: string;
    email?: string;
    ip_address?: string;
    device_fingerprint?: string;
  } | null>(null);
  const [blacklistReason, setBlacklistReason] = useState("Malicious or abusive behavior");
  const [submittingBlacklist, setSubmittingBlacklist] = useState(false);

  // Manual Add Blacklist Modal
  const [showManualBlacklistModal, setShowManualBlacklistModal] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualIp, setManualIp] = useState("");
  const [manualFp, setManualFp] = useState("");
  const [manualReason, setManualReason] = useState("Manual administrative block");

  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Fetch Suggestions
  const fetchSuggestions = async () => {
    try {
      const res = await fetch("/api/admin/suggestions");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSuggestions(data.items || []);
    } catch (err: unknown) {
      setErrorMsg("Failed to load suggestions: " + (err as Error).message);
    }
  };

  // Fetch Blacklisted Users
  const fetchBlacklist = async () => {
    try {
      const res = await fetch("/api/admin/blacklist");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setBlacklistedUsers(data.items || []);
    } catch (err: unknown) {
      console.error("Failed to load blacklist:", err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setErrorMsg(null);
    await Promise.all([fetchSuggestions(), fetchBlacklist()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Helper: check if a user is blacklisted
  const findBlacklistMatch = (target: {
    email?: string;
    ip_address?: string;
    device_fingerprint?: string;
  }): BlacklistedUser | undefined => {
    const targetEmail = target.email?.trim().toLowerCase();
    return blacklistedUsers.find((b) => {
      if (b.device_fingerprint && target.device_fingerprint && b.device_fingerprint === target.device_fingerprint) {
        return true;
      }
      if (b.ip_address && target.ip_address && b.ip_address === target.ip_address) {
        return true;
      }
      if (b.email && targetEmail && b.email.trim().toLowerCase() === targetEmail) {
        return true;
      }
      return false;
    });
  };

  // Blacklist User Action
  const confirmBlacklist = async () => {
    if (!blacklistModalTarget) return;
    setSubmittingBlacklist(true);
    try {
      const res = await fetch("/api/admin/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: blacklistModalTarget.user_name,
          email: blacklistModalTarget.email,
          ip_address: blacklistModalTarget.ip_address,
          device_fingerprint: blacklistModalTarget.device_fingerprint,
          reason: blacklistReason.trim() || "Malicious or abusive behavior",
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setBlacklistedUsers((prev) => [data.item, ...prev]);
      notifySuccess(`User "${blacklistModalTarget.user_name || blacklistModalTarget.email || 'target'}" has been blacklisted.`);
      setBlacklistModalTarget(null);
      setBlacklistReason("Malicious or abusive behavior");
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setSubmittingBlacklist(false);
    }
  };

  // Unblacklist User Action
  const handleUnblacklist = async (blacklistId: string, label?: string) => {
    if (!confirm(`Are you sure you want to unblock ${label || "this user"}?`)) return;
    try {
      const res = await fetch(`/api/admin/blacklist?id=${blacklistId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setBlacklistedUsers((prev) => prev.filter((b) => b.id !== blacklistId));
      notifySuccess(`User unblocked successfully.`);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    return {
      total: suggestions.length,
      unread: suggestions.filter((s) => s.status === "unread").length,
      inProgress: suggestions.filter((s) => s.status === "in_progress").length,
      resolved: suggestions.filter((s) => s.status === "resolved").length,
      blacklisted: blacklistedUsers.length,
    };
  }, [suggestions, blacklistedUsers]);

  // Filtered flat suggestions
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

  // Grouped Suggestions by User (grouped by device_fingerprint or email)
  const groupedUsers = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        userName: string;
        email: string;
        ip_address: string;
        device_fingerprint: string;
        isp_name?: string;
        ip_city?: string;
        ip_country?: string;
        suggestions: Suggestion[];
        totalCount: number;
        unreadCount: number;
        latestDate: string;
        isBlacklisted: boolean;
        blacklistRecord?: BlacklistedUser;
      }
    >();

    // First collect all suggestions grouped by user
    for (const s of suggestions) {
      const groupKey = s.device_fingerprint || s.email.toLowerCase().trim();
      const existing = map.get(groupKey);

      if (!existing) {
        const bl = findBlacklistMatch({
          email: s.email,
          ip_address: s.ip_address,
          device_fingerprint: s.device_fingerprint,
        });

        map.set(groupKey, {
          key: groupKey,
          userName: s.name,
          email: s.email,
          ip_address: s.ip_address || "unknown",
          device_fingerprint: s.device_fingerprint || "",
          isp_name: s.isp_name || s.forensic_data?.network?.isp_name || "",
          ip_city: s.ip_city || "",
          ip_country: s.ip_country || "",
          suggestions: [s],
          totalCount: 1,
          unreadCount: s.status === "unread" ? 1 : 0,
          latestDate: s.created_at || "",
          isBlacklisted: !!bl,
          blacklistRecord: bl,
        });
      } else {
        existing.suggestions.push(s);
        existing.totalCount += 1;
        if (!existing.isp_name && (s.isp_name || s.forensic_data?.network?.isp_name)) {
          existing.isp_name = s.isp_name || s.forensic_data?.network?.isp_name;
        }
        if (!existing.ip_city && s.ip_city) {
          existing.ip_city = s.ip_city;
          existing.ip_country = s.ip_country || "";
        }
        if (s.status === "unread") existing.unreadCount += 1;
        if (s.created_at && (!existing.latestDate || new Date(s.created_at) > new Date(existing.latestDate))) {
          existing.latestDate = s.created_at;
          existing.userName = s.name; // Keep freshest name
          existing.email = s.email;
        }
      }
    }

    // Convert to array and filter based on statusFilter and searchQuery
    const groups = Array.from(map.values()).map((group) => {
      // Sort suggestions in group newest first
      const sorted = [...group.suggestions].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });

      // Filter suggestions within the group
      const matching = sorted.filter((s) => {
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

      return {
        ...group,
        filteredSuggestions: matching,
      };
    });

    // Filter out groups with 0 matching suggestions under current query
    const activeGroups = groups.filter((g) => g.filteredSuggestions.length > 0);

    // Sort groups newest activity first
    activeGroups.sort((a, b) => {
      const timeA = a.latestDate ? new Date(a.latestDate).getTime() : 0;
      const timeB = b.latestDate ? new Date(b.latestDate).getTime() : 0;
      return timeB - timeA;
    });

    return activeGroups;
  }, [suggestions, blacklistedUsers, statusFilter, searchQuery]);

  // Expand / Collapse group helpers
  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAllGroups = () => {
    const allKeys = new Set(groupedUsers.map((g) => g.key));
    setExpandedGroups(allKeys);
  };

  const collapseAllGroups = () => {
    setExpandedGroups(new Set());
  };

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
    if (s.status === "unread") {
      handleQuickStatusChange(s.id, "read");
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFingerprint(id);
      setTimeout(() => setCopiedFingerprint(null), 2000);
    } catch {}
  };

  const generatePoliceEvidenceDossier = (s: Suggestion): string => {
    const f = s.forensic_data || {};
    const net = f.network || {};
    const hints = f.client_hints || {};
    const tele = f.device_telemetry || {};
    const screen = tele.screen || {};
    const hardware = tele.hardware || {};
    const locale = tele.locale || {};

    const proxyChain = Array.isArray(net.proxy_chain)
      ? net.proxy_chain.join(" -> ")
      : s.ip_address || "N/A";

    const geoStr = [s.ip_city, s.ip_region, s.ip_country].filter(Boolean).join(", ") || "N/A";

    return `=====================================================
CYBER CRIME EVIDENCE DOSSIER: ABUSIVE / DEFAMATORY SUBMISSION
Platform: Daily German Malayalam (dailygerman.vercel.app)
Database Record UUID: ${s.id}
=====================================================

1. SUBMISSION DETAILS:
- Reported Name: ${s.name || "N/A"}
- Reported Email: ${s.email || "N/A"}
- Category / Subject: ${s.subject || "General Suggestion"}
- Submission Timestamp (UTC): ${s.created_at || "N/A"}
- Offending Message Content:
"${s.suggestion}"

2. NETWORK & ISP IDENTIFICATION (For ISP Section 91 CrPC Notice):
- Public Client IP: ${s.ip_address || "N/A"}
- Full Proxy / Hop Chain: ${proxyChain}
- Autonomous System Number (ASN): ${s.isp_asn || net.asn || "N/A"}
- Internet Service Provider (ISP): ${s.isp_name || net.isp_name || "N/A"}
- Geolocation (Edge Origin): ${geoStr}
- Coordinates: ${net.coordinates || "N/A"}
- Edge Timezone: ${net.edge_timezone || "N/A"}

3. DEVICE & HARDWARE TELEMETRY (Client Machine Fingerprint):
- Deterministic Machine ID: ${s.device_fingerprint || "N/A"}
- Hardware Device Model: ${hints.model || "N/A"}
- OS / Platform: ${hints.platform || "N/A"} (Version: ${hints.platform_version || "N/A"})
- Screen Resolution: ${screen.width && screen.height ? `${screen.width}x${screen.height} (Pixel Ratio: ${screen.pixel_ratio || 1})` : "N/A"}
- CPU Cores / Threads: ${hardware.concurrency || "N/A"}
- Device Memory: ${hardware.device_memory_gb ? `${hardware.device_memory_gb} GB` : "N/A"}
- Touch Screen Points: ${hardware.max_touch_points ?? "N/A"}
- Client Local Timezone: ${locale.timezone_name || "N/A"} (Offset: ${locale.timezone_offset_minutes ?? "N/A"} mins)
- Form Typing Duration: ${tele.interaction_duration_ms ? `${Math.round(tele.interaction_duration_ms / 1000)} seconds` : "N/A"}
- Full User-Agent: ${s.user_agent || "N/A"}

4. INVESTIGATIVE SUMMARY:
This evidence was captured upon submission. To identify the physical subscriber, the ISP (${s.isp_name || s.isp_asn || "Telecom Provider"}) must cross-reference Public IP ${s.ip_address} at exact timestamp ${s.created_at} UTC with their NAT/Radius allocation logs.
=====================================================`;
  };

  const handleCopyPoliceDossier = async (s: Suggestion) => {
    try {
      const dossier = generatePoliceEvidenceDossier(s);
      await navigator.clipboard.writeText(dossier);
      setCopiedPoliceDossier(true);
      setTimeout(() => setCopiedPoliceDossier(false), 3000);
      notifySuccess("Forensic Evidence Dossier copied! Ready to attach to Cyber Cell complaint.");
    } catch {
      notifySuccess("Failed to copy automatically. Please copy the text manually.");
    }
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
              User Suggestions &amp; Moderation
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase">
            User Suggestions Hub
          </h1>
          <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 mt-1">
            Review user feedback grouped by user identity, track resolution, and blacklist malicious actors.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAllData}
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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

        <div
          onClick={() => setViewMode("blacklist")}
          className="border-2 border-red-600 dark:border-red-500 p-4 bg-red-50 dark:bg-red-950/20 shadow-[3px_3px_0px_0px_rgba(220,38,38,1)] cursor-pointer hover:bg-red-100 transition-colors"
        >
          <span className="text-[10px] font-black uppercase text-red-700 dark:text-red-400 block mb-1">
            Blacklisted Users
          </span>
          <p className="text-2xl sm:text-3xl font-black text-red-700 dark:text-red-400">
            {metrics.blacklisted}
          </p>
        </div>
      </div>

      {/* Control Bar: View Switcher, Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b-2 border-black dark:border-neutral-800 pb-3">
        {/* Left: View Mode Switcher */}
        <div className="flex items-center gap-1 bg-neutral-200 dark:bg-neutral-800 p-1 border border-black dark:border-neutral-700">
          <button
            type="button"
            onClick={() => setViewMode("grouped")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase transition-all ${
              viewMode === "grouped"
                ? "bg-[#ffe600] text-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] border border-black"
                : "text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Grouped by User ({groupedUsers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("flat")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase transition-all ${
              viewMode === "flat"
                ? "bg-[#ffe600] text-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] border border-black"
                : "text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Flat List ({filteredSuggestions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("blacklist")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase transition-all ${
              viewMode === "blacklist"
                ? "bg-red-600 text-white shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] border border-black"
                : "text-neutral-700 dark:text-neutral-300 hover:text-red-600"
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Blacklist ({blacklistedUsers.length})</span>
          </button>
        </div>

        {/* Right: Search & Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {viewMode !== "blacklist" && (
            <div className="flex items-center gap-1 flex-wrap">
              {(["all", "unread", "read", "in_progress", "resolved", "archived"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-1 text-[11px] font-black uppercase border transition-all cursor-pointer ${
                    statusFilter === st
                      ? "bg-[#ffe600] text-black border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                      : "bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {st === "all" ? "All" : st.replace("_", " ")}
                </button>
              ))}
            </div>
          )}

          {/* Search Bar */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, email, text, IP..."
              className="w-full pl-8 pr-3 py-1 text-xs font-medium border border-black dark:border-neutral-700 bg-white dark:bg-[#141414]"
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: GROUPED BY USER (DEFAULT)                               */}
      {/* ============================================================== */}
      {viewMode === "grouped" && (
        <div className="space-y-4">
          {/* Quick Accordion Toolbar */}
          <div className="flex items-center justify-between text-xs font-bold text-neutral-600 dark:text-neutral-400 px-1">
            <span>
              Showing <strong className="text-black dark:text-white">{groupedUsers.length}</strong> unique users
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAllGroups}
                className="hover:underline text-[11px] font-black uppercase text-black dark:text-white cursor-pointer"
              >
                Expand All
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={collapseAllGroups}
                className="hover:underline text-[11px] font-black uppercase text-black dark:text-white cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          </div>

          {groupedUsers.length === 0 ? (
            <div className="p-12 border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#141414] text-center text-neutral-500 font-medium">
              {loading
                ? "Loading suggestions..."
                : "No users or suggestions match your current filter or search criteria."}
            </div>
          ) : (
            groupedUsers.map((user) => {
              const isExpanded = expandedGroups.has(user.key);

              return (
                <div
                  key={user.key}
                  className={`border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#141414] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(250,204,21,0.2)] transition-all ${
                    user.isBlacklisted ? "border-red-600 dark:border-red-500" : ""
                  }`}
                >
                  {/* User Group Header */}
                  <div className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 ${
                    isExpanded ? "border-black dark:border-neutral-700" : "border-transparent"
                  } ${user.isBlacklisted ? "bg-red-50/50 dark:bg-red-950/20" : "bg-neutral-50/70 dark:bg-neutral-900/50"}`}>
                    
                    {/* User Identity Info */}
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 border-2 border-black flex items-center justify-center font-black text-sm shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                        user.isBlacklisted ? "bg-red-600 text-white" : "bg-[#ffe600] text-black"
                      }`}>
                        {user.userName.charAt(0).toUpperCase()}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-base text-black dark:text-white">
                            {user.userName}
                          </h3>
                          {user.isBlacklisted && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-600 border border-black text-white font-black text-[10px] uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                              <ShieldAlert className="w-3 h-3" />
                              <span>Blacklisted</span>
                            </span>
                          )}
                          {user.unreadCount > 0 && (
                            <span className="px-2 py-0.5 bg-[#ffe600] border border-black text-black font-black text-[10px] uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                              ● {user.unreadCount} Unread
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold text-[10px] uppercase border border-neutral-400">
                            {user.totalCount} {user.totalCount === 1 ? "Suggestion" : "Suggestions"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400 flex-wrap">
                          <a
                            href={`mailto:${user.email}`}
                            className="inline-flex items-center gap-1 font-semibold hover:text-black dark:hover:text-white hover:underline"
                          >
                            <Mail className="w-3 h-3" />
                            <span>{user.email}</span>
                          </a>

                          <span>•</span>
                          <span className="font-mono text-[11px]">IP: {user.ip_address}</span>

                          {(user.ip_city || user.isp_name) && (
                            <>
                              <span>•</span>
                              <span className="font-bold text-[11px] text-neutral-700 dark:text-neutral-300">
                                📍 {[user.ip_city, user.ip_country].filter(Boolean).join(", ")} {user.isp_name ? `(${user.isp_name})` : ""}
                              </span>
                            </>
                          )}

                          {user.device_fingerprint && (
                            <>
                              <span>•</span>
                              <div className="inline-flex items-center gap-1 font-mono text-[11px]">
                                <span>ID: {user.device_fingerprint.slice(0, 8)}...</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(user.device_fingerprint, user.key)}
                                  className="p-0.5 border border-neutral-300 hover:bg-neutral-200 text-neutral-600"
                                  title="Copy Machine ID"
                                >
                                  {copiedFingerprint === user.key ? (
                                    <Check className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {user.isBlacklisted && user.blacklistRecord?.reason && (
                          <p className="text-[11px] font-bold text-red-700 dark:text-red-400 pt-0.5">
                            Block Reason: &quot;{user.blacklistRecord.reason}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons: Blacklist & Expand/Collapse */}
                    <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                      {user.isBlacklisted ? (
                        <button
                          type="button"
                          onClick={() => user.blacklistRecord && handleUnblacklist(user.blacklistRecord.id, user.userName)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase bg-white dark:bg-neutral-800 border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Unblock User</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setBlacklistModalTarget({
                              user_name: user.userName,
                              email: user.email,
                              ip_address: user.ip_address,
                              device_fingerprint: user.device_fingerprint,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase bg-white dark:bg-neutral-800 border-2 border-red-600 text-red-700 dark:text-red-400 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Blacklist User</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleGroup(user.key)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-black uppercase bg-neutral-100 dark:bg-neutral-800 border-2 border-black dark:border-neutral-700 hover:bg-[#ffe600] hover:text-black transition-colors cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                      >
                        <span>{isExpanded ? "Collapse" : "View"} ({user.filteredSuggestions.length})</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Suggestions List */}
                  {isExpanded && (
                    <div className="p-4 space-y-3 bg-white dark:bg-[#141414]">
                      <div className="divide-y divide-neutral-200 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800">
                        {user.filteredSuggestions.map((s) => (
                          <div
                            key={s.id}
                            className={`p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#fffdf0] dark:hover:bg-neutral-900/60 transition-colors ${
                              s.status === "unread" ? "bg-amber-50/50 dark:bg-amber-950/10 font-medium" : ""
                            }`}
                          >
                            <div className="space-y-1 max-w-3xl">
                              <div className="flex items-center gap-2 flex-wrap">
                                {statusBadge(s.status)}
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">
                                  {s.subject || "General Suggestion"}
                                </span>
                                <span className="text-[11px] text-neutral-500 font-medium">
                                  {s.created_at ? new Date(s.created_at).toLocaleString() : "—"}
                                </span>
                              </div>

                              <p className="text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 leading-relaxed">
                                {s.suggestion}
                              </p>

                              {s.admin_notes && (
                                <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-400 italic">
                                  Admin Note: {s.admin_notes}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                              <button
                                type="button"
                                onClick={() => openDetailModal(s)}
                                className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 border border-black dark:border-neutral-700 text-xs font-black uppercase hover:bg-[#ffe600] hover:text-black transition-colors"
                              >
                                Review
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(s.id, s.name)}
                                className="p-1.5 border border-neutral-300 dark:border-neutral-700 hover:bg-red-600 hover:text-white text-neutral-600 dark:text-neutral-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: FLAT LIST (CHRONOLOGICAL)                              */}
      {/* ============================================================== */}
      {viewMode === "flat" && (
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
                filteredSuggestions.map((s) => {
                  const bl = findBlacklistMatch({
                    email: s.email,
                    ip_address: s.ip_address,
                    device_fingerprint: s.device_fingerprint,
                  });

                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-[#fffdf0] dark:hover:bg-neutral-900/60 transition-colors ${
                        s.status === "unread" ? "bg-amber-50/40 dark:bg-amber-950/10 font-semibold" : ""
                      } ${bl ? "bg-red-50/30 dark:bg-red-950/20" : ""}`}
                    >
                      <td className="p-3 whitespace-nowrap align-top">
                        <div className="space-y-1">
                          {statusBadge(s.status)}
                          {bl && (
                            <span className="block px-1.5 py-0.5 bg-red-600 text-white font-black text-[9px] uppercase">
                              Blocked
                            </span>
                          )}
                        </div>
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
                        {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                      </td>

                      {/* Actions */}
                      <td className="p-3 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDetailModal(s)}
                            className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 border border-black dark:border-neutral-700 text-[11px] font-black uppercase hover:bg-[#ffe600] hover:text-black transition-colors"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(s.id, s.name)}
                            className="p-1 border border-neutral-300 dark:border-neutral-700 hover:bg-red-600 hover:text-white text-neutral-600 dark:text-neutral-400 transition-colors"
                            title="Delete"
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
      )}

      {/* ============================================================== */}
      {/* VIEW 3: BLACKLIST REGISTRY VIEW                                */}
      {/* ============================================================== */}
      {viewMode === "blacklist" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">
                Blacklisted Users Registry
              </h2>
              <p className="text-xs text-neutral-500">
                Any future suggestion submitted matching these device fingerprints, IPs, or emails will be blocked automatically.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowManualBlacklistModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-700 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Block New User</span>
            </button>
          </div>

          <div className="border-2 border-black dark:border-neutral-700 bg-white dark:bg-[#141414] overflow-x-auto shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(250,204,21,0.2)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-black dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 font-black uppercase text-black dark:text-white">
                  <th className="p-3">User &amp; Email</th>
                  <th className="p-3">IP Address</th>
                  <th className="p-3">Device Machine ID</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Blocked Date</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {blacklistedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-neutral-500 font-medium">
                      No users are currently blacklisted.
                    </td>
                  </tr>
                ) : (
                  blacklistedUsers.map((b) => (
                    <tr key={b.id} className="hover:bg-red-50/30 dark:hover:bg-neutral-900/60 transition-colors">
                      <td className="p-3 align-top font-bold">
                        <p className="text-black dark:text-white">{b.user_name || "Unknown Name"}</p>
                        <p className="text-neutral-500 text-[11px]">{b.email || "No email"}</p>
                      </td>
                      <td className="p-3 align-top font-mono text-[11px]">
                        {b.ip_address || "—"}
                      </td>
                      <td className="p-3 align-top font-mono text-[11px]">
                        {b.device_fingerprint ? `${b.device_fingerprint.slice(0, 16)}...` : "—"}
                      </td>
                      <td className="p-3 align-top text-red-700 dark:text-red-400 font-medium">
                        {b.reason || "Malicious behavior"}
                      </td>
                      <td className="p-3 align-top text-neutral-500 text-[11px]">
                        {b.created_at ? new Date(b.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="p-3 align-top text-right">
                        <button
                          type="button"
                          onClick={() => handleUnblacklist(b.id, b.user_name || b.email)}
                          className="px-2.5 py-1 text-xs font-black uppercase border border-neutral-400 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                        >
                          Unblock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

            {/* Blacklist Alert Banner in Modal */}
            {(() => {
              const match = findBlacklistMatch({
                email: selectedSuggestion.email,
                ip_address: selectedSuggestion.ip_address,
                device_fingerprint: selectedSuggestion.device_fingerprint,
              });
              if (match) {
                return (
                  <div className="p-3 bg-red-100 dark:bg-red-950/40 border-2 border-red-600 text-red-900 dark:text-red-200 text-xs font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                      <span>This user is currently <strong>BLACKLISTED</strong> ({match.reason}).</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnblacklist(match.id, selectedSuggestion.name)}
                      className="px-2 py-0.5 bg-white dark:bg-neutral-800 border border-red-600 text-red-700 text-[10px] uppercase font-black hover:bg-red-600 hover:text-white"
                    >
                      Unblock
                    </button>
                  </div>
                );
              }
              return null;
            })()}

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

              {/* Cyber Crime & Network Forensic Dossier */}
              <div className="pt-3 border-t-2 border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-3.5 border border-red-200 dark:border-red-900/50 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-red-200 dark:border-red-900 pb-2">
                  <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400 font-black text-xs uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Cyber Crime &amp; Network Forensic Dossier</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyPoliceDossier(selectedSuggestion)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 text-white font-black text-[11px] uppercase border border-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] hover:bg-red-700 cursor-pointer"
                  >
                    {copiedPoliceDossier ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Copied for Cyber Cell!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Police / Cyber Cell Dossier</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* 1. IP Address & Proxy Chain */}
                  <div>
                    <span className="text-[10px] font-black uppercase text-neutral-500 block mb-0.5">
                      Client IP (IPv4 / IPv6)
                    </span>
                    <p className="font-mono font-bold text-xs text-black dark:text-white">
                      {selectedSuggestion.ip_address || "unknown"}
                    </p>
                    {selectedSuggestion.forensic_data?.network?.proxy_chain && selectedSuggestion.forensic_data.network.proxy_chain.length > 1 && (
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 block mt-0.5">
                        ⚠️ Proxy/VPN Hops: {selectedSuggestion.forensic_data.network.proxy_chain.length}
                      </span>
                    )}
                  </div>

                  {/* 2. ISP & Autonomous System */}
                  <div>
                    <span className="text-[10px] font-black uppercase text-neutral-500 block mb-0.5">
                      Internet Service Provider (ISP)
                    </span>
                    <p className="font-bold text-xs text-neutral-800 dark:text-neutral-200 truncate">
                      {selectedSuggestion.isp_name || selectedSuggestion.forensic_data?.network?.isp_name || "Unknown / Local"}
                    </p>
                    {(selectedSuggestion.isp_asn || selectedSuggestion.forensic_data?.network?.asn) && (
                      <span className="font-mono text-[10px] text-neutral-500 font-bold block">
                        ASN: {selectedSuggestion.isp_asn || selectedSuggestion.forensic_data?.network?.asn}
                      </span>
                    )}
                  </div>

                  {/* 3. Edge Geolocation */}
                  <div>
                    <span className="text-[10px] font-black uppercase text-neutral-500 block mb-0.5">
                      Edge Geolocation
                    </span>
                    <p className="font-bold text-xs text-neutral-800 dark:text-neutral-200">
                      {[selectedSuggestion.ip_city, selectedSuggestion.ip_region, selectedSuggestion.ip_country]
                        .filter(Boolean)
                        .join(", ") || "Unavailable"}
                    </p>
                    {selectedSuggestion.forensic_data?.network?.edge_timezone && (
                      <span className="text-[10px] text-neutral-500 font-bold block">
                        TZ: {selectedSuggestion.forensic_data.network.edge_timezone}
                      </span>
                    )}
                  </div>

                  {/* 4. Hardware / Device Model */}
                  <div>
                    <span className="text-[10px] font-black uppercase text-neutral-500 block mb-0.5">
                      Device Model &amp; OS
                    </span>
                    <p className="font-bold text-xs text-neutral-800 dark:text-neutral-200 truncate">
                      {selectedSuggestion.forensic_data?.client_hints?.model || selectedSuggestion.forensic_data?.client_hints?.platform || selectedSuggestion.user_agent?.split(" ")[0] || "Unknown"}
                      {selectedSuggestion.forensic_data?.client_hints?.platform && (
                        <span className="text-[10px] text-neutral-500 font-normal ml-1">
                          ({selectedSuggestion.forensic_data.client_hints.platform})
                        </span>
                      )}
                    </p>
                  </div>

                  {/* 5. Screen & Hardware Specs */}
                  <div>
                    <span className="text-[10px] font-black uppercase text-neutral-500 block mb-0.5">
                      Hardware &amp; Screen
                    </span>
                    <p className="font-mono text-xs text-neutral-700 dark:text-neutral-300">
                      {selectedSuggestion.forensic_data?.device_telemetry?.screen?.width
                        ? `${selectedSuggestion.forensic_data.device_telemetry.screen.width}x${selectedSuggestion.forensic_data.device_telemetry.screen.height}`
                        : "N/A"}
                      {selectedSuggestion.forensic_data?.device_telemetry?.hardware?.concurrency && (
                        <span className="text-neutral-500 font-sans ml-1 text-[10px]">
                          ({selectedSuggestion.forensic_data.device_telemetry.hardware.concurrency} cores)
                        </span>
                      )}
                    </p>
                  </div>

                  {/* 6. Machine Fingerprint */}
                  <div>
                    <span className="text-[10px] font-black uppercase text-neutral-500 block mb-0.5">
                      Machine Hash ID
                    </span>
                    <div className="flex items-center gap-1.5">
                      <p className="font-mono font-bold text-[11px] truncate">
                        {selectedSuggestion.device_fingerprint || "unknown"}
                      </p>
                      {selectedSuggestion.device_fingerprint && (
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedSuggestion.device_fingerprint || "", "modal-fp")}
                          className="p-1 border border-neutral-300 hover:bg-neutral-200 text-neutral-700 shrink-0"
                          title="Copy Machine ID"
                        >
                          {copiedFingerprint === "modal-fp" ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <a
                  href={`mailto:${selectedSuggestion.email}?subject=Re: Your suggestion on Daily German Malayalam&body=Hi ${selectedSuggestion.name},%0D%0A%0D%0AThank you for sharing your suggestion with us:%0D%0A"${encodeURIComponent(selectedSuggestion.suggestion)}"%0D%0A%0D%0A`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-black dark:border-neutral-700 text-xs font-bold uppercase hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Reply Email</span>
                </a>

                {/* Blacklist toggle button in modal */}
                {!findBlacklistMatch({
                  email: selectedSuggestion.email,
                  ip_address: selectedSuggestion.ip_address,
                  device_fingerprint: selectedSuggestion.device_fingerprint,
                }) && (
                  <button
                    type="button"
                    onClick={() => {
                      setBlacklistModalTarget({
                        user_name: selectedSuggestion.name,
                        email: selectedSuggestion.email,
                        ip_address: selectedSuggestion.ip_address,
                        device_fingerprint: selectedSuggestion.device_fingerprint,
                      });
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 border border-red-600 text-red-600 hover:bg-red-600 hover:text-white text-xs font-bold uppercase transition-colors"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Blacklist</span>
                  </button>
                )}
              </div>

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

      {/* ============================================================== */}
      {/* MODAL: CONFIRM BLACKLIST MODAL                                 */}
      {/* ============================================================== */}
      {blacklistModalTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="border-2 border-black bg-white dark:bg-[#141414] p-6 max-w-md w-full space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2 text-red-600 border-b-2 border-red-600 pb-2">
              <Ban className="w-5 h-5" />
              <h3 className="font-black text-base uppercase">Confirm User Blacklist</h3>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Are you sure you want to blacklist <strong>{blacklistModalTarget.user_name || blacklistModalTarget.email}</strong>?
              Submissions from their device fingerprint, IP address, or email address will be rejected immediately with HTTP 403 Forbidden.
            </p>

            <div className="p-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-[11px] font-mono space-y-1">
              {blacklistModalTarget.email && <p>Email: {blacklistModalTarget.email}</p>}
              {blacklistModalTarget.ip_address && <p>IP: {blacklistModalTarget.ip_address}</p>}
              {blacklistModalTarget.device_fingerprint && (
                <p>Machine ID: {blacklistModalTarget.device_fingerprint.slice(0, 16)}...</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-neutral-500 block">
                Blacklist Reason
              </label>
              <input
                type="text"
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                placeholder="e.g. Malicious spam, offensive remarks..."
                className="w-full p-2 text-xs font-medium border border-black dark:border-neutral-700 bg-white dark:bg-[#141414]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBlacklistModalTarget(null)}
                className="px-3 py-1.5 border border-black dark:border-neutral-700 text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBlacklist}
                disabled={submittingBlacklist}
                className="px-4 py-1.5 bg-red-600 text-white font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-700"
              >
                {submittingBlacklist ? "Blocking..." : "Confirm Blacklist"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: MANUAL ADD BLACKLIST ENTRY                              */}
      {/* ============================================================== */}
      {showManualBlacklistModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="border-2 border-black bg-white dark:bg-[#141414] p-6 max-w-md w-full space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <div className="flex items-center gap-2 text-red-600">
                <Ban className="w-5 h-5" />
                <h3 className="font-black text-base uppercase">Add Manual Blacklist Entry</h3>
              </div>
              <button onClick={() => setShowManualBlacklistModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Provide at least one identifier (email, IP address, or machine ID) to block.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-black uppercase text-neutral-500 block mb-1">User Name (Optional)</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Spam Account"
                  className="w-full p-2 border border-black dark:border-neutral-700 bg-white dark:bg-[#141414]"
                />
              </div>

              <div>
                <label className="font-black uppercase text-neutral-500 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="spammer@example.com"
                  className="w-full p-2 border border-black dark:border-neutral-700 bg-white dark:bg-[#141414]"
                />
              </div>

              <div>
                <label className="font-black uppercase text-neutral-500 block mb-1">IP Address</label>
                <input
                  type="text"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  placeholder="e.g. 192.168.1.1"
                  className="w-full p-2 border border-black dark:border-neutral-700 bg-white dark:bg-[#141414]"
                />
              </div>

              <div>
                <label className="font-black uppercase text-neutral-500 block mb-1">Device Machine ID</label>
                <input
                  type="text"
                  value={manualFp}
                  onChange={(e) => setManualFp(e.target.value)}
                  placeholder="SHA-256 fingerprint hash"
                  className="w-full p-2 border border-black dark:border-neutral-700 bg-white dark:bg-[#141414]"
                />
              </div>

              <div>
                <label className="font-black uppercase text-neutral-500 block mb-1">Reason</label>
                <input
                  type="text"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="Reason for blocking..."
                  className="w-full p-2 border border-black dark:border-neutral-700 bg-white dark:bg-[#141414]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowManualBlacklistModal(false)}
                className="px-3 py-1.5 border border-black text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!manualEmail && !manualIp && !manualFp) {
                    alert("Please provide at least one identifier (email, IP, or machine ID).");
                    return;
                  }
                  try {
                    const res = await fetch("/api/admin/blacklist", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        user_name: manualName,
                        email: manualEmail,
                        ip_address: manualIp,
                        device_fingerprint: manualFp,
                        reason: manualReason,
                      }),
                    });
                    const data = await res.json();
                    if (!data.success) throw new Error(data.error);
                    setBlacklistedUsers((prev) => [data.item, ...prev]);
                    notifySuccess("User blocked successfully.");
                    setShowManualBlacklistModal(false);
                    setManualName("");
                    setManualEmail("");
                    setManualIp("");
                    setManualFp("");
                  } catch (err: unknown) {
                    alert((err as Error).message);
                  }
                }}
                className="px-4 py-1.5 bg-red-600 text-white font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-red-700"
              >
                Block User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
