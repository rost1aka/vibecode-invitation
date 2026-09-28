import { describe, expect, it } from 'vitest';
import { buildCalendarUrl, buildMapsUrl } from '../src/calendar';

describe('buildCalendarUrl', () => {
  // VI-TC-15
  it('builds a TEMPLATE link with UTC dates, end = start + duration', () => {
    const url = new URL(buildCalendarUrl('2026-10-01T18:00+03:00', 90, null, null));
    expect(`${url.origin}${url.pathname}`).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('dates')).toBe('20261001T150000Z/20261001T163000Z');
    expect(url.searchParams.get('text')).toBe('Вайбкодинг-сесія 🤖☕');
    expect(url.searchParams.get('details')).toBe('Вайбкодимо разом 🤖☕');
  });

  // VI-TC-16
  it('adds location and guest only when present, encoded', () => {
    const bare = new URL(buildCalendarUrl('2026-10-01T18:00+03:00', 120, null, null));
    expect(bare.searchParams.has('location')).toBe(false);
    expect(bare.searchParams.has('add')).toBe(false);

    const raw = buildCalendarUrl('2026-10-01T18:00+03:00', 120, 'Lviv IT Park & Co', 'me@x.com');
    const full = new URL(raw);
    expect(full.searchParams.get('location')).toBe('Lviv IT Park & Co');
    expect(full.searchParams.get('add')).toBe('me@x.com');
    expect(raw).not.toContain(' ');
    expect(raw).not.toContain('& Co');
  });
});

describe('buildMapsUrl', () => {
  // VI-TC-17
  it('builds a Google Maps search link', () => {
    expect(buildMapsUrl('Lviv IT Park')).toBe('https://www.google.com/maps/search/?api=1&query=Lviv%20IT%20Park');
  });
});
