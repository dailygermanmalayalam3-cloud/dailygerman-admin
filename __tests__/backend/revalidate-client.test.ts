import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { revalidateLearnerPaths } from "@/lib/revalidate";

describe("Admin Backend: revalidateLearnerPaths webhook caller", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      REVALIDATION_SECRET: "admin-secret-token",
      LEARNER_APP_URL: "https://dailygerman-nu.vercel.app",
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("should gracefully skip when REVALIDATION_SECRET is not configured without throwing", async () => {
    delete process.env.REVALIDATION_SECRET;
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(revalidateLearnerPaths(["/a1"])).resolves.not.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should send POST request with secret and paths to learner revalidation endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    await revalidateLearnerPaths(["/", "/a1", "/grammar"]);

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://dailygerman-nu.vercel.app/api/revalidate",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: "admin-secret-token",
          paths: ["/", "/a1", "/grammar"],
        }),
      })
    );
  });

  it("should handle network failure or timeout gracefully without throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network timeout"));

    await expect(revalidateLearnerPaths(["/a1"])).resolves.not.toThrow();
  });
});
