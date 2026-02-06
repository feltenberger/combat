import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { PlayerInput, GameState, MatchPhase } from '../types/game';
import { ConnectionState, TransportType } from './NetworkTransport';

// Track mock transport instances
interface MockTransportInstance {
  state: ConnectionState;
  transportType: TransportType;
  sendInput: Mock;
  sendState: Mock;
  onInput: Mock;
  onState: Mock;
  onStateChange: Mock;
  destroy: Mock;
  pause?: Mock;
  resume?: Mock;
  _triggerStateChange: (state: ConnectionState, type: TransportType) => void;
  _triggerInput: (input: PlayerInput) => void;
  _triggerState: (state: GameState) => void;
}

const webrtcInstances: MockTransportInstance[] = [];
const firebaseInstances: MockTransportInstance[] = [];

function createMockTransport(type: TransportType): MockTransportInstance {
  const stateChangeCallbacks: ((state: ConnectionState, type: TransportType) => void)[] = [];
  const inputCallbacks: ((input: PlayerInput) => void)[] = [];
  const stateCallbacks: ((state: GameState) => void)[] = [];

  const instance: MockTransportInstance = {
    state: 'connecting' as ConnectionState,
    transportType: type,
    sendInput: vi.fn(),
    sendState: vi.fn(),
    onInput: vi.fn((cb: (i: PlayerInput) => void) => inputCallbacks.push(cb)),
    onState: vi.fn((cb: (s: GameState) => void) => stateCallbacks.push(cb)),
    onStateChange: vi.fn((cb: (s: ConnectionState, t: TransportType) => void) => stateChangeCallbacks.push(cb)),
    destroy: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    _triggerStateChange: (state: ConnectionState, t: TransportType) => {
      instance.state = state;
      stateChangeCallbacks.forEach(cb => cb(state, t));
    },
    _triggerInput: (input: PlayerInput) => {
      inputCallbacks.forEach(cb => cb(input));
    },
    _triggerState: (state: GameState) => {
      stateCallbacks.forEach(cb => cb(state));
    },
  };

  return instance;
}

vi.mock('./WebRTCTransport', () => ({
  WebRTCTransport: class MockWebRTCTransport {
    private _instance: MockTransportInstance;
    transportType: TransportType = 'p2p';

    constructor() {
      this._instance = createMockTransport('p2p');
      webrtcInstances.push(this._instance);
    }

    get state() { return this._instance.state; }
    sendInput(input: PlayerInput) { this._instance.sendInput(input); }
    sendState(state: GameState) { this._instance.sendState(state); }
    onInput(cb: (i: PlayerInput) => void) { this._instance.onInput(cb); }
    onState(cb: (s: GameState) => void) { this._instance.onState(cb); }
    onStateChange(cb: (s: ConnectionState, t: TransportType) => void) { this._instance.onStateChange(cb); }
    destroy() { this._instance.destroy(); }
  },
}));

vi.mock('./FirebaseTransport', () => ({
  FirebaseTransport: class MockFirebaseTransport {
    private _instance: MockTransportInstance;
    transportType: TransportType = 'relay';

    constructor() {
      this._instance = createMockTransport('relay');
      firebaseInstances.push(this._instance);
    }

    get state() { return this._instance.state; }
    sendInput(input: PlayerInput) { this._instance.sendInput(input); }
    sendState(state: GameState) { this._instance.sendState(state); }
    onInput(cb: (i: PlayerInput) => void) { this._instance.onInput(cb); }
    onState(cb: (s: GameState) => void) { this._instance.onState(cb); }
    onStateChange(cb: (s: ConnectionState, t: TransportType) => void) { this._instance.onStateChange(cb); }
    destroy() { this._instance.destroy(); }
    pause() { this._instance.pause!(); }
    resume() { this._instance.resume!(); }
  },
}));

import { HybridTransport } from './HybridTransport';

function getLatestWebRTC(): MockTransportInstance {
  return webrtcInstances[webrtcInstances.length - 1];
}

function getLatestFirebase(): MockTransportInstance {
  return firebaseInstances[firebaseInstances.length - 1];
}

describe('HybridTransport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    webrtcInstances.length = 0;
    firebaseInstances.length = 0;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  const createConfig = (isHost: boolean) => ({
    gameId: 'test-game-123',
    localUid: 'local-user',
    remoteUid: 'remote-user',
    isHost,
  });

  describe('initialization', () => {
    it('should create both WebRTC and Firebase transports', () => {
      const transport = new HybridTransport(createConfig(true));

      expect(webrtcInstances).toHaveLength(1);
      expect(firebaseInstances).toHaveLength(1);

      transport.destroy();
    });

    it('should start in connecting state', () => {
      const transport = new HybridTransport(createConfig(true));

      expect(transport.state).toBe('connecting');

      transport.destroy();
    });
  });

  describe('WebRTC success path', () => {
    it('should use P2P when WebRTC connects within timeout', () => {
      const transport = new HybridTransport(createConfig(true));
      const webrtc = getLatestWebRTC();
      const firebase = getLatestFirebase();

      // Simulate WebRTC connecting successfully
      webrtc._triggerStateChange('connected', 'p2p');

      expect(transport.state).toBe('connected');
      expect(transport.transportType).toBe('p2p');
      expect(firebase.pause).toHaveBeenCalled();

      transport.destroy();
    });

    it('should forward input via WebRTC when connected', () => {
      const transport = new HybridTransport(createConfig(true));
      const webrtc = getLatestWebRTC();

      // Simulate WebRTC connecting
      webrtc._triggerStateChange('connected', 'p2p');

      const input: PlayerInput = {
        left: true,
        right: false,
        up: false,
        down: false,
        fire: false,
        timestamp: 1000,
      };

      transport.sendInput(input);

      expect(webrtc.sendInput).toHaveBeenCalledWith(input);

      transport.destroy();
    });

    it('should forward state via WebRTC when connected', () => {
      const transport = new HybridTransport(createConfig(true));
      const webrtc = getLatestWebRTC();

      webrtc._triggerStateChange('connected', 'p2p');

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

      expect(webrtc.sendState).toHaveBeenCalledWith(state);

      transport.destroy();
    });

    it('should receive input from WebRTC', () => {
      const transport = new HybridTransport(createConfig(true));
      const webrtc = getLatestWebRTC();
      const inputCallback = vi.fn();

      transport.onInput(inputCallback);
      webrtc._triggerStateChange('connected', 'p2p');

      const input: PlayerInput = {
        left: true,
        right: false,
        up: false,
        down: false,
        fire: true,
        timestamp: 2000,
      };

      webrtc._triggerInput(input);

      expect(inputCallback).toHaveBeenCalledWith(input);

      transport.destroy();
    });
  });

  describe('timeout fallback', () => {
    it('should fall back to Firebase after timeout', () => {
      const transport = new HybridTransport(createConfig(true));
      const firebase = getLatestFirebase();

      // Advance timer past the timeout
      vi.advanceTimersByTime(5001);

      // Simulate Firebase being connected
      firebase._triggerStateChange('connected', 'relay');

      expect(transport.state).toBe('connected');
      expect(transport.transportType).toBe('relay');

      transport.destroy();
    });

    it('should forward input via Firebase when in relay mode', () => {
      const transport = new HybridTransport(createConfig(true));
      const firebase = getLatestFirebase();

      // Timeout and fall back
      vi.advanceTimersByTime(5001);
      firebase._triggerStateChange('connected', 'relay');

      const input: PlayerInput = {
        left: false,
        right: true,
        up: false,
        down: false,
        fire: false,
        timestamp: 1000,
      };

      transport.sendInput(input);

      expect(firebase.sendInput).toHaveBeenCalledWith(input);

      transport.destroy();
    });
  });

  describe('WebRTC failure fallback', () => {
    it('should fall back to Firebase when WebRTC fails', () => {
      const transport = new HybridTransport(createConfig(true));
      const webrtc = getLatestWebRTC();
      const firebase = getLatestFirebase();

      // Simulate WebRTC failure
      webrtc._triggerStateChange('failed', 'p2p');

      // Firebase should resume
      expect(firebase.resume).toHaveBeenCalled();

      // Simulate Firebase being connected
      firebase._triggerStateChange('connected', 'relay');

      expect(transport.state).toBe('connected');
      expect(transport.transportType).toBe('relay');

      transport.destroy();
    });

    it('should fall back to Firebase when P2P disconnects mid-game', () => {
      const transport = new HybridTransport(createConfig(true));
      const webrtc = getLatestWebRTC();
      const firebase = getLatestFirebase();
      const stateChangeCallback = vi.fn();

      transport.onStateChange(stateChangeCallback);

      // P2P connects successfully
      webrtc._triggerStateChange('connected', 'p2p');
      expect(transport.transportType).toBe('p2p');
      stateChangeCallback.mockClear();

      // P2P disconnects mid-game
      webrtc._triggerStateChange('disconnected', 'p2p');

      // Should resume Firebase
      expect(firebase.resume).toHaveBeenCalled();

      // Firebase takes over
      firebase._triggerStateChange('connected', 'relay');

      expect(transport.transportType).toBe('relay');
      expect(stateChangeCallback).toHaveBeenCalledWith('connected', 'relay');

      transport.destroy();
    });
  });

  describe('state change notifications', () => {
    it('should notify on P2P connection', () => {
      const transport = new HybridTransport(createConfig(true));
      const webrtc = getLatestWebRTC();
      const callback = vi.fn();

      transport.onStateChange(callback);
      webrtc._triggerStateChange('connected', 'p2p');

      expect(callback).toHaveBeenCalledWith('connected', 'p2p');

      transport.destroy();
    });

    it('should notify on relay fallback', () => {
      const transport = new HybridTransport(createConfig(true));
      const firebase = getLatestFirebase();
      const callback = vi.fn();

      transport.onStateChange(callback);

      // Timeout
      vi.advanceTimersByTime(5001);
      firebase._triggerStateChange('connected', 'relay');

      expect(callback).toHaveBeenCalledWith('connected', 'relay');

      transport.destroy();
    });
  });

  describe('destroy', () => {
    it('should destroy both transports', () => {
      const transport = new HybridTransport(createConfig(true));
      const webrtc = getLatestWebRTC();
      const firebase = getLatestFirebase();

      transport.destroy();

      expect(webrtc.destroy).toHaveBeenCalled();
      expect(firebase.destroy).toHaveBeenCalled();
    });

    it('should clear timeout on destroy', () => {
      const transport = new HybridTransport(createConfig(true));

      transport.destroy();

      // Advance timer - should not cause any issues
      vi.advanceTimersByTime(10000);

      // No errors expected
    });
  });
});
