import { describe, expect, it, vi } from 'vitest';
import { formatMessage, validateEvent } from '../api/_message';
import { handleNotify } from '../api/notify';

const ENV = { TELEGRAM_BOT_TOKEN: 'TOKEN', TELEGRAM_CHAT_ID: '42' };
const SLOT = '2026-10-01T18:00+03:00';
const accepted = { type: 'accepted', name: 'Андрій', noAttempts: 7 };

const post = (body: string) => new Request('https://x.test/api/notify', { method: 'POST', body });
const okFetch = () => vi.fn(async () => new Response('{"ok":true}', { status: 200 }));

describe('validateEvent', () => {
  // VI-TC-32
  it('accepts the three event types and clips strings to 100', () => {
    expect(validateEvent(accepted)).toEqual(accepted);
    expect(validateEvent({ type: 'slot_selected', name: 'Андрій', slot: SLOT, timeZone: 'Europe/Warsaw' })).toEqual({
      type: 'slot_selected',
      name: 'Андрій',
      slot: SLOT,
      timeZone: 'Europe/Warsaw',
    });
    expect(validateEvent({ type: 'calendar_clicked', name: 'Андрій', slot: SLOT })).toEqual({
      type: 'calendar_clicked',
      name: 'Андрій',
      slot: SLOT,
    });
    const long = validateEvent({ ...accepted, name: 'я'.repeat(150) });
    expect(long && long.name).toBe('я'.repeat(100));
  });

  // VI-TC-33
  it('rejects unknown types, bad noAttempts, bad slots and non-objects', () => {
    for (const body of [
      null,
      'accepted',
      [],
      { ...accepted, type: 'declined' },
      { ...accepted, name: '' },
      { ...accepted, noAttempts: -1 },
      { ...accepted, noAttempts: 10001 },
      { ...accepted, noAttempts: 1.5 },
      { ...accepted, noAttempts: '3' },
      { type: 'slot_selected', name: 'Андрій', slot: 'garbage', timeZone: 'Europe/Kyiv' },
      { type: 'slot_selected', name: 'Андрій', slot: SLOT },
      { type: 'calendar_clicked', name: 'Андрій' },
    ]) {
      expect(validateEvent(body)).toBeNull();
    }
    expect(validateEvent({ ...accepted, noAttempts: 0 })).not.toBeNull();
    expect(validateEvent({ ...accepted, noAttempts: 10000 })).not.toBeNull();
  });
});

describe('formatMessage', () => {
  // VI-TC-34
  it('renders the texts from the spec with Kyiv time and the nominative name', () => {
    expect(formatMessage({ type: 'accepted', name: 'Андрій', noAttempts: 7 })).toBe(
      '✅ Андрій погодився вайбкодити! (спроб натиснути «Ні»: 7)',
    );
    expect(
      formatMessage({ type: 'slot_selected', name: 'Андрій', slot: '2026-10-01T17:00+02:00', timeZone: 'Europe/Warsaw' }),
    ).toBe('🕐 Андрій обрав час: чт, 1 жовтня · 18:00 (Київ). Пояс друга: Europe/Warsaw');
    expect(formatMessage({ type: 'calendar_clicked', name: 'Андрій', slot: SLOT })).toBe(
      '📅 Андрій натиснув «Додати в Google Calendar» на чт, 1 жовтня · 18:00',
    );
  });
});

describe('handleNotify', () => {
  // VI-TC-35
  it('answers 405 to anything but POST', async () => {
    const res = await handleNotify(new Request('https://x.test/api/notify'), ENV, okFetch());
    expect(res.status).toBe(405);
  });

  // VI-TC-36
  it('answers 413 when the body exceeds 2048 bytes', async () => {
    const fetchFn = okFetch();
    expect((await handleNotify(post('x'.repeat(2049)), ENV, fetchFn)).status).toBe(413);
    // 1025 Cyrillic letters = 2050 bytes, only 1025 characters
    const cyrillic = JSON.stringify({ ...accepted, name: 'я'.repeat(1025) });
    expect((await handleNotify(post(cyrillic), ENV, fetchFn)).status).toBe(413);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  // VI-TC-37
  it('answers 400 to invalid JSON or an invalid event', async () => {
    expect((await handleNotify(post('{not json'), ENV, okFetch())).status).toBe(400);
    expect((await handleNotify(post(JSON.stringify({ type: 'nope' })), ENV, okFetch())).status).toBe(400);
  });

  // VI-TC-38
  it('answers 500 without Telegram env and does not call Telegram', async () => {
    const fetchFn = okFetch();
    expect((await handleNotify(post(JSON.stringify(accepted)), {}, fetchFn)).status).toBe(500);
    expect((await handleNotify(post(JSON.stringify(accepted)), { TELEGRAM_BOT_TOKEN: 'T' }, fetchFn)).status).toBe(500);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  // VI-TC-39
  it('sends a plain-text message to the configured chat and answers 204', async () => {
    const fetchFn = okFetch();
    const res = await handleNotify(post(JSON.stringify(accepted)), ENV, fetchFn);
    expect(res.status).toBe(204);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.telegram.org/botTOKEN/sendMessage');
    expect(init.method).toBe('POST');
    const payload = JSON.parse(String(init.body));
    expect(payload).toEqual({ chat_id: '42', text: '✅ Андрій погодився вайбкодити! (спроб натиснути «Ні»: 7)' });
    expect(payload).not.toHaveProperty('parse_mode');
  });

  // VI-TC-40
  it('answers 502 when Telegram fails or is unreachable', async () => {
    const failing = vi.fn(async () => new Response('{"ok":false}', { status: 400 }));
    expect((await handleNotify(post(JSON.stringify(accepted)), ENV, failing)).status).toBe(502);
    const throwing = vi.fn(async () => Promise.reject(new TypeError('fetch failed')));
    expect((await handleNotify(post(JSON.stringify(accepted)), ENV, throwing)).status).toBe(502);
  });
});
