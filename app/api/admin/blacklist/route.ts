import { NextResponse } from "next/server";
import {
  getBlacklistedUsers,
  blacklistUser,
  unblacklistUser,
} from "@/lib/db/content";

export const revalidate = 0;

export async function GET() {
  try {
    const items = await getBlacklistedUsers();
    return NextResponse.json({ success: true, items });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { user_name, email, ip_address, device_fingerprint, reason } = body;

    // Must provide at least one identifier to blacklist
    if (!device_fingerprint && !ip_address && !email) {
      return NextResponse.json(
        { error: "At least one identifier (device_fingerprint, ip_address, or email) is required to blacklist a user." },
        { status: 400 }
      );
    }

    const item = await blacklistUser({
      user_name,
      email,
      ip_address,
      device_fingerprint,
      reason,
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
      return NextResponse.json({ error: "Missing blacklist entry id" }, { status: 400 });
    }

    await unblacklistUser(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
