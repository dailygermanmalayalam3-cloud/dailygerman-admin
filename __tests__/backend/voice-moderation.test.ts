import { describe, it, expect } from "vitest";
import {
  MODERATION_LISTENER_ROLE,
  isValidUuid,
  findActiveSpeakersAtSecond,
  formatReportDuration,
  type SpeakerTimelineSegment,
} from "@/lib/voice/moderation-engine";

describe("Admin Voice Moderation & Stealth Listen-In Unit Tests", () => {
  it("defines MODERATION_LISTENER_ROLE as moderation:listener", () => {
    expect(MODERATION_LISTENER_ROLE).toBe("moderation:listener");
  });

  it("validates RFC 4122 UUIDs strictly", () => {
    expect(isValidUuid(crypto.randomUUID())).toBe(true);
    expect(isValidUuid("cat-1")).toBe(false);
    expect(isValidUuid("")).toBe(false);
  });

  it("formats report durations into MM:SS accurately", () => {
    expect(formatReportDuration(0)).toBe("00:00");
    expect(formatReportDuration(9)).toBe("00:09");
    expect(formatReportDuration(65)).toBe("01:05");
    expect(formatReportDuration(125.4)).toBe("02:05");
  });

  it("identifies active speaker(s) at any given playback second of recorded evidence", () => {
    const u1 = crypto.randomUUID();
    const u2 = crypto.randomUUID();
    const timeline: SpeakerTimelineSegment[] = [
      {
        startSec: 1.0,
        endSec: 5.5,
        userId: u1,
        userName: "LearnerA",
        userEmail: "a@example.com",
      },
      {
        startSec: 6.0,
        endSec: 12.0,
        userId: u2,
        userName: "ReportedUserB",
        userEmail: "b@example.com",
      },
    ];

    expect(findActiveSpeakersAtSecond(timeline, 0.2)).toHaveLength(0);
    const at3 = findActiveSpeakersAtSecond(timeline, 3.2);
    expect(at3).toHaveLength(1);
    expect(at3[0].userName).toBe("LearnerA");

    const at9 = findActiveSpeakersAtSecond(timeline, 9.0);
    expect(at9).toHaveLength(1);
    expect(at9[0].userName).toBe("ReportedUserB");
  });
});
