import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase/database
const mockSet = vi.fn();
vi.mock('firebase/database', () => ({
  ref: vi.fn(() => 'mock-ref'),
  set: (...args: unknown[]) => mockSet(...args),
  onValue: vi.fn(),
  off: vi.fn(),
  onDisconnect: vi.fn(() => ({ set: vi.fn() })),
  remove: vi.fn(),
}));

// Mock firebase config
vi.mock('../config/firebase', () => ({
  rtdb: 'mock-rtdb',
}));

import { GameSyncService } from './gameSync';

describe('GameSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writeInput includes targetAngle when present (touch input)', () => {
    // Regression: guest touch controls require targetAngle to be
    // sent over RTDB so the host can process joystick movement.
    const sync = new GameSyncService('game-123', 'user-1');

    sync.writeInput({
      left: false, right: false, up: false, down: false,
      fire: false, timestamp: 1000,
      targetAngle: 1.5,
    });

    const writtenData = mockSet.mock.calls[0][1];
    expect(writtenData.targetAngle).toBe(1.5);
  });

  it('writeInput omits targetAngle for keyboard input', () => {
    const sync = new GameSyncService('game-123', 'user-1');

    sync.writeInput({
      left: true, right: false, up: true, down: false,
      fire: false, timestamp: 1000,
    });

    const writtenData = mockSet.mock.calls[0][1];
    expect(writtenData).not.toHaveProperty('targetAngle');
  });
});
