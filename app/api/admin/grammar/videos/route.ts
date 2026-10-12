import { NextResponse } from "next/server";
import { getGrammarVideos, mutateGrammarVideo, deleteGrammarVideo } from "@/lib/db/content";
import { revalidateLearnerPaths } from "@/lib/revalidate";

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const topicId = searchParams.get("topic_id") || undefined;
    const items = await getGrammarVideos(topicId);
    return NextResponse.json({ success: true, items });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const hasVideo = typeof body.video_url === "string" && body.video_url.trim().length > 0;
    const hasPdf = typeof body.pdf_url === "string" && body.pdf_url.trim().length > 0;

    if (!body.topic_id || (!hasVideo && !hasPdf)) {
      return NextResponse.json(
        { error: "Missing required fields (topic_id and at least one of video_url or pdf_url)" },
        { status: 400 }
      );
    }
    const item = await mutateGrammarVideo(body);
    await revalidateLearnerPaths(["/grammar", "/a1", "/a2", "/b1", "/b2"]);
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
    await deleteGrammarVideo(id);
    await revalidateLearnerPaths(["/grammar", "/a1", "/a2", "/b1", "/b2"]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
