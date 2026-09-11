import { NextResponse } from "next/server";
import { mutateVocabulary, batchMutateVocabulary, deleteVocabularyItem } from "@/lib/db/content";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Check if batch words insertion
    if (Array.isArray(body.words)) {
      if (body.words.length === 0) {
        return NextResponse.json({ error: "No words provided" }, { status: 400 });
      }
      const results = await batchMutateVocabulary(body.words);
      return NextResponse.json({ success: true, items: results });
    }

    // Single word insertion / update
    if (!body.level || !body.category || (!body.german_content && !body.title)) {
      return NextResponse.json({ error: "Missing required fields (level, category, german word)" }, { status: 400 });
    }
    const result = await mutateVocabulary(body);
    return NextResponse.json({ success: true, item: result });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await deleteVocabularyItem(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
