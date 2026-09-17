import crypto from "crypto";

/**
 * Google Cloud Text-to-Speech Service
 *
 * Supports both:
 * 1. Google Cloud Service Account JSON (via OAuth2 Bearer token)
 * 2. Google Cloud API Key (?key=...)
 *
 * Uses the Google Cloud Text-to-Speech REST API v1 to synthesize
 * high-quality German speech using Neural2 High German models (de-DE).
 */

export interface SynthesizeSpeechOptions {
  text: string;
  voiceName?: string;
  speakingRate?: number;
  pitch?: number;
}

export interface SynthesizeSpeechResult {
  audioBuffer: Buffer;
  contentType: string;
  ext: string;
  characterCount: number;
}

const DEFAULT_VOICE = "de-DE-Neural2-F";
const DEFAULT_SPEAKING_RATE = 0.95;

// In-memory token cache for service account
let cachedOAuthToken: { token: string; expiresAt: number } | null = null;

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getServiceAccountAccessToken(serviceAccountJson: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if valid for at least another 60 seconds
  if (cachedOAuthToken && Date.now() < cachedOAuthToken.expiresAt - 60000) {
    return cachedOAuthToken.token;
  }

  let creds: {
    client_email?: string;
    private_key?: string;
    token_uri?: string;
  };

  try {
    creds = JSON.parse(serviceAccountJson);
  } catch (err) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON: " + (err as Error).message
    );
  }

  if (!creds.client_email || !creds.private_key) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key."
    );
  }

  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: creds.token_uri || "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaimSet = base64url(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signatureInput);
  const signature = base64url(signer.sign(creds.private_key));
  const jwt = `${signatureInput}.${signature}`;

  const tokenEndpoint = creds.token_uri || "https://oauth2.googleapis.com/token";
  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    const msg = data.error_description || data.error || "Failed to exchange service account JWT for token";
    throw new Error(`Google OAuth2 Error: ${msg}`);
  }

  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600;
  cachedOAuthToken = {
    token: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return data.access_token;
}

export async function synthesizeGermanSpeech(
  options: SynthesizeSpeechOptions
): Promise<SynthesizeSpeechResult> {
  const serviceAccountJson =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_TTS_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  const apiKey =
    process.env.GOOGLE_TTS_API_KEY ||
    process.env.GOOGLE_CLOUD_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!serviceAccountJson && !apiKey) {
    throw new Error(
      "Neither GOOGLE_SERVICE_ACCOUNT_JSON nor GOOGLE_TTS_API_KEY is configured in environment variables. Please provide Google Cloud credentials."
    );
  }

  const cleanText = options.text?.trim();
  if (!cleanText) {
    throw new Error("Text is required for speech synthesis.");
  }

  const voiceName = options.voiceName || DEFAULT_VOICE;
  const isMale = voiceName.endsWith("-B") || voiceName.endsWith("-D");
  const ssmlGender = isMale ? "MALE" : "FEMALE";
  const speakingRate =
    typeof options.speakingRate === "number" && options.speakingRate > 0
      ? options.speakingRate
      : DEFAULT_SPEAKING_RATE;
  const pitch = typeof options.pitch === "number" ? options.pitch : 0.0;

  let url = "https://texttospeech.googleapis.com/v1/text:synthesize";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (serviceAccountJson) {
    const accessToken = await getServiceAccountAccessToken(serviceAccountJson);
    headers["Authorization"] = `Bearer ${accessToken}`;
  } else if (apiKey) {
    url = `${url}?key=${apiKey}`;
  }

  const payload = {
    input: {
      text: cleanText,
    },
    voice: {
      languageCode: "de-DE",
      name: voiceName,
      ssmlGender,
    },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate,
      pitch,
      sampleRateHertz: 24000,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.audioContent) {
    const errorMsg =
      data.error?.message ||
      `Google Cloud TTS failed with status ${response.status}: ${response.statusText}`;
    console.error("Google Cloud TTS error:", errorMsg);
    throw new Error(errorMsg);
  }

  const audioBuffer = Buffer.from(data.audioContent, "base64");

  return {
    audioBuffer,
    contentType: "audio/mpeg",
    ext: "mp3",
    characterCount: cleanText.length,
  };
}
