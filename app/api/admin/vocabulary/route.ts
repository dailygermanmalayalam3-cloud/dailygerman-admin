import { NextResponse } from "next/server";
import { mutateVocabulary, deleteVocabularyItem } from "@/lib/db/content";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title || !body.level || !body.category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
