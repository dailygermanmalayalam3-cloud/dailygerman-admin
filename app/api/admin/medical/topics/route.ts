import { NextResponse } from "next/server";
import {
  getMedicalConversationTopics,
  mutateMedicalConversationTopic,
  deleteMedicalConversationTopic,
} from "@/lib/db/content";

export const revalidate = 0;

export async function GET() {
  try {
    const items = await getMedicalConversationTopics();
    return NextResponse.json({ success: true, items });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title || !body.slug) {
      return NextResponse.json(
        { error: "Missing required fields (title, slug)" },
        { status: 400 }
      );
    }
    const item = await mutateMedicalConversationTopic(body);
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
    await deleteMedicalConversationTopic(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
