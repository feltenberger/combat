import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChallengeSetupModal } from './ChallengeSetupModal';

vi.mock('../../firebase/cpuGame', () => ({
  buildCpuPlayers: vi.fn((diffs: string[], _usedColors: Set<string>) => {
    return diffs.map((d, i) => ({
      difficulty: d,
      uid: `cpu-bot-${d}${i > 0 ? `-${i}` : ''}`,
      name: `CPU (${d})${diffs.length > 1 ? ` #${i + 1}` : ''}`,
      color: i === 0 ? 'green' : 'camo',
    }));
  }),
}));

describe('ChallengeSetupModal', () => {
  it('renders target player name', () => {
    render(
      <ChallengeSetupModal
        targetName="Alice"
        hostColor="blue"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText('Challenge Alice')).toBeInTheDocument();
  });

  it('has Send Challenge and Cancel buttons', () => {
    render(
      <ChallengeSetupModal
        targetName="Alice"
        hostColor="blue"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText('Send Challenge')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onConfirm with undefined when no CPUs added', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ChallengeSetupModal
        targetName="Alice"
        hostColor="blue"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );

    await user.click(screen.getByText('Send Challenge'));
    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });

  it('calls onConfirm with cpuPlayers when CPUs are added', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ChallengeSetupModal
        targetName="Alice"
        hostColor="blue"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );

    // Toggle CPU on
    await user.click(screen.getByLabelText('Add CPU opponents'));
    await user.click(screen.getByText('Send Challenge'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const cpuPlayers = onConfirm.mock.calls[0][0];
    expect(cpuPlayers).toBeDefined();
    expect(cpuPlayers.length).toBe(1);
    expect(cpuPlayers[0].difficulty).toBe('easy'); // default
  });

  it('calls onCancel when Cancel clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <ChallengeSetupModal
        targetName="Alice"
        hostColor="blue"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows difficulty buttons when CPU toggle is enabled', async () => {
    const user = userEvent.setup();

    render(
      <ChallengeSetupModal
        targetName="Alice"
        hostColor="blue"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    // CPU options not visible initially
    expect(screen.queryByText('Easy')).not.toBeInTheDocument();

    // Toggle CPU on
    await user.click(screen.getByLabelText('Add CPU opponents'));

    // Now difficulty buttons should appear
    expect(screen.getByText('Easy')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
  });

  it('supports adding 2 CPUs', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ChallengeSetupModal
        targetName="Alice"
        hostColor="blue"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );

    await user.click(screen.getByLabelText('Add CPU opponents'));

    // Click "2" bot count button
    await user.click(screen.getByText('2'));
    await user.click(screen.getByText('Send Challenge'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const cpuPlayers = onConfirm.mock.calls[0][0];
    expect(cpuPlayers.length).toBe(2);
  });
});
