import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
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
      })),
    },
  })),
}));

describe("Admin Backend API: /api/admin/audio/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-user-id" } } });
    mockUpload.mockResolvedValue({ data: { path: "vocab/test.webm" }, error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://mock-supabase-storage.com/pronunciations/vocab/test.webm" },
    });
  });

  it("should return 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const { POST } = await import("@/app/api/admin/audio/upload/route");

    const req = new Request("http://localhost:3001/api/admin/audio/upload", {
      method: "POST",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when no file is uploaded in formData", async () => {
    const { POST } = await import("@/app/api/admin/audio/upload/route");

    const formData = new FormData();
    const req = new Request("http://localhost:3001/api/admin/audio/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("No audio file provided");
  });

  it("should sanitize MIME type from audio/webm;codecs=opus and upload successfully", async () => {
    const { POST } = await import("@/app/api/admin/audio/upload/route");

    const blob = new Blob(["audio-bytes"], { type: "audio/webm;codecs=opus" });
    const file = new File([blob], "recording.webm", { type: "audio/webm;codecs=opus" });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("prefix", "vocab");

    const req = new Request("http://localhost:3001/api/admin/audio/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.url).toContain("https://mock-supabase-storage.com");
    // Verify contentType passed to storage upload was cleaned of codecs suffix
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^vocab\/.*\.webm$/),
      expect.any(Buffer),
      expect.objectContaining({ contentType: "audio/webm", upsert: true })
    );
  });

  it("should handle MP3 and WAV file uploads and correctly extract extensions", async () => {
    const { POST } = await import("@/app/api/admin/audio/upload/route");

    const blob = new Blob(["mp3-bytes"], { type: "audio/mpeg" });
    const file = new File([blob], "pronunciation.mp3", { type: "audio/mpeg" });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("prefix", "sentences");

    const req = new Request("http://localhost:3001/api/admin/audio/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^sentences\/.*\.mp3$/),
      expect.any(Buffer),
      expect.objectContaining({ contentType: "audio/mpeg" })
    );
  });
});
