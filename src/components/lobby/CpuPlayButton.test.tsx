import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CpuPlayButton } from './CpuPlayButton';

describe('CpuPlayButton', () => {
  it('renders Play vs CPU heading', () => {
    render(<CpuPlayButton onStartCpuGame={() => {}} />);
    expect(screen.getByText('Play vs CPU')).toBeInTheDocument();
  });

  it('renders bot count buttons for 1, 2, and 3', () => {
    render(<CpuPlayButton onStartCpuGame={() => {}} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('starts with 1 bot selected by default', () => {
    render(<CpuPlayButton onStartCpuGame={() => {}} />);
    const btn1 = screen.getByText('1');
    expect(btn1.className).toContain('selected');
  });

  it('calls onStartCpuGame with 1 difficulty for 1 bot', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<CpuPlayButton onStartCpuGame={onStart} />);

    await user.click(screen.getByText('Start Game'));
    expect(onStart).toHaveBeenCalledWith(['easy']);
  });

  it('calls onStartCpuGame with 2 difficulties for 2 bots', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<CpuPlayButton onStartCpuGame={onStart} />);

    await user.click(screen.getByText('2'));
    await user.click(screen.getByText('Start Game'));
    expect(onStart).toHaveBeenCalledWith(['easy', 'hard']);
  });

  it('calls onStartCpuGame with 3 difficulties for 3 bots', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<CpuPlayButton onStartCpuGame={onStart} />);

    await user.click(screen.getByText('3'));
    await user.click(screen.getByText('Start Game'));
    expect(onStart).toHaveBeenCalledWith(['easy', 'hard', 'offensive']);
  });

  it('shows Bot labels when multiple bots selected', async () => {
    const user = userEvent.setup();
    render(<CpuPlayButton onStartCpuGame={() => {}} />);

    // 1 bot — no labels
    expect(screen.queryByText('Bot 1:')).not.toBeInTheDocument();

    // 2 bots — Bot 1 and Bot 2
    await user.click(screen.getByText('2'));
    expect(screen.getByText('Bot 1:')).toBeInTheDocument();
    expect(screen.getByText('Bot 2:')).toBeInTheDocument();

    // 3 bots — Bot 1, 2, and 3
    await user.click(screen.getByText('3'));
    expect(screen.getByText('Bot 1:')).toBeInTheDocument();
    expect(screen.getByText('Bot 2:')).toBeInTheDocument();
    expect(screen.getByText('Bot 3:')).toBeInTheDocument();
  });

  it('allows changing Bot 3 difficulty', async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    render(<CpuPlayButton onStartCpuGame={onStart} />);

    await user.click(screen.getByText('3'));

    // Bot 3 defaults to Offensive; change to Defensive
    // There are multiple "Defensive" buttons (one per bot row), get the last one (Bot 3)
    const defensiveButtons = screen.getAllByText('Defensive');
    await user.click(defensiveButtons[defensiveButtons.length - 1]);

    await user.click(screen.getByText('Start Game'));
    expect(onStart).toHaveBeenCalledWith(['easy', 'hard', 'defensive']);
  });

  it('hides Bot 3 row when switching from 3 to 2 bots', async () => {
    const user = userEvent.setup();
    render(<CpuPlayButton onStartCpuGame={() => {}} />);

    await user.click(screen.getByText('3'));
    expect(screen.getByText('Bot 3:')).toBeInTheDocument();

    await user.click(screen.getByText('2'));
    expect(screen.queryByText('Bot 3:')).not.toBeInTheDocument();
  });
});
