import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ gameId: 'test-game' }),
  useNavigate: () => mockNavigate,
}));

// Mock Firebase services
vi.mock('../../firebase/gameSync', () => ({
  GameSyncService: class {
    setupDisconnect = vi.fn();
    listenToConfig = vi.fn();
    listenToInput = vi.fn();
    listenToState = vi.fn();
    listenToPresence = vi.fn();
    listenToStatus = vi.fn();
    writeInput = vi.fn();
    writeState = vi.fn();
    finishGame = vi.fn();
    cleanup = vi.fn();
  },
}));

vi.mock('../../firebase/matchHistory', () => ({
  saveMatchResult: vi.fn(),
}));

vi.mock('../../hooks/useGameLoop', () => ({
  useGameLoop: vi.fn(),
}));

import { GamePage } from './GamePage';

describe('GamePage fullscreen', () => {
  let originalOntouchstart: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate touch device
    originalOntouchstart = Object.getOwnPropertyDescriptor(window, 'ontouchstart');
    Object.defineProperty(window, 'ontouchstart', { value: true, configurable: true });
  });

  afterEach(() => {
    if (originalOntouchstart) {
      Object.defineProperty(window, 'ontouchstart', originalOntouchstart);
    } else {
      delete (window as unknown as Record<string, unknown>).ontouchstart;
    }
  });

  it('renders touch controls and fullscreen button on touch devices', () => {
    const { container } = render(<GamePage uid="test-uid" />);

    expect(container.querySelector('.touch-controls')).toBeInTheDocument();
    expect(screen.getByText('Fullscreen')).toBeInTheDocument();
    expect(screen.getByText('FIRE')).toBeInTheDocument();
  });

  it('fullscreen targets game-page element, not document.documentElement', () => {
    // Regression test: fullscreening document.documentElement breaks
    // position:fixed touch controls on mobile browsers.
    const { container } = render(<GamePage uid="test-uid" />);

    const gamePage = container.querySelector('.game-page') as HTMLElement;
    const gamePageFullscreen = vi.fn().mockResolvedValue(undefined);
    gamePage.requestFullscreen = gamePageFullscreen;

    const docFullscreen = vi.fn().mockResolvedValue(undefined);
    document.documentElement.requestFullscreen = docFullscreen;

    fireEvent.click(screen.getByText('Fullscreen'));

    expect(gamePageFullscreen).toHaveBeenCalled();
    expect(docFullscreen).not.toHaveBeenCalled();
  });
});
