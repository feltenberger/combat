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

  it('renders Fire Rate slider when settings is open', async () => {
    const user = userEvent.setup();
    localStorage.setItem('combat-name', 'TestPlayer');
    render(<LobbyPage uid="test-uid" />);
    await user.click(screen.getByText(/Settings/));
    expect(screen.getByText('Fire Rate')).toBeInTheDocument();
    expect(screen.getAllByRole('slider').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Rounds to Win selector when settings is open', async () => {
    const user = userEvent.setup();
    localStorage.setItem('combat-name', 'TestPlayer');
    render(<LobbyPage uid="test-uid" />);
    await user.click(screen.getByText(/Settings/));
    expect(screen.getByText('Rounds to Win')).toBeInTheDocument();
  });

  it('settings panel is collapsed by default', () => {
    localStorage.setItem('combat-name', 'TestPlayer');
    render(<LobbyPage uid="test-uid" />);
    expect(screen.getByText(/Settings/)).toBeInTheDocument();
    expect(screen.queryByText('Tank Color')).not.toBeInTheDocument();
    expect(screen.queryByText('Sound Effects')).not.toBeInTheDocument();
    expect(screen.queryByText('Music')).not.toBeInTheDocument();
  });

  it('clicking Settings reveals all settings including volume controls', async () => {
    const user = userEvent.setup();
    localStorage.setItem('combat-name', 'TestPlayer');
    render(<LobbyPage uid="test-uid" />);
    await user.click(screen.getByText(/Settings/));

    expect(screen.getByText('Tank Color')).toBeInTheDocument();
    expect(screen.getByText('Fire Rate')).toBeInTheDocument();
    expect(screen.getByText('Rounds to Win')).toBeInTheDocument();
    expect(screen.getByText('Sound Effects')).toBeInTheDocument();
    expect(screen.getByText('Music')).toBeInTheDocument();
  });

  it('clicking Settings again collapses the panel', async () => {
    const user = userEvent.setup();
    localStorage.setItem('combat-name', 'TestPlayer');
    render(<LobbyPage uid="test-uid" />);

    await user.click(screen.getByText(/Settings/));
    expect(screen.getByText('Sound Effects')).toBeInTheDocument();

    await user.click(screen.getByText(/Settings/));
    expect(screen.queryByText('Sound Effects')).not.toBeInTheDocument();
  });

  it('shows SFX and Music ON buttons by default', async () => {
    const user = userEvent.setup();
    localStorage.setItem('combat-name', 'TestPlayer');
    render(<LobbyPage uid="test-uid" />);
    await user.click(screen.getByText(/Settings/));

    const onButtons = screen.getAllByText('ON');
    expect(onButtons).toHaveLength(2);
  });

  it('toggling SFX mute shows OFF and persists to localStorage', async () => {
    const user = userEvent.setup();
    localStorage.setItem('combat-name', 'TestPlayer');
    render(<LobbyPage uid="test-uid" />);
    await user.click(screen.getByText(/Settings/));

    const sfxToggle = screen.getByTitle('Mute SFX');
    await user.click(sfxToggle);

    expect(sfxToggle).toHaveTextContent('OFF');
    expect(localStorage.getItem('combat-sfx-muted')).toBe('true');
  });

  it('toggling Music mute shows OFF and persists to localStorage', async () => {
    const user = userEvent.setup();
    localStorage.setItem('combat-name', 'TestPlayer');
    render(<LobbyPage uid="test-uid" />);
    await user.click(screen.getByText(/Settings/));

    const musicToggle = screen.getByTitle('Mute Music');
    await user.click(musicToggle);

    expect(musicToggle).toHaveTextContent('OFF');
    expect(localStorage.getItem('combat-music-muted')).toBe('true');
  });

  it('SFX volume slider is disabled when muted', async () => {
    const user = userEvent.setup();
    localStorage.setItem('combat-name', 'TestPlayer');
    render(<LobbyPage uid="test-uid" />);
    await user.click(screen.getByText(/Settings/));

    const sfxToggle = screen.getByTitle('Mute SFX');
    await user.click(sfxToggle);

    const sliders = screen.getAllByRole('slider');
    // The first volume slider (SFX) should be disabled
    const sfxSlider = sliders.find(s => s.closest('.volume-select')?.querySelector('h3')?.textContent === 'Sound Effects');
    expect(sfxSlider).toBeDisabled();
  });

  it('volume display shows -- when muted', async () => {
    const user = userEvent.setup();
    localStorage.setItem('combat-name', 'TestPlayer');
    render(<LobbyPage uid="test-uid" />);
    await user.click(screen.getByText(/Settings/));

    await user.click(screen.getByTitle('Mute SFX'));
    await user.click(screen.getByTitle('Mute Music'));

    const dashes = screen.getAllByText('--');
    expect(dashes).toHaveLength(2);
  });

  it('loads saved volume prefs from localStorage', async () => {
    const user = userEvent.setup();
    localStorage.setItem('combat-name', 'TestPlayer');
    localStorage.setItem('combat-sfx-volume', '30');
    localStorage.setItem('combat-music-volume', '90');
    localStorage.setItem('combat-sfx-muted', 'true');
    render(<LobbyPage uid="test-uid" />);
    await user.click(screen.getByText(/Settings/));

    // SFX is muted so shows OFF and '--'
    expect(screen.getByTitle('Unmute SFX')).toHaveTextContent('OFF');
    // Music volume is 90 and not muted
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByTitle('Mute Music')).toHaveTextContent('ON');
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
