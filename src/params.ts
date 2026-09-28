import { normalizeSlots } from './slots';

export type Gender = 'm' | 'f';

export interface InvitationParams {
  name: string | null;
  location: string | null;
  slots: string[];
  duration: number;
  gender: Gender | null;
  vocative: string | null;
}

export const DEFAULT_DURATION = 120;
export const MIN_DURATION = 15;
export const MAX_DURATION = 480;
export const MAX_SLOTS = 12;
export const NAME_MAX = 40;
export const LOCATION_MAX = 100;

/** Trim and cut to `max` code points so emoji are never split in half. */
export function clip(value: string | null | undefined, max: number): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return null;
  return Array.from(trimmed).slice(0, max).join('').trim();
}

function parseDuration(raw: string | null): number {
  if (!raw || !/^\d+$/.test(raw)) return DEFAULT_DURATION;
  const minutes = Number(raw);
  return minutes >= MIN_DURATION && minutes <= MAX_DURATION ? minutes : DEFAULT_DURATION;
}

export function parseParams(search: string, now: Date): InvitationParams {
  const query = new URLSearchParams(search);
  const gender = query.get('gender');
  const slots = query.get('slots');
  return {
    name: clip(query.get('name'), NAME_MAX),
    location: clip(query.get('location'), LOCATION_MAX),
    slots: slots ? normalizeSlots(slots.split(','), now).slice(0, MAX_SLOTS) : [],
    duration: parseDuration(query.get('duration')),
    gender: gender === 'm' || gender === 'f' ? gender : null,
    vocative: clip(query.get('vocative'), NAME_MAX),
  };
}
