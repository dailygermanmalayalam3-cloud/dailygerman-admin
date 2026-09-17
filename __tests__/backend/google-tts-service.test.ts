import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { synthesizeGermanSpeech } from "@/lib/services/google-tts";
import crypto from "crypto";

describe("Google Cloud Text-to-Speech Service (synthesizeGermanSpeech)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, GOOGLE_TTS_API_KEY: "mock-tts-key" };
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should throw an error when neither service account nor API key is configured", async () => {
    delete process.env.GOOGLE_TTS_API_KEY;
    delete process.env.GOOGLE_CLOUD_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    await expect(
      synthesizeGermanSpeech({ text: "Guten Tag" })
    ).rejects.toThrow("Neither GOOGLE_SERVICE_ACCOUNT_JSON nor GOOGLE_TTS_API_KEY is configured");
  });

  it("should throw an error when text is empty", async () => {
    await expect(
      synthesizeGermanSpeech({ text: "   " })
    ).rejects.toThrow("Text is required for speech synthesis");
  });

  it("should make a request to Google Cloud TTS REST API using API key", async () => {
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

  it("should authenticate using Service Account JSON via Bearer token", async () => {
    const { privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const mockServiceAccount = {
      type: "service_account",
      project_id: "test-project",
      client_email: "test-sa@test-project.iam.gserviceaccount.com",
      private_key: privateKey,
    };

    delete process.env.GOOGLE_TTS_API_KEY;
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify(mockServiceAccount);

    const mockAudioBase64 = Buffer.from("sa-mp3-audio-bytes").toString("base64");

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("oauth2.googleapis.com/token")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ access_token: "mock-oauth-access-token", expires_in: 3600 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ audioContent: mockAudioBase64 }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await synthesizeGermanSpeech({
      text: "das Krankenhaus",
    });

    expect(result.contentType).toBe("audio/mpeg");
    expect(result.ext).toBe("mp3");
    expect(result.audioBuffer.toString()).toBe("sa-mp3-audio-bytes");

    // Verify token was sent in Authorization header
    expect(mockFetch).toHaveBeenCalledWith(
      "https://texttospeech.googleapis.com/v1/text:synthesize",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mock-oauth-access-token",
        }),
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
