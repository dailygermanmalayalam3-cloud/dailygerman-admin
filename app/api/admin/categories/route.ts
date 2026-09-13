import { NextResponse } from "next/server";
import {
  getVocabularyCategories,
  mutateVocabularyCategory,
  deleteVocabularyCategory,
} from "@/lib/db/content";
import { revalidateLearnerPaths } from "@/lib/revalidate";

export async function GET() {
  try {
    const categories = await getVocabularyCategories();
    return NextResponse.json({ success: true, items: categories });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const item = await mutateVocabularyCategory({
      id: body.id,
      name: body.name.trim(),
      order_index: Number(body.order_index) || 1,
    });

    await revalidateLearnerPaths(["/", "/a1", "/a2", "/b1", "/b2"]);
    return NextResponse.json({ success: true, item });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing category id" }, { status: 400 });

    await deleteVocabularyCategory(id);
    await revalidateLearnerPaths(["/", "/a1", "/a2", "/b1", "/b2"]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
