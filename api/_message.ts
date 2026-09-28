import { formatStart } from '../src/format.js';
import type { NotifyEvent } from '../src/notify.js';

export const AUTHOR_TIME_ZONE = 'Europe/Kyiv';
const MAX_STRING = 100;
const MAX_ATTEMPTS = 10_000;

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? Array.from(trimmed).slice(0, MAX_STRING).join('') : null;
}

function slot(value: unknown): string | null {
  const iso = text(value);
  return iso && !Number.isNaN(Date.parse(iso)) ? iso : null;
}

export function validateEvent(body: unknown): NotifyEvent | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  const name = text(input.name);
  if (!name) return null;
  switch (input.type) {
    case 'accepted': {
      const attempts = input.noAttempts;
      if (typeof attempts !== 'number' || !Number.isInteger(attempts) || attempts < 0 || attempts > MAX_ATTEMPTS) {
        return null;
      }
      return { type: 'accepted', name, noAttempts: attempts };
    }
    case 'slot_selected': {
      const iso = slot(input.slot);
      const timeZone = text(input.timeZone);
      return iso && timeZone ? { type: 'slot_selected', name, slot: iso, timeZone } : null;
    }
    case 'calendar_clicked': {
      const iso = slot(input.slot);
      return iso ? { type: 'calendar_clicked', name, slot: iso } : null;
    }
    default:
      return null;
  }
}

export function formatMessage(event: NotifyEvent): string {
  switch (event.type) {
    case 'accepted':
      return `✅ ${event.name} погодився вайбкодити! (спроб натиснути «Ні»: ${event.noAttempts})`;
    case 'slot_selected':
      return `🕐 ${event.name} обрав час: ${formatStart(event.slot, AUTHOR_TIME_ZONE)} (Київ). Пояс друга: ${event.timeZone}`;
    case 'calendar_clicked':
      return `📅 ${event.name} натиснув «Додати в Google Calendar» на ${formatStart(event.slot, AUTHOR_TIME_ZONE)}`;
  }
}
