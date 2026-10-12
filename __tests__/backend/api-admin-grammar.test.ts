import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockRemove = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
        remove: mockRemove,
      })),
    },
  })),
}));

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
  getGrammarVideos: vi.fn(async () => []),
  mutateGrammarVideo: vi.fn(async (body) => ({
    id: body.id || "66666666-6666-4666-8666-666666666666",
    topic_id: body.topic_id,
    title: body.title || "",
    video_url: (body.video_url || "").trim(),
    pdf_url: body.pdf_url ? body.pdf_url.trim() : null,
    description: body.description || "",
    order_index: body.order_index ?? 1,
  })),
  deleteGrammarVideo: vi.fn(async (_id: string) => true),
}));

describe("Admin Backend API: /api/admin/grammar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "8224e9e2-a275-4f04-a020-440628d1576a" } } });
    mockUpload.mockResolvedValue({ data: { path: "grammar/11111111-1111-4111-8111-111111111111.pdf" }, error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://wivtdopwvgefybojakuo.supabase.co/storage/v1/object/public/grammar-pdfs/grammar/11111111-1111-4111-8111-111111111111.pdf" },
    });
    mockRemove.mockResolvedValue({ data: [], error: null });
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

  describe("/api/admin/grammar/videos (Video Only, PDF Only, Both, Neither)", () => {
    const validTopicId = "44444444-4444-4444-8444-444444444444";

    it("should allow saving with Video link only", async () => {
      const { POST } = await import("@/app/api/admin/grammar/videos/route");
      const req = new Request("http://localhost:3001/api/admin/grammar/videos", {
        method: "POST",
        body: JSON.stringify({
          topic_id: validTopicId,
          video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          title: "Video Only Guide",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.item.video_url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(data.item.pdf_url).toBeNull();
    });

    it("should allow saving with PDF link only (empty video_url)", async () => {
      const { POST } = await import("@/app/api/admin/grammar/videos/route");
      const req = new Request("http://localhost:3001/api/admin/grammar/videos", {
        method: "POST",
        body: JSON.stringify({
          topic_id: validTopicId,
          video_url: "",
          pdf_url: "https://wivtdopwvgefybojakuo.supabase.co/storage/v1/object/public/grammar-pdfs/grammar/11111111-1111-4111-8111-111111111111.pdf",
          title: "PDF Cheat Sheet Only",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.item.video_url).toBe("");
      expect(data.item.pdf_url).toContain("grammar-pdfs");
    });

    it("should allow saving with BOTH Video link and PDF link", async () => {
      const { POST } = await import("@/app/api/admin/grammar/videos/route");
      const req = new Request("http://localhost:3001/api/admin/grammar/videos", {
        method: "POST",
        body: JSON.stringify({
          topic_id: validTopicId,
          video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          pdf_url: "https://wivtdopwvgefybojakuo.supabase.co/storage/v1/object/public/grammar-pdfs/grammar/11111111-1111-4111-8111-111111111111.pdf",
          title: "Video + PDF Complete Lesson",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.item.video_url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(data.item.pdf_url).toContain("grammar-pdfs");
    });

    it("should return 400 when NEITHER video_url nor pdf_url is provided", async () => {
      const { POST } = await import("@/app/api/admin/grammar/videos/route");
      const req = new Request("http://localhost:3001/api/admin/grammar/videos", {
        method: "POST",
        body: JSON.stringify({
          topic_id: validTopicId,
          video_url: "   ",
          pdf_url: "",
          title: "Empty Resource",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("at least one of video_url or pdf_url");
    });
  });

  describe("/api/admin/grammar/upload-pdf", () => {
    it("should upload a valid PDF document and return public URL", async () => {
      const { POST } = await import("@/app/api/admin/grammar/upload-pdf/route");
      const blob = new Blob(["%PDF-1.4 mock content"], { type: "application/pdf" });
      const file = new File([blob], "grammar-notes.pdf", { type: "application/pdf" });
      const formData = new FormData();
      formData.append("file", file);

      const req = new Request("http://localhost:3001/api/admin/grammar/upload-pdf", {
        method: "POST",
        body: formData,
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.url).toContain("/storage/v1/object/public/grammar-pdfs/grammar/");
    });

    it("should reject non-PDF file types with 400", async () => {
      const { POST } = await import("@/app/api/admin/grammar/upload-pdf/route");
      const blob = new Blob(["not a pdf"], { type: "image/png" });
      const file = new File([blob], "image.png", { type: "image/png" });
      const formData = new FormData();
      formData.append("file", file);

      const req = new Request("http://localhost:3001/api/admin/grammar/upload-pdf", {
        method: "POST",
        body: formData,
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Only PDF documents");
    });

    it("should return 401 when user is not authenticated", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      const { POST } = await import("@/app/api/admin/grammar/upload-pdf/route");
      const req = new Request("http://localhost:3001/api/admin/grammar/upload-pdf", {
        method: "POST",
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });
});
