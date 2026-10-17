import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/revalidate", () => ({
  revalidateLearnerPaths: vi.fn(),
}));

vi.mock("@/lib/db/content", () => ({
  getMockExams: vi.fn(async () => [
    {
      id: "00000000-0000-4000-8000-000000000001",
      slug: "goethe-a1-lesen-modellsatz-01",
      title: "Goethe A1 Lesen Modellsatz 01",
      level: "A1",
      module: "lesen",
      duration_minutes: 25,
      passing_percentage: 60,
      total_questions: 15,
      is_published: true,
    },
  ]),
  getMockQuestions: vi.fn(async (_examId?: string) => [
    {
      id: "11111111-1111-4111-8111-111111111101",
      exam_id: "00000000-0000-4000-8000-000000000001",
      teil_number: 1,
      question_index: 1,
      question_text: "Karin kommt mit dem Zug.",
      options: [
        { id: "richtig", text: "Richtig" },
        { id: "falsch", text: "Falsch" },
      ],
      correct_option_id: "richtig",
      points: 1,
    },
  ]),
  saveMockExam: vi.fn(async (body) => ({
    id: body.id || "00000000-0000-4000-8000-000000000001",
    ...body,
  })),
  deleteMockExam: vi.fn(async (_id: string) => true),
  saveMockQuestion: vi.fn(async (body) => ({
    id: body.id || "11111111-1111-4111-8111-111111111101",
    ...body,
  })),
  deleteMockQuestion: vi.fn(async (_id: string) => true),
}));

describe("Admin Backend API: /api/admin/mock and /api/admin/mock-list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return mock exams and questions from /api/admin/mock-list", async () => {
    const { GET } = await import("@/app/api/admin/mock-list/route");

    const req = new Request("http://localhost:3001/api/admin/mock-list");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.exams).toHaveLength(1);
    expect(data.exams[0].level).toBe("A1");
    expect(data.questions).toHaveLength(1);
  });

  it("should return 400 if required mock exam fields are missing", async () => {
    const { POST } = await import("@/app/api/admin/mock/route");

    const req = new Request("http://localhost:3001/api/admin/mock", {
      method: "POST",
      body: JSON.stringify({ title: "Incomplete Exam" }), // Missing level, module, slug
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing required fields");
  });

  it("should create/save a mock exam and trigger learner revalidation", async () => {
    const { POST } = await import("@/app/api/admin/mock/route");
    const { revalidateLearnerPaths } = await import("@/lib/revalidate");

    const req = new Request("http://localhost:3001/api/admin/mock", {
      method: "POST",
      body: JSON.stringify({
        title: "Goethe B1 Lesen Modellsatz",
        slug: "goethe-b1-lesen-modellsatz",
        level: "B1",
        module: "lesen",
        duration_minutes: 65,
        passing_percentage: 60,
        total_questions: 30,
        is_published: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.exam.level).toBe("B1");
    expect(revalidateLearnerPaths).toHaveBeenCalledWith([
      "/",
      "/goethe",
      "/goethe/mock",
      "/goethe/mock/goethe-b1-lesen-modellsatz",
      "/mock",
      "/mock/goethe-b1-lesen-modellsatz",
    ]);
  });

  it("should delete a mock exam and trigger learner revalidation", async () => {
    const { DELETE } = await import("@/app/api/admin/mock/route");
    const { deleteMockExam } = await import("@/lib/db/content");
    const { revalidateLearnerPaths } = await import("@/lib/revalidate");

    const req = new Request(
      "http://localhost:3001/api/admin/mock?id=00000000-0000-4000-8000-000000000001&slug=goethe-a1-lesen-modellsatz-01",
      { method: "DELETE" }
    );

    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(deleteMockExam).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000001");
    expect(revalidateLearnerPaths).toHaveBeenCalledWith([
      "/",
      "/goethe",
      "/goethe/mock",
      "/mock",
      "/goethe/mock/goethe-a1-lesen-modellsatz-01",
      "/mock/goethe-a1-lesen-modellsatz-01",
    ]);
  });

  it("should create/save a mock question and trigger learner revalidation", async () => {
    const { POST } = await import("@/app/api/admin/mock/questions/route");
    const { revalidateLearnerPaths } = await import("@/lib/revalidate");

    const req = new Request("http://localhost:3001/api/admin/mock/questions", {
      method: "POST",
      body: JSON.stringify({
        exam_id: "00000000-0000-4000-8000-000000000001",
        teil_number: 1,
        question_index: 2,
        question_text: "Ralf feiert Geburtstag.",
        options: [
          { id: "richtig", text: "Richtig" },
          { id: "falsch", text: "Falsch" },
        ],
        correct_option_id: "richtig",
        points: 1,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(revalidateLearnerPaths).toHaveBeenCalledWith(["/", "/goethe", "/goethe/mock", "/mock"]);
  });

  it("should delete a mock question and trigger learner revalidation", async () => {
    const { DELETE } = await import("@/app/api/admin/mock/questions/route");
    const { deleteMockQuestion } = await import("@/lib/db/content");
    const { revalidateLearnerPaths } = await import("@/lib/revalidate");

    const req = new Request(
      "http://localhost:3001/api/admin/mock/questions?id=11111111-1111-4111-8111-111111111101",
      { method: "DELETE" }
    );

    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(deleteMockQuestion).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111101");
    expect(revalidateLearnerPaths).toHaveBeenCalledWith(["/", "/goethe", "/goethe/mock", "/mock"]);
  });
});
