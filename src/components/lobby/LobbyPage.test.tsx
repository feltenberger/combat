import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock Firebase hooks and services
vi.mock('../../hooks/useFirebasePresence', () => ({
  useFirebasePresence: () => ({
    players: {},
    onlinePlayers: [],
  }),
}));

vi.mock('../../firebase/lobby', () => ({
  sendChallenge: vi.fn(),
  listenToChallenge: vi.fn(() => () => {}),
  acceptChallenge: vi.fn(),
  rejectChallenge: vi.fn(),
  clearChallenge: vi.fn(),
}));

vi.mock('../../engine/Arena', () => ({
  ARENAS: [{ name: 'Test Arena', grid: [] }],
}));

import { LobbyPage } from './LobbyPage';

describe('LobbyPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('shows NameEntry when no name is set', () => {
    render(<LobbyPage uid="test-uid" />);
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
  });

  it('shows lobby with Edit button when name is set', () => {
    localStorage.setItem('combat-name', 'TestPlayer');
    render(<LobbyPage uid="test-uid" />);
    expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('clicking Edit shows NameEntry form', async () => {
    const user = userEvent.setup();
    localStorage.setItem('combat-name', 'TestPlayer');
    render(<LobbyPage uid="test-uid" />);

    await user.click(screen.getByText('Edit'));
    expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
  });

  it('submitting a new name updates the displayed name', async () => {
    const user = userEvent.setup();
    localStorage.setItem('combat-name', 'OldName');
    render(<LobbyPage uid="test-uid" />);

    // Click Edit
    await user.click(screen.getByText('Edit'));

    // Clear and type new name
    const input = screen.getByPlaceholderText('Enter your name');
    await user.clear(input);
    await user.type(input, 'NewName');
    await user.click(screen.getByText('Enter Lobby'));

    // Should show new name in lobby
    expect(screen.getByText('NewName')).toBeInTheDocument();
  });
});
