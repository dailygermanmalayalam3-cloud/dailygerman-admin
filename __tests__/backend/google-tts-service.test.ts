import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { synthesizeGermanSpeech } from "@/lib/services/google-tts";

describe("Google Cloud Text-to-Speech Service (synthesizeGermanSpeech)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, GOOGLE_TTS_API_KEY: "mock-tts-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should throw an error when GOOGLE_TTS_API_KEY is not configured", async () => {
    delete process.env.GOOGLE_TTS_API_KEY;
    delete process.env.GOOGLE_CLOUD_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    await expect(
      synthesizeGermanSpeech({ text: "Guten Tag" })
    ).rejects.toThrow("GOOGLE_TTS_API_KEY is not configured");
  });

  it("should throw an error when text is empty", async () => {
    await expect(
      synthesizeGermanSpeech({ text: "   " })
    ).rejects.toThrow("Text is required for speech synthesis");
  });

  it("should make a request to Google Cloud TTS REST API and return audio buffer", async () => {
    const mockAudioBase64 = Buffer.from("fake-mp3-audio-bytes").toString("base64");

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ audioContent: mockAudioBase64 }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await synthesizeGermanSpeech({
      text: "der Hauptbahnhof",
      voiceName: "de-DE-Neural2-B",
      speakingRate: 0.9,
    });

    expect(result.contentType).toBe("audio/mpeg");
    expect(result.ext).toBe("mp3");
    expect(result.audioBuffer.toString()).toBe("fake-mp3-audio-bytes");
    expect(result.characterCount).toBe("der Hauptbahnhof".length);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://texttospeech.googleapis.com/v1/text:synthesize?key=mock-tts-key",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"name":"de-DE-Neural2-B"'),
      })
    );

    vi.unstubAllGlobals();
  });

  it("should handle API error responses gracefully", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      json: async () => ({
        error: { message: "Cloud Text-to-Speech API has not been enabled" },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      synthesizeGermanSpeech({ text: "Hallo" })
    ).rejects.toThrow("Cloud Text-to-Speech API has not been enabled");

    vi.unstubAllGlobals();
  });
});
