const LOCALE = 'uk-UA';

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((p) => p.type === type)?.value ?? '';
}

function formatDay(date: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat(LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).formatToParts(date);
  return `${part(parts, 'weekday')}, ${part(parts, 'day')} ${part(parts, 'month')}`;
}

function formatTime(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(date);
}

export function formatStart(iso: string, timeZone?: string): string {
  const start = new Date(iso);
  return `${formatDay(start, timeZone)} · ${formatTime(start, timeZone)}`;
}

export function formatSlot(iso: string, durationMin: number, timeZone?: string): string {
  const end = new Date(Date.parse(iso) + durationMin * 60_000);
  return `${formatStart(iso, timeZone)}–${formatTime(end, timeZone)}`;
}
