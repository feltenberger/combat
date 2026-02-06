import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlayerInput, GameState, MatchPhase } from '../types/game';

// Store mock signaling instances for access in tests
const signalingInstances: MockSignalingInstance[] = [];

interface MockSignalingInstance {
  sendOffer: ReturnType<typeof vi.fn>;
  sendAnswer: ReturnType<typeof vi.fn>;
  sendIceCandidate: ReturnType<typeof vi.fn>;
  onOffer: ReturnType<typeof vi.fn>;
  onAnswer: ReturnType<typeof vi.fn>;
  onIceCandidate: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

vi.mock('./WebRTCSignaling', () => {
  return {
    WebRTCSignaling: class {
      sendOffer = vi.fn().mockResolvedValue(undefined);
      sendAnswer = vi.fn().mockResolvedValue(undefined);
      sendIceCandidate = vi.fn().mockResolvedValue(undefined);
      onOffer = vi.fn();
      onAnswer = vi.fn();
      onIceCandidate = vi.fn();
      destroy = vi.fn();

      constructor() {
        signalingInstances.push(this as unknown as MockSignalingInstance);
      }
    },
  };
});

function getLatestSignaling(): MockSignalingInstance {
  return signalingInstances[signalingInstances.length - 1];
}

// Mock RTCPeerConnection and RTCDataChannel
class MockRTCDataChannel {
  readyState = 'connecting';
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((event: { error: Error }) => void) | null = null;
  send = vi.fn();
  close = vi.fn();
}

class MockRTCPeerConnection {
  localDescription: RTCSessionDescriptionInit | null = null;
  remoteDescription: RTCSessionDescriptionInit | null = null;
  iceConnectionState = 'new';
  connectionState = 'new';
  onicecandidate: ((event: { candidate: RTCIceCandidate | null }) => void) | null = null;
  oniceconnectionstatechange: (() => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  ondatachannel: ((event: { channel: MockRTCDataChannel }) => void) | null = null;

  dataChannel: MockRTCDataChannel | null = null;

  createDataChannel = vi.fn(() => {
    this.dataChannel = new MockRTCDataChannel();
    return this.dataChannel;
  });

  createOffer = vi.fn(async () => ({ type: 'offer', sdp: 'mock-offer-sdp' }));
  createAnswer = vi.fn(async () => ({ type: 'answer', sdp: 'mock-answer-sdp' }));

  setLocalDescription = vi.fn(async (desc: RTCSessionDescriptionInit) => {
    this.localDescription = desc;
  });

  setRemoteDescription = vi.fn(async (desc: RTCSessionDescriptionInit) => {
    this.remoteDescription = desc;
  });

  addIceCandidate = vi.fn();
  close = vi.fn();
}

let mockPeerConnection: MockRTCPeerConnection;

vi.stubGlobal('RTCPeerConnection', function() {
  mockPeerConnection = new MockRTCPeerConnection();
  return mockPeerConnection;
});

vi.stubGlobal('RTCSessionDescription', function(desc: RTCSessionDescriptionInit) {
  return desc;
});

vi.stubGlobal('RTCIceCandidate', function(candidate: RTCIceCandidateInit) {
  return candidate;
});

import { WebRTCTransport } from './WebRTCTransport';

describe('WebRTCTransport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signalingInstances.length = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createConfig = (isHost: boolean) => ({
    gameId: 'test-game-123',
    localUid: 'local-user',
    remoteUid: 'remote-user',
    isHost,
  });

  describe('initialization', () => {
    it('should have p2p transport type', () => {
      const transport = new WebRTCTransport(createConfig(true));
      expect(transport.transportType).toBe('p2p');
      transport.destroy();
    });

    it('should start in connecting state', () => {
      const transport = new WebRTCTransport(createConfig(true));
      expect(transport.state).toBe('connecting');
      transport.destroy();
    });
  });

  describe('host flow', () => {
    it('host should create data channel and offer', async () => {
      const transport = new WebRTCTransport(createConfig(true));
      const signaling = getLatestSignaling();

      // Wait for async initialization
      await vi.waitFor(() => {
        expect(mockPeerConnection.createDataChannel).toHaveBeenCalledWith('game-data');
        expect(mockPeerConnection.createOffer).toHaveBeenCalled();
        expect(mockPeerConnection.setLocalDescription).toHaveBeenCalled();
        expect(signaling.sendOffer).toHaveBeenCalled();
      });

      transport.destroy();
    });

    it('host should handle ICE candidates', async () => {
      const transport = new WebRTCTransport(createConfig(true));
      const signaling = getLatestSignaling();

      await vi.waitFor(() => {
        expect(mockPeerConnection.onicecandidate).toBeDefined();
      });

      // Simulate ICE candidate
      mockPeerConnection.onicecandidate!({
        candidate: { candidate: 'mock-candidate', toJSON: () => ({ candidate: 'mock-candidate' }) } as RTCIceCandidate,
      });

      expect(signaling.sendIceCandidate).toHaveBeenCalled();

      transport.destroy();
    });

    it('host should set remote description when answer received', async () => {
      const transport = new WebRTCTransport(createConfig(true));
      const signaling = getLatestSignaling();

      await vi.waitFor(() => {
        expect(signaling.onAnswer).toHaveBeenCalled();
      });

      // Simulate answer from signaling
      const answerCallback = signaling.onAnswer.mock.calls[0][0];
      answerCallback({ type: 'answer', sdp: 'remote-answer-sdp' });

      await vi.waitFor(() => {
        expect(mockPeerConnection.setRemoteDescription).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'answer', sdp: 'remote-answer-sdp' })
        );
      });

      transport.destroy();
    });
  });

  describe('guest flow', () => {
    it('guest should wait for offer and create answer', async () => {
      const transport = new WebRTCTransport(createConfig(false));
      const signaling = getLatestSignaling();

      await vi.waitFor(() => {
        expect(signaling.onOffer).toHaveBeenCalled();
      });

      // Simulate offer from host
      const offerCallback = signaling.onOffer.mock.calls[0][0];
      offerCallback({ type: 'offer', sdp: 'remote-offer-sdp' });

      await vi.waitFor(() => {
        expect(mockPeerConnection.setRemoteDescription).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'offer', sdp: 'remote-offer-sdp' })
        );
        expect(mockPeerConnection.createAnswer).toHaveBeenCalled();
        expect(signaling.sendAnswer).toHaveBeenCalled();
      });

      transport.destroy();
    });

    it('guest should receive data channel from host', async () => {
      const transport = new WebRTCTransport(createConfig(false));

      await vi.waitFor(() => {
        expect(mockPeerConnection.ondatachannel).toBeDefined();
      });

      // Simulate data channel event
      const mockChannel = new MockRTCDataChannel();
      mockPeerConnection.ondatachannel!({ channel: mockChannel });

      // Simulate channel opening
      mockChannel.readyState = 'open';
      mockChannel.onopen!();

      expect(transport.state).toBe('connected');

      transport.destroy();
    });
  });

  describe('data channel messaging', () => {
    it('should send input messages when connected', async () => {
      const transport = new WebRTCTransport(createConfig(true));

      // Setup connected state
      await vi.waitFor(() => {
        expect(mockPeerConnection.dataChannel).toBeDefined();
      });

      const channel = mockPeerConnection.dataChannel!;
      channel.readyState = 'open';
      channel.onopen!();

      const input: PlayerInput = {
        left: true,
        right: false,
        up: true,
        down: false,
        fire: false,
        timestamp: 1000,
      };

      transport.sendInput(input);

      expect(channel.send).toHaveBeenCalled();
      const sentData = JSON.parse(channel.send.mock.calls[0][0]);
      expect(sentData.type).toBe('input');
      expect(sentData.data.left).toBe(true);

      transport.destroy();
    });

    it('should send state messages when connected', async () => {
      const transport = new WebRTCTransport(createConfig(true));

      await vi.waitFor(() => {
        expect(mockPeerConnection.dataChannel).toBeDefined();
      });

      const channel = mockPeerConnection.dataChannel!;
      channel.readyState = 'open';
      channel.onopen!();

      const state: GameState = {
        phase: 'PLAYING' as MatchPhase,
        tanks: {},
        bullets: [],
        rockHP: {},
        scores: {},
        round: 1,
        countdown: 0,
        roundResult: null,
        matchWinner: null,
        timestamp: 1000,
      };

      transport.sendState(state);

      expect(channel.send).toHaveBeenCalled();
      const sentData = JSON.parse(channel.send.mock.calls[0][0]);
      expect(sentData.type).toBe('state');
      expect(sentData.data.phase).toBe('PLAYING');

      transport.destroy();
    });

    it('should receive and dispatch input messages', async () => {
      const transport = new WebRTCTransport(createConfig(true));
      const inputCallback = vi.fn();
      transport.onInput(inputCallback);

      await vi.waitFor(() => {
        expect(mockPeerConnection.dataChannel).toBeDefined();
      });

      const channel = mockPeerConnection.dataChannel!;
      channel.readyState = 'open';
      channel.onopen!();

      // Simulate receiving message
      const inputMessage = {
        type: 'input',
        data: { left: true, right: false, up: false, down: false, fire: true, timestamp: 2000 },
      };
      channel.onmessage!({ data: JSON.stringify(inputMessage) });

      expect(inputCallback).toHaveBeenCalledWith(
        expect.objectContaining({ left: true, fire: true })
      );

      transport.destroy();
    });

    it('should receive and dispatch state messages', async () => {
      const transport = new WebRTCTransport(createConfig(false));
      const stateCallback = vi.fn();
      transport.onState(stateCallback);

      // Simulate data channel from host
      await vi.waitFor(() => {
        expect(mockPeerConnection.ondatachannel).toBeDefined();
      });

      const mockChannel = new MockRTCDataChannel();
      mockPeerConnection.ondatachannel!({ channel: mockChannel });
      mockChannel.readyState = 'open';
      mockChannel.onopen!();

      // Simulate receiving state message
      const stateMessage = {
        type: 'state',
        data: {
          phase: 'PLAYING',
          tanks: {},
          bullets: [],
          rockHP: {},
          scores: {},
          round: 1,
          countdown: 0,
          roundResult: null,
          matchWinner: null,
          timestamp: 1000,
        },
      };
      mockChannel.onmessage!({ data: JSON.stringify(stateMessage) });

      expect(stateCallback).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'PLAYING' })
      );

      transport.destroy();
    });

    it('should not send when not connected', () => {
      const transport = new WebRTCTransport(createConfig(true));

      const input: PlayerInput = {
        left: true,
        right: false,
        up: false,
        down: false,
        fire: false,
        timestamp: 1000,
      };

      transport.sendInput(input);

      // Channel not open yet, shouldn't send
      expect(mockPeerConnection.dataChannel?.send).not.toHaveBeenCalled();

      transport.destroy();
    });
  });

  describe('connection state changes', () => {
    it('should transition to failed on ICE failure', async () => {
      const transport = new WebRTCTransport(createConfig(true));
      const stateChangeCallback = vi.fn();
      transport.onStateChange(stateChangeCallback);

      await vi.waitFor(() => {
        expect(mockPeerConnection.oniceconnectionstatechange).toBeDefined();
      });

      // Simulate ICE failure
      mockPeerConnection.iceConnectionState = 'failed';
      mockPeerConnection.oniceconnectionstatechange!();

      expect(transport.state).toBe('failed');
      expect(stateChangeCallback).toHaveBeenCalledWith('failed', 'p2p');

      transport.destroy();
    });

    it('should transition to disconnected on channel close', async () => {
      const transport = new WebRTCTransport(createConfig(true));
      const stateChangeCallback = vi.fn();
      transport.onStateChange(stateChangeCallback);

      await vi.waitFor(() => {
        expect(mockPeerConnection.dataChannel).toBeDefined();
      });

      const channel = mockPeerConnection.dataChannel!;
      channel.readyState = 'open';
      channel.onopen!();

      // Clear the mock to test close callback
      stateChangeCallback.mockClear();

      // Simulate channel close
      channel.readyState = 'closed';
      channel.onclose!();

      expect(transport.state).toBe('disconnected');
      expect(stateChangeCallback).toHaveBeenCalledWith('disconnected', 'p2p');

      transport.destroy();
    });
  });

  describe('destroy', () => {
    it('should clean up resources', async () => {
      const transport = new WebRTCTransport(createConfig(true));
      const signaling = getLatestSignaling();

      await vi.waitFor(() => {
        expect(mockPeerConnection.dataChannel).toBeDefined();
      });

      transport.destroy();

      expect(mockPeerConnection.dataChannel!.close).toHaveBeenCalled();
      expect(mockPeerConnection.close).toHaveBeenCalled();
      expect(signaling.destroy).toHaveBeenCalled();
      expect(transport.state).toBe('disconnected');
    });
  });
});
