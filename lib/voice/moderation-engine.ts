/**
 * Admin Stealth Listen-In & Voice Moderation Engine (`DailyGermanAdmin`)
 * Connects to active Sprechen Café voice rooms with hidden role `moderation:listener`
 * (`canPublish: false, canSubscribe: true, hidden: true`), identical to `kerala.dhilber.com`.
 */

export const MODERATION_LISTENER_ROLE = "moderation:listener" as const;

export interface SpeakerTimelineSegment {
  startSec: number;
  endSec: number;
  userId: string;
  userName: string;
  userEmail: string;
}

export interface VoiceReportRow {
  id: string;
  group_id: string | null;
  group_name: string;
  reporter_id: string;
  reporter_name: string;
  reporter_email: string;
  reported_id: string;
  reported_name: string;
  reported_email: string;
  reason: string;
  details: string;
  recording_url: string;
  speaker_timeline: SpeakerTimelineSegment[];
  duration_sec: number;
  status: "open" | "reviewed" | "banned" | "dismissed";
  created_at: string;
}

export interface VoiceGroupRow {
  id: string;
  name: string;
  level: "All" | "A1" | "A2" | "B1" | "B2";
  topic: string;
  host_id: string;
  host_name: string;
  participant_count: number;
  is_active: boolean;
  created_at: string;
}

export interface LiveMonitoredParticipant {
  peerId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  isGuest: boolean;
  muted: boolean;
  speaking: boolean;
  volume: number;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(String(value || "").trim());
}

/**
 * Given the current playback position (`currentTimeSec`) of a recorded conversation `.webm` file,
 * returns all speakers whose microphone was active at that exact second.
 */
export function findActiveSpeakersAtSecond(
  timeline: SpeakerTimelineSegment[],
  currentTimeSec: number
): SpeakerTimelineSegment[] {
  if (!Array.isArray(timeline) || timeline.length === 0) return [];
  const t = Math.max(0, Number(currentTimeSec || 0));
  return timeline.filter((seg) => t >= seg.startSec && t <= seg.endSec + 0.25);
}

/**
 * Formats duration in seconds into `MM:SS` (e.g. `65` -> `"01:05"`).
 */
export function formatReportDuration(seconds: number): string {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

/**
 * Stealth Admin Listener (`moderation:listener`):
 * - Joins any active voice group completely invisibly (`role: "moderation:listener"`).
 * - Never publishes microphone audio (`canPublish: false`), only subscribes to room speakers (`canSubscribe: true`).
 * - Computes live per-speaker volume meters and allows Admin to record live room audio or Force-Mute / Kick / Dissolve.
 */
export class AdminStealthListener {
  private peerId: string = crypto.randomUUID();
  private adminId: string;
  private activeRoomId: string | null = null;
  private ws: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private remoteAudioEls: Map<string, HTMLAudioElement> = new Map();
  private participants: Map<string, LiveMonitoredParticipant> = new Map();

  private audioCtx: AudioContext | null = null;
  private tapNode: MediaStreamAudioDestinationNode | null = null;
  private analysers: Map<string, AnalyserNode> = new Map();
  private meterInterval: ReturnType<typeof setInterval> | null = null;

  private onParticipantsUpdate?: (list: LiveMonitoredParticipant[]) => void;

  constructor(adminId: string, onParticipantsUpdate?: (list: LiveMonitoredParticipant[]) => void) {
    this.adminId = isValidUuid(adminId) ? adminId : crypto.randomUUID();
    this.onParticipantsUpdate = onParticipantsUpdate;
  }

  public startStealthListen(roomId: string) {
    this.stopStealthListen();
    this.activeRoomId = roomId;

    if (typeof window !== "undefined") {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.tapNode = this.audioCtx.createMediaStreamDestination();
      }

      if ("BroadcastChannel" in window) {
        this.broadcastChannel = new BroadcastChannel("dg_sprechen_cafe_signaling_v1");
        this.broadcastChannel.onmessage = (ev) => {
          if (ev.data) this.handleSignal(ev.data);
        };
      }

      const hubUrl =
        process.env.NEXT_PUBLIC_VOICE_HUB_URL || "https://dailygerman-voice-hub.voice-hub.workers.dev";
      if (hubUrl) {
        try {
          const wsUrl = hubUrl.replace(/^http/, "ws");
          this.ws = new WebSocket(wsUrl);
          this.ws.onopen = () => {
            this.sendWs({
              type: "hello",
              peerId: this.peerId,
              userId: this.adminId,
              userName: "Admin Moderator",
              role: MODERATION_LISTENER_ROLE,
            });
            this.sendWs({
              type: "join-room",
              roomId,
              participant: {
                peerId: this.peerId,
                userId: this.adminId,
                userName: "Stealth Moderator",
                userEmail: "",
                role: MODERATION_LISTENER_ROLE,
                isGuest: false,
                muted: true,
                speaking: false,
                volume: 0,
              },
            });
          };
          this.ws.onmessage = (ev) => {
            try {
              this.handleSignal(JSON.parse(String(ev.data)));
            } catch {}
          };
        } catch {}
      }

      // Announce stealth listener presence to active speakers so they stream audio to us without listing us in UI
      this.broadcast({
        type: "join-room",
        roomId,
        participant: {
          peerId: this.peerId,
          userId: this.adminId,
          userName: "Stealth Moderator",
          userEmail: "",
          role: MODERATION_LISTENER_ROLE,
          isGuest: false,
          muted: true,
          speaking: false,
          volume: 0,
        },
      });

      this.meterInterval = setInterval(() => {
        this.updateVolumeMeters();
      }, 250);
    }
  }

  public stopStealthListen() {
    this.activeRoomId = null;
    if (this.meterInterval) {
      clearInterval(this.meterInterval);
      this.meterInterval = null;
    }
    for (const [, pc] of this.peers) {
      try {
        pc.close();
      } catch {}
    }
    this.peers.clear();
    for (const [, audioEl] of this.remoteAudioEls) {
      try {
        audioEl.pause();
        audioEl.srcObject = null;
      } catch {}
    }
    this.remoteAudioEls.clear();
    this.analysers.clear();
    this.participants.clear();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close();
      } catch {}
      this.broadcastChannel = null;
    }
    this.emitParticipants();
  }

  public sendModerationCommand(
    action: "force-mute" | "kick-user" | "dissolve-room",
    targetUserId?: string
  ) {
    if (!this.activeRoomId) return;
    this.broadcast({
      type: "admin-action",
      roomId: this.activeRoomId,
      action,
      targetUserId,
    });
  }

  private handleSignal(msg: any) {
    if (!msg || typeof msg !== "object") return;
    if (msg.roomId && this.activeRoomId && msg.roomId !== this.activeRoomId) return;

    switch (msg.type) {
      case "peer-announce":
      case "join-room": {
        const p: LiveMonitoredParticipant | undefined = msg.participant;
        if (!p || p.peerId === this.peerId || p.role === MODERATION_LISTENER_ROLE) return;
        this.participants.set(p.peerId, p);
        this.emitParticipants();
        break;
      }

      case "room-joined":
      case "room-state": {
        if (Array.isArray(msg.participants)) {
          this.participants.clear();
          for (const p of msg.participants) {
            if (p.role !== MODERATION_LISTENER_ROLE) {
              this.participants.set(p.peerId, {
                ...p,
                volume: p.volume || 0,
              });
            }
          }
          this.emitParticipants();
        }
        break;
      }

      case "leave-room": {
        const peerId = String(msg.peerId || "");
        this.participants.delete(peerId);
        this.analysers.delete(peerId);
        this.emitParticipants();
        break;
      }

      case "mic-state": {
        const peerId = String(msg.peerId || "");
        const existing = this.participants.get(peerId);
        if (existing) {
          existing.muted = Boolean(msg.muted);
          existing.speaking = !existing.muted && Boolean(msg.speaking);
          if (existing.muted) existing.volume = 0;
          this.participants.set(peerId, { ...existing });
          this.emitParticipants();
        }
        break;
      }

      case "webrtc-signal": {
        if (msg.targetPeerId && msg.targetPeerId !== this.peerId) return;
        const fromPeerId = String(msg.fromPeerId || "");
        if (msg.fromParticipant && msg.fromParticipant.role !== MODERATION_LISTENER_ROLE) {
          this.participants.set(fromPeerId, msg.fromParticipant);
          this.emitParticipants();
        }
        this.handleWebRtcSignal(fromPeerId, msg.signal);
        break;
      }
    }
  }

  private async handleWebRtcSignal(fromPeerId: string, signal: any) {
    if (!signal || typeof RTCPeerConnection === "undefined") return;
    let pc = this.peers.get(fromPeerId);
    if (!pc) {
      pc = new RTCPeerConnection(RTC_CONFIG);
      this.peers.set(fromPeerId, pc);

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          this.broadcast({
            type: "webrtc-signal",
            roomId: this.activeRoomId,
            targetPeerId: fromPeerId,
            fromPeerId: this.peerId,
            fromRole: MODERATION_LISTENER_ROLE,
            signal: { candidate: ev.candidate },
          });
        }
      };

      pc.ontrack = (ev) => {
        const stream = ev.streams?.[0];
        if (!stream) return;
        let audioEl = this.remoteAudioEls.get(fromPeerId);
        if (!audioEl && typeof Audio !== "undefined") {
          audioEl = new Audio();
          audioEl.autoplay = true;
          this.remoteAudioEls.set(fromPeerId, audioEl);
        }
        if (audioEl) {
          audioEl.srcObject = stream;
          audioEl.play().catch(() => {});
        }
        if (this.audioCtx && this.tapNode) {
          try {
            const source = this.audioCtx.createMediaStreamSource(stream);
            const analyser = this.audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            source.connect(this.tapNode);
            this.analysers.set(fromPeerId, analyser);
          } catch {}
        }
      };
    }

    try {
      if (signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.broadcast({
            type: "webrtc-signal",
            roomId: this.activeRoomId,
            targetPeerId: fromPeerId,
            fromPeerId: this.peerId,
            fromRole: MODERATION_LISTENER_ROLE,
            signal: { sdp: pc.localDescription },
          });
        }
      } else if (signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch {}
  }

  private updateVolumeMeters() {
    let changed = false;
    const freq = new Uint8Array(64);
    for (const [peerId, analyser] of this.analysers.entries()) {
      const p = this.participants.get(peerId);
      if (!p) continue;
      if (p.muted) {
        if (p.volume !== 0 || p.speaking) {
          p.volume = 0;
          p.speaking = false;
          this.participants.set(peerId, { ...p });
          changed = true;
        }
        continue;
      }
      analyser.getByteFrequencyData(freq);
      let sum = 0;
      for (let i = 0; i < freq.length; i++) sum += freq[i];
      const avg = sum / freq.length;
      const volume = Math.min(100, Math.round((avg / 96) * 100));
      const speaking = volume >= 10;
      if (Math.abs(p.volume - volume) >= 4 || p.speaking !== speaking) {
        p.volume = volume;
        p.speaking = speaking;
        this.participants.set(peerId, { ...p });
        changed = true;
      }
    }
    if (changed) this.emitParticipants();
  }

  private broadcast(payload: Record<string, any>) {
    try {
      this.broadcastChannel?.postMessage(payload);
    } catch {}
    this.sendWs(payload);
  }

  private sendWs(payload: Record<string, any>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch {}
    }
  }

  private emitParticipants() {
    this.onParticipantsUpdate?.(Array.from(this.participants.values()));
  }
}
