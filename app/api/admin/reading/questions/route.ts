import { NextResponse } from "next/server";
import { getReadingQuestions, mutateReadingQuestion, deleteReadingQuestion } from "@/lib/db/content";
import { revalidateLearnerPaths } from "@/lib/revalidate";

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get("topic_id") || undefined;
    const items = await getReadingQuestions(topicId);
    return NextResponse.json({ success: true, items });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.topic_id || !body.question || !Array.isArray(body.options) || body.options.length < 2) {
      return NextResponse.json({ error: "Missing required fields (topic_id, question, options [array of at least 2])" }, { status: 400 });
    }
    const item = await mutateReadingQuestion(body);
    await revalidateLearnerPaths(["/", "/reading", "/a1", "/a2", "/b1", "/b2"]);
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
    await deleteReadingQuestion(id);
    await revalidateLearnerPaths(["/", "/reading", "/a1", "/a2", "/b1", "/b2"]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
