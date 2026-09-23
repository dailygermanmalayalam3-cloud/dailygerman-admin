import { NextResponse } from "next/server";
import {
  getVerbCategories,
  createVerbCategory,
  updateVerbCategory,
  deleteVerbCategory,
  isValidUUID,
} from "@/lib/db/verbs";
import { revalidateLearnerPaths } from "@/lib/revalidate";

export async function GET() {
  try {
    const categories = await getVerbCategories();
    return NextResponse.json({ success: true, items: categories });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch verb categories" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    let item;
    if (body.id) {
      if (!isValidUUID(body.id)) {
        return NextResponse.json(
          { error: `Invalid UUID format for category id: ${body.id}` },
          { status: 400 }
        );
      }
      item = await updateVerbCategory(body.id, {
        name: body.name.trim(),
        order_index: Number(body.order_index) || 1,
      });
    } else {
      item = await createVerbCategory({
        name: body.name.trim(),
        order_index: Number(body.order_index) || 1,
      });
    }

    await revalidateLearnerPaths(["/", "/a1", "/a2", "/b1", "/b2"]);
    return NextResponse.json({ success: true, item });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to save verb category" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Missing category id parameter" },
        { status: 400 }
      );
    }

    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: `Invalid UUID format for category id: ${id}` },
        { status: 400 }
      );
    }

    await deleteVerbCategory(id);
    await revalidateLearnerPaths(["/", "/a1", "/a2", "/b1", "/b2"]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to delete verb category" },
      { status: 500 }
    );
  }
}
