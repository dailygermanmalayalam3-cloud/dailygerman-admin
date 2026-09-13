import { NextRequest, NextResponse } from "next/server";
import {
  getCategoryParagraphs,
  mutateCategoryParagraph,
  deleteCategoryParagraph,
} from "@/lib/db/content";
import { Level } from "@/types";
import { revalidateLearnerPaths } from "@/lib/revalidate";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level") as Level | null;
    const category = searchParams.get("category");

    const items = await getCategoryParagraphs(
      level || undefined,
      category || undefined
    );
    return NextResponse.json({ items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch paragraphs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.category_name || !body.level || !body.paragraph_german) {
      return NextResponse.json(
        { error: "category_name, level, and paragraph_german are required." },
        { status: 400 }
      );
    }

    const saved = await mutateCategoryParagraph(body);
    await revalidateLearnerPaths(["/", `/${body.level.toLowerCase()}`]);
    return NextResponse.json({ item: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save paragraph";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing paragraph id." }, { status: 400 });
    }

    await deleteCategoryParagraph(id);
    await revalidateLearnerPaths(["/", "/a1", "/a2", "/b1", "/b2"]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete paragraph";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
