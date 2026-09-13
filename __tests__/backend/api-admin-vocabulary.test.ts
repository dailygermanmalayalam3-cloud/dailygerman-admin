import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/revalidate", () => ({
  revalidateLearnerPaths: vi.fn(),
}));

vi.mock("@/lib/db/content", () => ({
  mutateVocabulary: vi.fn(async (body) => ({
    id: body.id || "11111111-1111-4111-8111-111111111111",
    level: body.level,
    category: body.category,
    title: body.title || body.german_content,
    slug: "test-slug",
    german_content: body.german_content,
    english_meaning: body.english_meaning || "",
    malayalam_meaning: body.malayalam_meaning || "",
  })),
  batchMutateVocabulary: vi.fn(async (words) => words.map((w: Record<string, unknown>, idx: number) => ({
    id: `22222222-2222-4222-8222-22222222222${idx}`,
    ...w,
  }))),
  deleteVocabularyItem: vi.fn(async (_id: string) => true),
}));

describe("Admin Backend API: /api/admin/vocabulary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 when missing required fields on single word creation", async () => {
    const { POST } = await import("@/app/api/admin/vocabulary/route");

    const req = new Request("http://localhost:3001/api/admin/vocabulary", {
      method: "POST",
      body: JSON.stringify({ level: "A1" }), // Missing category & german_content
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Missing required fields");
  });

  it("should successfully create a single word and trigger learner cache revalidation", async () => {
    const { POST } = await import("@/app/api/admin/vocabulary/route");
    const { revalidateLearnerPaths } = await import("@/lib/revalidate");

    const req = new Request("http://localhost:3001/api/admin/vocabulary", {
      method: "POST",
      body: JSON.stringify({
        level: "A1",
        category: "Greetings",
        german_content: "Guten Morgen",
        english_meaning: "Good morning",
        malayalam_meaning: "ശുഭോദയം",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.item.german_content).toBe("Guten Morgen");
    expect(revalidateLearnerPaths).toHaveBeenCalledWith(["/", "/a1"]);
  });

  it("should return 400 when words array is empty on batch insertion", async () => {
    const { POST } = await import("@/app/api/admin/vocabulary/route");

    const req = new Request("http://localhost:3001/api/admin/vocabulary", {
      method: "POST",
      body: JSON.stringify({ words: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("No words provided");
  });

  it("should successfully batch insert words and trigger revalidation across multiple levels", async () => {
    const { POST } = await import("@/app/api/admin/vocabulary/route");
    const { revalidateLearnerPaths } = await import("@/lib/revalidate");

    const req = new Request("http://localhost:3001/api/admin/vocabulary", {
      method: "POST",
      body: JSON.stringify({
        words: [
          { level: "A1", category: "Food", german_content: "Apfel", english_meaning: "Apple", malayalam_meaning: "ആപ്പിൾ" },
          { level: "B1", category: "Career", german_content: "Bewerbung", english_meaning: "Application", malayalam_meaning: "അപേക്ഷ" },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.items.length).toBe(2);
    expect(revalidateLearnerPaths).toHaveBeenCalledWith(["/", "/a1", "/b1"]);
  });

  it("should return 400 when deleting without providing an id query param", async () => {
    const { DELETE } = await import("@/app/api/admin/vocabulary/route");

    const req = new Request("http://localhost:3001/api/admin/vocabulary", {
      method: "DELETE",
    });

    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing id");
  });

  it("should successfully delete a vocabulary item and trigger revalidation", async () => {
    const { DELETE } = await import("@/app/api/admin/vocabulary/route");
    const { deleteVocabularyItem } = await import("@/lib/db/content");
    const { revalidateLearnerPaths } = await import("@/lib/revalidate");

    const req = new Request("http://localhost:3001/api/admin/vocabulary?id=33333333-3333-4333-8333-333333333333", {
      method: "DELETE",
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(deleteVocabularyItem).toHaveBeenCalledWith("33333333-3333-4333-8333-333333333333");
    expect(revalidateLearnerPaths).toHaveBeenCalledWith(["/", "/a1", "/a2", "/b1", "/b2"]);
  });
});
