import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/revalidate", () => ({
  revalidateLearnerPaths: vi.fn(),
}));

vi.mock("@/lib/db/content", () => ({
  getListeningTopics: vi.fn(async () => [
    {
      id: "340cbe29-9fdf-459e-8829-fd48310b1a3e",
      level: "A1",
      title: "Goethe A1 Hören: Durchsagen am Hauptbahnhof",
      slug: "goethe-a1-hoeren-durchsagen",
      description: "Bahnhofsdurchsagen trainieren",
      order_index: 1,
    },
  ]),
  mutateListeningTopic: vi.fn(async (body) => ({
    id: body.id || "340cbe29-9fdf-459e-8829-fd48310b1a3e",
    level: body.level,
    title: body.title,
    slug: body.slug,
    description: body.description || "",
    order_index: body.order_index ?? 1,
  })),
  deleteListeningTopic: vi.fn(async (_id: string) => true),

  getListeningAudios: vi.fn(async () => [
    {
      id: "f60c9402-086a-4f59-b47f-99b6fba0f409",
      topic_id: "340cbe29-9fdf-459e-8829-fd48310b1a3e",
      title: "Durchsage: ICE 582",
      content_german: "Achtung an alle Fahrgäste...",
      audio_url: "https://audio.mp3",
      order_index: 1,
    },
  ]),
  mutateListeningAudio: vi.fn(async (body) => ({
    id: body.id || "f60c9402-086a-4f59-b47f-99b6fba0f409",
    topic_id: body.topic_id,
    title: body.title,
    content_german: body.content_german,
    audio_url: body.audio_url || null,
    order_index: body.order_index ?? 1,
  })),
  deleteListeningAudio: vi.fn(async (_id: string) => true),

  getListeningQuestions: vi.fn(async () => [
    {
      id: "a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1",
      topic_id: "340cbe29-9fdf-459e-8829-fd48310b1a3e",
      question: "Wohin fährt der Zug?",
      options: ["Nach Frankfurt", "Nach München"],
      correct_option_index: 0,
      order_index: 1,
    },
  ]),
  mutateListeningQuestion: vi.fn(async (body) => ({
    id: body.id || "a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1",
    topic_id: body.topic_id,
    question: body.question,
    options: body.options,
    correct_option_index: body.correct_option_index ?? 0,
    order_index: body.order_index ?? 1,
  })),
  deleteListeningQuestion: vi.fn(async (_id: string) => true),
}));

describe("Admin Backend API: Listening Module (/api/admin/listening/*)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Listening Topics (/api/admin/listening/topics)", () => {
    it("GET: should return listening topics list", async () => {
      const { GET } = await import("@/app/api/admin/listening/topics/route");
      const req = new Request("http://localhost:3001/api/admin/listening/topics?level=A1");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.items.length).toBe(1);
      expect(json.items[0].slug).toBe("goethe-a1-hoeren-durchsagen");
    });

    it("POST: should return 400 if level, title, or slug is missing", async () => {
      const { POST } = await import("@/app/api/admin/listening/topics/route");
      const req = new Request("http://localhost:3001/api/admin/listening/topics", {
        method: "POST",
        body: JSON.stringify({ level: "A1", title: "Missing slug topic" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Missing required fields");
    });

    it("POST: should save topic and revalidate learner paths", async () => {
      const { POST } = await import("@/app/api/admin/listening/topics/route");
      const { revalidateLearnerPaths } = await import("@/lib/revalidate");

      const req = new Request("http://localhost:3001/api/admin/listening/topics", {
        method: "POST",
        body: JSON.stringify({
          level: "A1",
          title: "Flughafendurchsagen A1",
          slug: "flughafen-durchsagen",
          description: "Flughafendurchsagen üben",
          order_index: 2,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.item.slug).toBe("flughafen-durchsagen");
      expect(revalidateLearnerPaths).toHaveBeenCalledWith([
        "/",
        "/listening",
        "/a1",
        "/listening/flughafen-durchsagen",
      ]);
    });

    it("DELETE: should return 400 if id is missing", async () => {
      const { DELETE } = await import("@/app/api/admin/listening/topics/route");
      const req = new Request("http://localhost:3001/api/admin/listening/topics", { method: "DELETE" });
      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });

    it("DELETE: should delete topic and trigger revalidation", async () => {
      const { DELETE } = await import("@/app/api/admin/listening/topics/route");
      const { deleteListeningTopic } = await import("@/lib/db/content");
      const { revalidateLearnerPaths } = await import("@/lib/revalidate");

      const req = new Request("http://localhost:3001/api/admin/listening/topics?id=340cbe29-9fdf-459e-8829-fd48310b1a3e", {
        method: "DELETE",
      });
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      expect(deleteListeningTopic).toHaveBeenCalledWith("340cbe29-9fdf-459e-8829-fd48310b1a3e");
      expect(revalidateLearnerPaths).toHaveBeenCalledWith(["/", "/listening", "/a1", "/a2", "/b1", "/b2"]);
    });
  });

  describe("Listening Audios (/api/admin/listening/audios)", () => {
    it("GET: should return audios for topic", async () => {
      const { GET } = await import("@/app/api/admin/listening/audios/route");
      const req = new Request("http://localhost:3001/api/admin/listening/audios?topic_id=340cbe29-9fdf-459e-8829-fd48310b1a3e");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.items.length).toBe(1);
    });

    it("POST: should return 400 if topic_id or content_german is missing", async () => {
      const { POST } = await import("@/app/api/admin/listening/audios/route");
      const req = new Request("http://localhost:3001/api/admin/listening/audios", {
        method: "POST",
        body: JSON.stringify({ topic_id: "340cbe29-9fdf-459e-8829-fd48310b1a3e" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("POST: should save audio passage and trigger revalidation", async () => {
      const { POST } = await import("@/app/api/admin/listening/audios/route");
      const { revalidateLearnerPaths } = await import("@/lib/revalidate");

      const req = new Request("http://localhost:3001/api/admin/listening/audios", {
        method: "POST",
        body: JSON.stringify({
          topic_id: "340cbe29-9fdf-459e-8829-fd48310b1a3e",
          title: "Audio Track 1",
          content_german: "Achtung an Gleis 7...",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(revalidateLearnerPaths).toHaveBeenCalledWith(["/", "/listening", "/a1", "/a2", "/b1", "/b2"]);
    });

    it("DELETE: should delete audio passage and trigger revalidation", async () => {
      const { DELETE } = await import("@/app/api/admin/listening/audios/route");
      const { deleteListeningAudio } = await import("@/lib/db/content");

      const req = new Request("http://localhost:3001/api/admin/listening/audios?id=f60c9402-086a-4f59-b47f-99b6fba0f409", {
        method: "DELETE",
      });
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      expect(deleteListeningAudio).toHaveBeenCalledWith("f60c9402-086a-4f59-b47f-99b6fba0f409");
    });
  });

  describe("Listening Questions (/api/admin/listening/questions)", () => {
    it("GET: should return questions for topic", async () => {
      const { GET } = await import("@/app/api/admin/listening/questions/route");
      const req = new Request("http://localhost:3001/api/admin/listening/questions?topic_id=340cbe29-9fdf-459e-8829-fd48310b1a3e");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.items.length).toBe(1);
    });

    it("POST: should return 400 if options array has less than 2 items", async () => {
      const { POST } = await import("@/app/api/admin/listening/questions/route");
      const req = new Request("http://localhost:3001/api/admin/listening/questions", {
        method: "POST",
        body: JSON.stringify({
          topic_id: "340cbe29-9fdf-459e-8829-fd48310b1a3e",
          question: "Invalid question?",
          options: ["Only one option"],
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("POST: should save question and trigger revalidation", async () => {
      const { POST } = await import("@/app/api/admin/listening/questions/route");
      const { revalidateLearnerPaths } = await import("@/lib/revalidate");

      const req = new Request("http://localhost:3001/api/admin/listening/questions", {
        method: "POST",
        body: JSON.stringify({
          topic_id: "340cbe29-9fdf-459e-8829-fd48310b1a3e",
          question: "Wann fährt der Zug ab?",
          options: ["Um 14:15 Uhr", "Um 15:00 Uhr"],
          correct_option_index: 0,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(revalidateLearnerPaths).toHaveBeenCalledWith(["/", "/listening", "/a1", "/a2", "/b1", "/b2"]);
    });

    it("DELETE: should delete question and trigger revalidation", async () => {
      const { DELETE } = await import("@/app/api/admin/listening/questions/route");
      const { deleteListeningQuestion } = await import("@/lib/db/content");

      const req = new Request("http://localhost:3001/api/admin/listening/questions?id=a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1", {
        method: "DELETE",
      });
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      expect(deleteListeningQuestion).toHaveBeenCalledWith("a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1");
    });
  });
});
