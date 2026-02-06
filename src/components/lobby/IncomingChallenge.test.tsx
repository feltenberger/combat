import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncomingChallenge } from './IncomingChallenge';
import { ChallengeData } from '../../types/firebase';

vi.mock('../../engine/Arena', () => ({
  ARENAS: [
    { name: 'Open Field' },
    { name: 'The Maze' },
  ],
}));

function makeChallenge(overrides: Partial<ChallengeData> = {}): ChallengeData {
  return {
    from: 'uid-host',
    fromName: 'HostPlayer',
    to: 'uid-guest',
    toName: 'GuestPlayer',
    status: 'pending',
    arenaIndex: 0,
    fromColor: 'red',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('IncomingChallenge', () => {
  it('shows standard accept/decline when no color clash', () => {
    render(
      <IncomingChallenge
        challenge={makeChallenge({ fromColor: 'red' })}
        myColor="blue"
        onAccept={() => {}}
        onReject={() => {}}
      />
    );

    expect(screen.getByText(/HostPlayer/)).toBeInTheDocument();
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
    // No clash picker
    expect(screen.queryByText(/color is taken/)).not.toBeInTheDocument();
  });

  it('shows color picker with clashing color disabled on color clash', () => {
    render(
      <IncomingChallenge
        challenge={makeChallenge({ fromColor: 'blue' })}
        myColor="blue"
        onAccept={() => {}}
        onReject={() => {}}
      />
    );

    expect(screen.getByText(/color is taken/)).toBeInTheDocument();
    // The challenger's color (blue) should be disabled
    expect(screen.getByLabelText('Blue')).toBeDisabled();
    // Other colors should be enabled
    expect(screen.getByLabelText('Red')).not.toBeDisabled();
  });

  it('calls onAccept with myColor when no clash', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();

    render(
      <IncomingChallenge
        challenge={makeChallenge({ fromColor: 'red' })}
        myColor="blue"
        onAccept={onAccept}
        onReject={() => {}}
      />
    );

    await user.click(screen.getByText('Accept'));
    expect(onAccept).toHaveBeenCalledWith('blue');
  });

  it('shows arena name and rounds to win', () => {
    render(
      <IncomingChallenge
        challenge={makeChallenge({ arenaIndex: 1, roundsToWin: 3 })}
        myColor="blue"
        onAccept={() => {}}
        onReject={() => {}}
      />
    );

    expect(screen.getByText('The Maze')).toBeInTheDocument();
    expect(screen.getByText('First to 3')).toBeInTheDocument();
  });

  it('defaults rounds to win to 2 when not specified', () => {
    render(
      <IncomingChallenge
        challenge={makeChallenge()}
        myColor="blue"
        onAccept={() => {}}
        onReject={() => {}}
      />
    );

    expect(screen.getByText('First to 2')).toBeInTheDocument();
  });

  it('shows fire rate label', () => {
    render(
      <IncomingChallenge
        challenge={makeChallenge({ fireRate: 0 })}
        myColor="blue"
        onAccept={() => {}}
        onReject={() => {}}
      />
    );

    expect(screen.getByText('Rapid fire')).toBeInTheDocument();
  });

  it('calls onAccept with resolved color when clash', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();

    render(
      <IncomingChallenge
        challenge={makeChallenge({ fromColor: 'blue' })}
        myColor="blue"
        onAccept={onAccept}
        onReject={() => {}}
      />
    );

    // Pick green to resolve
    await user.click(screen.getByLabelText('Green'));
    await user.click(screen.getByText('Accept'));
    expect(onAccept).toHaveBeenCalledWith('green');
  });

  // New tests for CPU opponents
  describe('with CPU opponents', () => {
    const cpuPlayers = [
      { difficulty: 'easy' as const, uid: 'cpu-bot-easy', name: 'CPU (Easy)', color: 'green' as const },
    ];

    it('shows CPU opponents section when cpuPlayers present', () => {
      render(
        <IncomingChallenge
          challenge={makeChallenge({ cpuPlayers })}
          myColor="blue"
          onAccept={() => {}}
          onReject={() => {}}
        />
      );

      expect(screen.getByText('CPU opponents included:')).toBeInTheDocument();
      expect(screen.getByText('CPU (Easy)')).toBeInTheDocument();
    });

    it('does not show CPU section when no cpuPlayers', () => {
      render(
        <IncomingChallenge
          challenge={makeChallenge()}
          myColor="blue"
          onAccept={() => {}}
          onReject={() => {}}
        />
      );

      expect(screen.queryByText('CPU opponents included:')).not.toBeInTheDocument();
    });

    it('disables CPU colors in color picker on clash', () => {
      // Host is red, CPU is green, my color is red => clash
      render(
        <IncomingChallenge
          challenge={makeChallenge({ fromColor: 'red', cpuPlayers })}
          myColor="red"
          onAccept={() => {}}
          onReject={() => {}}
        />
      );

      // Red (host) and Green (CPU) should be disabled
      expect(screen.getByLabelText('Red')).toBeDisabled();
      expect(screen.getByLabelText('Green')).toBeDisabled();
      // Blue and Camo should be available
      expect(screen.getByLabelText('Blue')).not.toBeDisabled();
      expect(screen.getByLabelText('Camo')).not.toBeDisabled();
    });

    it('shows clash picker when myColor matches a CPU color', () => {
      // Host is red, CPU is green, my color is green => clash with CPU
      render(
        <IncomingChallenge
          challenge={makeChallenge({ fromColor: 'red', cpuPlayers })}
          myColor="green"
          onAccept={() => {}}
          onReject={() => {}}
        />
      );

      expect(screen.getByText(/color is taken/)).toBeInTheDocument();
      expect(screen.getByLabelText('Green')).toBeDisabled();
      expect(screen.getByLabelText('Red')).toBeDisabled();
    });

    it('shows multiple CPU opponents', () => {
      const twoCpus = [
        { difficulty: 'easy' as const, uid: 'cpu-bot-easy', name: 'CPU (Easy) #1', color: 'green' as const },
        { difficulty: 'hard' as const, uid: 'cpu-bot-hard-1', name: 'CPU (Hard) #2', color: 'camo' as const },
      ];

      render(
        <IncomingChallenge
          challenge={makeChallenge({ cpuPlayers: twoCpus })}
          myColor="blue"
          onAccept={() => {}}
          onReject={() => {}}
        />
      );

      expect(screen.getByText('CPU (Easy) #1')).toBeInTheDocument();
      expect(screen.getByText('CPU (Hard) #2')).toBeInTheDocument();
    });
  });
});
