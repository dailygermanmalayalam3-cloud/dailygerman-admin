import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  MODERATION_LISTENER_ROLE,
  isValidUuid,
  findActiveSpeakersAtSecond,
  formatReportDuration,
  AdminStealthListener,
  type SpeakerTimelineSegment,
  type LiveMonitoredParticipant,
} from "@/lib/voice/moderation-engine";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => null,
}));

import VoiceModerationPage from "@/app/voice-moderation/page";

class MockWebSocket {
  static OPEN = 1;
  static instances: MockWebSocket[] = [];
  url: string;
  readyState = MockWebSocket.OPEN;
  sent: any[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.closed = true;
  }
}

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  name: string;
  posted: any[] = [];
  onmessage: ((ev: { data: any }) => void) | null = null;

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  postMessage(data: any) {
    this.posted.push(data);
  }

  close() {}
}

class MockRTCPeerConnection {
  static instances: MockRTCPeerConnection[] = [];
  localDescription: any = null;
  remoteDescription: any = null;
  iceCandidates: any[] = [];
  closed = false;
  onicecandidate: ((ev: { candidate: any }) => void) | null = null;
  ontrack: ((ev: { streams: any[] }) => void) | null = null;

  constructor() {
    MockRTCPeerConnection.instances.push(this);
  }

  async createAnswer() {
    return { type: "answer", sdp: "admin-answer-sdp" };
  }

  async setLocalDescription(desc: any) {
    this.localDescription = desc;
  }

  async setRemoteDescription(desc: any) {
    this.remoteDescription = desc;
  }

  async addIceCandidate(cand: any) {
    this.iceCandidates.push(cand);
  }

  close() {
    this.closed = true;
  }
}

class MockAudioContext {
  static freqValue = 75;
  createMediaStreamDestination() {
    return { stream: {} };
  }
  createMediaStreamSource() {
    return { connect: vi.fn() };
  }
  createAnalyser() {
    return {
      fftSize: 256,
      getByteFrequencyData: (arr: Uint8Array) => {
        arr.fill(MockAudioContext.freqValue);
      },
    };
  }
}

class MockAudio {
  autoplay = false;
  srcObject: any = null;
  async play() {}
  pause() {}
}

describe("Admin Voice Moderation & Stealth Listen-In Engine (100% Coverage)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    MockBroadcastChannel.instances = [];
    MockRTCPeerConnection.instances = [];
    MockAudioContext.freqValue = 75;

    (globalThis as any).window = globalThis;
    (globalThis as any).WebSocket = MockWebSocket;
    (globalThis as any).BroadcastChannel = MockBroadcastChannel;
    (globalThis as any).RTCPeerConnection = MockRTCPeerConnection;
    (globalThis as any).RTCSessionDescription = class {
      type: string;
      sdp: string;
      constructor(init: any) {
        this.type = init.type;
        this.sdp = init.sdp;
      }
    };
    (globalThis as any).RTCIceCandidate = class {
      candidate: string;
      constructor(init: any) {
        this.candidate = init.candidate || init;
      }
    };
    (globalThis as any).AudioContext = MockAudioContext;
    (globalThis as any).Audio = MockAudio;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("defines MODERATION_LISTENER_ROLE as moderation:listener and validates UUIDs", () => {
    expect(MODERATION_LISTENER_ROLE).toBe("moderation:listener");
    expect(isValidUuid(crypto.randomUUID())).toBe(true);
    expect(isValidUuid("cat-1")).toBe(false);
    expect(isValidUuid("")).toBe(false);
  });

  it("formats report durations into MM:SS accurately", () => {
    expect(formatReportDuration(-10)).toBe("00:00");
    expect(formatReportDuration(0)).toBe("00:00");
    expect(formatReportDuration(9)).toBe("00:09");
    expect(formatReportDuration(65)).toBe("01:05");
    expect(formatReportDuration(125.4)).toBe("02:05");
  });

  it("identifies active speaker(s) at any given playback second of recorded evidence", () => {
    expect(findActiveSpeakersAtSecond([], 5)).toEqual([]);
    expect(findActiveSpeakersAtSecond(null as any, 5)).toEqual([]);

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

  it("AdminStealthListener connects invisibly as moderation:listener, negotiates WebRTC, tracks volume meters, and sends moderation commands", async () => {
    const updates: LiveMonitoredParticipant[][] = [];
    const listener = new AdminStealthListener("invalid-admin-id-fallback", (list) => {
      updates.push(list);
    });

    const roomId = crypto.randomUUID();
    listener.startStealthListen(roomId);

    const ws = MockWebSocket.instances[0];
    expect(ws).toBeDefined();
    ws.onopen?.();
    expect(ws.sent.some((m) => m.type === "hello" && m.role === MODERATION_LISTENER_ROLE)).toBe(true);
    expect(ws.sent.some((m) => m.type === "join-room" && m.roomId === roomId)).toBe(true);

    // Handle room-state with both learner and moderation:listener (filters out moderation:listener)
    const speakerPeerId = "speaker-peer-1";
    const speakerUserId = crypto.randomUUID();
    ws.onmessage?.({
      data: JSON.stringify({
        type: "room-state",
        roomId,
        participants: [
          {
            peerId: speakerPeerId,
            userId: speakerUserId,
            userName: "Hans",
            userEmail: "hans@example.com",
            role: "learner",
            isGuest: false,
            muted: false,
            speaking: false,
            volume: 0,
          },
          {
            peerId: "other-admin",
            userId: crypto.randomUUID(),
            userName: "Admin2",
            userEmail: "",
            role: MODERATION_LISTENER_ROLE,
            isGuest: false,
            muted: true,
            speaking: false,
            volume: 0,
          },
        ],
      }),
    });
    expect(updates[updates.length - 1]).toHaveLength(1);
    expect(updates[updates.length - 1][0].userName).toBe("Hans");

    // Handle incoming WebRTC offer from speaker + ICE candidate + ontrack
    ws.onmessage?.({
      data: JSON.stringify({
        type: "webrtc-signal",
        roomId,
        targetPeerId: (listener as any).peerId,
        fromPeerId: speakerPeerId,
        fromParticipant: {
          peerId: speakerPeerId,
          userId: speakerUserId,
          userName: "Hans",
          userEmail: "hans@example.com",
          role: "learner",
          isGuest: false,
          muted: false,
          speaking: true,
          volume: 50,
        },
        signal: { sdp: { type: "offer", sdp: "speaker-offer-sdp" } },
      }),
    });
    await Promise.resolve();

    const pc = MockRTCPeerConnection.instances[0];
    expect(pc).toBeDefined();
    pc.onicecandidate?.({ candidate: "admin-ice-candidate" });
    pc.ontrack?.({ streams: [{ id: "remote-stream" }] });

    ws.onmessage?.({
      data: JSON.stringify({
        type: "webrtc-signal",
        roomId,
        targetPeerId: (listener as any).peerId,
        fromPeerId: speakerPeerId,
        signal: { candidate: "speaker-ice-candidate" },
      }),
    });
    await Promise.resolve();

    // Advance timer to trigger updateVolumeMeters (active speaking)
    vi.advanceTimersByTime(300);
    expect(updates[updates.length - 1][0].speaking).toBe(true);
    expect(updates[updates.length - 1][0].volume).toBeGreaterThan(10);

    // Mute speaker via mic-state and advance timer so muted volume reset executes
    ws.onmessage?.({
      data: JSON.stringify({
        type: "mic-state",
        roomId,
        peerId: speakerPeerId,
        muted: true,
        speaking: false,
      }),
    });
    vi.advanceTimersByTime(300);
    expect(updates[updates.length - 1][0].volume).toBe(0);

    // Test peer-announce and leave-room via BroadcastChannel
    MockBroadcastChannel.instances[0]?.onmessage?.({
      data: {
        type: "peer-announce",
        roomId,
        participant: {
          peerId: "peer-guest-2",
          userId: crypto.randomUUID(),
          userName: "Gast-9999",
          userEmail: "",
          role: "guest",
          isGuest: true,
          muted: true,
          speaking: false,
          volume: 0,
        },
      },
    });
    expect(updates[updates.length - 1]).toHaveLength(2);

    ws.onmessage?.({
      data: JSON.stringify({
        type: "leave-room",
        roomId,
        peerId: "peer-guest-2",
      }),
    });
    expect(updates[updates.length - 1]).toHaveLength(1);

    // Send moderation commands (force-mute, kick-user, dissolve-room)
    listener.sendModerationCommand("force-mute", speakerUserId);
    listener.sendModerationCommand("kick-user", speakerUserId);
    listener.sendModerationCommand("dissolve-room");
    expect(ws.sent.some((m) => m.type === "admin-action" && m.action === "force-mute")).toBe(true);
    expect(ws.sent.some((m) => m.type === "admin-action" && m.action === "kick-user")).toBe(true);
    expect(ws.sent.some((m) => m.type === "admin-action" && m.action === "dissolve-room")).toBe(true);

    // Stop stealth listen and verify cleanup
    listener.stopStealthListen();
    expect(updates[updates.length - 1]).toHaveLength(0);
  });

  it("renders VoiceModerationPage with Reported Recordings & Stealth Listen-In tabs", () => {
    const html = renderToString(React.createElement(VoiceModerationPage));
    expect(html).toContain("SPRECHEN CAFÉ • VOICE MODERATION &amp; STEALTH LISTEN-IN");
    expect(html).toContain("Voice Groups, Silent Reports &amp; Audio Evidence");
    expect(html).toContain("moderation:listener");
    expect(html).toContain("Reported Conversations &amp; Audio Evidence");
    expect(html).toContain("Live Active Voice Groups");
  });
});

