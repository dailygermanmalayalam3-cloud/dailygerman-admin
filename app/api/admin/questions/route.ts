import { NextRequest, NextResponse } from "next/server";
import {
  getCategoryQuestions,
  mutateCategoryQuestion,
  deleteCategoryQuestion,
} from "@/lib/db/content";
import { Level } from "@/types";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level") as Level | null;
    const category = searchParams.get("category");
    const paragraphId = searchParams.get("paragraph_id");

    const items = await getCategoryQuestions(
      level || undefined,
      category || undefined,
      paragraphId === "null" ? null : paragraphId || undefined
    );
    return NextResponse.json({ items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch questions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (
      !body.category_name ||
      !body.level ||
      !body.question_german ||
      !Array.isArray(body.options) ||
      body.options.length !== 4 ||
      typeof body.correct_option_index !== "number"
    ) {
      return NextResponse.json(
        {
          error:
            "category_name, level, question_german, 4 options, and correct_option_index (0-3) are required.",
        },
        { status: 400 }
      );
    }

    const saved = await mutateCategoryQuestion(body);
    return NextResponse.json({ item: saved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save question";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing question id." }, { status: 400 });
    }

    await deleteCategoryQuestion(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete question";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
