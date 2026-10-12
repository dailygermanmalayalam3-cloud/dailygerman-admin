import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const revalidate = 0;

const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15 MB

export function extractGrammarPdfStoragePath(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath || typeof urlOrPath !== "string") return null;
  const trimmed = urlOrPath.trim();
  const marker = "/storage/v1/object/public/grammar-pdfs/";
  const idx = trimmed.indexOf(marker);
  if (idx !== -1) {
    return decodeURIComponent(trimmed.slice(idx + marker.length).split("?")[0]);
  }
  if (trimmed.startsWith("grammar/") && trimmed.endsWith(".pdf")) {
    return trimmed;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Storage service configuration missing" },
        { status: 500 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }

    const rawMime = (file.type || "").toLowerCase();
    const fileName = (file.name || "").toLowerCase();
    if (!rawMime.includes("pdf") && !fileName.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Invalid file type. Only PDF documents (.pdf) are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: "PDF file exceeds the 15 MB size limit." },
        { status: 400 }
      );
    }

    const uniqueId = crypto.randomUUID();
    const filePath = `grammar/${uniqueId}.pdf`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("grammar-pdfs")
      .upload(filePath, buffer, {
        contentType: "application/pdf",
        cacheControl: "31536000",
        upsert: true,
      });

    if (uploadError) {
      console.error("Grammar PDF upload error:", uploadError.message);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicData } = supabase.storage
      .from("grammar-pdfs")
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: publicData.publicUrl,
      path: filePath,
    });
  } catch (err: unknown) {
    console.error("Grammar PDF upload exception:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Storage service configuration missing" },
        { status: 500 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const target = searchParams.get("url") || searchParams.get("path");
    const storagePath = extractGrammarPdfStoragePath(target);

    if (!storagePath) {
      return NextResponse.json(
        { error: "Missing or invalid storage path" },
        { status: 400 }
      );
    }

    const { error } = await supabase.storage
      .from("grammar-pdfs")
      .remove([storagePath]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
