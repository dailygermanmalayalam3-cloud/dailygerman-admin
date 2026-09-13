import { NextResponse } from "next/server";
import { getSpeakingTopics, mutateSpeakingTopic, deleteSpeakingTopic } from "@/lib/db/content";
import { Level } from "@/types";
import { revalidateLearnerPaths } from "@/lib/revalidate";

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const level = (searchParams.get("level") as Level) || undefined;
    const items = await getSpeakingTopics(level);
    return NextResponse.json({ success: true, items });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.level || !body.title || !body.slug) {
      return NextResponse.json({ error: "Missing required fields (level, title, slug)" }, { status: 400 });
    }
    const item = await mutateSpeakingTopic(body);
    const paths = ["/", "/speaking", `/${body.level.toLowerCase()}`];
    if (body.slug) paths.push(`/speaking/${body.slug}`);
    await revalidateLearnerPaths(paths);
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
    await deleteSpeakingTopic(id);
    await revalidateLearnerPaths(["/", "/speaking", "/a1", "/a2", "/b1", "/b2"]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
