import { NextResponse } from "next/server";
import { saveMockQuestion, deleteMockQuestion } from "@/lib/db/content";
import { revalidateLearnerPaths } from "@/lib/revalidate";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.exam_id || !body.question_text || !body.correct_option_id || !body.options) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await saveMockQuestion(body);
    await revalidateLearnerPaths(["/", "/goethe", "/goethe/mock", "/mock"]);

    return NextResponse.json({ success: true, question: result });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await deleteMockQuestion(id);
    await revalidateLearnerPaths(["/", "/goethe", "/goethe/mock", "/mock"]);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
