import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAdminUser = {
  id: "admin-uuid-1111-2222-3333-444444444444",
  email: `admin-${Date.now().toString(36)}@example.com`,
};

const randomPrefix1 = `learner1-${Date.now().toString(36)}`;
const randomLearner1Email = `${randomPrefix1}@example.com`;

const randomPrefix2 = `user2-${Date.now().toString(36)}`;
const randomLearner2Email = `${randomPrefix2}@mock-auth.net`;

const randomPrefix3 = `unverified-${Date.now().toString(36)}`;
const randomLearner3Email = `${randomPrefix3}@example.com`;

const mockLearners = [
  {
    id: "learner-uuid-1",
    email: randomLearner1Email,
    phone: null,
    created_at: "2026-10-01T10:00:00.000Z",
    last_sign_in_at: "2026-10-08T09:00:00.000Z",
    email_confirmed_at: "2026-10-01T10:05:00.000Z",
    confirmed_at: "2026-10-01T10:05:00.000Z",
    role: "authenticated",
    fullName: "Rahul Menon",
    avatarUrl: null,
    provider: "email",
    raw_user_meta_data: { full_name: "Rahul Menon" },
    raw_app_meta_data: { provider: "email" },
  },
  {
    id: "learner-uuid-2",
    email: randomLearner2Email,
    phone: null,
    created_at: "2026-09-13T18:00:00.000Z",
    last_sign_in_at: "2026-10-08T04:00:00.000Z",
    email_confirmed_at: "2026-09-13T18:01:00.000Z",
    confirmed_at: "2026-09-13T18:01:00.000Z",
    role: "authenticated",
    fullName: "Sample Learner Two",
    avatarUrl: "https://lh3.googleusercontent.com/avatar",
    provider: "google",
    raw_user_meta_data: { full_name: "Sample Learner Two" },
    raw_app_meta_data: { provider: "google" },
  },
  {
    id: "learner-uuid-3",
    email: randomLearner3Email,
    phone: null,
    created_at: "2026-10-07T12:00:00.000Z",
    last_sign_in_at: null,
    email_confirmed_at: null,
    confirmed_at: null,
    role: "authenticated",
    fullName: "Unverified Learner",
    avatarUrl: null,
    provider: "email",
    raw_user_meta_data: { full_name: "Unverified Learner" },
    raw_app_meta_data: { provider: "email" },
  },
];

let mockIsAdmin = true;

vi.mock("@/lib/supabase/auth", () => ({
  isCurrentUserAdmin: vi.fn(async () => mockIsAdmin),
  getCurrentUser: vi.fn(async () => (mockIsAdmin ? mockAdminUser : null)),
}));

vi.mock("@/lib/supabase/admin", () => ({
  listAdminUsers: vi.fn(async () => mockLearners),
  deleteAdminUser: vi.fn(async (userId: string) => {
    if (userId === "error-user") throw new Error("Database deletion error");
    return true;
  }),
}));

describe("Admin Backend API: /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin = true;
  });

  describe("GET /api/admin/users", () => {
    it("should reject unauthorized requests with 403 Forbidden", async () => {
      mockIsAdmin = false;
      const { GET } = await import("@/app/api/admin/users/route");

      const req = new Request("http://localhost:3001/api/admin/users");
      const res = await GET(req);

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Unauthorized");
    });

    it("should retrieve all users when authenticated as administrator", async () => {
      const { GET } = await import("@/app/api/admin/users/route");

      const req = new Request("http://localhost:3001/api/admin/users");
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.users).toHaveLength(3);
      expect(data.count).toBe(3);
    });

    it("should filter users by search query (name or email)", async () => {
      const { GET } = await import("@/app/api/admin/users/route");

      const req = new Request(`http://localhost:3001/api/admin/users?search=${randomPrefix2}`);
      const res = await GET(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.users).toHaveLength(1);
      expect(data.users[0].email).toBe(randomLearner2Email);
    });

    it("should filter users by verified status", async () => {
      const { GET } = await import("@/app/api/admin/users/route");

      const reqVerified = new Request("http://localhost:3001/api/admin/users?status=verified");
      const resVerified = await GET(reqVerified);
      const dataVerified = await resVerified.json();
      expect(dataVerified.users).toHaveLength(2);

      const reqUnverified = new Request("http://localhost:3001/api/admin/users?status=unverified");
      const resUnverified = await GET(reqUnverified);
      const dataUnverified = await resUnverified.json();
      expect(dataUnverified.users).toHaveLength(1);
      expect(dataUnverified.users[0].email).toBe(randomLearner3Email);
    });

    it("should filter users by provider (google vs email)", async () => {
      const { GET } = await import("@/app/api/admin/users/route");

      const reqGoogle = new Request("http://localhost:3001/api/admin/users?provider=google");
      const resGoogle = await GET(reqGoogle);
      const dataGoogle = await resGoogle.json();
      expect(dataGoogle.users).toHaveLength(1);
      expect(dataGoogle.users[0].provider).toBe("google");

      const reqEmail = new Request("http://localhost:3001/api/admin/users?provider=email");
      const resEmail = await GET(reqEmail);
      const dataEmail = await resEmail.json();
      expect(dataEmail.users).toHaveLength(2);
    });
  });

  describe("DELETE /api/admin/users", () => {
    it("should reject unauthorized deletion requests with 403 Forbidden", async () => {
      mockIsAdmin = false;
      const { DELETE } = await import("@/app/api/admin/users/route");

      const req = new Request("http://localhost:3001/api/admin/users?id=learner-uuid-1", {
        method: "DELETE",
      });
      const res = await DELETE(req);

      expect(res.status).toBe(403);
    });

    it("should reject deletion when no ID is provided", async () => {
      const { DELETE } = await import("@/app/api/admin/users/route");

      const req = new Request("http://localhost:3001/api/admin/users", {
        method: "DELETE",
      });
      const res = await DELETE(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Missing or invalid user ID");
    });

    it("should block self-deletion attempts by the active administrator", async () => {
      const { DELETE } = await import("@/app/api/admin/users/route");

      const req = new Request(
        `http://localhost:3001/api/admin/users?id=${mockAdminUser.id}`,
        { method: "DELETE" }
      );
      const res = await DELETE(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("You cannot delete your own administrator account");
    });

    it("should successfully delete target learner user", async () => {
      const { DELETE } = await import("@/app/api/admin/users/route");
      const { deleteAdminUser } = await import("@/lib/supabase/admin");

      const req = new Request("http://localhost:3001/api/admin/users?id=learner-uuid-1", {
        method: "DELETE",
      });
      const res = await DELETE(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(deleteAdminUser).toHaveBeenCalledWith("learner-uuid-1");
    });

    it("should handle unexpected database errors gracefully with 500", async () => {
      const { DELETE } = await import("@/app/api/admin/users/route");

      const req = new Request("http://localhost:3001/api/admin/users?id=error-user", {
        method: "DELETE",
      });
      const res = await DELETE(req);

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Database deletion error");
    });
  });
});
