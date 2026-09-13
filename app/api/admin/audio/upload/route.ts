import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Storage service configuration missing" },
        { status: 500 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const prefix = (formData.get("prefix") as string) || "vocab";

    if (!file) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    // Determine extension and clean base MIME type (e.g. "audio/webm;codecs=opus" -> "audio/webm")
    const rawMime = file.type || "audio/webm";
    const cleanMime = rawMime.split(";")[0].trim() || "audio/webm";
    let ext = "webm";
    if (rawMime.includes("mp4") || rawMime.includes("m4a")) ext = "mp4";
    else if (rawMime.includes("mpeg") || rawMime.includes("mp3")) ext = "mp3";
    else if (rawMime.includes("ogg")) ext = "ogg";
    else if (rawMime.includes("wav")) ext = "wav";

    const uniqueId = crypto.randomUUID();
    const filePath = `${prefix}/${uniqueId}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("pronunciations")
      .upload(filePath, buffer, {
        contentType: cleanMime,
        upsert: true,
      });

    if (uploadError) {
      console.error("Audio upload error:", uploadError.message);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
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
    });
  } catch (err: unknown) {
    console.error("Audio upload exception:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
