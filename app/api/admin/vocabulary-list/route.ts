import { NextResponse } from "next/server";
import { getVocabulary } from "@/lib/db/content";

export const revalidate = 0;

export async function GET() {
  try {
    const items = await getVocabulary();
    return NextResponse.json({ items });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}