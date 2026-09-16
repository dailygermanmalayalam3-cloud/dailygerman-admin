import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/content", () => ({
  getSuggestions: vi.fn(async (status?: string, search?: string) => [
    {
      id: "99999999-9999-4999-8999-999999999999",
      name: "Test User",
      email: "test@example.com",
      suggestion: "Please add medical dialogues",
      page_url: "https://dailygerman.com/medical",
      ip_address: "127.0.0.1",
      device_fingerprint: "abc123hash",
      status: status || "unread",
      admin_notes: null,
      created_at: "2026-09-16T10:00:00.000Z",
      updated_at: "2026-09-16T10:00:00.000Z",
    },
  ]),
  updateSuggestion: vi.fn(async (id: string, updates: { status?: string; admin_notes?: string }) => ({
    id,
    name: "Test User",
    email: "test@example.com",
    suggestion: "Please add medical dialogues",
    status: updates.status || "unread",
    admin_notes: updates.admin_notes || null,
    updated_at: "2026-09-16T10:05:00.000Z",
  })),
  deleteSuggestion: vi.fn(async (_id: string) => true),
}));

describe("Admin Backend API: /api/admin/suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/suggestions", () => {
    it("should retrieve suggestions successfully with default parameters", async () => {
      const { GET } = await import("@/app/api/admin/suggestions/route");
      const { getSuggestions } = await import("@/lib/db/content");

      const req = new Request("http://localhost:3001/api/admin/suggestions");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].name).toBe("Test User");
      expect(getSuggestions).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should pass status and search query parameters to getSuggestions", async () => {
      const { GET } = await import("@/app/api/admin/suggestions/route");
      const { getSuggestions } = await import("@/lib/db/content");

      const req = new Request("http://localhost:3001/api/admin/suggestions?status=unread&search=medical");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(getSuggestions).toHaveBeenCalledWith("unread", "medical");
    });

    it("should return 500 when database throws an error", async () => {
      const { GET } = await import("@/app/api/admin/suggestions/route");
      const { getSuggestions } = await import("@/lib/db/content");
      vi.mocked(getSuggestions).mockRejectedValueOnce(new Error("Database connection failed"));

      const req = new Request("http://localhost:3001/api/admin/suggestions");
      const res = await GET(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Database connection failed");
    });
  });

  describe("PATCH /api/admin/suggestions", () => {
    it("should return 400 when body or id is missing", async () => {
      const { PATCH } = await import("@/app/api/admin/suggestions/route");

      const req = new Request("http://localhost:3001/api/admin/suggestions", {
        method: "PATCH",
        body: JSON.stringify({ status: "read" }), // missing id
      });

      const res = await PATCH(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Missing suggestion id");
    });

    it("should return 400 when invalid status is provided", async () => {
      const { PATCH } = await import("@/app/api/admin/suggestions/route");

      const req = new Request("http://localhost:3001/api/admin/suggestions", {
        method: "PATCH",
        body: JSON.stringify({
          id: "99999999-9999-4999-8999-999999999999",
          status: "non_existent_status",
        }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid status value");
    });

    it("should update suggestion status and admin notes successfully", async () => {
      const { PATCH } = await import("@/app/api/admin/suggestions/route");
      const { updateSuggestion } = await import("@/lib/db/content");

      const req = new Request("http://localhost:3001/api/admin/suggestions", {
        method: "PATCH",
        body: JSON.stringify({
          id: "99999999-9999-4999-8999-999999999999",
          status: "in_progress",
          admin_notes: "Reviewed and scheduled for implementation",
        }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.item.status).toBe("in_progress");
      expect(data.item.admin_notes).toBe("Reviewed and scheduled for implementation");
      expect(updateSuggestion).toHaveBeenCalledWith("99999999-9999-4999-8999-999999999999", {
        status: "in_progress",
        admin_notes: "Reviewed and scheduled for implementation",
      });
    });

    it("should return 500 when update fails in database", async () => {
      const { PATCH } = await import("@/app/api/admin/suggestions/route");
      const { updateSuggestion } = await import("@/lib/db/content");
      vi.mocked(updateSuggestion).mockRejectedValueOnce(new Error("Update failed in DB"));

      const req = new Request("http://localhost:3001/api/admin/suggestions", {
        method: "PATCH",
        body: JSON.stringify({
          id: "99999999-9999-4999-8999-999999999999",
          status: "resolved",
        }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Update failed in DB");
    });
  });

  describe("DELETE /api/admin/suggestions", () => {
    it("should return 400 when query parameter id is missing", async () => {
      const { DELETE } = await import("@/app/api/admin/suggestions/route");

      const req = new Request("http://localhost:3001/api/admin/suggestions", {
        method: "DELETE",
      });

      const res = await DELETE(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Missing suggestion id");
    });

    it("should delete suggestion successfully when id is provided", async () => {
      const { DELETE } = await import("@/app/api/admin/suggestions/route");
      const { deleteSuggestion } = await import("@/lib/db/content");

      const req = new Request("http://localhost:3001/api/admin/suggestions?id=99999999-9999-4999-8999-999999999999", {
        method: "DELETE",
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(deleteSuggestion).toHaveBeenCalledWith("99999999-9999-4999-8999-999999999999");
    });

    it("should return 500 when delete fails in database", async () => {
      const { DELETE } = await import("@/app/api/admin/suggestions/route");
      const { deleteSuggestion } = await import("@/lib/db/content");
      vi.mocked(deleteSuggestion).mockRejectedValueOnce(new Error("Deletion failed"));

      const req = new Request("http://localhost:3001/api/admin/suggestions?id=99999999-9999-4999-8999-999999999999", {
        method: "DELETE",
      });

      const res = await DELETE(req);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Deletion failed");
    });
  });
});
