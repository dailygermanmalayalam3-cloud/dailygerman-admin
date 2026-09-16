import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/content", () => ({
  getBlacklistedUsers: vi.fn(async () => [
    {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      user_name: "Bad Spammer",
      email: "bad@spammer.com",
      ip_address: "192.168.1.50",
      device_fingerprint: "badfp12345",
      reason: "Repeated offensive suggestions",
      created_at: "2026-09-16T10:00:00.000Z",
      updated_at: "2026-09-16T10:00:00.000Z",
    },
  ]),
  blacklistUser: vi.fn(async (data: {
    user_name?: string;
    email?: string;
    ip_address?: string;
    device_fingerprint?: string;
    reason?: string;
  }) => ({
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    user_name: data.user_name || "Unknown",
    email: data.email,
    ip_address: data.ip_address,
    device_fingerprint: data.device_fingerprint,
    reason: data.reason || "Malicious or abusive behavior",
    created_at: "2026-09-16T10:30:00.000Z",
    updated_at: "2026-09-16T10:30:00.000Z",
  })),
  unblacklistUser: vi.fn(async (_id: string) => true),
}));

describe("Admin Backend API: /api/admin/blacklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/blacklist", () => {
    it("should retrieve all blacklisted users successfully", async () => {
      const { GET } = await import("@/app/api/admin/blacklist/route");
      const { getBlacklistedUsers } = await import("@/lib/db/content");

      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.items).toHaveLength(1);
      expect(data.items[0].email).toBe("bad@spammer.com");
      expect(getBlacklistedUsers).toHaveBeenCalled();
    });

    it("should return 500 when database throws an error", async () => {
      const { GET } = await import("@/app/api/admin/blacklist/route");
      const { getBlacklistedUsers } = await import("@/lib/db/content");
      vi.mocked(getBlacklistedUsers).mockRejectedValueOnce(new Error("Database error"));

      const res = await GET();
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Database error");
    });
  });

  describe("POST /api/admin/blacklist", () => {
    it("should return 400 when missing all identifiers", async () => {
      const { POST } = await import("@/app/api/admin/blacklist/route");

      const req = new Request("http://localhost:3001/api/admin/blacklist", {
        method: "POST",
        body: JSON.stringify({ user_name: "Just a name", reason: "no identifiers" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("At least one identifier");
    });

    it("should blacklist a user successfully when valid identifier is provided", async () => {
      const { POST } = await import("@/app/api/admin/blacklist/route");
      const { blacklistUser } = await import("@/lib/db/content");

      const req = new Request("http://localhost:3001/api/admin/blacklist", {
        method: "POST",
        body: JSON.stringify({
          user_name: "Malicious User",
          email: "spammer@badsite.com",
          ip_address: "10.0.0.1",
          device_fingerprint: "hash98765",
          reason: "Spam flood attack",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.item.email).toBe("spammer@badsite.com");
      expect(blacklistUser).toHaveBeenCalledWith({
        user_name: "Malicious User",
        email: "spammer@badsite.com",
        ip_address: "10.0.0.1",
        device_fingerprint: "hash98765",
        reason: "Spam flood attack",
      });
    });

    it("should return 500 when blacklistUser throws error", async () => {
      const { POST } = await import("@/app/api/admin/blacklist/route");
      const { blacklistUser } = await import("@/lib/db/content");
      vi.mocked(blacklistUser).mockRejectedValueOnce(new Error("Insert into blacklist failed"));

      const req = new Request("http://localhost:3001/api/admin/blacklist", {
        method: "POST",
        body: JSON.stringify({
          email: "spammer@badsite.com",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Insert into blacklist failed");
    });
  });

  describe("DELETE /api/admin/blacklist", () => {
    it("should return 400 when id query parameter is missing", async () => {
      const { DELETE } = await import("@/app/api/admin/blacklist/route");

      const req = new Request("http://localhost:3001/api/admin/blacklist", {
        method: "DELETE",
      });

      const res = await DELETE(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Missing blacklist entry id");
    });

    it("should unblacklist user successfully when id is provided", async () => {
      const { DELETE } = await import("@/app/api/admin/blacklist/route");
      const { unblacklistUser } = await import("@/lib/db/content");

      const req = new Request("http://localhost:3001/api/admin/blacklist?id=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", {
        method: "DELETE",
      });

      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(unblacklistUser).toHaveBeenCalledWith("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    });

    it("should return 500 when unblacklistUser throws error", async () => {
      const { DELETE } = await import("@/app/api/admin/blacklist/route");
      const { unblacklistUser } = await import("@/lib/db/content");
      vi.mocked(unblacklistUser).mockRejectedValueOnce(new Error("Delete failed"));

      const req = new Request("http://localhost:3001/api/admin/blacklist?id=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", {
        method: "DELETE",
      });

      const res = await DELETE(req);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Delete failed");
    });
  });
});
