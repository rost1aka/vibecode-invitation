import { describe, expect, it } from 'vitest';
import { localInputToIso, normalizeSlots } from '../src/slots';

const NOW = new Date('2026-09-28T12:00:00+03:00');

describe('localInputToIso', () => {
  it('VI-TC-01: uses the author offset valid on the slot date', () => {
    expect(localInputToIso('2026-10-01T18:00')).toBe('2026-10-01T18:00+03:00');
    expect(localInputToIso('2026-11-02T18:00')).toBe('2026-11-02T18:00+02:00');
  });

  it('VI-TC-02: maps a local time skipped by the DST jump to the real instant', () => {
    const iso = localInputToIso('2027-03-28T03:30');
    expect(iso).toBe('2027-03-28T04:30+03:00');
    expect(Date.parse(iso!)).toBe(new Date('2027-03-28T03:30').getTime());
  });

  it('VI-TC-03: returns null for empty or malformed input', () => {
    expect(localInputToIso('')).toBeNull();
    expect(localInputToIso('abc')).toBeNull();
  });
});

describe('normalizeSlots', () => {
  it('VI-TC-04: sorts, drops empties and dedupes by instant keeping the first spelling', () => {
    expect(
      normalizeSlots(
        ['2026-10-02T19:30+03:00', '', '2026-10-01T18:00+03:00', '2026-10-01T15:00Z'],
        NOW,
      ),
    ).toEqual(['2026-10-01T18:00+03:00', '2026-10-02T19:30+03:00']);
  });

  it('VI-TC-05: drops invalid, offset-less and past slots', () => {
    expect(
      normalizeSlots(
        ['2026-09-01T18:00+03:00', 'nope', '2026-10-01T18:00', '2026-10-01T18:00+03:00'],
        NOW,
      ),
    ).toEqual(['2026-10-01T18:00+03:00']);
  });

  it('VI-TC-06: treats a space before the trailing HH:MM as a plus sign', () => {
    expect(normalizeSlots(['2026-10-01T18:00 03:00'], NOW)).toEqual(['2026-10-01T18:00+03:00']);
  });
});
