import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/revalidate", () => ({
  revalidateLearnerPaths: vi.fn(),
}));

const mockVerbs = [
  {
    id: "a1111111-1111-4111-8111-111111111111",
    level: "A1",
    category_id: "c1111111-1111-4111-8111-111111111111",
    category_name: "Unregelmäßige Verben",
    infinitive_de: "bleiben",
    infinitive_en: "to stay",
    infinitive_ml: "നില്ക്കുക",
    praeteritum_de: "blieb",
    praeteritum_en: "stayed",
    praeteritum_ml: "നിന്നു",
    perfekt_de: "ist geblieben",
    perfekt_en: "has stayed",
    perfekt_ml: "നിന്നിട്ടുണ്ട്",
    order_index: 1,
  },
];

const mockCategories = [
  {
    id: "c1111111-1111-4111-8111-111111111111",
    name: "Unregelmäßige Verben",
    order_index: 1,
  },
];

vi.mock("@/lib/db/verbs", () => ({
  isValidUUID: (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
  getVerbs: vi.fn(async () => mockVerbs),
  createVerb: vi.fn(async (verb) => ({
    id: verb.id || "a2222222-2222-4222-8222-222222222222",
    ...verb,
    category_name: "Unregelmäßige Verben",
  })),
  updateVerb: vi.fn(async (id, updates) => ({
    id,
    level: updates.level || "A1",
    category_id: updates.category_id || "c1111111-1111-4111-8111-111111111111",
    infinitive_de: updates.infinitive_de || "gehen",
    praeteritum_de: updates.praeteritum_de || "ging",
    perfekt_de: updates.perfekt_de || "ist gegangen",
    ...updates,
  })),
  deleteVerb: vi.fn(async (_id: string) => true),
  batchCreateVerbs: vi.fn(async (verbs) =>
    verbs.map((v: Record<string, unknown>, idx: number) => ({
      id: `a3333333-3333-4333-8333-33333333333${idx}`,
      ...v,
    }))
  ),
  getVerbCategories: vi.fn(async () => mockCategories),
  createVerbCategory: vi.fn(async (cat) => ({
    id: cat.id || "c2222222-2222-4222-8222-222222222222",
    ...cat,
  })),
  updateVerbCategory: vi.fn(async (id, updates) => ({
    id,
    name: updates.name || "Updated Category",
    order_index: updates.order_index ?? 1,
  })),
  deleteVerbCategory: vi.fn(async (_id: string) => true),
}));

describe("Admin Backend API: /api/admin/verbs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET: should return a list of verbs", async () => {
    const { GET } = await import("@/app/api/admin/verbs/route");
    const req = new Request("http://localhost:3001/api/admin/verbs");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].infinitive_de).toBe("bleiben");
  });

  it("POST: should return 400 when missing required fields", async () => {
    const { POST } = await import("@/app/api/admin/verbs/route");
    const req = new Request("http://localhost:3001/api/admin/verbs", {
      method: "POST",
      body: JSON.stringify({ level: "A1" }), // Missing category_id and verb forms
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Missing required fields");
  });

  it("POST: should return 400 when category_id is not a valid UUID (Rule 5)", async () => {
    const { POST } = await import("@/app/api/admin/verbs/route");
    const req = new Request("http://localhost:3001/api/admin/verbs", {
      method: "POST",
      body: JSON.stringify({
        level: "A1",
        category_id: "non-uuid-category-1",
        infinitive_de: "machen",
        praeteritum_de: "machte",
        perfekt_de: "hat gemacht",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid category UUID");
  });

  it("POST: should create a verb and trigger learner cache revalidation", async () => {
    const { POST } = await import("@/app/api/admin/verbs/route");
    const { revalidateLearnerPaths } = await import("@/lib/revalidate");

    const req = new Request("http://localhost:3001/api/admin/verbs", {
      method: "POST",
      body: JSON.stringify({
        level: "A1",
        category_id: "c1111111-1111-4111-8111-111111111111",
        infinitive_de: "machen",
        infinitive_en: "to do / make",
        infinitive_ml: "ചെയ്യുക",
        praeteritum_de: "machte",
        praeteritum_en: "did / made",
        praeteritum_ml: "ചെയ്തു",
        perfekt_de: "hat gemacht",
        perfekt_en: "has done / made",
        perfekt_ml: "ചെയ്തിട്ടുണ്ട്",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.item.infinitive_de).toBe("machen");
    expect(revalidateLearnerPaths).toHaveBeenCalledWith(["/", "/a1"]);
  });

  it("POST: should return 400 on empty batch array", async () => {
    const { POST } = await import("@/app/api/admin/verbs/route");
    const req = new Request("http://localhost:3001/api/admin/verbs", {
      method: "POST",
      body: JSON.stringify({ verbs: [] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("No verbs provided in batch");
  });

  it("POST: should batch create verbs and trigger multi-level revalidation", async () => {
    const { POST } = await import("@/app/api/admin/verbs/route");
    const { revalidateLearnerPaths } = await import("@/lib/revalidate");

    const req = new Request("http://localhost:3001/api/admin/verbs", {
      method: "POST",
      body: JSON.stringify({
        verbs: [
          {
            level: "A1",
            category_id: "c1111111-1111-4111-8111-111111111111",
            infinitive_de: "hören",
            praeteritum_de: "hörte",
            perfekt_de: "hat gehört",
          },
          {
            level: "B1",
            category_id: "c1111111-1111-4111-8111-111111111111",
            infinitive_de: "entscheiden",
            praeteritum_de: "entschied",
            perfekt_de: "hat entschieden",
          },
        ],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.items).toHaveLength(2);
    expect(revalidateLearnerPaths).toHaveBeenCalledWith(["/", "/a1", "/b1"]);
  });

  it("PUT: should return 400 when missing or invalid UUID", async () => {
    const { PUT } = await import("@/app/api/admin/verbs/route");

    // Missing id
    const req1 = new Request("http://localhost:3001/api/admin/verbs", {
      method: "PUT",
      body: JSON.stringify({ infinitive_de: "sehen" }),
    });
    const res1 = await PUT(req1);
    expect(res1.status).toBe(400);

    // Invalid UUID
    const req2 = new Request("http://localhost:3001/api/admin/verbs", {
      method: "PUT",
      body: JSON.stringify({ id: "invalid-uuid-123", infinitive_de: "sehen" }),
    });
    const res2 = await PUT(req2);
    expect(res2.status).toBe(400);
  });

  it("PUT: should successfully update verb and trigger revalidation", async () => {
    const { PUT } = await import("@/app/api/admin/verbs/route");
    const { revalidateLearnerPaths } = await import("@/lib/revalidate");

    const req = new Request("http://localhost:3001/api/admin/verbs", {
      method: "PUT",
      body: JSON.stringify({
        id: "a1111111-1111-4111-8111-111111111111",
        infinitive_de: "bleiben (verändert)",
        level: "A1",
      }),
    });

    const res = await PUT(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(revalidateLearnerPaths).toHaveBeenCalledWith(["/", "/a1"]);
  });

  it("DELETE: should return 400 when id is missing or invalid UUID", async () => {
    const { DELETE } = await import("@/app/api/admin/verbs/route");

    const req1 = new Request("http://localhost:3001/api/admin/verbs", {
      method: "DELETE",
    });
    const res1 = await DELETE(req1);
    expect(res1.status).toBe(400);

    const req2 = new Request("http://localhost:3001/api/admin/verbs?id=not-a-uuid", {
      method: "DELETE",
    });
    const res2 = await DELETE(req2);
    expect(res2.status).toBe(400);
  });

  it("DELETE: should successfully delete verb and trigger revalidation", async () => {
    const { DELETE } = await import("@/app/api/admin/verbs/route");
    const { revalidateLearnerPaths } = await import("@/lib/revalidate");

    const req = new Request(
      "http://localhost:3001/api/admin/verbs?id=a1111111-1111-4111-8111-111111111111",
      { method: "DELETE" }
    );
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(revalidateLearnerPaths).toHaveBeenCalledWith(["/", "/a1", "/a2", "/b1", "/b2"]);
  });
});

describe("Admin Backend API: /api/admin/verbs/categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET: should return verb categories", async () => {
    const { GET } = await import("@/app/api/admin/verbs/categories/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].name).toBe("Unregelmäßige Verben");
  });

  it("POST: should return 400 when category name is missing", async () => {
    const { POST } = await import("@/app/api/admin/verbs/categories/route");
    const req = new Request("http://localhost:3001/api/admin/verbs/categories", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Category name is required");
  });

  it("POST: should create category and trigger revalidation", async () => {
    const { POST } = await import("@/app/api/admin/verbs/categories/route");
    const { revalidateLearnerPaths } = await import("@/lib/revalidate");

    const req = new Request("http://localhost:3001/api/admin/verbs/categories", {
      method: "POST",
      body: JSON.stringify({ name: "Modalverben", order_index: 2 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(revalidateLearnerPaths).toHaveBeenCalledWith(["/", "/a1", "/a2", "/b1", "/b2"]);
  });

  it("DELETE: should return 400 when missing or invalid category UUID", async () => {
    const { DELETE } = await import("@/app/api/admin/verbs/categories/route");

    const req1 = new Request("http://localhost:3001/api/admin/verbs/categories", {
      method: "DELETE",
    });
    const res1 = await DELETE(req1);
    expect(res1.status).toBe(400);

    const req2 = new Request(
      "http://localhost:3001/api/admin/verbs/categories?id=bad-uuid",
      { method: "DELETE" }
    );
    const res2 = await DELETE(req2);
    expect(res2.status).toBe(400);
  });

  it("DELETE: should delete category and trigger revalidation", async () => {
    const { DELETE } = await import("@/app/api/admin/verbs/categories/route");
    const { revalidateLearnerPaths } = await import("@/lib/revalidate");

    const req = new Request(
      "http://localhost:3001/api/admin/verbs/categories?id=c1111111-1111-4111-8111-111111111111",
      { method: "DELETE" }
    );
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(revalidateLearnerPaths).toHaveBeenCalledWith(["/", "/a1", "/a2", "/b1", "/b2"]);
  });
});
