import { ref, set, onValue, off, push } from 'firebase/database';
import { rtdb } from '../config/firebase';

/**
 * WebRTC signaling via Firebase Realtime Database.
 * Handles SDP offer/answer exchange and ICE candidate trickling.
 *
 * Firebase paths:
 * /games/{gameId}/webrtc/
 *   ├── offer           # Host writes SDP offer
 *   ├── answer          # Guest writes SDP answer
 *   ├── hostCandidates/ # Host ICE candidates
 *   └── guestCandidates/# Guest ICE candidates
 */
export class WebRTCSignaling {
  private gameId: string;
  private isHost: boolean;
  private unsubscribers: (() => void)[] = [];
  private seenCandidateKeys = new Set<string>();

  constructor(gameId: string, isHost: boolean) {
    this.gameId = gameId;
    this.isHost = isHost;
  }

  private getBasePath(): string {
    return `games/${this.gameId}/webrtc`;
  }

  /**
   * Host sends SDP offer to Firebase.
   */
  async sendOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    const offerRef = ref(rtdb, `${this.getBasePath()}/offer`);
    await set(offerRef, {
      type: offer.type,
      sdp: offer.sdp,
    });
  }

  /**
   * Guest listens for SDP offer from host.
   */
  onOffer(callback: (offer: RTCSessionDescriptionInit) => void): void {
    const offerRef = ref(rtdb, `${this.getBasePath()}/offer`);
    onValue(offerRef, (snap) => {
      const data = snap.val();
      if (data && data.type && data.sdp) {
        callback({ type: data.type, sdp: data.sdp });
      }
    });
    this.unsubscribers.push(() => off(offerRef));
  }

  /**
   * Guest sends SDP answer to Firebase.
   */
  async sendAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    const answerRef = ref(rtdb, `${this.getBasePath()}/answer`);
    await set(answerRef, {
      type: answer.type,
      sdp: answer.sdp,
    });
  }

  /**
   * Host listens for SDP answer from guest.
   */
  onAnswer(callback: (answer: RTCSessionDescriptionInit) => void): void {
    const answerRef = ref(rtdb, `${this.getBasePath()}/answer`);
    onValue(answerRef, (snap) => {
      const data = snap.val();
      if (data && data.type && data.sdp) {
        callback({ type: data.type, sdp: data.sdp });
      }
    });
    this.unsubscribers.push(() => off(answerRef));
  }

  /**
   * Send ICE candidate to Firebase.
   * Host writes to hostCandidates, guest writes to guestCandidates.
   */
  async sendIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    const path = this.isHost
      ? `${this.getBasePath()}/hostCandidates`
      : `${this.getBasePath()}/guestCandidates`;

    const candidatesRef = ref(rtdb, path);
    const newCandidateRef = push(candidatesRef);
    await set(newCandidateRef, {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
    });
  }

  /**
   * Listen for remote ICE candidates.
   * Host listens to guestCandidates, guest listens to hostCandidates.
   */
  onIceCandidate(callback: (candidate: RTCIceCandidateInit) => void): void {
    const path = this.isHost
      ? `${this.getBasePath()}/guestCandidates`
      : `${this.getBasePath()}/hostCandidates`;

    const candidatesRef = ref(rtdb, path);
    onValue(candidatesRef, (snap) => {
      const data = snap.val();
      if (data && typeof data === 'object') {
        for (const [key, value] of Object.entries(data)) {
          // Skip already-seen candidates
          if (this.seenCandidateKeys.has(key)) {
            continue;
          }
          this.seenCandidateKeys.add(key);

          const candidateData = value as {
            candidate: string;
            sdpMid: string | null;
            sdpMLineIndex: number | null;
          };
          if (candidateData.candidate) {
            callback({
              candidate: candidateData.candidate,
              sdpMid: candidateData.sdpMid ?? undefined,
              sdpMLineIndex: candidateData.sdpMLineIndex ?? undefined,
            });
          }
        }
      }
    });
    this.unsubscribers.push(() => off(candidatesRef));
  }

  /**
   * Clean up all Firebase listeners.
   */
  destroy(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    this.seenCandidateKeys.clear();
  }
}
