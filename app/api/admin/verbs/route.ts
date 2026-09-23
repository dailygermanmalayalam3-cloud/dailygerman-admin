import { NextResponse } from "next/server";
import {
  getVerbs,
  createVerb,
  updateVerb,
  deleteVerb,
  batchCreateVerbs,
  isValidUUID,
} from "@/lib/db/verbs";
import { revalidateLearnerPaths } from "@/lib/revalidate";
import { Level } from "@/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const level = (searchParams.get("level") as Level) || undefined;
    const category_id = searchParams.get("category_id") || undefined;
    const search = searchParams.get("search") || undefined;

    const items = await getVerbs({ level, category_id, search });
    return NextResponse.json({ success: true, items });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch verbs" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Batch insertion
    if (Array.isArray(body.verbs)) {
      if (body.verbs.length === 0) {
        return NextResponse.json({ error: "No verbs provided in batch" }, { status: 400 });
      }

      for (const v of body.verbs) {
        if (!v.level || !v.category_id || !v.infinitive_de || !v.praeteritum_de || !v.perfekt_de) {
          return NextResponse.json(
            { error: "Each verb must have level, category_id, infinitive_de, praeteritum_de, and perfekt_de" },
            { status: 400 }
          );
        }
        if (!isValidUUID(v.category_id)) {
          return NextResponse.json(
            { error: `Invalid category UUID: ${v.category_id}` },
            { status: 400 }
          );
        }
        if (v.id && !isValidUUID(v.id)) {
          return NextResponse.json(
            { error: `Invalid verb UUID: ${v.id}` },
            { status: 400 }
          );
        }
      }

      const results = await batchCreateVerbs(body.verbs);
      const levels = Array.from(new Set(body.verbs.map((v: { level?: string }) => v.level?.toLowerCase()).filter(Boolean)));
      const paths = ["/", ...levels.map((lvl) => `/${lvl}`)];
      await revalidateLearnerPaths(paths);
      return NextResponse.json({ success: true, items: results });
    }

    // Single verb creation
    const {
      id,
      level,
      category_id,
      infinitive_de,
      infinitive_en,
      infinitive_ml,
      infinitive_audio_url,
      praeteritum_de,
      praeteritum_en,
      praeteritum_ml,
      praeteritum_audio_url,
      perfekt_de,
      perfekt_en,
      perfekt_ml,
      perfekt_audio_url,
      order_index,
    } = body;

    if (!level || !category_id || !infinitive_de || !praeteritum_de || !perfekt_de) {
      return NextResponse.json(
        { error: "Missing required fields (level, category_id, infinitive_de, praeteritum_de, perfekt_de)" },
        { status: 400 }
      );
    }

    if (!isValidUUID(category_id)) {
      return NextResponse.json(
        { error: `Invalid category UUID: ${category_id}` },
        { status: 400 }
      );
    }

    if (id && !isValidUUID(id)) {
      return NextResponse.json(
        { error: `Invalid verb UUID: ${id}` },
        { status: 400 }
      );
    }

    const item = await createVerb({
      id,
      level,
      category_id,
      infinitive_de,
      infinitive_en: infinitive_en || "",
      infinitive_ml: infinitive_ml || "",
      infinitive_audio_url,
      praeteritum_de,
      praeteritum_en: praeteritum_en || "",
      praeteritum_ml: praeteritum_ml || "",
      praeteritum_audio_url,
      perfekt_de,
      perfekt_en: perfekt_en || "",
      perfekt_ml: perfekt_ml || "",
      perfekt_audio_url,
      order_index: Number(order_index) || 1,
    });

    const levelPath = `/${level.toLowerCase()}`;
    await revalidateLearnerPaths(["/", levelPath]);
    return NextResponse.json({ success: true, item });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to create verb" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing verb id" }, { status: 400 });
    }

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: `Invalid verb UUID: ${id}` }, { status: 400 });
    }

    if (updates.category_id && !isValidUUID(updates.category_id)) {
      return NextResponse.json(
        { error: `Invalid category UUID: ${updates.category_id}` },
        { status: 400 }
      );
    }

    const item = await updateVerb(id, updates);
    const paths = ["/"];
    if (item.level) {
      paths.push(`/${item.level.toLowerCase()}`);
    }
    await revalidateLearnerPaths(paths);
    return NextResponse.json({ success: true, item });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to update verb" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      const body = await req.json().catch(() => null);
      if (body && body.id) {
        id = body.id;
      }
    }

    if (!id) {
      return NextResponse.json({ error: "Missing verb id" }, { status: 400 });
    }

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: `Invalid verb UUID: ${id}` }, { status: 400 });
    }

    await deleteVerb(id);
    await revalidateLearnerPaths(["/", "/a1", "/a2", "/b1", "/b2"]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to delete verb" },
      { status: 500 }
    );
  }
}
