import {
  clip,
  DEFAULT_DURATION,
  LOCATION_MAX,
  MAX_SLOTS,
  NAME_MAX,
  type Gender,
  type InvitationParams,
} from './params';
import { localInputToIso, normalizeSlots, slotTime } from './slots';

export function buildInvitationUrl(origin: string, params: InvitationParams): string {
  const query = new URLSearchParams();
  if (params.name) query.set('name', params.name);
  if (params.gender) query.set('gender', params.gender);
  if (params.vocative) query.set('vocative', params.vocative);
  if (params.location) query.set('location', params.location);
  if (params.slots.length > 0) query.set('slots', params.slots.join(','));
  if (params.duration !== DEFAULT_DURATION) query.set('duration', String(params.duration));
  const search = query.toString();
  return search ? `${origin}/?${search}` : `${origin}/`;
}

export interface FormState {
  name: string;
  vocative: string;
  gender: '' | Gender;
  location: string;
  duration: number;
  /** Raw `datetime-local` values in form row order. */
  slots: string[];
}

export interface FormResult {
  params: InvitationParams;
  /** Indexes of form rows whose time has already passed. */
  pastSlots: number[];
}

export function formToParams(form: FormState, autoVocative: string, now: Date): FormResult {
  const isoSlots = form.slots.map(localInputToIso);
  const pastSlots = isoSlots.flatMap((iso, index) => {
    const time = iso === null ? null : slotTime(iso);
    return time !== null && time <= now.getTime() ? [index] : [];
  });
  const vocative = clip(form.vocative, NAME_MAX);
  return {
    params: {
      name: clip(form.name, NAME_MAX),
      location: clip(form.location, LOCATION_MAX),
      slots: normalizeSlots(
        isoSlots.filter((iso): iso is string => iso !== null),
        now,
      ).slice(0, MAX_SLOTS),
      duration: form.duration,
      gender: form.gender || null,
      vocative: vocative && vocative !== autoVocative ? vocative : null,
    },
    pastSlots,
  };
}
