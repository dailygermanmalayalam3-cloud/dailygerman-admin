import { NextResponse } from "next/server";
import {
  getSuggestions,
  updateSuggestion,
  deleteSuggestion,
} from "@/lib/db/content";
import { SuggestionStatus } from "@/types";

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const items = await getSuggestions(status, search);
    return NextResponse.json({ success: true, items });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json({ error: "Missing suggestion id" }, { status: 400 });
    }

    const validStatuses: SuggestionStatus[] = ["unread", "read", "in_progress", "resolved", "archived"];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const item = await updateSuggestion(body.id, {
      status: body.status as SuggestionStatus,
      admin_notes: body.admin_notes,
    });

    return NextResponse.json({ success: true, item });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing suggestion id" }, { status: 400 });
    }

    await deleteSuggestion(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
