const CALENDAR_URL = 'https://calendar.google.com/calendar/render';
const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=';

/** 2026-10-01T15:00:00.000Z → 20261001T150000Z */
function toUtcStamp(ms: number): string {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[-:]/g, '');
}

export function buildCalendarUrl(
  slot: string,
  durationMin: number,
  location: string | null,
  hostEmail: string | null,
): string {
  const start = Date.parse(slot);
  const end = start + durationMin * 60_000;
  const query = new URLSearchParams({
    action: 'TEMPLATE',
    text: 'Вайбкодинг-сесія 🤖☕',
    dates: `${toUtcStamp(start)}/${toUtcStamp(end)}`,
    details: 'Вайбкодимо разом 🤖☕',
  });
  if (location) query.set('location', location);
  if (hostEmail) query.set('add', hostEmail);
  return `${CALENDAR_URL}?${query}`;
}

export function buildMapsUrl(location: string): string {
  return `${MAPS_URL}${encodeURIComponent(location)}`;
}
