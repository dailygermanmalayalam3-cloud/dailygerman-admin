"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
} from "lucide-react";

export default function VoiceModerationPage() {
  const supabase = useMemo(() => createClient(), []);

  const [activeTab, setActiveTab] = useState<"reports" | "live">("reports");
  const [reports, setReports] = useState<VoiceReportRow[]>([]);
  const [groups, setGroups] = useState<VoiceGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Audio playback current time per reportId for synchronized speaker timeline highlight
  const [playbackTimes, setPlaybackTimes] = useState<Record<string, number>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  // Stealth Listen-In state (`moderation:listener`)
  const [listeningGroup, setListeningGroup] = useState<VoiceGroupRow | null>(null);
  const [liveParticipants, setLiveParticipants] = useState<LiveMonitoredParticipant[]>([]);
  const listenerRef = useRef<AdminStealthListener | null>(null);

  const fetchModerationData = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [reportsRes, groupsRes] = await Promise.all([
      supabase
        .from("voice_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("voice_groups")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (reportsRes.data) {
      setReports(reportsRes.data as VoiceReportRow[]);
    }
    if (groupsRes.data) {
      setGroups(groupsRes.data as VoiceGroupRow[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchModerationData();
  }, [fetchModerationData]);

  useEffect(() => {
    return () => {
      listenerRef.current?.stopStealthListen();
    };
  }, []);

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
    await supabase.from("voice_reports").delete().eq("id", reportId);
    setActionMessage("Report deleted.");
    fetchModerationData();
  };

  const handleDissolveGroup = async (group: VoiceGroupRow) => {
    if (!supabase) return;
    await supabase
      .from("voice_groups")
      .update({ is_active: false, participant_count: 0 })
      .eq("id", group.id);

    if (listeningGroup?.id === group.id) {
      listenerRef.current?.sendModerationCommand("dissolve-room");
      handleStopStealthListen();
    }
    setActionMessage(`Dissolved voice group "${group.name}".`);
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
            Voice Groups, Silent Reports & Audio Evidence
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Review recorded conversation evidence with synchronized speaker timelines, or join any live group silently as{" "}
            <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
              moderation:listener
            </code>{" "}
            (100% invisible to learners).
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
                Host: {listeningGroup.host_name} • Topic: {listeningGroup.topic || "General Practice"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleDissolveGroup(listeningGroup)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Dissolve Group</span>
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
          <span>Live Active Voice Groups ({groups.length})</span>
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
                              reason: report.reason,
                              reportId: report.id,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Ban User Immediately</span>
                        </button>
                      )}

                      {report.status === "open" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateReportStatus(report.id, "reviewed")}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Reviewed</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteReport(report.id)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Delete Report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Recorded Conversation Audio Evidence Player + Synchronized Speaker Timeline */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Recorded Conversation Evidence ({formatReportDuration(report.duration_sec)})
                      </span>

                      {/* Live Speaker Indicator at Current Audio Second */}
                      <div className="flex items-center gap-2">
                        {activeSpeakersNow.length > 0 ? (
                          activeSpeakersNow.map((seg, idx) => (
                            <span
                              key={`${seg.userId}-${idx}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white"
                            >
                              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                              <span>Speaking @ {currentSec.toFixed(1)}s: {seg.userName}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">
                            Playback @ {currentSec.toFixed(1)}s
                          </span>
                        )}
                      </div>
                    </div>

                    {report.recording_url ? (
                      <audio
                        ref={(el) => {
                          audioRefs.current[report.id] = el;
                        }}
                        controls
                        src={report.recording_url}
                        onTimeUpdate={(e) => {
                          const t = e.currentTarget.currentTime;
                          setPlaybackTimes((prev) => ({ ...prev, [report.id]: t }));
                        }}
                        className="w-full"
                      />
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

      {/* TAB 2: LIVE ACTIVE VOICE GROUPS (STEALTH LISTEN-IN) */}
      {activeTab === "live" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.length === 0 ? (
            <div className="col-span-full rounded-3xl p-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Live Voice Groups Active</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Active learner voice groups will appear here automatically.
              </p>
            </div>
          ) : (
            groups.map((group) => {
              const hostReports = reportCountsByUser[group.host_id] || 0;
              const isCurrentlyListening = listeningGroup?.id === group.id;
              return (
                <div
                  key={group.id}
                  className={`rounded-3xl p-5 border flex flex-col justify-between gap-4 bg-white dark:bg-slate-900 ${
                    isCurrentlyListening
                      ? "border-2 border-indigo-600"
                      : hostReports > 0
                      ? "border-rose-400 dark:border-rose-800"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                        Level {group.level}
                      </span>
                      {hostReports > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white">
                          ⚠️ Reported Host ({hostReports})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <Radio className="w-3.5 h-3.5 animate-pulse" />
                          Active
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{group.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Topic: {group.topic || "General Conversation"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Host: <strong>{group.host_name}</strong>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleDissolveGroup(group)}
                      className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      Close Room
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartStealthListen(group)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                    >
                      <Headphones className="w-3.5 h-3.5" />
                      <span>{isCurrentlyListening ? "Listening (Stealth)" : "Stealth Listen-In"}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
