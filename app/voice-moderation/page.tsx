"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  AdminStealthListener,
  VoiceReportRow,
  VoiceGroupRow,
  LiveMonitoredParticipant,
  findActiveSpeakersAtSecond,
  formatReportDuration,
} from "@/lib/voice/moderation-engine";
import {
  ShieldAlert,
  Headphones,
  Radio,
  Ban,
  CheckCircle2,
  Trash2,
  Volume2,
  MicOff,
  UserX,
  XCircle,
  RefreshCw,
  Clock,
  Users,
  EyeOff,
  UserCheck,
  Mail,
  Copy,
  Check,
  ExternalLink,
  Search,
  Calendar,
} from "lucide-react";

export default function VoiceModerationPage() {
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState<"reports" | "live">("reports");
  const [reports, setReports] = useState<VoiceReportRow[]>([]);
  const [groups, setGroups] = useState<VoiceGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Group filters & search
  const [groupStatusFilter, setGroupStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Audio playback current time per reportId for synchronized speaker timeline highlight
  const [playbackTimes, setPlaybackTimes] = useState<Record<string, number>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  // Stealth Listen-In state (`moderation:listener`)
  const [listeningGroup, setListeningGroup] = useState<VoiceGroupRow | null>(null);
  const [liveParticipants, setLiveParticipants] = useState<LiveMonitoredParticipant[]>([]);
  const listenerRef = useRef<AdminStealthListener | null>(null);

  const fetchModerationData = useCallback(async () => {
    setLoading(true);
    try {
      const reportsPromise = supabase
        ? supabase
            .from("voice_reports")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [] });

      const groupsPromise = fetch("/api/admin/voice-groups?status=all")
        .then((r) => r.json())
        .catch(() => null);

      const [reportsRes, groupsApiRes] = await Promise.all([reportsPromise, groupsPromise]);

      if (reportsRes?.data) {
        setReports(reportsRes.data as VoiceReportRow[]);
      }

      if (groupsApiRes && groupsApiRes.success && Array.isArray(groupsApiRes.groups)) {
        setGroups(groupsApiRes.groups as VoiceGroupRow[]);
      } else if (supabase) {
        // Fallback to direct supabase client if endpoint is unavailable
        const { data } = await supabase
          .from("voice_groups")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);
        if (data) {
          setGroups(data as VoiceGroupRow[]);
        }
      }
    } catch (err: unknown) {
      console.error("Failed to load moderation data:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    queueMicrotask(() => {
      fetchModerationData();
    });
  }, [fetchModerationData]);

  useEffect(() => {
    return () => {
      listenerRef.current?.stopStealthListen();
    };
  }, []);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  // Count how many times each user UUID has been reported
  const reportCountsByUser = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of reports) {
      map[r.reported_id] = (map[r.reported_id] || 0) + 1;
    }
    return map;
  }, [reports]);

  const openReportsCount = useMemo(
    () => reports.filter((r) => r.status === "open").length,
    [reports]
  );

  const activeGroupsCount = useMemo(
    () => groups.filter((g) => g.is_active).length,
    [groups]
  );

  const inactiveGroupsCount = useMemo(
    () => groups.filter((g) => !g.is_active).length,
    [groups]
  );

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (groupStatusFilter === "active" && !g.is_active) return false;
      if (groupStatusFilter === "inactive" && g.is_active) return false;
      if (groupSearchQuery.trim()) {
        const q = groupSearchQuery.trim().toLowerCase();
        const matchName = g.name.toLowerCase().includes(q);
        const matchTopic = (g.topic || "").toLowerCase().includes(q);
        const matchHostName = (g.host_name || "").toLowerCase().includes(q);
        const matchHostEmail = (g.host_email || "").toLowerCase().includes(q);
        const matchHostFullName = (g.host_full_name || "").toLowerCase().includes(q);
        const matchHostId = (g.host_id || "").toLowerCase().includes(q);
        return matchName || matchTopic || matchHostName || matchHostEmail || matchHostFullName || matchHostId;
      }
      return true;
    });
  }, [groups, groupStatusFilter, groupSearchQuery]);

  const handleStartStealthListen = (group: VoiceGroupRow) => {
    if (!listenerRef.current) {
      listenerRef.current = new AdminStealthListener(crypto.randomUUID(), (list) => {
        setLiveParticipants(list);
      });
    }
    setListeningGroup(group);
    setLiveParticipants([]);
    listenerRef.current.startStealthListen(group.id);
    setActiveTab("live");
  };

  const handleStopStealthListen = () => {
    listenerRef.current?.stopStealthListen();
    setListeningGroup(null);
    setLiveParticipants([]);
  };

  const handleBanUser = async (params: {
    userId: string;
    userName: string;
    userEmail: string;
    reason: string;
    reportId?: string;
  }) => {
    if (!supabase) return;
    const banId = crypto.randomUUID();

    await supabase.from("blacklisted_users").insert({
      id: banId,
      user_id: params.userId,
      user_name: params.userName,
      email: params.userEmail || null,
      reason: `Voice Room Ban: ${params.reason}`,
    });

    if (params.reportId) {
      await supabase
        .from("voice_reports")
        .update({ status: "banned" })
        .eq("id", params.reportId);
    }

    // Also kick immediately if we are connected via Stealth Listener
    listenerRef.current?.sendModerationCommand("kick-user", params.userId);

    setActionMessage(`Banned ${params.userName} (${params.userEmail || params.userId}) from all voice groups.`);
    fetchModerationData();
  };

  const handleUpdateReportStatus = async (reportId: string, status: "reviewed" | "dismissed") => {
    if (!supabase) return;
    await supabase.from("voice_reports").update({ status }).eq("id", reportId);
    setActionMessage(`Report marked as ${status}.`);
    fetchModerationData();
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!supabase) return;
    const hubUrl = process.env.NEXT_PUBLIC_VOICE_HUB_URL || "";
    if (hubUrl) {
      try {
        await fetch(`${hubUrl.replace(/\/$/, "")}/api/reports/${reportId}`, {
          method: "DELETE",
        });
      } catch {}
    }
    await supabase.from("voice_reports").delete().eq("id", reportId);
    setActionMessage("Report and audio evidence deleted.");
    fetchModerationData();
  };

  const handleDissolveGroup = async (group: VoiceGroupRow) => {
    try {
      const res = await fetch("/api/admin/voice-groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: group.id, action: "dissolve" }),
      });
      if (!res.ok && supabase) {
        await supabase
          .from("voice_groups")
          .update({ is_active: false, participant_count: 0 })
          .eq("id", group.id);
      }
    } catch {
      if (supabase) {
        await supabase
          .from("voice_groups")
          .update({ is_active: false, participant_count: 0 })
          .eq("id", group.id);
      }
    }

    if (listeningGroup?.id === group.id) {
      listenerRef.current?.sendModerationCommand("dissolve-room");
      handleStopStealthListen();
    }
    setActionMessage(`Closed voice group "${group.name}".`);
    fetchModerationData();
  };

  const handleDeleteGroup = async (group: VoiceGroupRow) => {
    if (!window.confirm(`Are you sure you want to permanently delete the room "${group.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/voice-groups?id=${group.id}`, {
        method: "DELETE",
      });
      if (!res.ok && supabase) {
        await supabase.from("voice_groups").delete().eq("id", group.id);
      }
    } catch {
      if (supabase) {
        await supabase.from("voice_groups").delete().eq("id", group.id);
      }
    }

    if (listeningGroup?.id === group.id) {
      handleStopStealthListen();
    }
    setActionMessage(`Permanently deleted voice room "${group.name}".`);
    fetchModerationData();
  };

  const handleSeekAudio = (reportId: string, startSec: number) => {
    const el = audioRefs.current[reportId];
    if (el) {
      el.currentTime = startSec;
      el.play().catch(() => {});
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SPRECHEN CAFÉ • VOICE MODERATION & STEALTH LISTEN-IN</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Voice Groups, Room Creators & Audio Evidence
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            View who created each voice room, creator verified emails and account details, monitor live conversations silently as{" "}
            <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
              moderation:listener
            </code>{" "}
            (100% invisible to learners), or review reported audio evidence.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchModerationData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-indigo-900 dark:text-indigo-200">
          <span>{actionMessage}</span>
          <button type="button" onClick={() => setActionMessage(null)} className="cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* ACTIVE STEALTH LISTEN-IN CONSOLE (`moderation:listener`) */}
      {listeningGroup && (
        <div className="rounded-3xl p-6 border-2 border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-900 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white">
                <EyeOff className="w-3.5 h-3.5" />
                <span>STEALTH LISTEN-IN ACTIVE (moderation:listener • 100% Invisible to Learners)</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Listening to: {listeningGroup.name} (Level {listeningGroup.level})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Creator:{" "}
                <strong className="text-slate-900 dark:text-white">
                  {listeningGroup.host_full_name || listeningGroup.host_name}
                </strong>
                {listeningGroup.host_email && (
                  <span className="font-mono text-slate-600 dark:text-slate-300 ml-1">
                    ({listeningGroup.host_email})
                  </span>
                )}
                {listeningGroup.host_name && listeningGroup.host_name !== listeningGroup.host_full_name && (
                  <span className="italic ml-1">• Alias: "{listeningGroup.host_name}"</span>
                )}
                {" • Topic: "}{listeningGroup.topic || "General Practice"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleDissolveGroup(listeningGroup)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Close Room</span>
              </button>
              <button
                type="button"
                onClick={handleStopStealthListen}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <span>Stop Listening</span>
              </button>
            </div>
          </div>

          {liveParticipants.length === 0 ? (
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 py-4">
              Connected silently as <code className="font-mono">moderation:listener</code>. Waiting for active speakers in
              this room...
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {liveParticipants.map((p) => {
                const priorReports = reportCountsByUser[p.userId] || 0;
                return (
                  <div
                    key={p.peerId}
                    className={`p-4 rounded-2xl border space-y-3 ${
                      priorReports > 0
                        ? "border-rose-400 dark:border-rose-700 bg-rose-50/40 dark:bg-rose-950/20"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {p.userName} {p.isGuest ? "(Guest Listener)" : ""}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {p.userEmail || p.userId}
                        </p>
                      </div>
                      {priorReports > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white shrink-0">
                          {priorReports} Report{priorReports > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Live Volume Meter */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className={p.speaking ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}>
                          {p.muted ? "Muted" : p.speaking ? "Speaking Live" : "Mic Open (Silent)"}
                        </span>
                        <span className="text-slate-400">{p.volume}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-150"
                          style={{ width: `${p.muted ? 0 : Math.max(6, p.volume)}%` }}
                        />
                      </div>
                    </div>

                    {/* Instant Admin Controls per Participant */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => listenerRef.current?.sendModerationCommand("force-mute", p.userId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer"
                      >
                        <MicOff className="w-3 h-3" />
                        <span>Mute</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => listenerRef.current?.sendModerationCommand("kick-user", p.userId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 cursor-pointer"
                      >
                        <UserX className="w-3 h-3" />
                        <span>Kick</span>
                      </button>
                      {!p.isGuest && (
                        <button
                          type="button"
                          onClick={() =>
                            handleBanUser({
                              userId: p.userId,
                              userName: p.userName,
                              userEmail: p.userEmail,
                              reason: `Flagged during live Stealth Listen-In in "${listeningGroup.name}"`,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-600 text-white cursor-pointer"
                        >
                          <Ban className="w-3 h-3" />
                          <span>Ban</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold cursor-pointer transition-all ${
            activeTab === "reports"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Reported Conversations & Audio Evidence ({reports.length})</span>
          {openReportsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-500 text-white">
              {openReportsCount} Open
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("live")}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold cursor-pointer transition-all ${
            activeTab === "live"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span>Voice Groups & Creators ({groups.length})</span>
          {activeGroupsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500 text-white flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              {activeGroupsCount} Active
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: REPORTED CONVERSATIONS & AUDIO EVIDENCE PLAYER */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          {loading ? (
            <div className="h-40 rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
          ) : reports.length === 0 ? (
            <div className="rounded-3xl p-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Zero Reports Pending</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                When any learner clicks Report in a voice room, the conversation audio recording and speaker timeline will
                appear here immediately.
              </p>
            </div>
          ) : (
            reports.map((report) => {
              const currentSec = playbackTimes[report.id] || 0;
              const timeline = Array.isArray(report.speaker_timeline) ? report.speaker_timeline : [];
              const activeSpeakersNow = findActiveSpeakersAtSecond(timeline, currentSec);
              const totalUserReports = reportCountsByUser[report.reported_id] || 1;

              return (
                <div
                  key={report.id}
                  className="rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-xs"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                            report.status === "open"
                              ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300"
                              : report.status === "banned"
                              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                              : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {report.status}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                          Reported {totalUserReports}× Total
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(report.created_at).toLocaleString()}
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        Reported User: <span className="text-rose-600 dark:text-rose-400">{report.reported_name}</span>{" "}
                        <span className="text-xs font-mono text-slate-500">
                          ({report.reported_email || report.reported_id})
                        </span>
                      </h3>

                      <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Reason: {report.reason}
                        {report.details ? ` — "${report.details}"` : ""}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Group: <strong>{report.group_name}</strong> • Confidential Reporter:{" "}
                        <strong>{report.reporter_name}</strong> ({report.reporter_email || report.reporter_id})
                      </p>
                    </div>

                    {/* 1-Click Admin Actions */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {report.group_id && (
                        <button
                          type="button"
                          onClick={() => {
                            const found = groups.find((g) => g.id === report.group_id);
                            handleStartStealthListen(
                              found || {
                                id: report.group_id!,
                                name: report.group_name,
                                level: "All",
                                topic: "",
                                host_id: report.reported_id,
                                host_name: report.reported_name,
                                participant_count: 1,
                                is_active: true,
                                created_at: report.created_at,
                              }
                            );
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                        >
                          <Headphones className="w-3.5 h-3.5" />
                          <span>Stealth Listen Live</span>
                        </button>
                      )}

                      {report.status !== "banned" && (
                        <button
                          type="button"
                          onClick={() =>
                            handleBanUser({
                              userId: report.reported_id,
                              userName: report.reported_name,
                              userEmail: report.reported_email,
                              reason: `${report.reason} in group "${report.group_name}"`,
                              reportId: report.id,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Ban User</span>
                        </button>
                      )}

                      {report.status === "open" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateReportStatus(report.id, "reviewed")}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Reviewed</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteReport(report.id)}
                        title="Delete Report Record"
                        className="p-2 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Audio Player */}
                  <div className="space-y-3 pt-1">
                    {report.recording_url ? (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                            <Volume2 className="w-4 h-4 text-indigo-500" />
                            Incident Audio Window ({formatReportDuration(report.duration_sec || 60)})
                          </span>
                          <span className="font-mono text-slate-500">
                            Current Audio Time: {currentSec.toFixed(1)}s / {(report.duration_sec || 60).toFixed(0)}s
                          </span>
                        </div>

                        <audio
                          ref={(el) => {
                            audioRefs.current[report.id] = el;
                          }}
                          controls
                          src={report.recording_url}
                          onTimeUpdate={(e) => {
                            const cur = (e.target as HTMLAudioElement).currentTime;
                            setPlaybackTimes((prev) => ({ ...prev, [report.id]: cur }));
                          }}
                          className="w-full h-10 rounded-xl"
                        />

                        {/* Live Speaker indicator during playback */}
                        <div className="flex items-center gap-2 text-xs font-semibold">
                          <span className="text-slate-500">Active Speaker at {currentSec.toFixed(1)}s:</span>
                          {activeSpeakersNow.length === 0 ? (
                            <span className="text-slate-400 italic">None (Background/Silence)</span>
                          ) : (
                            activeSpeakersNow.map((s) => (
                              <span
                                key={s.userId}
                                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                  s.userId === report.reported_id
                                    ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300"
                                    : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                                }`}
                              >
                                {s.userName} {s.userId === report.reported_id ? "(Reported User)" : ""}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Audio recording is uploading from room mixer or no audio was spoken during the window.
                      </p>
                    )}

                    {/* Speaker Timeline Segments (Click any segment to jump audio to that second) */}
                    {timeline.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          Speaker Attribution Timeline (Click a segment to jump audio):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {timeline.map((seg, idx) => {
                            const isReportedSpeaker = seg.userId === report.reported_id;
                            const isActiveSlice =
                              currentSec >= seg.startSec && currentSec <= seg.endSec + 0.25;
                            return (
                              <button
                                key={`${seg.userId}-${idx}`}
                                type="button"
                                onClick={() => handleSeekAudio(report.id, seg.startSec)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                                  isActiveSlice
                                    ? "bg-indigo-600 text-white border-indigo-600 scale-105"
                                    : isReportedSpeaker
                                    ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                {seg.startSec.toFixed(1)}s–{seg.endSec.toFixed(1)}s: {seg.userName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: VOICE GROUPS & CREATOR IDENTITY (ACTIVE & HISTORICAL) */}
      {activeTab === "live" && (
        <div className="space-y-5">
          {/* Controls Bar: Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setGroupStatusFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  groupStatusFilter === "all"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                All Rooms ({groups.length})
              </button>
              <button
                type="button"
                onClick={() => setGroupStatusFilter("active")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  groupStatusFilter === "active"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active Live ({activeGroupsCount})
              </button>
              <button
                type="button"
                onClick={() => setGroupStatusFilter("inactive")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  groupStatusFilter === "inactive"
                    ? "bg-slate-700 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                Closed / Past ({inactiveGroupsCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={groupSearchQuery}
                onChange={(e) => setGroupSearchQuery(e.target.value)}
                placeholder="Search room name, topic, creator email..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {filteredGroups.length === 0 ? (
            <div className="rounded-3xl p-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Voice Groups Found</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {groupSearchQuery
                  ? "No voice rooms match your search query."
                  : groupStatusFilter === "active"
                  ? "No live voice groups are currently active on /talk."
                  : "Zero voice groups found."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGroups.map((group) => {
                const hostReports = reportCountsByUser[group.host_id] || 0;
                const isCurrentlyListening = listeningGroup?.id === group.id;

                return (
                  <div
                    key={group.id}
                    className={`rounded-3xl p-5 border flex flex-col justify-between gap-4 bg-white dark:bg-slate-900 transition-all ${
                      isCurrentlyListening
                        ? "border-2 border-indigo-600 shadow-lg"
                        : hostReports > 0
                        ? "border-rose-400 dark:border-rose-800"
                        : group.is_active
                        ? "border-emerald-300 dark:border-emerald-800/80 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 opacity-90"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Status & Level Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                          Level {group.level}
                        </span>

                        {hostReports > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white">
                            ⚠️ Reported Host ({hostReports})
                          </span>
                        ) : group.is_active ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <Radio className="w-3.5 h-3.5 animate-pulse" />
                            Active Live ({group.participant_count} online)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                            <Clock className="w-3 h-3" />
                            Closed Room
                          </span>
                        )}
                      </div>

                      {/* Room Name & Topic */}
                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                          {group.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Topic: {group.topic || "General Conversation"}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          Created: {new Date(group.created_at).toLocaleString()}
                        </p>
                      </div>

                      {/* ROOM CREATOR / HOST DOSSIER BOX */}
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5" /> Room Creator / Host
                          </span>
                          {group.host_provider && group.host_provider !== "unknown" && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200 uppercase font-bold">
                              {group.host_provider}
                            </span>
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {group.host_full_name || group.host_name}
                          </p>

                          {group.host_email ? (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-xs font-mono text-slate-700 dark:text-slate-300 font-medium truncate">
                                {group.host_email}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(group.host_email!, `email-${group.id}`)}
                                title="Copy email"
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                              >
                                {copiedKey === `email-${group.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                              No email on record
                            </p>
                          )}

                          {group.host_name && group.host_name !== group.host_full_name && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                              In-Room Display Alias:{" "}
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                "{group.host_name}"
                              </span>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] font-mono text-slate-400">
                          <span className="truncate" title={group.host_id}>
                            UUID: {group.host_id.slice(0, 8)}...
                          </span>
                          <Link
                            href={`/users?search=${encodeURIComponent(group.host_email || group.host_id)}`}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-sans font-bold"
                          >
                            <span>View In Users</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {group.is_active && (
                          <button
                            type="button"
                            onClick={() => handleDissolveGroup(group)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 cursor-pointer"
                          >
                            Close Room
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(group)}
                          title="Delete Room Record"
                          className="p-2 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {group.is_active && (
                        <button
                          type="button"
                          onClick={() => handleStartStealthListen(group)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                        >
                          <Headphones className="w-3.5 h-3.5" />
                          <span>{isCurrentlyListening ? "Listening (Stealth)" : "Stealth Listen-In"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
