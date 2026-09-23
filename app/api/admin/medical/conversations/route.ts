import { NextResponse } from "next/server";
import {
  getMedicalConversations,
  mutateMedicalConversation,
  deleteMedicalConversation,
} from "@/lib/db/content";
import { revalidateLearnerPaths } from "@/lib/revalidate";

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get("topicId") || searchParams.get("topic_id") || undefined;
    const items = await getMedicalConversations(topicId);
    return NextResponse.json({ success: true, items });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.topic_id) {
      return NextResponse.json(
        { error: "Missing required field: topic_id" },
        { status: 400 }
      );
    }
    const item = await mutateMedicalConversation(body);
    await revalidateLearnerPaths(["/", "/medical"]);
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
    await deleteMedicalConversation(id);
    await revalidateLearnerPaths(["/", "/medical"]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
