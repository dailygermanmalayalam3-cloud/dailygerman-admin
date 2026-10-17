'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GoetheExamTemplate, Level } from '@/types';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Volume2,
  Square,
} from 'lucide-react';

export default function ExamTemplatesManager() {
  const [templates, setTemplates] = useState<GoetheExamTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterModule, setFilterModule] = useState<string>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<GoetheExamTemplate>>({
    level: 'B1',
    module_type: 'schreiben',
    section: 'Teil 1',
    title: '',
    title_en: '',
    title_ml: '',
    register: 'informell',
    recommended_time: 'ca. 20 Minuten',
    target_word_count: 'ca. 80 Wörter',
    skeleton_structure: { steps: [] },
    model_prompt_de: '',
    model_answer_de: '',
    model_answer_en: '',
    model_answer_ml: '',
    connectors: ['obwohl', 'deshalb'],
    audio_url: '',
    order_index: 0,
  });

  const toggleAudio = (templateId: string, url?: string | null) => {
    if (!url) return;
    if (playingAudioId === templateId) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingAudioId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingAudioId(templateId);
    audio.play().catch(() => setPlayingAudioId(null));
    audio.onended = () => {
      setPlayingAudioId(null);
      audioRef.current = null;
    };
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/exam-templates');
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to load exam templates' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    try {
      const res = await fetch('/api/admin/exam-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: 'success', text: 'Template saved successfully and learner paths revalidated!' });
        setEditingId(null);
        setFormData({
          level: 'B1',
          module_type: 'schreiben',
          section: 'Teil 1',
          title: '',
          title_en: '',
          title_ml: '',
          register: 'informell',
          recommended_time: 'ca. 20 Minuten',
          target_word_count: 'ca. 80 Wörter',
          skeleton_structure: { steps: [] },
          model_prompt_de: '',
          model_answer_de: '',
          model_answer_en: '',
          model_answer_ml: '',
          connectors: ['obwohl', 'deshalb'],
          audio_url: '',
          order_index: 0,
        });
        fetchTemplates();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to save template' });
      }
    } catch (err: unknown) {
      setStatusMessage({ type: 'error', text: (err as Error).message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await fetch(`/api/admin/exam-templates?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: 'success', text: 'Template deleted and learner cache revalidated.' });
        fetchTemplates();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to delete template' });
      }
    } catch (err: unknown) {
      setStatusMessage({ type: 'error', text: (err as Error).message });
    }
  };

  const filtered = templates.filter((t) => {
    if (filterLevel !== 'ALL' && t.level !== filterLevel) return false;
    if (filterModule !== 'ALL' && t.module_type !== filterModule) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <FileText className="w-4 h-4" />
            Goethe Examination Redemittel & Templates Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Universal Exam Matrix Manager
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Manage official Goethe Schreiben and Sprechen templates, orthogonal Redemittel structures, and trilingual model answers (German, English, and Malayalam).
          </p>
        </div>
        <a
          href="http://localhost:3000/goethe/writing-speaking-guide"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white shadow transition-all shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
          View Live Learner Tool
        </a>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {statusMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {statusMessage.text}
        </div>
      )}

      {/* Editor / Form */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          {editingId ? <Edit2 className="w-5 h-5 text-indigo-500" /> : <Plus className="w-5 h-5 text-indigo-500" />}
          {editingId ? 'Edit Exam Template' : 'Add New Exam Template'}
        </h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">CEFR Level</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as Level })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-semibold text-sm"
              >
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Module Type</label>
              <select
                value={formData.module_type}
                onChange={(e) => setFormData({ ...formData, module_type: e.target.value as 'schreiben' | 'sprechen' })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-semibold text-sm"
              >
                <option value="schreiben">Schreiben (Writing)</option>
                <option value="sprechen">Sprechen (Speaking)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Section</label>
              <input
                type="text"
                placeholder="e.g. Teil 1, Teil 2"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Register</label>
              <select
                value={formData.register}
                onChange={(e) => setFormData({ ...formData, register: e.target.value as 'informell' | 'halbformell' | 'formell' | 'forum' })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white font-semibold text-sm"
              >
                <option value="informell">Informell (Duzen)</option>
                <option value="halbformell">Halbformell</option>
                <option value="formell">Formell (Siezen)</option>
                <option value="forum">Online-Forum</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">German Title</label>
              <input
                type="text"
                placeholder="German title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-sm font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">English Title</label>
              <input
                type="text"
                placeholder="English title"
                value={formData.title_en}
                onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Malayalam Title</label>
              <input
                type="text"
                placeholder="മലയാളം തലക്കെട്ട്"
                value={formData.title_ml}
                onChange={(e) => setFormData({ ...formData, title_ml: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-sm"
                required
              />
            </div>
          </div>

          {/* Model Answer Trilingual Textareas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">German Model Answer</label>
              <textarea
                rows={6}
                value={formData.model_answer_de}
                onChange={(e) => setFormData({ ...formData, model_answer_de: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-xs font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">English Translation</label>
              <textarea
                rows={6}
                value={formData.model_answer_en}
                onChange={(e) => setFormData({ ...formData, model_answer_en: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Malayalam Translation</label>
              <textarea
                rows={6}
                value={formData.model_answer_ml}
                onChange={(e) => setFormData({ ...formData, model_answer_ml: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-xs leading-relaxed"
                required
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Studio Audio URL (Supabase Storage)
              </label>
              <input
                type="url"
                value={formData.audio_url || ''}
                onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })}
                placeholder="https://wivtdopwvgefybojakuo.supabase.co/storage/v1/object/public/pronunciations/goethe-templates/..."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    level: 'B1',
                    module_type: 'schreiben',
                    section: 'Teil 1',
                    title: '',
                    title_en: '',
                    title_ml: '',
                    register: 'informell',
                    recommended_time: 'ca. 20 Minuten',
                    target_word_count: 'ca. 80 Wörter',
                    skeleton_structure: { steps: [] },
                    model_prompt_de: '',
                    model_answer_de: '',
                    model_answer_en: '',
                    model_answer_ml: '',
                    connectors: ['obwohl', 'deshalb'],
                    audio_url: '',
                    order_index: 0,
                  });
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md transition-all cursor-pointer"
            >
              {editingId ? 'Update Template' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {['ALL', 'A1', 'A2', 'B1', 'B2'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                filterLevel === lvl
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'schreiben', 'sprechen'].map((mod) => (
            <button
              key={mod}
              onClick={() => setFilterModule(mod)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer ${
                filterModule === mod
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm font-medium">Loading templates...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">No exam templates found for this filter.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      {t.level} • {t.section}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {t.module_type}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                      {t.register}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingId(t.id);
                        setFormData(t);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
                      title="Edit template"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-500 hover:text-rose-600"
                      title="Delete template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">{t.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t.title_en} • {t.title_ml}</p>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 line-clamp-3 mb-2">
                  {t.model_answer_de}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span>Target: {t.target_word_count}</span>
                  <span>•</span>
                  <span>Time: {t.recommended_time}</span>
                </div>
                {t.audio_url ? (
                  <button
                    type="button"
                    onClick={() => toggleAudio(t.id, t.audio_url)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                      playingAudioId === t.id
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-300'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-300 hover:bg-emerald-100'
                    }`}
                    title={playingAudioId === t.id ? "Stop audio" : "Play studio audio"}
                  >
                    {playingAudioId === t.id ? (
                      <>
                        <Square className="w-2.5 h-2.5 fill-current" />
                        <span>Stop</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-2.5 h-2.5" />
                        <span>Studio Audio</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
                    No Audio
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
