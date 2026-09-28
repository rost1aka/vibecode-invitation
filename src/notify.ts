export type NotifyEvent =
  | { type: 'accepted'; name: string; noAttempts: number }
  | { type: 'slot_selected'; name: string; slot: string; timeZone: string }
  | { type: 'calendar_clicked'; name: string; slot: string };

export const NOTIFY_ENDPOINT = '/api/notify';

/** Fire-and-forget: the UI never waits for the author's notification and never shows its errors. */
export function notify(event: NotifyEvent, fetchFn: typeof fetch = (input, init) => fetch(input, init)): void {
  try {
    fetchFn(NOTIFY_ENDPOINT, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch(() => {});
  } catch {
    // ignored on purpose
  }
}
