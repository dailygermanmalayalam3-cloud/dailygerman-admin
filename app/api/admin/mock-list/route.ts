import { NextResponse } from "next/server";
import { getMockExams, getMockQuestions } from "@/lib/db/content";

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get("examId") || undefined;

    const [exams, questions] = await Promise.all([
      getMockExams(),
      getMockQuestions(examId),
    ]);

    return NextResponse.json({ exams, questions });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
