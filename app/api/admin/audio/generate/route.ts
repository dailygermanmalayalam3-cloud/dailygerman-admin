import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { synthesizeGermanSpeech } from "@/lib/services/google-tts";

export const revalidate = 0;

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

    const { text, prefix = "vocab", voiceName, speakingRate } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "German text is required to generate pronunciation audio" },
        { status: 400 }
      );
    }

    // Synthesize audio with Google Cloud TTS
    const { audioBuffer, contentType, ext, characterCount } =
      await synthesizeGermanSpeech({
        text: text.trim(),
        voiceName,
        speakingRate,
      });

    // Upload to Supabase Storage
    const uniqueId = crypto.randomUUID();
    const filePath = `${prefix}/${uniqueId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("pronunciations")
      .upload(filePath, audioBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Audio upload failed:", uploadError.message);
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicData } = supabase.storage
      .from("pronunciations")
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: publicData.publicUrl,
      path: filePath,
      characterCount,
    });
  } catch (err: unknown) {
    console.error("Audio generation error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
