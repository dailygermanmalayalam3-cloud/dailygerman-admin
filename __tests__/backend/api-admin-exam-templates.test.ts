import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST, DELETE } from "@/app/api/admin/exam-templates/route";

vi.mock("@/lib/revalidate", () => ({
  revalidateLearnerPaths: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db/content", () => ({
  getGoetheExamTemplates: vi.fn().mockImplementation(async (level, moduleType) => {
    return [
      {
        id: "mock-uuid-1",
        level: level || "B1",
        module_type: moduleType || "schreiben",
        section: "Teil 1",
        title: "Test Template",
        title_en: "Test English",
        title_ml: "ടെസ്റ്റ് മലയാളം",
        register: "informell",
        recommended_time: "20 min",
        target_word_count: "80 words",
        skeleton_structure: {},
        model_prompt_de: "Prompt",
        model_answer_de: "Answer DE",
        model_answer_en: "Answer EN",
        model_answer_ml: "Answer ML",
        connectors: ["obwohl"],
      },
    ];
  }),
  mutateGoetheExamTemplate: vi.fn().mockImplementation(async (body) => {
    return { id: body.id || "mock-new-id", ...body };
  }),
  deleteGoetheExamTemplate: vi.fn().mockImplementation(async () => true),
}));

describe("Admin Backend API: /api/admin/exam-templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/admin/exam-templates", () => {
    it("should retrieve templates successfully with optional filter parameters", async () => {
      const req = new Request("http://localhost:3001/api/admin/exam-templates?level=B1&module_type=schreiben");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.templates)).toBe(true);
      expect(json.templates[0].level).toBe("B1");
    });
  });

  describe("POST /api/admin/exam-templates", () => {
    it("should return 400 when required fields are missing", async () => {
      const req = new Request("http://localhost:3001/api/admin/exam-templates", {
        method: "POST",
        body: JSON.stringify({ title: "Incomplete Template" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it("should successfully save template and trigger learner cache revalidation", async () => {
      const { revalidateLearnerPaths } = await import("@/lib/revalidate");
      const payload = {
        level: "B2",
        module_type: "schreiben",
        section: "Teil 1",
        title: "Discussionsbeitrag",
        title_en: "Discussion",
        title_ml: "ചർച്ച",
        register: "forum",
        recommended_time: "45 min",
        target_word_count: "150 words",
        skeleton_structure: {},
        model_prompt_de: "Prompt",
        model_answer_de: "Answer DE",
        model_answer_en: "Answer EN",
        model_answer_ml: "Answer ML",
      };
      const req = new Request("http://localhost:3001/api/admin/exam-templates", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.item.title).toBe("Discussionsbeitrag");
      expect(revalidateLearnerPaths).toHaveBeenCalledWith(
        expect.arrayContaining(["/tools/exam-templates"])
      );
    });
  });

  describe("DELETE /api/admin/exam-templates", () => {
    it("should return 400 when id is missing", async () => {
      const req = new Request("http://localhost:3001/api/admin/exam-templates", {
        method: "DELETE",
      });
      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });

    it("should delete template successfully and trigger revalidation", async () => {
      const { revalidateLearnerPaths } = await import("@/lib/revalidate");
      const req = new Request("http://localhost:3001/api/admin/exam-templates?id=mock-uuid-1", {
        method: "DELETE",
      });
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(revalidateLearnerPaths).toHaveBeenCalledWith(
        expect.arrayContaining(["/tools/exam-templates"])
      );
    });
  });
});
