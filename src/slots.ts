const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;
const LOCAL_INPUT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * `datetime-local` value (browser local time) → ISO with the offset valid on that date.
 * Built from the resolved Date, so a local time skipped by DST maps to the real instant.
 */
export function localInputToIso(value: string): string | null {
  if (!LOCAL_INPUT.test(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

/** An unencoded `+` in a URL arrives as a space: `18:00 03:00` → `18:00+03:00`. */
export function repairSlot(raw: string): string {
  return raw.trim().replace(/ (\d{2}:\d{2})$/, '+$1');
}

export function slotTime(iso: string): number | null {
  if (!ISO_WITH_OFFSET.test(iso)) return null;
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : time;
}

export function normalizeSlots(raw: string[], now: Date): string[] {
  const seen = new Set<number>();
  const slots: { iso: string; time: number }[] = [];
  for (const value of raw) {
    const iso = repairSlot(value);
    const time = slotTime(iso);
    if (time === null || time <= now.getTime() || seen.has(time)) continue;
    seen.add(time);
    slots.push({ iso, time });
  }
  return slots.sort((a, b) => a.time - b.time).map((slot) => slot.iso);
}
