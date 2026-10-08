"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  Search,
  RefreshCw,
  Mail,
  Trash2,
  X,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Clock,
  KeyRound,
  ExternalLink,
  AlertTriangle,
  FileCode,
  UserCheck,
  UserX,
} from "lucide-react";

export interface NormalizedAdminUser {
  id: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  confirmed_at: string | null;
  role: string | null;
  fullName: string;
  avatarUrl: string | null;
  provider: string;
  raw_user_meta_data: Record<string, unknown>;
  raw_app_meta_data: Record<string, unknown>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<NormalizedAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "unverified">("all");
  const [providerFilter, setProviderFilter] = useState<"all" | "google" | "email">("all");

  // Details Modal
  const [selectedUser, setSelectedUser] = useState<NormalizedAdminUser | null>(null);

  // Delete Confirmation Modal
  const [userToDelete, setUserToDelete] = useState<NormalizedAdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copy tracking
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const notifyError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load users");
      }
      setUsers(data.users || []);
    } catch (err: unknown) {
      notifyError((err as Error).message || "Error fetching users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Delete user handler
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(userToDelete.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete user");
      }

      notifySuccess(`User ${userToDelete.email || userToDelete.id} successfully deleted.`);
      setUserToDelete(null);
      if (selectedUser?.id === userToDelete.id) {
        setSelectedUser(null);
      }
      // Optimistic update
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
    } catch (err: unknown) {
      notifyError((err as Error).message || "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Metrics
  const stats = useMemo(() => {
    const total = users.length;
    const verified = users.filter((u) => Boolean(u.email_confirmed_at || u.confirmed_at)).length;
    const google = users.filter((u) => u.provider.toLowerCase().includes("google")).length;
    const email = users.filter((u) => !u.provider.toLowerCase().includes("google")).length;
    return { total, verified, unverified: total - verified, google, email };
  }, [users]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const emailMatch = u.email?.toLowerCase().includes(query);
        const nameMatch = u.fullName.toLowerCase().includes(query);
        const idMatch = u.id.toLowerCase().includes(query);
        if (!emailMatch && !nameMatch && !idMatch) return false;
      }

      // Status filter
      const isVerified = Boolean(u.email_confirmed_at || u.confirmed_at);
      if (statusFilter === "verified" && !isVerified) return false;
      if (statusFilter === "unverified" && isVerified) return false;

      // Provider filter
      const isGoogle = u.provider.toLowerCase().includes("google");
      if (providerFilter === "google" && !isGoogle) return false;
      if (providerFilter === "email" && isGoogle) return false;

      return true;
    });
  }, [users, searchQuery, statusFilter, providerFilter]);

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Never";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 transition-colors">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/50 shadow-2xs">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Learner User Directory
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Inspect registered learners, view security metadata, and manage platform accounts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/80 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="p-1 hover:opacity-75 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/80 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="p-1 hover:opacity-75 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Learners</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {stats.total}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">Platform accounts</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Verified</span>
              <UserCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.verified}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">Email confirmed</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Google OAuth</span>
              <span className="text-xs font-bold text-blue-500">G</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
              {stats.google}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">Social logins</div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Email/Password</span>
              <Mail className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {stats.email}
            </div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">Direct credentials</div>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or UUID..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status filters */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === "all"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                All Status
              </button>
              <button
                onClick={() => setStatusFilter("verified")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === "verified"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Verified
              </button>
              <button
                onClick={() => setStatusFilter("unverified")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === "unverified"
                    ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Unverified
              </button>
            </div>

            {/* Provider filters */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                onClick={() => setProviderFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  providerFilter === "all"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                All Providers
              </button>
              <button
                onClick={() => setProviderFilter("google")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  providerFilter === "google"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Google
              </button>
              <button
                onClick={() => setProviderFilter("email")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  providerFilter === "email"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Email
              </button>
            </div>
          </div>
        </div>

        {/* Users Table / Directory */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs overflow-hidden">
          {loading && users.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-3" />
              <p className="text-sm font-semibold">Loading learner directory...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <UserX className="w-10 h-10 mx-auto text-slate-400 mb-3" />
              <p className="text-base font-bold text-slate-800 dark:text-slate-200">No learners found</p>
              <p className="text-xs text-slate-500 mt-1">
                Try modifying your search or clearing the status/provider filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4 sm:px-6">Learner Details</th>
                    <th className="py-3.5 px-4">Provider</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Registered Date</th>
                    <th className="py-3.5 px-4">Last Active</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredUsers.map((user) => {
                    const isVerified = Boolean(user.email_confirmed_at || user.confirmed_at);
                    const isGoogle = user.provider.toLowerCase().includes("google");

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Name & Email */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              {user.fullName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white truncate">
                                {user.fullName}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span className="truncate">{user.email || "No email"}</span>
                                <button
                                  onClick={() => handleCopy(user.id, user.id)}
                                  className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                  title="Copy User UUID"
                                >
                                  {copiedId === user.id ? (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Provider */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isGoogle
                                ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60"
                                : "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/60"
                            }`}
                          >
                            {isGoogle ? "Google OAuth" : "Email + Password"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isVerified
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60"
                                : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60"
                            }`}
                          >
                            {isVerified ? (
                              <>
                                <ShieldCheck className="w-3 h-3" />
                                <span>Verified</span>
                              </>
                            ) : (
                              <>
                                <ShieldAlert className="w-3 h-3" />
                                <span>Unverified</span>
                              </>
                            )}
                          </span>
                        </td>

                        {/* Registered */}
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-400 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatDate(user.created_at)}</span>
                          </div>
                        </td>

                        {/* Last Active */}
                        <td className="py-4 px-4 text-slate-600 dark:text-slate-400 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{formatDate(user.last_sign_in_at)}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => setUserToDelete(user)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all cursor-pointer"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* User Details Slide-over / Modal */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
            <div className="fixed inset-0" onClick={() => setSelectedUser(null)} />
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-base flex items-center justify-center shadow-md">
                  {selectedUser.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {selectedUser.fullName}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedUser.email || "No email assigned"}
                  </p>
                </div>
              </div>

              {/* Information Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                    User UUID
                  </div>
                  <div className="font-mono text-slate-800 dark:text-slate-200 break-all select-all">
                    {selectedUser.id}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                    Primary Provider
                  </div>
                  <div className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                    {selectedUser.provider}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                    Created Timestamp
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDate(selectedUser.created_at)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                    Last Sign In
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatDate(selectedUser.last_sign_in_at)}
                  </div>
                </div>
              </div>

              {/* Raw JSON Meta Data */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Raw User Metadata (`user_metadata`)</span>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                    {JSON.stringify(selectedUser.raw_user_meta_data, null, 2)}
                  </pre>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <FileCode className="w-3.5 h-3.5 text-purple-500" />
                    <span>Raw App Metadata (`app_metadata`)</span>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                    {JSON.stringify(selectedUser.raw_app_meta_data, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setUserToDelete(selectedUser);
                  }}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900/80 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete This User</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => !isDeleting && setUserToDelete(null)} />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/80 rounded-3xl p-6 shadow-2xl z-10 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-900/60">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Permanently Delete User?
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  Are you sure you want to delete{" "}
                  <strong className="text-slate-900 dark:text-slate-100">
                    {userToDelete.email || userToDelete.fullName}
                  </strong>
                  ? This will delete their authentication identity and cascade cleanly through all related tables.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-[11px] font-mono break-all text-slate-500">
                ID: {userToDelete.id}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteUser}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>{isDeleting ? "Deleting..." : "Confirm Delete"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
