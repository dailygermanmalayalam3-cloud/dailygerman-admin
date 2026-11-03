import { describe, it, expect, vi, beforeEach } from "vitest";

const mockActiveGroupId = "11111111-1111-4111-8111-111111111111";
const mockInactiveGroupId = "22222222-2222-4222-8222-222222222222";
const mockHostUserId = "76f1266a-9fe8-4eb1-80ee-89c5ff8bc76e";

const mockVoiceGroups = [
  {
    id: mockActiveGroupId,
    name: "Anything in german",
    host_id: mockHostUserId,
    host_name: "Nothing",
    host_email: "germanlearnpooja@gmail.com",
    host_full_name: "German learnpooja",
    host_provider: "google",
    language_level: "B1",
    topic: "Open Discussion",
    max_participants: 6,
    is_active: true,
    is_private: false,
    created_at: "2026-10-20T10:00:00.000Z",
    updated_at: "2026-10-20T10:00:00.000Z",
  },
  {
    id: mockInactiveGroupId,
    name: "Daily Speaking Practice",
    host_id: "33333333-3333-4333-8333-333333333333",
    host_name: "Tony",
    host_email: "dailygermanmalayalam3@gmail.com",
    host_full_name: "Tony Sebastian",
    host_provider: "email",
    language_level: "A2",
    topic: "Grammar & Vocab",
    max_participants: 4,
    is_active: false,
    is_private: false,
    created_at: "2026-10-18T08:00:00.000Z",
    updated_at: "2026-10-18T09:00:00.000Z",
  },
];

let mockIsAdmin = true;

vi.mock("@/lib/supabase/auth", () => ({
  isCurrentUserAdmin: vi.fn(async () => mockIsAdmin),
}));

vi.mock("@/lib/supabase/admin", () => ({
  listAdminVoiceGroups: vi.fn(async () => mockVoiceGroups),
  dissolveAdminVoiceGroup: vi.fn(async (id: string) => {
    if (id === "error-group") throw new Error("Database dissolution failure");
    return true;
  }),
  deleteAdminVoiceGroup: vi.fn(async (id: string) => {
    if (id === "error-group") throw new Error("Database deletion failure");
    return true;
  }),
}));

describe("Admin Backend API: /api/admin/voice-groups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin = true;
  });

  describe("GET /api/admin/voice-groups", () => {
    it("should return 403 Forbidden when user is not an administrator", async () => {
      mockIsAdmin = false;
      const { GET } = await import("@/app/api/admin/voice-groups/route");

      const req = new Request("http://localhost:3001/api/admin/voice-groups");
      const res = await GET(req);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Administrator privileges required");
    });

    it("should return all voice groups with enriched creator data when status=all", async () => {
      const { GET } = await import("@/app/api/admin/voice-groups/route");

      const req = new Request("http://localhost:3001/api/admin/voice-groups?status=all");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.groups).toHaveLength(2);
      expect(data.totalCount).toBe(2);
      expect(data.activeCount).toBe(1);
      expect(data.inactiveCount).toBe(1);

      // Verify creator identity enrichment fields
      const groupWithAlias = data.groups.find((g: any) => g.id === mockActiveGroupId);
      expect(groupWithAlias.host_email).toBe("germanlearnpooja@gmail.com");
      expect(groupWithAlias.host_full_name).toBe("German learnpooja");
      expect(groupWithAlias.host_name).toBe("Nothing");
      expect(groupWithAlias.host_provider).toBe("google");
    });

    it("should filter only active voice groups when status=active", async () => {
      const { GET } = await import("@/app/api/admin/voice-groups/route");

      const req = new Request("http://localhost:3001/api/admin/voice-groups?status=active");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.groups).toHaveLength(1);
      expect(data.groups[0].is_active).toBe(true);
      expect(data.groups[0].id).toBe(mockActiveGroupId);
    });

    it("should filter only inactive voice groups when status=inactive", async () => {
      const { GET } = await import("@/app/api/admin/voice-groups/route");

      const req = new Request("http://localhost:3001/api/admin/voice-groups?status=inactive");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.groups).toHaveLength(1);
      expect(data.groups[0].is_active).toBe(false);
      expect(data.groups[0].id).toBe(mockInactiveGroupId);
    });

    it("should return 500 when listAdminVoiceGroups throws an error", async () => {
      const { GET } = await import("@/app/api/admin/voice-groups/route");
      const { listAdminVoiceGroups } = await import("@/lib/supabase/admin");
      vi.mocked(listAdminVoiceGroups).mockRejectedValueOnce(new Error("Supabase query failure"));

      const req = new Request("http://localhost:3001/api/admin/voice-groups");
      const res = await GET(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain("Supabase query failure");
    });
  });

  describe("PATCH /api/admin/voice-groups", () => {
    it("should return 403 Forbidden when user is not an administrator", async () => {
      mockIsAdmin = false;
      const { PATCH } = await import("@/app/api/admin/voice-groups/route");

      const req = new Request("http://localhost:3001/api/admin/voice-groups", {
        method: "PATCH",
        body: JSON.stringify({ id: mockActiveGroupId, action: "dissolve" }),
      });
      const res = await PATCH(req);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Administrator privileges required");
    });

    it("should return 400 when missing or invalid voice group id", async () => {
      const { PATCH } = await import("@/app/api/admin/voice-groups/route");

      const req = new Request("http://localhost:3001/api/admin/voice-groups", {
        method: "PATCH",
        body: JSON.stringify({ action: "dissolve" }),
      });
      const res = await PATCH(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Missing or invalid voice group ID");
    });

    it("should dissolve voice group successfully with valid id", async () => {
      const { PATCH } = await import("@/app/api/admin/voice-groups/route");
      const { dissolveAdminVoiceGroup } = await import("@/lib/supabase/admin");

      const req = new Request("http://localhost:3001/api/admin/voice-groups", {
        method: "PATCH",
        body: JSON.stringify({ id: mockActiveGroupId, action: "dissolve" }),
      });
      const res = await PATCH(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(dissolveAdminVoiceGroup).toHaveBeenCalledWith(mockActiveGroupId);
    });

    it("should return 500 when dissolveAdminVoiceGroup throws", async () => {
      const { PATCH } = await import("@/app/api/admin/voice-groups/route");

      const req = new Request("http://localhost:3001/api/admin/voice-groups", {
        method: "PATCH",
        body: JSON.stringify({ id: "error-group", action: "dissolve" }),
      });
      const res = await PATCH(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain("Database dissolution failure");
    });
  });

  describe("DELETE /api/admin/voice-groups", () => {
    it("should return 403 Forbidden when user is not an administrator", async () => {
      mockIsAdmin = false;
      const { DELETE } = await import("@/app/api/admin/voice-groups/route");

      const req = new Request(`http://localhost:3001/api/admin/voice-groups?id=${mockInactiveGroupId}`, {
        method: "DELETE",
      });
      const res = await DELETE(req);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Administrator privileges required");
    });

    it("should return 400 when missing voice group id", async () => {
      const { DELETE } = await import("@/app/api/admin/voice-groups/route");

      const req = new Request("http://localhost:3001/api/admin/voice-groups", {
        method: "DELETE",
      });
      const res = await DELETE(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Missing or invalid voice group ID");
    });

    it("should delete voice group successfully when id provided in query param", async () => {
      const { DELETE } = await import("@/app/api/admin/voice-groups/route");
      const { deleteAdminVoiceGroup } = await import("@/lib/supabase/admin");

      const req = new Request(`http://localhost:3001/api/admin/voice-groups?id=${mockInactiveGroupId}`, {
        method: "DELETE",
      });
      const res = await DELETE(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(deleteAdminVoiceGroup).toHaveBeenCalledWith(mockInactiveGroupId);
    });

    it("should delete voice group successfully when id provided in JSON body", async () => {
      const { DELETE } = await import("@/app/api/admin/voice-groups/route");
      const { deleteAdminVoiceGroup } = await import("@/lib/supabase/admin");

      const req = new Request("http://localhost:3001/api/admin/voice-groups", {
        method: "DELETE",
        body: JSON.stringify({ id: mockInactiveGroupId }),
      });
      const res = await DELETE(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(deleteAdminVoiceGroup).toHaveBeenCalledWith(mockInactiveGroupId);
    });

    it("should return 500 when deleteAdminVoiceGroup throws", async () => {
      const { DELETE } = await import("@/app/api/admin/voice-groups/route");

      const req = new Request("http://localhost:3001/api/admin/voice-groups?id=error-group", {
        method: "DELETE",
      });
      const res = await DELETE(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toContain("Database deletion failure");
    });
  });
});
