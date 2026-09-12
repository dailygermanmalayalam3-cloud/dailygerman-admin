import { NextResponse } from "next/server";
import {
  getMedicalWords,
  mutateMedicalWord,
  deleteMedicalWord,
} from "@/lib/db/content";

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId") || undefined;
    const items = await getMedicalWords(categoryId);
    return NextResponse.json({ success: true, items });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.category_id || !body.german || !body.english) {
      return NextResponse.json(
        { error: "Missing required fields (category_id, german, english)" },
        { status: 400 }
      );
    }
    const item = await mutateMedicalWord(body);
    return NextResponse.json({ success: true, item });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await deleteMedicalWord(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
