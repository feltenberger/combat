import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock firebase/database
const mockSet = vi.fn();
const mockOnValue = vi.fn();
const mockOff = vi.fn();
const mockPush = vi.fn((parentRef) => {
  const parentPath = (parentRef as { path: string }).path;
  return { path: `${parentPath}/mock-candidate-key`, key: 'mock-candidate-key' };
});

vi.mock('firebase/database', () => ({
  ref: vi.fn((db: unknown, path: string) => ({ path, key: path.split('/').pop() })),
  set: (ref: unknown, data: unknown) => mockSet(ref, data),
  onValue: (ref: unknown, cb: unknown) => mockOnValue(ref, cb),
  off: (ref: unknown) => mockOff(ref),
  push: (ref: unknown) => mockPush(ref),
}));

// Mock firebase config
vi.mock('../config/firebase', () => ({
  rtdb: 'mock-rtdb',
}));

import { WebRTCSignaling } from './WebRTCSignaling';

describe('WebRTCSignaling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createSignaling = (isHost: boolean) =>
    new WebRTCSignaling('test-game-123', isHost);

  describe('offer handling', () => {
    it('host should write offer to Firebase', async () => {
      const signaling = createSignaling(true);

      const mockOffer: RTCSessionDescriptionInit = {
        type: 'offer',
        sdp: 'mock-offer-sdp',
      };

      await signaling.sendOffer(mockOffer);

      expect(mockSet).toHaveBeenCalled();
      const [refArg, dataArg] = mockSet.mock.calls[0];
      expect(refArg.path).toContain('webrtc/offer');
      expect(dataArg.type).toBe('offer');
      expect(dataArg.sdp).toBe('mock-offer-sdp');

      signaling.destroy();
    });

    it('guest should listen for offer', () => {
      const signaling = createSignaling(false);
      const offerCallback = vi.fn();

      signaling.onOffer(offerCallback);

      // Find the onValue call for offer
      const offerOnValueCall = mockOnValue.mock.calls.find(
        call => call[0]?.path?.includes('webrtc/offer')
      );
      expect(offerOnValueCall).toBeDefined();

      // Simulate receiving offer
      const snapshotCallback = offerOnValueCall![1];
      snapshotCallback({
        val: () => ({ type: 'offer', sdp: 'received-offer-sdp' }),
      });

      expect(offerCallback).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'offer', sdp: 'received-offer-sdp' })
      );

      signaling.destroy();
    });

    it('guest should handle null offer gracefully', () => {
      const signaling = createSignaling(false);
      const offerCallback = vi.fn();

      signaling.onOffer(offerCallback);

      const offerOnValueCall = mockOnValue.mock.calls.find(
        call => call[0]?.path?.includes('webrtc/offer')
      );

      // Simulate null offer (not yet written)
      const cb = offerOnValueCall![1];
      cb({ val: () => null });

      expect(offerCallback).not.toHaveBeenCalled();

      signaling.destroy();
    });
  });

  describe('answer handling', () => {
    it('guest should write answer to Firebase', async () => {
      const signaling = createSignaling(false);

      const mockAnswer: RTCSessionDescriptionInit = {
        type: 'answer',
        sdp: 'mock-answer-sdp',
      };

      await signaling.sendAnswer(mockAnswer);

      expect(mockSet).toHaveBeenCalled();
      const [refArg, dataArg] = mockSet.mock.calls[0];
      expect(refArg.path).toContain('webrtc/answer');
      expect(dataArg.type).toBe('answer');
      expect(dataArg.sdp).toBe('mock-answer-sdp');

      signaling.destroy();
    });

    it('host should listen for answer', () => {
      const signaling = createSignaling(true);
      const answerCallback = vi.fn();

      signaling.onAnswer(answerCallback);

      // Find the onValue call for answer
      const answerOnValueCall = mockOnValue.mock.calls.find(
        call => call[0]?.path?.includes('webrtc/answer')
      );
      expect(answerOnValueCall).toBeDefined();

      // Simulate receiving answer
      const snapshotCallback = answerOnValueCall![1];
      snapshotCallback({
        val: () => ({ type: 'answer', sdp: 'received-answer-sdp' }),
      });

      expect(answerCallback).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'answer', sdp: 'received-answer-sdp' })
      );

      signaling.destroy();
    });
  });

  describe('ICE candidate handling', () => {
    it('host should write ICE candidates to hostCandidates path', async () => {
      const signaling = createSignaling(true);

      const mockCandidate: RTCIceCandidateInit = {
        candidate: 'mock-candidate-string',
        sdpMid: '0',
        sdpMLineIndex: 0,
      };

      await signaling.sendIceCandidate(mockCandidate);

      expect(mockSet).toHaveBeenCalled();
      const [refArg, dataArg] = mockSet.mock.calls[0];
      expect(refArg.path).toContain('webrtc/hostCandidates');
      expect(dataArg.candidate).toBe('mock-candidate-string');

      signaling.destroy();
    });

    it('guest should write ICE candidates to guestCandidates path', async () => {
      const signaling = createSignaling(false);

      const mockCandidate: RTCIceCandidateInit = {
        candidate: 'mock-candidate-string',
        sdpMid: '0',
        sdpMLineIndex: 0,
      };

      await signaling.sendIceCandidate(mockCandidate);

      expect(mockSet).toHaveBeenCalled();
      const [refArg, dataArg] = mockSet.mock.calls[0];
      expect(refArg.path).toContain('webrtc/guestCandidates');
      expect(dataArg.candidate).toBe('mock-candidate-string');

      signaling.destroy();
    });

    it('host should listen for guest ICE candidates', () => {
      const signaling = createSignaling(true);
      const candidateCallback = vi.fn();

      signaling.onIceCandidate(candidateCallback);

      // Find the onValue call for guestCandidates (host reads guest's candidates)
      const candidatesOnValueCall = mockOnValue.mock.calls.find(
        call => call[0]?.path?.includes('webrtc/guestCandidates')
      );
      expect(candidatesOnValueCall).toBeDefined();

      // Simulate receiving candidates object
      const snapshotCallback = candidatesOnValueCall![1];
      snapshotCallback({
        val: () => ({
          'candidate-1': { candidate: 'candidate-1-string', sdpMid: '0', sdpMLineIndex: 0 },
          'candidate-2': { candidate: 'candidate-2-string', sdpMid: '0', sdpMLineIndex: 0 },
        }),
      });

      expect(candidateCallback).toHaveBeenCalledTimes(2);

      signaling.destroy();
    });

    it('guest should listen for host ICE candidates', () => {
      const signaling = createSignaling(false);
      const candidateCallback = vi.fn();

      signaling.onIceCandidate(candidateCallback);

      // Find the onValue call for hostCandidates (guest reads host's candidates)
      const candidatesOnValueCall = mockOnValue.mock.calls.find(
        call => call[0]?.path?.includes('webrtc/hostCandidates')
      );
      expect(candidatesOnValueCall).toBeDefined();

      signaling.destroy();
    });

    it('should not re-emit already seen candidates', () => {
      const signaling = createSignaling(true);
      const candidateCallback = vi.fn();

      signaling.onIceCandidate(candidateCallback);

      const candidatesOnValueCall = mockOnValue.mock.calls.find(
        call => call[0]?.path?.includes('webrtc/guestCandidates')
      );

      const snapshotCallback = candidatesOnValueCall![1];

      // First update with one candidate
      snapshotCallback({
        val: () => ({
          'candidate-1': { candidate: 'candidate-1-string', sdpMid: '0', sdpMLineIndex: 0 },
        }),
      });

      expect(candidateCallback).toHaveBeenCalledTimes(1);

      // Second update with same candidate + new one
      snapshotCallback({
        val: () => ({
          'candidate-1': { candidate: 'candidate-1-string', sdpMid: '0', sdpMLineIndex: 0 },
          'candidate-2': { candidate: 'candidate-2-string', sdpMid: '0', sdpMLineIndex: 0 },
        }),
      });

      // Should only call once for the new candidate
      expect(candidateCallback).toHaveBeenCalledTimes(2);

      signaling.destroy();
    });
  });

  describe('destroy', () => {
    it('should clean up all listeners', () => {
      const signaling = createSignaling(true);

      signaling.onOffer(() => {});
      signaling.onAnswer(() => {});
      signaling.onIceCandidate(() => {});

      signaling.destroy();

      expect(mockOff).toHaveBeenCalled();
    });
  });
});

