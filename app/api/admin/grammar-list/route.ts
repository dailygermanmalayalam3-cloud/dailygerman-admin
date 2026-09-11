import { NextResponse } from "next/server";
import { getGrammarTopics } from "@/lib/db/content";

export const revalidate = 0;

export async function GET() {
  try {
    const items = await getGrammarTopics();
    return NextResponse.json({ items });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}