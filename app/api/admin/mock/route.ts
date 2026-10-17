import { NextResponse } from "next/server";
import { saveMockExam, deleteMockExam } from "@/lib/db/content";
import { revalidateLearnerPaths } from "@/lib/revalidate";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.title || !body.level || !body.slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await saveMockExam(body);
    await revalidateLearnerPaths(["/", "/goethe", "/goethe/mock", `/goethe/mock/${result.slug}`, "/mock", `/mock/${result.slug}`]);

    return NextResponse.json({ success: true, exam: result });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const slug = searchParams.get("slug");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await deleteMockExam(id);
    const paths = ["/", "/goethe", "/goethe/mock", "/mock"];
    if (slug) {
      paths.push(`/goethe/mock/${slug}`);
      paths.push(`/mock/${slug}`);
    }
    await revalidateLearnerPaths(paths);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
