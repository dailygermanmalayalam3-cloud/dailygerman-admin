/**
 * Google Cloud Text-to-Speech Service
 *
 * Uses the Google Cloud Text-to-Speech REST API v1 with API Key authentication
 * to synthesize high-quality German speech using Neural2 High German models (de-DE).
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

export async function synthesizeGermanSpeech(
  options: SynthesizeSpeechOptions
): Promise<SynthesizeSpeechResult> {
  const apiKey =
    process.env.GOOGLE_TTS_API_KEY ||
    process.env.GOOGLE_CLOUD_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GOOGLE_TTS_API_KEY is not configured in environment variables. Please add your Google Cloud API key."
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

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

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
    headers: {
      "Content-Type": "application/json",
    },
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
