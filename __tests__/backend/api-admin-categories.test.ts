import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/revalidate", () => ({
  revalidateLearnerPaths: vi.fn(),
}));

vi.mock("@/lib/db/content", () => ({
  getVocabularyCategories: vi.fn(async () => [
    { id: "c4444444-4444-4444-8444-444444444401", name: "Greetings", order_index: 1 },
    { id: "c4444444-4444-4444-8444-444444444402", name: "Personal Info", order_index: 2 },
  ]),
  mutateVocabularyCategory: vi.fn(async (cat) => ({
    id: cat.id || "c5555555-5555-4555-8555-555555555555",
    name: cat.name,
    order_index: cat.order_index || 1,
  })),
  deleteVocabularyCategory: vi.fn(async (_id: string) => true),
}));

describe("Admin Backend API: /api/admin/categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/categories", () => {
    it("should fetch all categories successfully", async () => {
      const { GET } = await import("@/app/api/admin/categories/route");
      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items.length).toBe(2);
    });
  });

  describe("POST /api/admin/categories", () => {
    it("should return 400 when category name is missing or empty", async () => {
      const { POST } = await import("@/app/api/admin/categories/route");
      const req = new Request("http://localhost:3001/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name: "   ", order_index: 1 }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Category name is required");
    });

    it("should create a new category and trigger learner edge cache revalidation", async () => {
      const { POST } = await import("@/app/api/admin/categories/route");
      const { revalidateLearnerPaths } = await import("@/lib/revalidate");

      const req = new Request("http://localhost:3001/api/admin/categories", {
        method: "POST",
        body: JSON.stringify({ name: "Sports & Fitness", order_index: 12 }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.item.name).toBe("Sports & Fitness");
      expect(revalidateLearnerPaths).toHaveBeenCalledWith(["/", "/a1", "/a2", "/b1", "/b2"]);
    });
  });

  describe("DELETE /api/admin/categories", () => {
    it("should return 400 when id param is missing", async () => {
      const { DELETE } = await import("@/app/api/admin/categories/route");
      const req = new Request("http://localhost:3001/api/admin/categories");
      const res = await DELETE(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Missing category id");
    });

    it("should delete category and trigger learner revalidation", async () => {
      const { DELETE } = await import("@/app/api/admin/categories/route");
      const { revalidateLearnerPaths } = await import("@/lib/revalidate");

      const req = new Request("http://localhost:3001/api/admin/categories?id=c4444444-4444-4444-8444-444444444401");
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(revalidateLearnerPaths).toHaveBeenCalledWith(["/", "/a1", "/a2", "/b1", "/b2"]);
    });
  });
});
