import { NextResponse } from "next/server";
import {
  getGoetheExamTemplates,
  mutateGoetheExamTemplate,
  deleteGoetheExamTemplate,
} from "@/lib/db/content";
import { revalidateLearnerPaths } from "@/lib/revalidate";
import { Level } from "@/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const level = (searchParams.get("level") as Level) || undefined;
    const moduleType = (searchParams.get("module_type") as "schreiben" | "sprechen") || undefined;

    const templates = await getGoetheExamTemplates(level, moduleType);
    return NextResponse.json({ success: true, templates });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title || !body.level || !body.module_type || !body.section) {
      return NextResponse.json(
        { error: "Missing required fields: title, level, module_type, section" },
        { status: 400 }
      );
    }

    const result = await mutateGoetheExamTemplate(body);
    await revalidateLearnerPaths(["/", "/goethe/writing-speaking-guide", "/tools/exam-templates", "/goethe"]);
    return NextResponse.json({ success: true, item: result });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing required query parameter: id" }, { status: 400 });
    }

    await deleteGoetheExamTemplate(id);
    await revalidateLearnerPaths(["/", "/goethe/writing-speaking-guide", "/tools/exam-templates", "/goethe"]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
