import Link from "next/link";
import {
  getVocabulary,
  getGrammarTopics,
  getGoetheMaterials,
  getVocabularyCategories,
} from "@/lib/db/content";
import { BookOpen, FileText, Award, PlusCircle, ArrowRight } from "lucide-react";

import { isCurrentUserAdmin } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    redirect("/login");
  }

  const [vocab, grammar, goethe, categories] = await Promise.all([
    getVocabulary(),
    getGrammarTopics(),
    getGoetheMaterials(),
    getVocabularyCategories(),
  ]);

  const cards = [
    {
      title: "Vocabulary & Categories",
      count: vocab.length,
      unit: `${categories.length} categories • ${vocab.length} words`,
      description: "Manage topic categories, order them, and batch add German words.",
      href: "/vocabulary",
      icon: BookOpen,
      color: "#ffe600",
    },
    {
      title: "German Grammar",
      count: grammar.length,
      unit: "grammar topics",
      description: "Manage grammar rules, Malayalam explanations, and structured examples.",
      href: "/grammar",
      icon: FileText,
      color: "#fef08a",
    },
    {
      title: "Goethe Prüfung",
      count: goethe.length,
      unit: "exam materials",
      description: "Manage Goethe preparation for Sprechen, Lesen, Schreiben, and Hören.",
      href: "/goethe",
      icon: Award,
      color: "#fde047",
    },
  ];

  return (
    <div className="space-y-10">
      {/* Admin Header */}
      <div className="border-b-2 border-black pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-black uppercase bg-black text-white">
              Admin Area
            </span>
            <span className="text-xs font-bold text-neutral-500 uppercase">
              Control Panel
            </span>
          </div>
          <h1 className="text-3xl font-black text-black tracking-tight mt-1">
            Content Management Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-bold uppercase tracking-wider px-3 py-2 border border-black hover:bg-neutral-100"
          >
            ← View Public Site
          </Link>
        </div>
      </div>

      {/* Admin Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="p-2.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    style={{ backgroundColor: card.color }}
                  >
                    <Icon className="w-6 h-6 text-black" />
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-black">
                      {card.count}
                    </span>
                    <span className="text-xs text-neutral-500 block uppercase font-bold">
                      {card.unit}
                    </span>
                  </div>
                </div>

                <h2 className="text-xl font-black text-black tracking-tight mb-2">
                  {card.title}
                </h2>
                <p className="text-sm text-neutral-600 mb-6">
                  {card.description}
                </p>
              </div>

              <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
                <Link
                  href={card.href}
                  className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-4 py-2 border-2 border-black bg-[#ffe600] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
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
      <div className="border border-black p-6 bg-[#fffbeb] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="text-sm font-black uppercase tracking-wider text-amber-950 mb-2">
          💡 Administrator Notes
        </h3>
        <ul className="text-xs text-amber-900 space-y-1.5 list-disc list-inside font-medium leading-relaxed">
          <li>Any content added or removed here is instantly reflected across the public website pages.</li>
          <li>For database persistence with Supabase, copy the SQL in <code>supabase_schema.sql</code> to your Supabase project SQL Editor and configure your <code>.env.local</code> credentials.</li>
        </ul>
      </div>
    </div>
  );
}