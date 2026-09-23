import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { synthesizeGermanSpeech } from "@/lib/services/google-tts";
import { revalidateLearnerPaths } from "@/lib/revalidate";

export const revalidate = 0;

export type BatchTarget =
  | "vocab_words"
  | "vocab_sentences"
  | "medical_words"
  | "medical_sentences"
  | "verb_infinitives"
  | "verb_praeteritums"
  | "verb_perfekts"
  | "verbs_all"
  | "conversation_turns";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database/storage configuration missing" },
        { status: 500 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Vocabulary Words stats
    const { count: totalVocab } = await supabase
      .from("vocabulary")
      .select("*", { count: "exact", head: true });

    const { count: vocabWordsMissing } = await supabase
      .from("vocabulary")
      .select("*", { count: "exact", head: true })
      .or("audio_url.is.null,audio_url.eq.");

    // Vocabulary Sentences: where example exists and sentence_audio_url is missing
    const { data: vocabRowsWithExamples } = await supabase
      .from("vocabulary")
      .select("id, examples, sentence_audio_url")
      .not("examples", "is", null);

    let vocabSentencesTotal = 0;
    let vocabSentencesMissing = 0;
    if (vocabRowsWithExamples) {
      for (const row of vocabRowsWithExamples) {
        const exs = Array.isArray(row.examples) ? row.examples : [];
        if (exs.length > 0 && exs[0]?.german && exs[0].german.trim()) {
          vocabSentencesTotal++;
          if (!row.sentence_audio_url || !row.sentence_audio_url.trim()) {
            vocabSentencesMissing++;
          }
        }
      }
    }

    // 2. Medical Words stats
    const { count: totalMedical } = await supabase
      .from("medical_words")
      .select("*", { count: "exact", head: true });

    const { count: medicalWordsMissing } = await supabase
      .from("medical_words")
      .select("*", { count: "exact", head: true })
      .or("audio_url.is.null,audio_url.eq.");

    // Medical Sentences stats
    const { count: medicalSentencesTotal } = await supabase
      .from("medical_words")
      .select("*", { count: "exact", head: true })
      .not("example_german", "is", null)
      .neq("example_german", "");

    const { count: medicalSentencesMissing } = await supabase
      .from("medical_words")
      .select("*", { count: "exact", head: true })
      .not("example_german", "is", null)
      .neq("example_german", "")
      .or("sentence_audio_url.is.null,sentence_audio_url.eq.");

    // 3. Verbs stats (Infinitiv, Präteritum, Perfekt)
    const { count: totalVerbs } = await supabase
      .from("verbs")
      .select("*", { count: "exact", head: true });

    const { count: verbInfinitivesMissing } = await supabase
      .from("verbs")
      .select("*", { count: "exact", head: true })
      .or("infinitive_audio_url.is.null,infinitive_audio_url.eq.");

    const { count: verbPraeteritumsMissing } = await supabase
      .from("verbs")
      .select("*", { count: "exact", head: true })
      .or("praeteritum_audio_url.is.null,praeteritum_audio_url.eq.");

    const { count: verbPerfektsMissing } = await supabase
      .from("verbs")
      .select("*", { count: "exact", head: true })
      .or("perfekt_audio_url.is.null,perfekt_audio_url.eq.");

    const verbsTotalCount = totalVerbs || 0;
    const vInfMissing = verbInfinitivesMissing || 0;
    const vPraetMissing = verbPraeteritumsMissing || 0;
    const vPerfMissing = verbPerfektsMissing || 0;

    // 4. Conversation Dialogue Turns stats
    const { data: convData } = await supabase
      .from("conversations")
      .select("id, turns");

    let convTurnsTotal = 0;
    let convTurnsMissing = 0;
    if (convData) {
      for (const conv of convData) {
        const turns = Array.isArray(conv.turns) ? conv.turns : [];
        for (const t of turns) {
          if (t && t.german && t.german.trim()) {
            convTurnsTotal++;
            if (!t.audio_url || !t.audio_url.trim()) {
              convTurnsMissing++;
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        vocabWords: {
          total: totalVocab || 0,
          missing: vocabWordsMissing || 0,
          generated: (totalVocab || 0) - (vocabWordsMissing || 0),
        },
        vocabSentences: {
          total: vocabSentencesTotal,
          missing: vocabSentencesMissing,
          generated: vocabSentencesTotal - vocabSentencesMissing,
        },
        medicalWords: {
          total: totalMedical || 0,
          missing: medicalWordsMissing || 0,
          generated: (totalMedical || 0) - (medicalWordsMissing || 0),
        },
        medicalSentences: {
          total: medicalSentencesTotal || 0,
          missing: medicalSentencesMissing || 0,
          generated: (medicalSentencesTotal || 0) - (medicalSentencesMissing || 0),
        },
        verbInfinitives: {
          total: verbsTotalCount,
          missing: vInfMissing,
          generated: verbsTotalCount - vInfMissing,
        },
        verbPraeteritums: {
          total: verbsTotalCount,
          missing: vPraetMissing,
          generated: verbsTotalCount - vPraetMissing,
        },
        verbPerfekts: {
          total: verbsTotalCount,
          missing: vPerfMissing,
          generated: verbsTotalCount - vPerfMissing,
        },
        verbsAll: {
          total: verbsTotalCount * 3,
          missing: vInfMissing + vPraetMissing + vPerfMissing,
          generated: (verbsTotalCount * 3) - (vInfMissing + vPraetMissing + vPerfMissing),
        },
        conversationTurns: {
          total: convTurnsTotal,
          missing: convTurnsMissing,
          generated: convTurnsTotal - convTurnsMissing,
        },
      },
    });
  } catch (err: unknown) {
    console.error("Batch audio stats error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database/storage configuration missing" },
        { status: 500 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { target, limit = 10, voiceName, speakingRate } = body as {
      target: BatchTarget;
      limit?: number;
      voiceName?: string;
      speakingRate?: number;
    };

    if (
      !target ||
      ![
        "vocab_words",
        "vocab_sentences",
        "medical_words",
        "medical_sentences",
        "verb_infinitives",
        "verb_praeteritums",
        "verb_perfekts",
        "verbs_all",
        "conversation_turns",
      ].includes(target)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid target. Must be one of: vocab_words, vocab_sentences, medical_words, medical_sentences, verb_infinitives, verb_praeteritums, verb_perfekts, verbs_all, conversation_turns",
        },
        { status: 400 }
      );
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 25);
    const processedItems: Array<{ id: string; text: string; url: string }> = [];
    const errors: string[] = [];

    if (target === "vocab_words") {
      const { data: rows, error: fetchErr } = await supabase
        .from("vocabulary")
        .select("id, german_content")
        .or("audio_url.is.null,audio_url.eq.")
        .limit(safeLimit);

      if (fetchErr) throw fetchErr;

      for (const row of rows || []) {
        const text = row.german_content?.trim();
        if (!text) continue;

        try {
          const { audioBuffer, ext } = await synthesizeGermanSpeech({
            text,
            voiceName,
            speakingRate,
          });

          const uniqueId = crypto.randomUUID();
          const filePath = `vocab/${uniqueId}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("pronunciations")
            .upload(filePath, audioBuffer, {
              contentType: "audio/mpeg",
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const { data: publicData } = supabase.storage
            .from("pronunciations")
            .getPublicUrl(filePath);

          const { error: updateErr } = await supabase
            .from("vocabulary")
            .update({ audio_url: publicData.publicUrl })
            .eq("id", row.id);

          if (updateErr) throw updateErr;

          processedItems.push({
            id: row.id,
            text,
            url: publicData.publicUrl,
          });
        } catch (itemErr: unknown) {
          console.error(`Error processing vocab word ${row.id} (${text}):`, itemErr);
          errors.push(`${text}: ${(itemErr as Error).message}`);
        }
      }
    } else if (target === "vocab_sentences") {
      const { data: rows, error: fetchErr } = await supabase
        .from("vocabulary")
        .select("id, examples")
        .or("sentence_audio_url.is.null,sentence_audio_url.eq.")
        .not("examples", "is", null)
        .neq("examples", "[]")
        .limit(safeLimit);

      if (fetchErr) throw fetchErr;

      for (const row of rows || []) {
        const exs = Array.isArray(row.examples) ? row.examples : [];
        const text = exs[0]?.german?.trim();
        if (!text) {
          errors.push(`Row ${row.id}: Empty or invalid German sentence in examples.`);
          continue;
        }

        try {
          const { audioBuffer, ext } = await synthesizeGermanSpeech({
            text,
            voiceName,
            speakingRate,
          });

          const uniqueId = crypto.randomUUID();
          const filePath = `sentence/${uniqueId}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("pronunciations")
            .upload(filePath, audioBuffer, {
              contentType: "audio/mpeg",
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const { data: publicData } = supabase.storage
            .from("pronunciations")
            .getPublicUrl(filePath);

          const { error: updateErr } = await supabase
            .from("vocabulary")
            .update({ sentence_audio_url: publicData.publicUrl })
            .eq("id", row.id);

          if (updateErr) throw updateErr;

          processedItems.push({
            id: row.id,
            text,
            url: publicData.publicUrl,
          });
        } catch (itemErr: unknown) {
          console.error(`Error processing vocab sentence ${row.id} (${text}):`, itemErr);
          errors.push(`${text}: ${(itemErr as Error).message}`);
        }
      }
    } else if (target === "medical_words") {
      const { data: rows, error: fetchErr } = await supabase
        .from("medical_words")
        .select("id, german")
        .or("audio_url.is.null,audio_url.eq.")
        .limit(safeLimit);

      if (fetchErr) throw fetchErr;

      for (const row of rows || []) {
        const text = row.german?.trim();
        if (!text) continue;

        try {
          const { audioBuffer, ext } = await synthesizeGermanSpeech({
            text,
            voiceName,
            speakingRate,
          });

          const uniqueId = crypto.randomUUID();
          const filePath = `medical_word/${uniqueId}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("pronunciations")
            .upload(filePath, audioBuffer, {
              contentType: "audio/mpeg",
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const { data: publicData } = supabase.storage
            .from("pronunciations")
            .getPublicUrl(filePath);

          const { error: updateErr } = await supabase
            .from("medical_words")
            .update({ audio_url: publicData.publicUrl })
            .eq("id", row.id);

          if (updateErr) throw updateErr;

          processedItems.push({
            id: row.id,
            text,
            url: publicData.publicUrl,
          });
        } catch (itemErr: unknown) {
          console.error(`Error processing medical word ${row.id} (${text}):`, itemErr);
          errors.push(`${text}: ${(itemErr as Error).message}`);
        }
      }
    } else if (target === "medical_sentences") {
      const { data: rows, error: fetchErr } = await supabase
        .from("medical_words")
        .select("id, example_german")
        .or("sentence_audio_url.is.null,sentence_audio_url.eq.")
        .not("example_german", "is", null)
        .neq("example_german", "")
        .limit(safeLimit);

      if (fetchErr) throw fetchErr;

      for (const row of rows || []) {
        const text = row.example_german?.trim();
        if (!text) continue;

        try {
          const { audioBuffer, ext } = await synthesizeGermanSpeech({
            text,
            voiceName,
            speakingRate,
          });

          const uniqueId = crypto.randomUUID();
          const filePath = `medical_sentence/${uniqueId}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("pronunciations")
            .upload(filePath, audioBuffer, {
              contentType: "audio/mpeg",
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const { data: publicData } = supabase.storage
            .from("pronunciations")
            .getPublicUrl(filePath);

          const { error: updateErr } = await supabase
            .from("medical_words")
            .update({ sentence_audio_url: publicData.publicUrl })
            .eq("id", row.id);

          if (updateErr) throw updateErr;

          processedItems.push({
            id: row.id,
            text,
            url: publicData.publicUrl,
          });
        } catch (itemErr: unknown) {
          console.error(`Error processing medical sentence ${row.id} (${text}):`, itemErr);
          errors.push(`${text}: ${(itemErr as Error).message}`);
        }
      }
    } else if (target === "verb_infinitives") {
      const { data: rows, error: fetchErr } = await supabase
        .from("verbs")
        .select("id, infinitive_de")
        .or("infinitive_audio_url.is.null,infinitive_audio_url.eq.")
        .limit(safeLimit);

      if (fetchErr) throw fetchErr;

      for (const row of rows || []) {
        const text = row.infinitive_de?.trim();
        if (!text) continue;

        try {
          const { audioBuffer, ext } = await synthesizeGermanSpeech({
            text,
            voiceName,
            speakingRate,
          });

          const uniqueId = crypto.randomUUID();
          const filePath = `verbs/infinitives/${uniqueId}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("pronunciations")
            .upload(filePath, audioBuffer, {
              contentType: "audio/mpeg",
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const { data: publicData } = supabase.storage
            .from("pronunciations")
            .getPublicUrl(filePath);

          const { error: updateErr } = await supabase
            .from("verbs")
            .update({ infinitive_audio_url: publicData.publicUrl })
            .eq("id", row.id);

          if (updateErr) throw updateErr;

          processedItems.push({
            id: row.id,
            text,
            url: publicData.publicUrl,
          });
        } catch (itemErr: unknown) {
          console.error(`Error processing verb infinitive ${row.id} (${text}):`, itemErr);
          errors.push(`${text}: ${(itemErr as Error).message}`);
        }
      }
    } else if (target === "verb_praeteritums") {
      const { data: rows, error: fetchErr } = await supabase
        .from("verbs")
        .select("id, praeteritum_de")
        .or("praeteritum_audio_url.is.null,praeteritum_audio_url.eq.")
        .limit(safeLimit);

      if (fetchErr) throw fetchErr;

      for (const row of rows || []) {
        const text = row.praeteritum_de?.trim();
        if (!text) continue;

        try {
          const { audioBuffer, ext } = await synthesizeGermanSpeech({
            text,
            voiceName,
            speakingRate,
          });

          const uniqueId = crypto.randomUUID();
          const filePath = `verbs/praeteritums/${uniqueId}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("pronunciations")
            .upload(filePath, audioBuffer, {
              contentType: "audio/mpeg",
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const { data: publicData } = supabase.storage
            .from("pronunciations")
            .getPublicUrl(filePath);

          const { error: updateErr } = await supabase
            .from("verbs")
            .update({ praeteritum_audio_url: publicData.publicUrl })
            .eq("id", row.id);

          if (updateErr) throw updateErr;

          processedItems.push({
            id: row.id,
            text,
            url: publicData.publicUrl,
          });
        } catch (itemErr: unknown) {
          console.error(`Error processing verb praeteritum ${row.id} (${text}):`, itemErr);
          errors.push(`${text}: ${(itemErr as Error).message}`);
        }
      }
    } else if (target === "verb_perfekts") {
      const { data: rows, error: fetchErr } = await supabase
        .from("verbs")
        .select("id, perfekt_de")
        .or("perfekt_audio_url.is.null,perfekt_audio_url.eq.")
        .limit(safeLimit);

      if (fetchErr) throw fetchErr;

      for (const row of rows || []) {
        const text = row.perfekt_de?.trim();
        if (!text) continue;

        try {
          const { audioBuffer, ext } = await synthesizeGermanSpeech({
            text,
            voiceName,
            speakingRate,
          });

          const uniqueId = crypto.randomUUID();
          const filePath = `verbs/perfekts/${uniqueId}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("pronunciations")
            .upload(filePath, audioBuffer, {
              contentType: "audio/mpeg",
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const { data: publicData } = supabase.storage
            .from("pronunciations")
            .getPublicUrl(filePath);

          const { error: updateErr } = await supabase
            .from("verbs")
            .update({ perfekt_audio_url: publicData.publicUrl })
            .eq("id", row.id);

          if (updateErr) throw updateErr;

          processedItems.push({
            id: row.id,
            text,
            url: publicData.publicUrl,
          });
        } catch (itemErr: unknown) {
          console.error(`Error processing verb perfekt ${row.id} (${text}):`, itemErr);
          errors.push(`${text}: ${(itemErr as Error).message}`);
        }
      }
    } else if (target === "verbs_all") {
      const { data: rows, error: fetchErr } = await supabase
        .from("verbs")
        .select("id, infinitive_de, infinitive_audio_url, praeteritum_de, praeteritum_audio_url, perfekt_de, perfekt_audio_url")
        .or(
          "infinitive_audio_url.is.null,infinitive_audio_url.eq.,praeteritum_audio_url.is.null,praeteritum_audio_url.eq.,perfekt_audio_url.is.null,perfekt_audio_url.eq."
        )
        .limit(safeLimit);

      if (fetchErr) throw fetchErr;

      for (const row of rows || []) {
        const updates: Record<string, string> = {};

        // 1. Check infinitive
        if (!row.infinitive_audio_url && row.infinitive_de?.trim()) {
          const text = row.infinitive_de.trim();
          try {
            const { audioBuffer, ext } = await synthesizeGermanSpeech({ text, voiceName, speakingRate });
            const uniqueId = crypto.randomUUID();
            const filePath = `verbs/infinitives/${uniqueId}.${ext}`;
            const { error: upErr } = await supabase.storage.from("pronunciations").upload(filePath, audioBuffer, { contentType: "audio/mpeg", upsert: true });
            if (!upErr) {
              const { data: pData } = supabase.storage.from("pronunciations").getPublicUrl(filePath);
              updates.infinitive_audio_url = pData.publicUrl;
              processedItems.push({ id: row.id, text, url: pData.publicUrl });
            }
          } catch (e: unknown) {
            errors.push(`${text}: ${(e as Error).message}`);
          }
        }

        // 2. Check praeteritum
        if (!row.praeteritum_audio_url && row.praeteritum_de?.trim()) {
          const text = row.praeteritum_de.trim();
          try {
            const { audioBuffer, ext } = await synthesizeGermanSpeech({ text, voiceName, speakingRate });
            const uniqueId = crypto.randomUUID();
            const filePath = `verbs/praeteritums/${uniqueId}.${ext}`;
            const { error: upErr } = await supabase.storage.from("pronunciations").upload(filePath, audioBuffer, { contentType: "audio/mpeg", upsert: true });
            if (!upErr) {
              const { data: pData } = supabase.storage.from("pronunciations").getPublicUrl(filePath);
              updates.praeteritum_audio_url = pData.publicUrl;
              processedItems.push({ id: row.id, text, url: pData.publicUrl });
            }
          } catch (e: unknown) {
            errors.push(`${text}: ${(e as Error).message}`);
          }
        }

        // 3. Check perfekt
        if (!row.perfekt_audio_url && row.perfekt_de?.trim()) {
          const text = row.perfekt_de.trim();
          try {
            const { audioBuffer, ext } = await synthesizeGermanSpeech({ text, voiceName, speakingRate });
            const uniqueId = crypto.randomUUID();
            const filePath = `verbs/perfekts/${uniqueId}.${ext}`;
            const { error: upErr } = await supabase.storage.from("pronunciations").upload(filePath, audioBuffer, { contentType: "audio/mpeg", upsert: true });
            if (!upErr) {
              const { data: pData } = supabase.storage.from("pronunciations").getPublicUrl(filePath);
              updates.perfekt_audio_url = pData.publicUrl;
              processedItems.push({ id: row.id, text, url: pData.publicUrl });
            }
          } catch (e: unknown) {
            errors.push(`${text}: ${(e as Error).message}`);
          }
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from("verbs").update(updates).eq("id", row.id);
        }
      }
    }

    if (target === "conversation_turns") {
      const { data: allConvs } = await supabase
        .from("conversations")
        .select("id, turns, topic_id")
        .order("order_index", { ascending: true });

      if (allConvs) {
        let processedCount = 0;

        for (const conv of allConvs) {
          if (processedCount >= safeLimit) break;
          const turns = Array.isArray(conv.turns) ? [...conv.turns] : [];
          let convModified = false;

          for (let i = 0; i < turns.length; i++) {
            if (processedCount >= safeLimit) break;
            const turn = turns[i];
            if (turn && turn.german && (!turn.audio_url || !turn.audio_url.trim())) {
              const text = turn.german.trim();
              try {
                // Gender-aware voice selection:
                // If gender is explicitly 'female', or speaker title/role indicates a woman, use de-DE-Neural2-F
                // Otherwise use male/default voice de-DE-Neural2-B
                const isFemale =
                  turn.gender === "female" ||
                  (!turn.gender &&
                    /frau|kandidatin|anna|maria|nurse|schwester|pflegekraft|ärztin|rezeptionistin|patientin|mutter|tochter|kellnerin|verkäuferin/i.test(
                      `${turn.speaker || ""} ${turn.speaker_role || ""}`
                    ));

                const turnVoice = isFemale
                  ? "de-DE-Studio-C"
                  : (voiceName || "de-DE-Studio-B");

                const { audioBuffer, ext } = await synthesizeGermanSpeech({
                  text,
                  voiceName: turnVoice,
                  speakingRate,
                });

                const turnId = turn.id || crypto.randomUUID();
                const filePath = `conversations/${turnId}.${ext}`;

                const { error: upErr } = await supabase.storage
                  .from("pronunciations")
                  .upload(filePath, audioBuffer, {
                    contentType: "audio/mpeg",
                    upsert: true,
                  });

                if (!upErr) {
                  const { data: pData } = supabase.storage
                    .from("pronunciations")
                    .getPublicUrl(filePath);

                  turn.id = turnId;
                  turn.audio_url = pData.publicUrl;
                  convModified = true;
                  processedItems.push({
                    id: turnId,
                    text: `${turn.speaker ? turn.speaker + ": " : ""}${text}`,
                    url: pData.publicUrl,
                  });
                  processedCount++;
                } else {
                  errors.push(`${text}: ${upErr.message}`);
                }
              } catch (e: unknown) {
                errors.push(`${text}: ${(e as Error).message}`);
              }
            }
          }

          if (convModified) {
            await supabase
              .from("conversations")
              .update({ turns, updated_at: new Date().toISOString() })
              .eq("id", conv.id);
          }
        }
      }
    }

    // Revalidate learner pages if any audio was updated
    if (processedItems.length > 0) {
      if (target.startsWith("vocab") || target.startsWith("verb")) {
        await revalidateLearnerPaths(["/", "/a1", "/a2", "/b1", "/b2"]);
      } else if (target.startsWith("medical")) {
        await revalidateLearnerPaths(["/medical"]);
      } else if (target === "conversation_turns") {
        await revalidateLearnerPaths(["/", "/speaking", "/medical", "/a1", "/a2", "/b1", "/b2"]);
      }
    }

    // Query remaining missing count
    let remaining = 0;
    try {
      if (target === "vocab_words") {
        const { count } = await supabase
          .from("vocabulary")
          .select("*", { count: "exact", head: true })
          .or("audio_url.is.null,audio_url.eq.");
        remaining = count ?? 0;
      } else if (target === "vocab_sentences") {
        const { count } = await supabase
          .from("vocabulary")
          .select("*", { count: "exact", head: true })
          .or("sentence_audio_url.is.null,sentence_audio_url.eq.")
          .not("examples", "is", null)
          .neq("examples", "[]");
        remaining = count ?? 0;
      } else if (target === "medical_words") {
        const { count } = await supabase
          .from("medical_words")
          .select("*", { count: "exact", head: true })
          .or("audio_url.is.null,audio_url.eq.");
        remaining = count ?? 0;
      } else if (target === "medical_sentences") {
        const { count } = await supabase
          .from("medical_words")
          .select("*", { count: "exact", head: true })
          .or("sentence_audio_url.is.null,sentence_audio_url.eq.")
          .not("example_german", "is", null)
          .neq("example_german", "");
        remaining = count ?? 0;
      } else if (target === "verb_infinitives") {
        const { count } = await supabase
          .from("verbs")
          .select("*", { count: "exact", head: true })
          .or("infinitive_audio_url.is.null,infinitive_audio_url.eq.");
        remaining = count ?? 0;
      } else if (target === "verb_praeteritums") {
        const { count } = await supabase
          .from("verbs")
          .select("*", { count: "exact", head: true })
          .or("praeteritum_audio_url.is.null,praeteritum_audio_url.eq.");
        remaining = count ?? 0;
      } else if (target === "verb_perfekts") {
        const { count } = await supabase
          .from("verbs")
          .select("*", { count: "exact", head: true })
          .or("perfekt_audio_url.is.null,perfekt_audio_url.eq.");
        remaining = count ?? 0;
      } else if (target === "verbs_all") {
        const { count: cInf } = await supabase
          .from("verbs")
          .select("*", { count: "exact", head: true })
          .or("infinitive_audio_url.is.null,infinitive_audio_url.eq.");
        const { count: cPraet } = await supabase
          .from("verbs")
          .select("*", { count: "exact", head: true })
          .or("praeteritum_audio_url.is.null,praeteritum_audio_url.eq.");
        const { count: cPerf } = await supabase
          .from("verbs")
          .select("*", { count: "exact", head: true })
          .or("perfekt_audio_url.is.null,perfekt_audio_url.eq.");
        remaining = (cInf || 0) + (cPraet || 0) + (cPerf || 0);
      } else if (target === "conversation_turns") {
        const { data: convData } = await supabase
          .from("conversations")
          .select("turns");
        let missing = 0;
        if (convData) {
          for (const conv of convData) {
            const turns = Array.isArray(conv.turns) ? conv.turns : [];
            for (const t of turns) {
              if (t && t.german && (!t.audio_url || !t.audio_url.trim())) {
                missing++;
              }
            }
          }
        }
        remaining = missing;
      }
    } catch {
      // Non-critical if count fails
    }

    return NextResponse.json({
      success: true,
      processed: processedItems.length,
      remaining,
      items: processedItems,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: unknown) {
    console.error("Batch audio generation error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
