import { NextResponse } from "next/server";
import { getListeningTopics, mutateListeningTopic, deleteListeningTopic } from "@/lib/db/content";
import { Level } from "@/types";
import { revalidateLearnerPaths } from "@/lib/revalidate";

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const level = (searchParams.get("level") as Level) || undefined;
    const items = await getListeningTopics(level);
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
    const item = await mutateListeningTopic(body);
    const paths = ["/", "/listening", `/${body.level.toLowerCase()}`];
    if (body.slug) paths.push(`/listening/${body.slug}`);
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
    await deleteListeningTopic(id);
    await revalidateLearnerPaths(["/", "/listening", "/a1", "/a2", "/b1", "/b2"]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
