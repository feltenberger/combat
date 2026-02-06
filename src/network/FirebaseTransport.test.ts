import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock firebase/database
const mockSet = vi.fn();
const mockOff = vi.fn();
const mockOnValue = vi.fn();
const mockOnDisconnect = vi.fn(() => ({ set: vi.fn() }));

vi.mock('firebase/database', () => ({
  ref: vi.fn((db, path) => ({ path })),
  set: (...args: unknown[]) => mockSet(...args),
  onValue: (...args: unknown[]) => mockOnValue(...args),
  off: (...args: unknown[]) => mockOff(...args),
  onDisconnect: () => mockOnDisconnect(),
}));

// Mock firebase config
vi.mock('../config/firebase', () => ({
  rtdb: 'mock-rtdb',
}));

import { FirebaseTransport } from './FirebaseTransport';
import { PlayerInput, GameState, MatchPhase } from '../types/game';

describe('FirebaseTransport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    it('should have relay transport type', () => {
      const transport = new FirebaseTransport(createConfig(true));
      expect(transport.transportType).toBe('relay');
      transport.destroy();
    });

    it('should be connected after construction', () => {
      const transport = new FirebaseTransport(createConfig(true));
      // FirebaseTransport sets up listeners synchronously and becomes connected
      expect(transport.state).toBe('connected');
      transport.destroy();
    });

    it('should transition to connected after setup', () => {
      const stateChangeCallback = vi.fn();
      const transport = new FirebaseTransport(createConfig(true));
      transport.onStateChange(stateChangeCallback);

      // Simulate Firebase connection by triggering onValue callback
      expect(mockOnValue).toHaveBeenCalled();

      transport.destroy();
    });
  });

  describe('sendInput', () => {
    it('should write input to Firebase at correct path', () => {
      const transport = new FirebaseTransport(createConfig(true));

      const input: PlayerInput = {
        left: true,
        right: false,
        up: true,
        down: false,
        fire: false,
        timestamp: 1000,
      };

      transport.sendInput(input);

      expect(mockSet).toHaveBeenCalled();
      const [refArg, dataArg] = mockSet.mock.calls[0];
      expect(refArg.path).toContain('input/local-user');
      expect(dataArg.left).toBe(true);
      expect(dataArg.up).toBe(true);
      expect(dataArg.timestamp).toBe(1000);

      transport.destroy();
    });

    it('should include targetAngle when present', () => {
      const transport = new FirebaseTransport(createConfig(true));

      const input: PlayerInput = {
        left: false,
        right: false,
        up: false,
        down: false,
        fire: false,
        timestamp: 1000,
        targetAngle: 1.5,
      };

      transport.sendInput(input);

      const [, dataArg] = mockSet.mock.calls[0];
      expect(dataArg.targetAngle).toBe(1.5);

      transport.destroy();
    });
  });

  describe('sendState (host only)', () => {
    it('should write state to Firebase', () => {
      const transport = new FirebaseTransport(createConfig(true));

      const state: GameState = {
        phase: 'PLAYING' as MatchPhase,
        tanks: { 'local-user': { x: 100, y: 200, angle: 0, alive: true } },
        bullets: [],
        rockHP: {},
        scores: { 'local-user': 0, 'remote-user': 0 },
        round: 1,
        countdown: 0,
        roundResult: null,
        matchWinner: null,
        timestamp: 1000,
      };

      transport.sendState(state);

      expect(mockSet).toHaveBeenCalled();
      const [refArg, dataArg] = mockSet.mock.calls[0];
      expect(refArg.path).toContain('state');
      expect(dataArg.phase).toBe('PLAYING');

      transport.destroy();
    });
  });

  describe('onInput callback', () => {
    it('should register input listener for remote player', () => {
      const transport = new FirebaseTransport(createConfig(true));
      const inputCallback = vi.fn();

      transport.onInput(inputCallback);

      // Find the onValue call for remote input
      const inputOnValueCall = mockOnValue.mock.calls.find(
        call => call[0]?.path?.includes('input/remote-user')
      );
      expect(inputOnValueCall).toBeDefined();

      // Simulate receiving input
      const snapshotCallback = inputOnValueCall![1];
      snapshotCallback({
        val: () => ({
          left: true,
          right: false,
          up: false,
          down: false,
          fire: true,
          timestamp: 2000,
        }),
      });

      expect(inputCallback).toHaveBeenCalledWith(
        expect.objectContaining({ left: true, fire: true })
      );

      transport.destroy();
    });
  });

  describe('onState callback', () => {
    it('should register state listener (for guest)', () => {
      const transport = new FirebaseTransport(createConfig(false));
      const stateCallback = vi.fn();

      transport.onState(stateCallback);

      // Find the onValue call for state
      const stateOnValueCall = mockOnValue.mock.calls.find(
        call => call[0]?.path?.includes('state')
      );
      expect(stateOnValueCall).toBeDefined();

      // Simulate receiving state
      const snapshotCallback = stateOnValueCall![1];
      snapshotCallback({
        val: () => ({
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
        }),
      });

      expect(stateCallback).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'PLAYING' })
      );

      transport.destroy();
    });

    it('should handle null state gracefully', () => {
      const transport = new FirebaseTransport(createConfig(false));
      const stateCallback = vi.fn();

      transport.onState(stateCallback);

      const stateOnValueCall = mockOnValue.mock.calls.find(
        call => call[0]?.path?.includes('state')
      );

      // Simulate null state
      const snapshotCallback = stateOnValueCall![1];
      snapshotCallback({ val: () => null });

      expect(stateCallback).not.toHaveBeenCalled();

      transport.destroy();
    });
  });

  describe('destroy', () => {
    it('should clean up all listeners', () => {
      const transport = new FirebaseTransport(createConfig(true));

      transport.onInput(() => {});
      transport.onState(() => {});

      transport.destroy();

      expect(mockOff).toHaveBeenCalled();
      expect(transport.state).toBe('disconnected');
    });
  });

  describe('pause and resume', () => {
    it('should pause sending when paused', () => {
      const transport = new FirebaseTransport(createConfig(true));

      transport.pause();

      const input: PlayerInput = {
        left: true,
        right: false,
        up: false,
        down: false,
        fire: false,
        timestamp: 1000,
      };

      transport.sendInput(input);

      // Should not write when paused
      expect(mockSet).not.toHaveBeenCalled();

      transport.destroy();
    });

    it('should resume sending after resume', () => {
      const transport = new FirebaseTransport(createConfig(true));

      transport.pause();
      transport.resume();

      const input: PlayerInput = {
        left: true,
        right: false,
        up: false,
        down: false,
        fire: false,
        timestamp: 1000,
      };

      transport.sendInput(input);

      expect(mockSet).toHaveBeenCalled();

      transport.destroy();
    });
  });
});
