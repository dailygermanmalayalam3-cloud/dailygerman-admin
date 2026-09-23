import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

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
    from: mockFrom,
  })),
}));

const mockSynthesizeGermanSpeech = vi.fn();
vi.mock("@/lib/services/google-tts", () => ({
  synthesizeGermanSpeech: vi.fn((opts) => mockSynthesizeGermanSpeech(opts)),
}));

const mockRevalidateLearnerPaths = vi.fn();
vi.mock("@/lib/revalidate", () => ({
  revalidateLearnerPaths: vi.fn((paths) => mockRevalidateLearnerPaths(paths)),
}));

describe("Admin Backend API: /api/admin/audio/generate (Single Generation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-id" } } });
    mockUpload.mockResolvedValue({ data: { path: "vocab/test.mp3" }, error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://mock-storage.com/pronunciations/vocab/test.mp3" },
    });
    mockSynthesizeGermanSpeech.mockResolvedValue({
      audioBuffer: Buffer.from("mock-mp3-data"),
      contentType: "audio/mpeg",
      ext: "mp3",
      characterCount: 15,
    });
  });

  it("should return 401 when user is unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const { POST } = await import("@/app/api/admin/audio/generate/route");

    const req = new Request("http://localhost:3001/api/admin/audio/generate", {
      method: "POST",
      body: JSON.stringify({ text: "Guten Tag" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("should return 400 when text is empty or missing", async () => {
    const { POST } = await import("@/app/api/admin/audio/generate/route");

    const req = new Request("http://localhost:3001/api/admin/audio/generate", {
      method: "POST",
      body: JSON.stringify({ text: "   " }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("German text is required");
  });

  it("should synthesize speech and upload MP3 to Supabase storage", async () => {
    const { POST } = await import("@/app/api/admin/audio/generate/route");

    const req = new Request("http://localhost:3001/api/admin/audio/generate", {
      method: "POST",
      body: JSON.stringify({
        text: "das Krankenhaus",
        prefix: "medical_word",
        voiceName: "de-DE-Neural2-F",
        speakingRate: 0.95,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.url).toContain("https://mock-storage.com/pronunciations/vocab/test.mp3");
    expect(mockSynthesizeGermanSpeech).toHaveBeenCalledWith({
      text: "das Krankenhaus",
      voiceName: "de-DE-Neural2-F",
      speakingRate: 0.95,
    });
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^medical_word\/.*\.mp3$/),
      expect.any(Buffer),
      expect.objectContaining({ contentType: "audio/mpeg", upsert: true })
    );
  });

  it("should return 500 if storage upload encounters an error", async () => {
    mockUpload.mockResolvedValueOnce({
      data: null,
      error: { message: "Storage quota exceeded" },
    });
    const { POST } = await import("@/app/api/admin/audio/generate/route");

    const req = new Request("http://localhost:3001/api/admin/audio/generate", {
      method: "POST",
      body: JSON.stringify({ text: "Auf Wiedersehen" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("Storage upload failed: Storage quota exceeded");
  });
});

describe("Admin Backend API: /api/admin/audio/generate-batch (Batch Generation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "admin-id" } } });
    mockUpload.mockResolvedValue({ data: { path: "vocab/batch.mp3" }, error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://mock-storage.com/pronunciations/vocab/batch.mp3" },
    });
    mockSynthesizeGermanSpeech.mockResolvedValue({
      audioBuffer: Buffer.from("mock-mp3-data"),
      contentType: "audio/mpeg",
      ext: "mp3",
      characterCount: 10,
    });
  });

  it("GET: should return stats on missing audio across vocabulary and medical terms", async () => {
    // Mock Supabase chained calls for stats
    mockFrom.mockImplementation((table: string) => {
      if (table === "vocabulary") {
        return {
          select: vi.fn((_cols, opts) => {
            if (opts?.head) {
              return {
                or: vi.fn(() => Promise.resolve({ count: 120, error: null })),
                then: (cb: any) => cb({ count: 480, error: null }),
              };
            }
            return {
              not: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      id: "vocab-1",
                      examples: [{ german: "Ein Beispielsatz." }],
                      sentence_audio_url: null,
                    },
                  ],
                  error: null,
                })
              ),
            };
          }),
        };
      }
      if (table === "medical_words") {
        return {
          select: vi.fn((_cols, opts) => {
            if (opts?.head) {
              return {
                or: vi.fn(() => Promise.resolve({ count: 15, error: null })),
                not: vi.fn(() => ({
                  neq: vi.fn(() => ({
                    or: vi.fn(() => Promise.resolve({ count: 10, error: null })),
                    then: (cb: any) => cb({ count: 45, error: null }),
                  })),
                })),
                then: (cb: any) => cb({ count: 50, error: null }),
              };
            }
            return {};
          }),
        };
      }
      if (table === "verbs") {
        return {
          select: vi.fn((_cols, opts) => {
            if (opts?.head) {
              return {
                or: vi.fn(() => Promise.resolve({ count: 5, error: null })),
                then: (cb: any) => cb({ count: 20, error: null }),
              };
            }
            return {};
          }),
        };
      }
      if (table === "conversations") {
        return {
          select: vi.fn(() =>
            Promise.resolve({
              data: [
                {
                  id: "conv-1",
                  turns: [
                    { id: "t1", speaker: "Anna", german: "Hallo", audio_url: null },
                    { id: "t2", speaker: "Ben", german: "Guten Tag", audio_url: "https://audio.mp3" },
                  ],
                },
              ],
              error: null,
            })
          ),
        };
      }
      return {};
    });

    const { GET } = await import("@/app/api/admin/audio/generate-batch/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.stats).toBeDefined();
    expect(json.stats.vocabWords).toBeDefined();
    expect(json.stats.vocabSentences).toBeDefined();
    expect(json.stats.medicalWords).toBeDefined();
    expect(json.stats.medicalSentences).toBeDefined();
    expect(json.stats.verbInfinitives).toBeDefined();
    expect(json.stats.conversationTurns).toEqual({ total: 2, missing: 1, generated: 1 });
  });

  it("POST: should return 400 for invalid target", async () => {
    const { POST } = await import("@/app/api/admin/audio/generate-batch/route");
    const req = new Request("http://localhost:3001/api/admin/audio/generate-batch", {
      method: "POST",
      body: JSON.stringify({ target: "unknown_target" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid target");
  });

  it("POST: should batch process missing vocabulary words and update database", async () => {
    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    }));

    mockFrom.mockImplementation((table: string) => {
      if (table === "vocabulary") {
        return {
          select: vi.fn(() => ({
            or: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve({
                  data: [
                    { id: "e1234567-e89b-12d3-a456-426614174000", german_content: "der Apfel" },
                    { id: "e1234567-e89b-12d3-a456-426614174001", german_content: "die Birne" },
                  ],
                  error: null,
                })
              ),
            })),
          })),
          update: mockUpdate,
        };
      }
      return {};
    });

    const { POST } = await import("@/app/api/admin/audio/generate-batch/route");
    const req = new Request("http://localhost:3001/api/admin/audio/generate-batch", {
      method: "POST",
      body: JSON.stringify({ target: "vocab_words", limit: 2 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.processed).toBe(2);
    expect(mockSynthesizeGermanSpeech).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockRevalidateLearnerPaths).toHaveBeenCalledWith(["/", "/a1", "/a2", "/b1", "/b2"]);
  });

  it("POST: should batch process vocab_sentences, skipping empty examples without halting", async () => {
    const mockUpdate = vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    }));

    const mockNeq = vi.fn(() => ({
      limit: vi.fn(() =>
        Promise.resolve({
          data: [
            {
              id: "e1234567-e89b-12d3-a456-426614174002",
              examples: [{ german: "Das ist ein Apfel." }],
            },
            {
              id: "e1234567-e89b-12d3-a456-426614174003",
              examples: [], // Empty examples
            },
          ],
          error: null,
        })
      ),
    }));

    mockFrom.mockImplementation((table: string) => {
      if (table === "vocabulary") {
        return {
          select: vi.fn((_cols, opts) => {
            if (opts?.head) {
              return {
                or: vi.fn(() => ({
                  not: vi.fn(() => ({
                    neq: vi.fn(() => Promise.resolve({ count: 5, error: null })),
                  })),
                })),
              };
            }
            return {
              or: vi.fn(() => ({
                not: vi.fn(() => ({
                  neq: mockNeq,
                })),
              })),
            };
          }),
          update: mockUpdate,
        };
      }
      return {};
    });

    const { POST } = await import("@/app/api/admin/audio/generate-batch/route");
    const req = new Request("http://localhost:3001/api/admin/audio/generate-batch", {
      method: "POST",
      body: JSON.stringify({ target: "vocab_sentences", limit: 2 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.processed).toBe(1); // 1 valid sentence processed, 1 empty skipped
    expect(json.errors).toBeDefined();
    expect(json.errors[0]).toContain("Empty or invalid German sentence");
    expect(mockNeq).toHaveBeenCalledWith("examples", "[]");
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockRevalidateLearnerPaths).toHaveBeenCalledWith(["/", "/a1", "/a2", "/b1", "/b2"]);
  });

  it("POST: should batch process missing conversation_turns with gender-aware voice matching", async () => {
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://mock-storage.supabase.co/audio/conversations/conv-1_turn-1.mp3" },
    });

    const mockConvUpdate = vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    }));

    mockFrom.mockImplementation((table: string) => {
      if (table === "conversations") {
        return {
          select: vi.fn(() => ({
            order: vi.fn(() =>
              Promise.resolve({
                data: [
                  {
                    id: "conv-1",
                    topic_id: "topic-1",
                    turns: [
                      {
                        id: "turn-1",
                        speaker: "Frau Schmidt",
                        gender: "female",
                        german: "Guten Tag, Herr Weber.",
                        audio_url: null,
                      },
                      {
                        id: "turn-2",
                        speaker: "Herr Weber",
                        gender: "male",
                        german: "Guten Tag, Frau Schmidt.",
                        audio_url: "https://existing.mp3",
                      },
                    ],
                  },
                ],
                error: null,
              })
            ),
          })),
          update: mockConvUpdate,
        };
      }
      return {};
    });

    const { POST } = await import("@/app/api/admin/audio/generate-batch/route");
    const req = new Request("http://localhost:3001/api/admin/audio/generate-batch", {
      method: "POST",
      body: JSON.stringify({ target: "conversation_turns", limit: 5 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.processed).toBe(1); // turn-1 synthesized, turn-2 already had audio
    expect(mockConvUpdate).toHaveBeenCalledTimes(1);
    expect(mockRevalidateLearnerPaths).toHaveBeenCalledWith([
      "/",
      "/speaking",
      "/medical",
      "/a1",
      "/a2",
      "/b1",
      "/b2",
    ]);
  });
});

