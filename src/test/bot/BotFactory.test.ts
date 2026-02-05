import { describe, it, expect } from 'vitest';
import { createBot, getCpuUid, isCpuUid } from '../../bot/BotFactory';
import { EasyBot } from '../../bot/EasyBot';
import { DefensiveBot } from '../../bot/DefensiveBot';
import { OffensiveBot } from '../../bot/OffensiveBot';
import { HardBot } from '../../bot/HardBot';

describe('BotFactory', () => {
  describe('createBot', () => {
    it('creates EasyBot for easy difficulty', () => {
      const bot = createBot('easy');
      expect(bot).toBeInstanceOf(EasyBot);
      expect(bot.difficulty).toBe('easy');
    });

    it('creates DefensiveBot for defensive difficulty', () => {
      const bot = createBot('defensive');
      expect(bot).toBeInstanceOf(DefensiveBot);
      expect(bot.difficulty).toBe('defensive');
    });

    it('creates OffensiveBot for offensive difficulty', () => {
      const bot = createBot('offensive');
      expect(bot).toBeInstanceOf(OffensiveBot);
      expect(bot.difficulty).toBe('offensive');
    });

    it('creates HardBot for hard difficulty', () => {
      const bot = createBot('hard');
      expect(bot).toBeInstanceOf(HardBot);
      expect(bot.difficulty).toBe('hard');
    });
  });

  describe('getCpuUid', () => {
    it('returns cpu-bot-easy for easy', () => {
      expect(getCpuUid('easy')).toBe('cpu-bot-easy');
    });

    it('returns cpu-bot-defensive for defensive', () => {
      expect(getCpuUid('defensive')).toBe('cpu-bot-defensive');
    });

    it('returns cpu-bot-offensive for offensive', () => {
      expect(getCpuUid('offensive')).toBe('cpu-bot-offensive');
    });

    it('returns cpu-bot-hard for hard', () => {
      expect(getCpuUid('hard')).toBe('cpu-bot-hard');
    });
  });

  describe('isCpuUid', () => {
    it('returns true for cpu-bot- prefixed UIDs', () => {
      expect(isCpuUid('cpu-bot-easy')).toBe(true);
      expect(isCpuUid('cpu-bot-hard')).toBe(true);
      expect(isCpuUid('cpu-bot-anything')).toBe(true);
    });

    it('returns false for regular UIDs', () => {
      expect(isCpuUid('abc123')).toBe(false);
      expect(isCpuUid('user_xyz')).toBe(false);
      expect(isCpuUid('')).toBe(false);
    });

    it('returns false for partial prefix match', () => {
      expect(isCpuUid('cpu-bo')).toBe(false);
      expect(isCpuUid('cpu')).toBe(false);
    });
  });
});
