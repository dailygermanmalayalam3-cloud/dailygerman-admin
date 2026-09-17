import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { synthesizeGermanSpeech } from "@/lib/services/google-tts";
import { revalidateLearnerPaths } from "@/lib/revalidate";

export const revalidate = 0;

export type BatchTarget =
  | "vocab_words"
  | "vocab_sentences"
  | "medical_words"
  | "medical_sentences";

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
      ].includes(target)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid target. Must be one of: vocab_words, vocab_sentences, medical_words, medical_sentences",
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
        .limit(safeLimit);

      if (fetchErr) throw fetchErr;

      for (const row of rows || []) {
        const exs = Array.isArray(row.examples) ? row.examples : [];
        const text = exs[0]?.german?.trim();
        if (!text) continue;

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
    }

    // Revalidate learner pages if any audio was updated
    if (processedItems.length > 0) {
      if (target.startsWith("vocab")) {
        await revalidateLearnerPaths(["/", "/a1", "/a2", "/b1", "/b2"]);
      } else if (target.startsWith("medical")) {
        await revalidateLearnerPaths(["/medical"]);
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedItems.length,
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
