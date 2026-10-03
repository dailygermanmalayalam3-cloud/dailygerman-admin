import Link from "next/link";
import {
  getVocabulary,
  getGrammarTopics,
  getGoetheMaterials,
  getVocabularyCategories,
  getSpeakingTopics,
  getReadingTopics,
  getWritingTopics,
  getListeningTopics,
  getMedicalCategories,
  getMedicalWords,
  getMedicalConversationTopics,
} from "@/lib/db/content";
import { BookOpen, FileText, Award, MessageSquare, FileEdit, PlusCircle, ArrowRight, Stethoscope, Headphones, ExternalLink } from "lucide-react";

import { isCurrentUserAdmin } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect("/login");
  }

  const [vocab, grammar, speaking, reading, writing, listening, goethe, categories, medCats, medWords, medTopics] = await Promise.all([
    getVocabulary(),
    getGrammarTopics(),
    getSpeakingTopics(),
    getReadingTopics(),
    getWritingTopics(),
    getListeningTopics(),
    getGoetheMaterials(),
    getVocabularyCategories(),
    getMedicalCategories(),
    getMedicalWords(),
    getMedicalConversationTopics(),
  ]);

  const cards = [
    {
      title: "Vocabulary & Categories",
      count: vocab.length,
      unit: `${categories.length} categories • ${vocab.length} words`,
      description: "Manage topic categories, order them, and batch add German words.",
      href: "/vocabulary",
      icon: BookOpen,
      iconBg: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50",
    },
    {
      title: "German Grammar",
      count: grammar.length,
      unit: "grammar topics",
      description: "Manage grammar rules, Malayalam explanations, video embeds, and workouts.",
      href: "/grammar",
      icon: FileText,
      iconBg: "bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/50",
    },
    {
      title: "Speaking Practice",
      count: speaking.length,
      unit: "situation topics",
      description: "Manage conversation situations, numbered topics, and continuous dialogues.",
      href: "/speaking",
      icon: MessageSquare,
      iconBg: "bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-900/50",
    },
    {
      title: "Reading Practice",
      count: reading.length,
      unit: "reading topics",
      description: "Manage short German reading passages and 4-option interactive questions.",
      href: "/reading",
      icon: BookOpen,
      iconBg: "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900/50",
    },
    {
      title: "Writing Practice",
      count: writing.length,
      unit: "writing topics",
      description: "Manage writing tasks, instructions, sample letters, and useful phrases.",
      href: "/writing",
      icon: FileEdit,
      iconBg: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50",
    },
    {
      title: "Listening Practice",
      count: listening.length,
      unit: "listening topics",
      description: "Manage audio comprehension passages, speech dialogues, and quiz questions.",
      href: "/listening",
      icon: Headphones,
      iconBg: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50",
    },
    {
      title: "Medical German",
      count: medWords.length,
      unit: `${medCats.length} categories • ${medTopics.length} situations`,
      description: "Manage Medical German Words and Useful Conversations in Hospital.",
      href: "/medical",
      icon: Stethoscope,
      iconBg: "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50",
    },
    {
      title: "Exam Prep",
      count: goethe.length,
      unit: "exam materials",
      description: "Manage Exam Preparation for Sprechen, Lesen, Schreiben, and Hören.",
      href: "/goethe",
      icon: Award,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50",
    },
  ];

  return (
    <div className="space-y-10">
      {/* Admin Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
              Admin Area
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Control Panel
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1.5">
            Content Management Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://dailygerman-nu.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-all text-slate-700 dark:text-slate-200"
          >
            <span>View Public Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Admin Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${card.iconBg}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {card.count}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block uppercase font-semibold mt-0.5">
                      {card.unit}
                    </span>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                  {card.title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <Link
                  href={card.href}
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 hover:shadow-md transition-all cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Manage & Add</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Instructions callout */}
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 p-6 bg-amber-50/70 dark:bg-amber-950/20 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-2">
          <span>💡</span> Administrator Notes
        </h3>
        <ul className="text-xs text-amber-800 dark:text-amber-200/90 space-y-1.5 list-disc list-inside font-medium leading-relaxed">
          <li>Any content added or removed here is instantly reflected across the public website pages via on-demand ISR revalidation.</li>
          <li>For database persistence with Supabase, ensure RLS policies enforce <code>is_admin()</code> on mutations.</li>
        </ul>
      </div>
    </div>
  );
}