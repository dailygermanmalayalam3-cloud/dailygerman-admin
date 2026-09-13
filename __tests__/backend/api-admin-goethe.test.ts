import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/revalidate", () => ({
  revalidateLearnerPaths: vi.fn(),
}));

vi.mock("@/lib/db/content", () => ({
  mutateGoetheMaterial: vi.fn(async (body) => ({
    id: body.id || "66666666-6666-4666-8666-666666666666",
    title: body.title,
    level: body.level,
    section: body.section,
    description: body.description || "",
    content: body.content || "",
  })),
  deleteGoetheMaterialItem: vi.fn(async (_id: string) => true),
}));

describe("Admin Backend API: /api/admin/goethe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if title, level, or section is missing", async () => {
    const { POST } = await import("@/app/api/admin/goethe/route");

    const req = new Request("http://localhost:3001/api/admin/goethe", {
      method: "POST",
      body: JSON.stringify({ title: "Sprechen Modul 1", level: "A1" }), // Missing section
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing required fields");
  });

  it("should create Goethe material and trigger revalidation of / and /goethe", async () => {
    const { POST } = await import("@/app/api/admin/goethe/route");
    const { revalidateLearnerPaths } = await import("@/lib/revalidate");

    const req = new Request("http://localhost:3001/api/admin/goethe", {
      method: "POST",
      body: JSON.stringify({
        title: "Goethe A1 Sprechen Teil 1",
        level: "A1",
        section: "Sprechen",
        description: "Introducing yourself",
        content: "Sich vorstellen: Name, Alter, Land, Wohnort...",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.item.section).toBe("Sprechen");
    expect(revalidateLearnerPaths).toHaveBeenCalledWith(["/", "/goethe"]);
  });

  it("should return 400 when deleting Goethe material without id", async () => {
    const { DELETE } = await import("@/app/api/admin/goethe/route");

    const req = new Request("http://localhost:3001/api/admin/goethe", {
      method: "DELETE",
    });

    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("should delete Goethe material and trigger revalidation", async () => {
    const { DELETE } = await import("@/app/api/admin/goethe/route");
    const { deleteGoetheMaterialItem } = await import("@/lib/db/content");
    const { revalidateLearnerPaths } = await import("@/lib/revalidate");

    const req = new Request("http://localhost:3001/api/admin/goethe?id=66666666-6666-4666-8666-666666666666", {
      method: "DELETE",
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(deleteGoetheMaterialItem).toHaveBeenCalledWith("66666666-6666-4666-8666-666666666666");
    expect(revalidateLearnerPaths).toHaveBeenCalledWith(["/", "/goethe"]);
  });
});
