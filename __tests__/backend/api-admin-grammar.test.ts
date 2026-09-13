import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/revalidate", () => ({
  revalidateLearnerPaths: vi.fn(),
}));

vi.mock("@/lib/db/content", () => ({
  mutateGrammarTopic: vi.fn(async (body) => ({
    id: body.id || "44444444-4444-4444-8444-444444444444",
    title: body.title,
    level: body.level,
    slug: body.slug || "der-die-das",
    short_description: body.short_description || "",
    explanation_malayalam: body.explanation_malayalam || "",
  })),
  deleteGrammarTopicItem: vi.fn(async (_id: string) => true),
}));

describe("Admin Backend API: /api/admin/grammar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 when title or level is missing on creation", async () => {
    const { POST } = await import("@/app/api/admin/grammar/route");

    const req = new Request("http://localhost:3001/api/admin/grammar", {
      method: "POST",
      body: JSON.stringify({ level: "A1" }), // Missing title
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing required fields");
  });

  it("should mutate grammar topic and trigger revalidation including detail slug path", async () => {
    const { POST } = await import("@/app/api/admin/grammar/route");
    const { revalidateLearnerPaths } = await import("@/lib/revalidate");

    const req = new Request("http://localhost:3001/api/admin/grammar", {
      method: "POST",
      body: JSON.stringify({
        title: "Der Die Das",
        level: "A1",
        slug: "der-die-das",
        short_description: "Definite articles in German",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.item.title).toBe("Der Die Das");
    expect(revalidateLearnerPaths).toHaveBeenCalledWith([
      "/",
      "/grammar",
      "/a1",
      "/grammar/der-die-das",
    ]);
  });

  it("should return 400 when deleting without id parameter", async () => {
    const { DELETE } = await import("@/app/api/admin/grammar/route");

    const req = new Request("http://localhost:3001/api/admin/grammar", {
      method: "DELETE",
    });

    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("should delete grammar topic and revalidate all grammar-related learner paths", async () => {
    const { DELETE } = await import("@/app/api/admin/grammar/route");
    const { deleteGrammarTopicItem } = await import("@/lib/db/content");
    const { revalidateLearnerPaths } = await import("@/lib/revalidate");

    const req = new Request("http://localhost:3001/api/admin/grammar?id=55555555-5555-4555-8555-555555555555", {
      method: "DELETE",
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(deleteGrammarTopicItem).toHaveBeenCalledWith("55555555-5555-4555-8555-555555555555");
    expect(revalidateLearnerPaths).toHaveBeenCalledWith([
      "/",
      "/grammar",
      "/a1",
      "/a2",
      "/b1",
      "/b2",
    ]);
  });
});
