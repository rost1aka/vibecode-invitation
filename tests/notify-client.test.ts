import { describe, expect, it, vi } from 'vitest';
import { notify } from '../src/notify';

describe('notify', () => {
  it('VI-TC-30: posts the event as JSON with keepalive', () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 204 }));
    notify({ type: 'accepted', name: 'Андрій', noAttempts: 3 }, fetchFn);
    expect(fetchFn).toHaveBeenCalledWith('/api/notify', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'accepted', name: 'Андрій', noAttempts: 3 }),
    });
  });

  it('VI-TC-31: swallows synchronous throws and rejected promises', async () => {
    const event = { type: 'calendar_clicked', name: 'Андрій', slot: '2026-10-01T18:00+03:00' } as const;
    expect(() =>
      notify(event, () => {
        throw new TypeError('fetch is not defined');
      }),
    ).not.toThrow();

    const rejection = vi.fn();
    process.on('unhandledRejection', rejection);
    notify(event, async () => Promise.reject(new Error('offline')));
    await new Promise((resolve) => setTimeout(resolve, 10));
    process.off('unhandledRejection', rejection);
    expect(rejection).not.toHaveBeenCalled();
  });
});
