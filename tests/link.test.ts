import { describe, expect, it } from 'vitest';
import { buildInvitationUrl, formToParams, type FormState } from '../src/link';
import { parseParams, type InvitationParams } from '../src/params';

const NOW = new Date('2026-09-28T12:00:00+03:00');
const ORIGIN = 'https://vibecode-invitation.vercel.app';

const base: InvitationParams = {
  name: null,
  location: null,
  slots: [],
  duration: 120,
  gender: null,
  vocative: null,
};

const roundTrip = (p: InvitationParams) => parseParams(new URL(buildInvitationUrl(ORIGIN, p)).search, NOW);

describe('buildInvitationUrl', () => {
  // VI-TC-27
  it('round-trips through parseParams', () => {
    const fixtures: InvitationParams[] = [
      base,
      { ...base, name: 'Андрій' },
      { ...base, name: 'Олена', gender: 'f', vocative: 'Оленко', duration: 90 },
      {
        name: 'Тарас',
        location: 'Lviv IT Park',
        slots: ['2026-10-01T18:00+03:00', '2026-11-02T18:00+02:00'],
        duration: 480,
        gender: 'm',
        vocative: null,
      },
    ];
    for (const fixture of fixtures) expect(roundTrip(fixture)).toEqual(fixture);
  });

  // VI-TC-28
  it('omits default values', () => {
    expect(buildInvitationUrl(ORIGIN, base)).toBe(`${ORIGIN}/`);
    expect(buildInvitationUrl(ORIGIN, { ...base, name: 'Andrii' })).toBe(`${ORIGIN}/?name=Andrii`);
    expect(buildInvitationUrl(ORIGIN, { ...base, duration: 60 })).toBe(`${ORIGIN}/?duration=60`);
  });

  // VI-TC-29
  it('encodes plus signs, Cyrillic and query metacharacters safely', () => {
    const p: InvitationParams = {
      ...base,
      name: 'Андрій & Co #1?',
      location: '100% кава + код',
      slots: ['2026-10-01T18:00+03:00'],
    };
    const url = buildInvitationUrl(ORIGIN, p);
    expect(url).toContain('%2B03%3A00');
    expect(url).not.toMatch(/[\s#]/);
    expect(roundTrip(p)).toEqual(p);
  });
});

describe('formToParams', () => {
  const form: FormState = {
    name: ' Андрій ',
    vocative: 'Андрію',
    gender: '',
    location: '',
    duration: 120,
    slots: [''],
  };

  // VI-TC-41
  it('keeps vocative only when it differs from the automatic one', () => {
    expect(formToParams(form, 'Андрію', NOW).params.vocative).toBeNull();
    expect(formToParams({ ...form, vocative: 'Андрійку' }, 'Андрію', NOW).params.vocative).toBe('Андрійку');
    expect(formToParams({ ...form, vocative: '  ' }, 'Андрію', NOW).params.vocative).toBeNull();
  });

  // VI-TC-42
  it('maps gender, converts, sorts and dedupes slots, flags past rows, caps at 12', () => {
    const result = formToParams(
      {
        ...form,
        gender: 'f',
        duration: 90,
        slots: ['2026-10-02T19:30', '', '2026-09-01T10:00', '2026-10-01T18:00', '2026-10-02T19:30'],
      },
      'Андрію',
      NOW,
    );
    expect(result.params).toEqual({
      name: 'Андрій',
      location: null,
      slots: ['2026-10-01T18:00+03:00', '2026-10-02T19:30+03:00'],
      duration: 90,
      gender: 'f',
      vocative: null,
    });
    expect(result.pastSlots).toEqual([2]);

    const thirteen = Array.from({ length: 13 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}T18:00`);
    expect(formToParams({ ...form, slots: thirteen }, 'Андрію', NOW).params.slots).toHaveLength(12);
  });
});
