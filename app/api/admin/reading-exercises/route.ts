import { NextRequest, NextResponse } from "next/server";
import {
  getCategoryReadingExercises,
  mutateCategoryReadingExercise,
  deleteCategoryReadingExercise,
} from "@/lib/db/content";
import { Level } from "@/types";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level") as Level | null;
    const category = searchParams.get("category");

    const items = await getCategoryReadingExercises(
      level || undefined,
      category || undefined
    );
    return NextResponse.json({ items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch reading exercises";
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

    const saved = await mutateCategoryReadingExercise(body);
    return NextResponse.json({ item: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save reading exercise";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing exercise id." }, { status: 400 });
    }

    await deleteCategoryReadingExercise(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete reading exercise";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
