import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/supabase/auth";
import {
  listAdminVoiceGroups,
  dissolveAdminVoiceGroup,
  deleteAdminVoiceGroup,
} from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Administrator privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusParam = (searchParams.get("status") || "all").toLowerCase();
    const status = statusParam === "active" ? "active" : statusParam === "inactive" ? "inactive" : "all";

    const allGroups = await listAdminVoiceGroups("all");
    const filteredGroups =
      status === "active"
        ? allGroups.filter((g) => g.is_active)
        : status === "inactive"
        ? allGroups.filter((g) => !g.is_active)
        : allGroups;

    const activeCount = allGroups.filter((g) => g.is_active).length;
    const inactiveCount = allGroups.filter((g) => !g.is_active).length;

    return NextResponse.json({
      success: true,
      groups: filteredGroups,
      totalCount: allGroups.length,
      activeCount,
      inactiveCount,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch voice groups" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Administrator privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    const id = body?.id;
    const action = body?.action || "dissolve";

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid voice group ID" },
        { status: 400 }
      );
    }

    if (action === "dissolve") {
      await dissolveAdminVoiceGroup(id);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to update voice group" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Administrator privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await req.json().catch(() => null);
      id = body?.id;
    }

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid voice group ID" },
        { status: 400 }
      );
    }

    await deleteAdminVoiceGroup(id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to delete voice group" },
      { status: 500 }
    );
  }
}
