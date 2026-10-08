import { NextResponse } from "next/server";
import { isCurrentUserAdmin, getCurrentUser } from "@/lib/supabase/auth";
import { listAdminUsers, deleteAdminUser } from "@/lib/supabase/admin";

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
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const filterStatus = searchParams.get("status") || "all";
    const filterProvider = searchParams.get("provider") || "all";

    let users = await listAdminUsers();

    if (search) {
      users = users.filter((u) => {
        const emailMatch = u.email?.toLowerCase().includes(search);
        const nameMatch = u.fullName.toLowerCase().includes(search);
        const idMatch = u.id.toLowerCase().includes(search);
        return emailMatch || nameMatch || idMatch;
      });
    }

    if (filterStatus === "verified") {
      users = users.filter((u) => Boolean(u.email_confirmed_at || u.confirmed_at));
    } else if (filterStatus === "unverified") {
      users = users.filter((u) => !u.email_confirmed_at && !u.confirmed_at);
    }

    if (filterProvider !== "all") {
      users = users.filter(
        (u) => u.provider.toLowerCase() === filterProvider.toLowerCase()
      );
    }

    return NextResponse.json({
      success: true,
      users,
      count: users.length,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch users" },
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

    const currentUser = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("id");

    if (!userId) {
      const body = await req.json().catch(() => null);
      userId = body?.id;
    }

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid user ID" },
        { status: 400 }
      );
    }

    // Safety guard: Prevent administrator from deleting themselves
    if (currentUser?.id && currentUser.id === userId) {
      return NextResponse.json(
        { error: "Action blocked: You cannot delete your own administrator account." },
        { status: 400 }
      );
    }

    await deleteAdminUser(userId);

    return NextResponse.json({
      success: true,
      message: "User successfully deleted.",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
