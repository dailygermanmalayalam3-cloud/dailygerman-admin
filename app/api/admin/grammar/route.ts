import { NextResponse } from "next/server";
import { mutateGrammarTopic, deleteGrammarTopicItem } from "@/lib/db/content";
import { revalidateLearnerPaths } from "@/lib/revalidate";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title || !body.level) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const result = await mutateGrammarTopic(body);
    const paths = ["/", "/grammar", `/${body.level.toLowerCase()}`];
    if (result.slug) paths.push(`/grammar/${result.slug}`);
    await revalidateLearnerPaths(paths);
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
    await deleteGrammarTopicItem(id);
    await revalidateLearnerPaths(["/", "/grammar", "/a1", "/a2", "/b1", "/b2"]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
