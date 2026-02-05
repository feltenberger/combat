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
    expect(screen.queryByText(/same color/)).not.toBeInTheDocument();
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

    expect(screen.getByText(/same color/)).toBeInTheDocument();
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
});
