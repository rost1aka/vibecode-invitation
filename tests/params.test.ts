import { describe, expect, it } from 'vitest';
import { parseParams } from '../src/params';

const NOW = new Date('2026-09-28T12:00:00+03:00');
const q = (query: Record<string, string>) => `?${new URLSearchParams(query)}`;

describe('parseParams', () => {
  it('VI-TC-07: returns defaults for an empty query', () => {
    expect(parseParams('', NOW)).toEqual({
      name: null,
      location: null,
      slots: [],
      duration: 120,
      gender: null,
      vocative: null,
    });
  });

  it('VI-TC-08: trims and clips name, vocative and location by code point', () => {
    const name = 'а'.repeat(39) + '🤖🤖';
    const p = parseParams(q({ name, vocative: `  ${'б'.repeat(45)}  `, location: 'x'.repeat(150) }), NOW);
    expect(p.name).toBe('а'.repeat(39) + '🤖');
    expect(p.vocative).toBe('б'.repeat(40));
    expect(p.location).toHaveLength(100);
    expect(parseParams(q({ name: '   ' }), NOW).name).toBeNull();
  });

  it('VI-TC-09: reads slots with %2B or a raw plus and keeps at most 12', () => {
    const p = parseParams('?slots=2026-10-01T18:00%2B03:00,2026-10-02T19:30+03:00', NOW);
    expect(p.slots).toEqual(['2026-10-01T18:00+03:00', '2026-10-02T19:30+03:00']);

    const many = Array.from({ length: 15 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}T18:00+03:00`);
    const limited = parseParams(q({ slots: many.join(',') }), NOW);
    expect(limited.slots).toEqual(many.slice(0, 12));
  });

  it('VI-TC-10: accepts duration 15..480 and falls back to 120 otherwise', () => {
    expect(parseParams('?duration=15', NOW).duration).toBe(15);
    expect(parseParams('?duration=480', NOW).duration).toBe(480);
    for (const bad of ['14', '481', 'abc', '90.5', '1e2', '']) {
      expect(parseParams(`?duration=${bad}`, NOW).duration).toBe(120);
    }
  });

  it('VI-TC-11: accepts gender m or f only', () => {
    expect(parseParams('?gender=m', NOW).gender).toBe('m');
    expect(parseParams('?gender=f', NOW).gender).toBe('f');
    expect(parseParams('?gender=M', NOW).gender).toBeNull();
    expect(parseParams('?gender=x', NOW).gender).toBeNull();
  });
});
