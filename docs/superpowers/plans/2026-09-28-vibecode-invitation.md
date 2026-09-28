# Vibecode Invitation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Персональна сторінка-запрошення повайбкодити (екран запрошення з «Ні», що тікає → вибір слоту → Google Calendar) плюс конструктор посилань `/create` і Telegram-сповіщення автору через одну Vercel-функцію.

**Architecture:** Vite multi-page (`index.html` — запрошення, `create.html` — конструктор) на vanilla TypeScript. Уся логіка — чисті модулі в `src/` без DOM (параметри, слоти, посилання, формат, календар, втеча кнопки, кличний відмінок, клієнт notify), тонкі DOM-шари в `src/main.ts` і `src/create.ts`. Бекенд — одна Vercel function `api/notify.ts` з чистим ядром `handleNotify(Request, env, fetch)` і чистими функціями валідації/тексту в `api/_message.ts`.

**Tech Stack:** Vite, TypeScript (strict), Vitest (node environment), `shevchenko` (MIT, кличний відмінок), Vercel (static + Node function), Telegram Bot API.

**Spec:** `docs/superpowers/specs/2026-09-28-vibecode-invitation-design.md`

**Proba:** продукт `vibecode-invitation`, сьют `VI` (id `1e22ac94-7c3c-48a2-81e3-20319d255b50`). Вимоги `VI-FR-*`, `VI-RULE-*`, `VI-INV-*`, `VI-NFR-*`, `VI-RISK-*`; тест-кейси `VI-TC-01`…`VI-TC-49` уже заведені зі статусом `planned` і привʼязані до вимог. Кожен тест у коді позначений коментарем `// VI-TC-NN` над `it(...)`; **назва тесту ID не містить** (Proba приєднує результати за `file::title`).

## Global Constraints

- Інтерфейс — лише українською; без авторизації, БД, збереження стану (`VI-NFR-09`).
- `name` ≤ 40 символів, `vocative` ≤ 40, `location` ≤ 100 — обрізання за code point (`Array.from`), з `trim`.
- `slots`: ISO 8601 з offset (`+HH:MM`, `-HH:MM` або `Z`), через кому; невалідні та минулі відкидаються; максимум 12.
- `duration`: ціле 15–480 хвилин, інакше 120 (`DEFAULT_DURATION`).
- `gender`: лише `m` | `f`.
- Звертання без `name` — «Друже».
- Заголовок: `«{кличний}, давай повайбкодимо разом? 🤖☕»`.
- Футер `«not a big deal, зробив цей додаток поки пив каву»` — лише на екрані запрошення.
- Кнопка «Ні»: тригер ближче 100px, нова позиція ≥ 200px від вказівника, до 20 кандидатів, відступ 16px, анімація 150ms (нуль при `prefers-reduced-motion`).
- Календар: `text=Вайбкодинг-сесія 🤖☕`, `details=Вайбкодимо разом 🤖☕`, `dates` у `YYYYMMDDTHHMMSSZ`, усі значення через `URLSearchParams`.
- `/api/notify`: лише POST (405), тіло ≤ 2048 байт (413), невалідне — 400, env відсутні — 500, помилка Telegram — 502, успіх — 204; без `parse_mode`; час у повідомленнях — `Europe/Kyiv`.
- Env: `VITE_HOST_EMAIL` (фронтенд, вбудовується при збірці), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (сервер). Не комітити.
- Тести запускаються з `TZ=Europe/Kyiv` (зашито в `npm test`).
- **Відхилення від спеки:** `api/message.ts` зі спеки називається `api/_message.ts` — Vercel перетворює кожен файл у `api/` на endpoint, крім тих, що починаються з `_`. Файли в `api/` імпортують з розширенням `.js` (`'./_message.js'`, `'../src/format.js'`) — так вимагає Node ESM під час виконання функції; Vite/Vitest резолвлять `.js` → `.ts`.

## Review Focus

1. **Емодзі/сурогатні пари в `name` на межі 40 символів** — обрізання не має лишати «битий» символ. Тест: `VI-TC-08` (Task 2).
2. **Неіснуючий локальний час у день переходу на літній час** (`2027-03-28T03:30` у Києві) — слот має відповідати реальному моменту, а не зсунутись на годину. Тест: `VI-TC-02` (Task 1).
3. **Спецсимволи `& # ? + %` у `name`/`location`** — не мають ламати query і мають пережити round-trip. Тест: `VI-TC-29` (Task 3).
4. **Сторонній клієнт шле в `/api/notify` `slot: "garbage"` або кириличне тіло > 2 KB у байтах** — 400/413, а не падіння форматування чи пропуск ліміту. Тести: `VI-TC-33` (Task 9), `VI-TC-36` (Task 9).
5. **Telegram недоступний (fetch кидає)** — 502, а не неперехоплений виняток; **вʼюпорт менший за кнопку** — координати скінченні й невідʼємні. Тести: `VI-TC-40` (Task 9), `VI-TC-21` (Task 6).

## Proba: як позначати кейси реалізованими

Останній крок кожної задачі з тестами:

1. Знайти uuid кейсу: `mcp__proba__search` з `productId: "vibecode-invitation"`, `q: "VI-TC-NN"`, `kinds: ["testCase"]`.
2. `mcp__proba__link_implemented_tests` з `caseId: <uuid>`, `level: "U"` (або `"I"` для `VI-TC-35..40`), `ref: "<файл>::<describe> > <назва it>"` — наприклад `tests/slots.test.ts::localInputToIso > uses the author offset valid on the slot date`.
3. `mcp__proba__edit_test_case` з `caseId: <uuid>`, `status: "implemented"`.

Ручні кейси (`VI-TC-43..49`, level `M`) переводяться в `implemented` після проходження в Task 12 через `mcp__proba__create_test_run` / `record_case_result`.

## File Structure

```
package.json            — скрипти dev/build/test/typecheck, залежності
tsconfig.json           — strict, Bundler resolution, include src/api/tests
vite.config.ts          — multi-page input + конфіг Vitest
vercel.json             — cleanUrls
.env.example            — перелік env без значень
index.html              — сторінка запрошення (3 екрани + футер)
create.html             — конструктор (noindex)
src/
  slots.ts              — localInputToIso, repairSlot, slotTime, normalizeSlots
  params.ts             — типи InvitationParams/Gender, константи, clip, parseParams
  link.ts               — buildInvitationUrl, FormState, formToParams
  format.ts             — formatStart, formatSlot (uk-UA)
  calendar.ts           — buildCalendarUrl, buildMapsUrl
  dodge.ts              — nextPosition, isNear (чисті)
  vocative.ts           — toVocative через динамічний import('shevchenko')
  notify.ts             — тип NotifyEvent, notify() fire-and-forget
  main.ts               — DOM сторінки запрошення
  create.ts             — DOM конструктора
  style.css             — спільні стилі
api/
  _message.ts           — validateEvent, formatMessage (чисті)
  notify.ts             — handleNotify + Vercel default export
tests/
  slots.test.ts, params.test.ts, link.test.ts, format.test.ts, calendar.test.ts,
  dodge.test.ts, vocative.test.ts, notify-client.test.ts, notify-api.test.ts
```

---

### Task 1: Scaffold проєкту + модуль слотів

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vercel.json`, `.env.example`
- Create: `src/slots.ts`
- Test: `tests/slots.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `localInputToIso(value: string): string | null` — `'YYYY-MM-DDTHH:MM'` (локальний час браузера) → `'YYYY-MM-DDTHH:MM±HH:MM'` з offset, чинним на цю дату; `null` для порожнього/невалідного.
  - `repairSlot(raw: string): string` — `trim` + пробіл перед кінцевим `HH:MM` → `+`.
  - `slotTime(iso: string): number | null` — epoch ms, якщо рядок — ISO з offset/`Z`, інакше `null`.
  - `normalizeSlots(raw: string[], now: Date): string[]` — repair → валідні → майбутні (`> now`) → дедуплікація за моментом (перший виграє) → сортування за часом. Без ліміту 12.

- [ ] **Step 1: Створити `package.json` і встановити залежності**

```json
{
  "name": "vibecode-invitation",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "TZ=Europe/Kyiv vitest run",
    "test:watch": "TZ=Europe/Kyiv vitest"
  }
}
```

Run:
```bash
npm install -D vite vitest typescript @types/node
npm install shevchenko
```
Expected: `node_modules/` зʼявився, у `package.json` додались `devDependencies` і `dependencies.shevchenko`.

- [ ] **Step 2: Створити `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "node"],
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src", "api", "tests", "vite.config.ts"]
}
```

- [ ] **Step 3: Створити `vite.config.ts`, `vercel.json`, `.env.example`**

`vite.config.ts`:
```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        create: fileURLToPath(new URL('./create.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

`vercel.json`:
```json
{
  "cleanUrls": true
}
```

`.env.example`:
```
# Скопіюй у .env.local і заповни. .env.local не комітиться.
VITE_HOST_EMAIL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

- [ ] **Step 4: Написати падаючі тести `tests/slots.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { localInputToIso, normalizeSlots } from '../src/slots';

const NOW = new Date('2026-09-28T12:00:00+03:00');

describe('localInputToIso', () => {
  // VI-TC-01
  it('uses the author offset valid on the slot date', () => {
    expect(localInputToIso('2026-10-01T18:00')).toBe('2026-10-01T18:00+03:00');
    expect(localInputToIso('2026-11-02T18:00')).toBe('2026-11-02T18:00+02:00');
  });

  // VI-TC-02
  it('maps a local time skipped by the DST jump to the real instant', () => {
    const iso = localInputToIso('2027-03-28T03:30');
    expect(iso).toBe('2027-03-28T04:30+03:00');
    expect(Date.parse(iso!)).toBe(new Date('2027-03-28T03:30').getTime());
  });

  // VI-TC-03
  it('returns null for empty or malformed input', () => {
    expect(localInputToIso('')).toBeNull();
    expect(localInputToIso('abc')).toBeNull();
  });
});

describe('normalizeSlots', () => {
  // VI-TC-04
  it('sorts, drops empties and dedupes by instant keeping the first spelling', () => {
    expect(
      normalizeSlots(
        ['2026-10-02T19:30+03:00', '', '2026-10-01T18:00+03:00', '2026-10-01T15:00Z'],
        NOW,
      ),
    ).toEqual(['2026-10-01T18:00+03:00', '2026-10-02T19:30+03:00']);
  });

  // VI-TC-05
  it('drops invalid, offset-less and past slots', () => {
    expect(
      normalizeSlots(
        ['2026-09-01T18:00+03:00', 'nope', '2026-10-01T18:00', '2026-10-01T18:00+03:00'],
        NOW,
      ),
    ).toEqual(['2026-10-01T18:00+03:00']);
  });

  // VI-TC-06
  it('treats a space before the trailing HH:MM as a plus sign', () => {
    expect(normalizeSlots(['2026-10-01T18:00 03:00'], NOW)).toEqual(['2026-10-01T18:00+03:00']);
  });
});
```

- [ ] **Step 5: Запустити й переконатися, що падає**

Run: `npm test -- tests/slots.test.ts`
Expected: FAIL — `Failed to resolve import "../src/slots"`.

- [ ] **Step 6: Реалізувати `src/slots.ts`**

```ts
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
```

- [ ] **Step 7: Запустити тести й typecheck**

Run: `npm test -- tests/slots.test.ts && npx tsc --noEmit`
Expected: 6 тестів PASS; `tsc` без помилок.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts vercel.json .env.example src/slots.ts tests/slots.test.ts
git commit -m "feat: scaffold Vite+TS project and slot normalization"
```

- [ ] **Step 9: Proba** — привʼязати й позначити `implemented`: `VI-TC-01..06` (level `U`, файл `tests/slots.test.ts`).

---

### Task 2: Парсинг URL-параметрів

**Files:**
- Create: `src/params.ts`
- Test: `tests/params.test.ts`

**Interfaces:**
- Consumes: `normalizeSlots(raw: string[], now: Date): string[]` з `src/slots.ts`.
- Produces:
  - `type Gender = 'm' | 'f'`
  - `interface InvitationParams { name: string | null; location: string | null; slots: string[]; duration: number; gender: Gender | null; vocative: string | null }`
  - константи `DEFAULT_DURATION = 120`, `MIN_DURATION = 15`, `MAX_DURATION = 480`, `MAX_SLOTS = 12`, `NAME_MAX = 40`, `LOCATION_MAX = 100`
  - `clip(value: string | null | undefined, max: number): string | null` — trim, обрізання за code point, порожнє → `null`.
  - `parseParams(search: string, now: Date): InvitationParams`

- [ ] **Step 1: Написати падаючі тести `tests/params.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { parseParams } from '../src/params';

const NOW = new Date('2026-09-28T12:00:00+03:00');
const q = (query: Record<string, string>) => `?${new URLSearchParams(query)}`;

describe('parseParams', () => {
  // VI-TC-07
  it('returns defaults for an empty query', () => {
    expect(parseParams('', NOW)).toEqual({
      name: null,
      location: null,
      slots: [],
      duration: 120,
      gender: null,
      vocative: null,
    });
  });

  // VI-TC-08
  it('trims and clips name, vocative and location by code point', () => {
    const name = 'а'.repeat(39) + '🤖🤖';
    const p = parseParams(q({ name, vocative: `  ${'б'.repeat(45)}  `, location: 'x'.repeat(150) }), NOW);
    expect(p.name).toBe('а'.repeat(39) + '🤖');
    expect(p.vocative).toBe('б'.repeat(40));
    expect(p.location).toHaveLength(100);
    expect(parseParams(q({ name: '   ' }), NOW).name).toBeNull();
  });

  // VI-TC-09
  it('reads slots with %2B or a raw plus and keeps at most 12', () => {
    const p = parseParams('?slots=2026-10-01T18:00%2B03:00,2026-10-02T19:30+03:00', NOW);
    expect(p.slots).toEqual(['2026-10-01T18:00+03:00', '2026-10-02T19:30+03:00']);

    const many = Array.from({ length: 15 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}T18:00+03:00`);
    const limited = parseParams(q({ slots: many.join(',') }), NOW);
    expect(limited.slots).toEqual(many.slice(0, 12));
  });

  // VI-TC-10
  it('accepts duration 15..480 and falls back to 120 otherwise', () => {
    expect(parseParams('?duration=15', NOW).duration).toBe(15);
    expect(parseParams('?duration=480', NOW).duration).toBe(480);
    for (const bad of ['14', '481', 'abc', '90.5', '1e2', '']) {
      expect(parseParams(`?duration=${bad}`, NOW).duration).toBe(120);
    }
  });

  // VI-TC-11
  it('accepts gender m or f only', () => {
    expect(parseParams('?gender=m', NOW).gender).toBe('m');
    expect(parseParams('?gender=f', NOW).gender).toBe('f');
    expect(parseParams('?gender=M', NOW).gender).toBeNull();
    expect(parseParams('?gender=x', NOW).gender).toBeNull();
  });
});
```

- [ ] **Step 2: Запустити й переконатися, що падає**

Run: `npm test -- tests/params.test.ts`
Expected: FAIL — `Failed to resolve import "../src/params"`.

- [ ] **Step 3: Реалізувати `src/params.ts`**

```ts
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
```

- [ ] **Step 4: Запустити тести**

Run: `npm test -- tests/params.test.ts`
Expected: 5 тестів PASS.

- [ ] **Step 5: Commit**

```bash
git add src/params.ts tests/params.test.ts
git commit -m "feat: parse invitation URL parameters"
```

- [ ] **Step 6: Proba** — `VI-TC-07..11` → implemented (level `U`, `tests/params.test.ts`).

---

### Task 3: Побудова посилання й стан форми конструктора

**Files:**
- Create: `src/link.ts`
- Test: `tests/link.test.ts`

**Interfaces:**
- Consumes: з `src/params.ts` — `InvitationParams`, `Gender`, `clip`, `parseParams`, `DEFAULT_DURATION`, `NAME_MAX`, `LOCATION_MAX`, `MAX_SLOTS`; з `src/slots.ts` — `localInputToIso`, `normalizeSlots`, `slotTime`.
- Produces:
  - `buildInvitationUrl(origin: string, params: InvitationParams): string` — `${origin}/?…` (або `${origin}/`), параметри в порядку name, gender, vocative, location, slots, duration; дефолти пропускаються.
  - `interface FormState { name: string; vocative: string; gender: '' | Gender; location: string; duration: number; slots: string[] }` — `slots` — сирі значення `datetime-local` у порядку рядків форми.
  - `interface FormResult { params: InvitationParams; pastSlots: number[] }` — `pastSlots` — індекси рядків форми, чий час уже минув.
  - `formToParams(form: FormState, autoVocative: string, now: Date): FormResult`

- [ ] **Step 1: Написати падаючі тести `tests/link.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { buildInvitationUrl, formToParams, type FormState } from '../src/link';
import { parseParams, type InvitationParams } from '../src/params';

const NOW = new Date('2026-09-28T12:00:00+03:00');
const ORIGIN = 'https://vibecode-invitation.vercel.app';

const base: InvitationParams = {
  name: null,
  location: null,
  slots: [],
  duration: 120,
  gender: null,
  vocative: null,
};

const roundTrip = (p: InvitationParams) => parseParams(new URL(buildInvitationUrl(ORIGIN, p)).search, NOW);

describe('buildInvitationUrl', () => {
  // VI-TC-27
  it('round-trips through parseParams', () => {
    const fixtures: InvitationParams[] = [
      base,
      { ...base, name: 'Андрій' },
      { ...base, name: 'Олена', gender: 'f', vocative: 'Оленко', duration: 90 },
      {
        name: 'Тарас',
        location: 'Lviv IT Park',
        slots: ['2026-10-01T18:00+03:00', '2026-11-02T18:00+02:00'],
        duration: 480,
        gender: 'm',
        vocative: null,
      },
    ];
    for (const fixture of fixtures) expect(roundTrip(fixture)).toEqual(fixture);
  });

  // VI-TC-28
  it('omits default values', () => {
    expect(buildInvitationUrl(ORIGIN, base)).toBe(`${ORIGIN}/`);
    expect(buildInvitationUrl(ORIGIN, { ...base, name: 'Andrii' })).toBe(`${ORIGIN}/?name=Andrii`);
    expect(buildInvitationUrl(ORIGIN, { ...base, duration: 60 })).toBe(`${ORIGIN}/?duration=60`);
  });

  // VI-TC-29
  it('encodes plus signs, Cyrillic and query metacharacters safely', () => {
    const p: InvitationParams = {
      ...base,
      name: 'Андрій & Co #1?',
      location: '100% кава + код',
      slots: ['2026-10-01T18:00+03:00'],
    };
    const url = buildInvitationUrl(ORIGIN, p);
    expect(url).toContain('%2B03%3A00');
    expect(url).not.toMatch(/[\s#]/);
    expect(roundTrip(p)).toEqual(p);
  });
});

describe('formToParams', () => {
  const form: FormState = {
    name: ' Андрій ',
    vocative: 'Андрію',
    gender: '',
    location: '',
    duration: 120,
    slots: [''],
  };

  // VI-TC-41
  it('keeps vocative only when it differs from the automatic one', () => {
    expect(formToParams(form, 'Андрію', NOW).params.vocative).toBeNull();
    expect(formToParams({ ...form, vocative: 'Андрійку' }, 'Андрію', NOW).params.vocative).toBe('Андрійку');
    expect(formToParams({ ...form, vocative: '  ' }, 'Андрію', NOW).params.vocative).toBeNull();
  });

  // VI-TC-42
  it('maps gender, converts, sorts and dedupes slots, flags past rows, caps at 12', () => {
    const result = formToParams(
      {
        ...form,
        gender: 'f',
        duration: 90,
        slots: ['2026-10-02T19:30', '', '2026-09-01T10:00', '2026-10-01T18:00', '2026-10-02T19:30'],
      },
      'Андрію',
      NOW,
    );
    expect(result.params).toEqual({
      name: 'Андрій',
      location: null,
      slots: ['2026-10-01T18:00+03:00', '2026-10-02T19:30+03:00'],
      duration: 90,
      gender: 'f',
      vocative: null,
    });
    expect(result.pastSlots).toEqual([2]);

    const thirteen = Array.from({ length: 13 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}T18:00`);
    expect(formToParams({ ...form, slots: thirteen }, 'Андрію', NOW).params.slots).toHaveLength(12);
  });
});
```

- [ ] **Step 2: Запустити й переконатися, що падає**

Run: `npm test -- tests/link.test.ts`
Expected: FAIL — `Failed to resolve import "../src/link"`.

- [ ] **Step 3: Реалізувати `src/link.ts`**

```ts
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
```

- [ ] **Step 4: Запустити тести**

Run: `npm test -- tests/link.test.ts`
Expected: 5 тестів PASS.

- [ ] **Step 5: Commit**

```bash
git add src/link.ts tests/link.test.ts
git commit -m "feat: build invitation links and derive them from the builder form"
```

- [ ] **Step 6: Proba** — `VI-TC-27, 28, 29, 41, 42` → implemented (level `U`, `tests/link.test.ts`).

---

### Task 4: Форматування слотів

**Files:**
- Create: `src/format.ts`
- Test: `tests/format.test.ts`

**Interfaces:**
- Consumes: —  (**без імпортів** — файл імпортує `api/_message.ts`, див. Global Constraints)
- Produces:
  - `formatStart(iso: string, timeZone?: string): string` — `'чт, 1 жовтня · 18:00'`
  - `formatSlot(iso: string, durationMin: number, timeZone?: string): string` — `'чт, 1 жовтня · 18:00–20:00'` (en dash `–`, середня крапка `·`)

- [ ] **Step 1: Написати падаючі тести `tests/format.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { formatSlot, formatStart } from '../src/format';

describe('formatSlot', () => {
  // VI-TC-12
  it('formats a slot for uk-UA', () => {
    expect(formatSlot('2026-10-01T18:00+03:00', 120, 'Europe/Kyiv')).toBe('чт, 1 жовтня · 18:00–20:00');
  });

  // VI-TC-13
  it('shows the time in the friend time zone', () => {
    expect(formatSlot('2026-10-01T18:00+03:00', 90, 'Europe/London')).toBe('чт, 1 жовтня · 16:00–17:30');
  });
});

describe('formatStart', () => {
  // VI-TC-14
  it('formats the start in the given zone', () => {
    expect(formatStart('2026-10-01T15:00Z', 'Europe/Kyiv')).toBe('чт, 1 жовтня · 18:00');
  });
});
```

- [ ] **Step 2: Запустити й переконатися, що падає**

Run: `npm test -- tests/format.test.ts`
Expected: FAIL — `Failed to resolve import "../src/format"`.

- [ ] **Step 3: Реалізувати `src/format.ts`**

```ts
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
```

- [ ] **Step 4: Запустити тести**

Run: `npm test -- tests/format.test.ts`
Expected: 3 тести PASS. Якщо падає лише через форму дня тижня чи місяця — вивести фактичне значення (`node -e "console.log(new Intl.DateTimeFormat('uk-UA',{weekday:'short',day:'numeric',month:'long'}).formatToParts(new Date('2026-10-01T15:00Z')))"`) і з'ясувати причину (зазвичай — Node без full-icu), а не підганяти очікування.

- [ ] **Step 5: Commit**

```bash
git add src/format.ts tests/format.test.ts
git commit -m "feat: format slots for uk-UA in a given time zone"
```

- [ ] **Step 6: Proba** — `VI-TC-12..14` → implemented (level `U`, `tests/format.test.ts`).

---

### Task 5: Посилання Google Calendar і Google Maps

**Files:**
- Create: `src/calendar.ts`
- Test: `tests/calendar.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `buildCalendarUrl(slot: string, durationMin: number, location: string | null, hostEmail: string | null): string`
  - `buildMapsUrl(location: string): string`

- [ ] **Step 1: Написати падаючі тести `tests/calendar.test.ts`**

```ts
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
```

- [ ] **Step 2: Запустити й переконатися, що падає**

Run: `npm test -- tests/calendar.test.ts`
Expected: FAIL — `Failed to resolve import "../src/calendar"`.

- [ ] **Step 3: Реалізувати `src/calendar.ts`**

```ts
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
```

- [ ] **Step 4: Запустити тести**

Run: `npm test -- tests/calendar.test.ts`
Expected: 3 тести PASS.

- [ ] **Step 5: Commit**

```bash
git add src/calendar.ts tests/calendar.test.ts
git commit -m "feat: build Google Calendar and Maps links"
```

- [ ] **Step 6: Proba** — `VI-TC-15..17` → implemented (level `U`, `tests/calendar.test.ts`).

---

### Task 6: Позиція кнопки «Ні»

**Files:**
- Create: `src/dodge.ts`
- Test: `tests/dodge.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `interface Point { x: number; y: number }`, `interface Size { width: number; height: number }`, `interface Rect { left: number; top: number; width: number; height: number }`
  - константи `EDGE_MARGIN = 16`, `MIN_POINTER_DISTANCE = 200`, `NEAR_RADIUS = 100`, `MAX_CANDIDATES = 20`
  - `nextPosition(viewport: Size, button: Size, pointer: Point, random: () => number): Point` — лівий верхній кут кнопки.
  - `isNear(pointer: Point, rect: Rect, radius?: number): boolean` — відстань до центру < radius (за замовчуванням 100).

- [ ] **Step 1: Написати падаючі тести `tests/dodge.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { isNear, nextPosition } from '../src/dodge';

/** Deterministic PRNG (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns the given values in a loop. */
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('nextPosition', () => {
  // VI-TC-18
  it('always keeps the button inside the viewport with a 16px margin', () => {
    const viewport = { width: 375, height: 667 };
    const button = { width: 80, height: 44 };
    const random = seeded(42);
    for (let i = 0; i < 1000; i++) {
      const pointer = { x: random() * viewport.width, y: random() * viewport.height };
      const pos = nextPosition(viewport, button, pointer, random);
      expect(pos.x).toBeGreaterThanOrEqual(16);
      expect(pos.y).toBeGreaterThanOrEqual(16);
      expect(pos.x + button.width).toBeLessThanOrEqual(viewport.width - 16);
      expect(pos.y + button.height).toBeLessThanOrEqual(viewport.height - 16);
    }
  });

  // VI-TC-19
  it('returns the first candidate whose centre is at least 200px from the pointer', () => {
    // candidate 1 = (16,16), centre (66,36) — right under the pointer; candidate 2 = (450,380)
    const pos = nextPosition({ width: 1000, height: 800 }, { width: 100, height: 40 }, { x: 66, y: 36 }, sequence(0, 0, 0.5, 0.5));
    expect(pos).toEqual({ x: 450, y: 380 });
  });

  // VI-TC-20
  it('falls back to the farthest candidate on a small screen', () => {
    // No point of a 240x240 viewport is 200px from its centre; (16,16) is the farthest of the two candidates.
    const pos = nextPosition({ width: 240, height: 240 }, { width: 100, height: 40 }, { x: 120, y: 120 }, sequence(0.5, 0.5, 0, 0));
    expect(pos).toEqual({ x: 16, y: 16 });
  });

  // VI-TC-21
  it('returns finite non-negative coordinates when the button does not fit', () => {
    const pos = nextPosition({ width: 50, height: 30 }, { width: 100, height: 40 }, { x: 25, y: 15 }, seeded(1));
    expect(Number.isFinite(pos.x) && Number.isFinite(pos.y)).toBe(true);
    expect(pos.x).toBeGreaterThanOrEqual(0);
    expect(pos.y).toBeGreaterThanOrEqual(0);
  });
});

describe('isNear', () => {
  // VI-TC-22
  it('is true strictly within 100px of the button centre', () => {
    const rect = { left: 100, top: 100, width: 80, height: 40 }; // centre (140,120)
    expect(isNear({ x: 239, y: 120 }, rect)).toBe(true);
    expect(isNear({ x: 240, y: 120 }, rect)).toBe(false);
  });
});
```

- [ ] **Step 2: Запустити й переконатися, що падає**

Run: `npm test -- tests/dodge.test.ts`
Expected: FAIL — `Failed to resolve import "../src/dodge"`.

- [ ] **Step 3: Реалізувати `src/dodge.ts`**

```ts
export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  left: number;
  top: number;
}

export const EDGE_MARGIN = 16;
export const MIN_POINTER_DISTANCE = 200;
export const NEAR_RADIUS = 100;
export const MAX_CANDIDATES = 20;

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Top-left corner for the button: first random spot ≥ 200px from the pointer, else the farthest one. */
export function nextPosition(viewport: Size, button: Size, pointer: Point, random: () => number): Point {
  const spanX = Math.max(0, viewport.width - button.width - 2 * EDGE_MARGIN);
  const spanY = Math.max(0, viewport.height - button.height - 2 * EDGE_MARGIN);
  let best: Point = { x: EDGE_MARGIN, y: EDGE_MARGIN };
  let bestDistance = -1;
  for (let i = 0; i < MAX_CANDIDATES; i++) {
    const candidate = { x: EDGE_MARGIN + random() * spanX, y: EDGE_MARGIN + random() * spanY };
    const centre = { x: candidate.x + button.width / 2, y: candidate.y + button.height / 2 };
    const d = distance(centre, pointer);
    if (d >= MIN_POINTER_DISTANCE) return candidate;
    if (d > bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best;
}

export function isNear(pointer: Point, rect: Rect, radius = NEAR_RADIUS): boolean {
  const centre = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  return distance(pointer, centre) < radius;
}
```

- [ ] **Step 4: Запустити тести**

Run: `npm test -- tests/dodge.test.ts`
Expected: 5 тестів PASS.

- [ ] **Step 5: Commit**

```bash
git add src/dodge.ts tests/dodge.test.ts
git commit -m "feat: compute escape positions for the No button"
```

- [ ] **Step 6: Proba** — `VI-TC-18..22` → implemented (level `U`, `tests/dodge.test.ts`).

---

### Task 7: Кличний відмінок

**Files:**
- Create: `src/vocative.ts`
- Test: `tests/vocative.test.ts`

**Interfaces:**
- Consumes: `Gender` з `src/params.ts`.
- Produces:
  - `DEFAULT_GREETING = 'Друже'`
  - `interface ShevchenkoLib` і `type ShevchenkoLoader = () => Promise<ShevchenkoLib>` — щоб підмінити бібліотеку в тестах.
  - `toVocative(name: string | null, gender?: Gender | null, override?: string | null, load?: ShevchenkoLoader): Promise<string>`

- [ ] **Step 1: Звірити API встановленої `shevchenko`**

Run:
```bash
node --input-type=module -e "import * as s from 'shevchenko'; console.log(Object.keys(s)); console.log(s.GrammaticalGender); console.log(await s.detectGender({ givenName: 'Микола' })); console.log(await s.inVocative({ gender: s.GrammaticalGender.MASCULINE, givenName: 'Тарас' }));"
```
Expected: серед ключів є `inVocative`, `detectGender`, `GrammaticalGender`; `GrammaticalGender` — `{ MASCULINE: 'masculine', FEMININE: 'feminine' }`; `detectGender` → `'masculine'`; `inVocative` → обʼєкт із `givenName: 'Тарасе'`. Якщо API відрізняється, змінити лише інтерфейс `ShevchenkoLib` і тіло `try` у Step 4 — сигнатура `toVocative` лишається незмінною.

- [ ] **Step 2: Написати падаючі тести `tests/vocative.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { toVocative, type ShevchenkoLib } from '../src/vocative';

function fakeLib(overrides: Partial<ShevchenkoLib> = {}): ShevchenkoLib {
  return {
    GrammaticalGender: { MASCULINE: 'masculine', FEMININE: 'feminine' },
    detectGender: vi.fn(async () => 'masculine'),
    inVocative: vi.fn(async ({ givenName }: { givenName: string }) => ({ givenName: `${givenName}!` })),
    ...overrides,
  };
}

describe('toVocative', () => {
  // VI-TC-23
  it('declines common names with the real library', async () => {
    expect(await toVocative('Андрій')).toBe('Андрію');
    expect(await toVocative('Олена')).toBe('Олено');
    expect(await toVocative('Тарас')).toBe('Тарасе');
    expect(await toVocative('Микола')).toBe('Миколо');
  });

  // VI-TC-24
  it('prefers the override and greets «Друже» without a name', async () => {
    const lib = fakeLib();
    expect(await toVocative('Андрій', 'm', 'Андрійку', async () => lib)).toBe('Андрійку');
    expect(lib.inVocative).not.toHaveBeenCalled();
    expect(await toVocative(null)).toBe('Друже');
    expect(await toVocative('   ')).toBe('Друже');
  });

  // VI-TC-25
  it('returns the name unchanged for Latin names, unknown gender or library errors', async () => {
    const lib = fakeLib();
    expect(await toVocative('Alex', null, null, async () => lib)).toBe('Alex');
    expect(lib.detectGender).not.toHaveBeenCalled();

    const unknown = fakeLib({ detectGender: vi.fn(async () => null) });
    expect(await toVocative('Женя', null, null, async () => unknown)).toBe('Женя');

    expect(await toVocative('Андрій', null, null, async () => Promise.reject(new Error('chunk failed')))).toBe('Андрій');
    const throwing = fakeLib({ inVocative: vi.fn(async () => Promise.reject(new Error('boom'))) });
    expect(await toVocative('Андрій', null, null, async () => throwing)).toBe('Андрій');
  });

  // VI-TC-26
  it('passes an explicit gender to the library without detecting it', async () => {
    const lib = fakeLib();
    expect(await toVocative('Саша', 'f', null, async () => lib)).toBe('Саша!');
    expect(lib.detectGender).not.toHaveBeenCalled();
    expect(lib.inVocative).toHaveBeenCalledWith({ gender: 'feminine', givenName: 'Саша' });
  });
});
```

- [ ] **Step 3: Запустити й переконатися, що падає**

Run: `npm test -- tests/vocative.test.ts`
Expected: FAIL — `Failed to resolve import "../src/vocative"`.

- [ ] **Step 4: Реалізувати `src/vocative.ts`**

```ts
import type { Gender } from './params';

export const DEFAULT_GREETING = 'Друже';

/** The part of `shevchenko` we use; lets tests substitute the library. */
export interface ShevchenkoLib {
  GrammaticalGender: { MASCULINE: string; FEMININE: string };
  detectGender(input: { givenName: string }): Promise<string | null | undefined>;
  inVocative(input: { gender: string; givenName: string }): Promise<{ givenName?: string }>;
}

export type ShevchenkoLoader = () => Promise<ShevchenkoLib>;

// Dynamic import: the library is ~1 MB, so Vite puts it in its own chunk.
const loadShevchenko: ShevchenkoLoader = () => import('shevchenko') as unknown as Promise<ShevchenkoLib>;

const CYRILLIC_NAME = /^[\p{Script=Cyrillic}ʼ'’\- ]+$/u;

export async function toVocative(
  name: string | null,
  gender?: Gender | null,
  override?: string | null,
  load: ShevchenkoLoader = loadShevchenko,
): Promise<string> {
  const custom = override?.trim();
  if (custom) return custom;
  const givenName = name?.trim();
  if (!givenName) return DEFAULT_GREETING;
  if (!CYRILLIC_NAME.test(givenName)) return givenName;
  try {
    const lib = await load();
    const grammaticalGender =
      gender === 'm'
        ? lib.GrammaticalGender.MASCULINE
        : gender === 'f'
          ? lib.GrammaticalGender.FEMININE
          : await lib.detectGender({ givenName });
    if (!grammaticalGender) return givenName;
    const declined = await lib.inVocative({ gender: grammaticalGender, givenName });
    return declined.givenName || givenName;
  } catch {
    return givenName;
  }
}
```

- [ ] **Step 5: Запустити тести**

Run: `npm test -- tests/vocative.test.ts`
Expected: 4 тести PASS.

- [ ] **Step 6: Commit**

```bash
git add src/vocative.ts tests/vocative.test.ts
git commit -m "feat: decline the friend's name into the vocative case"
```

- [ ] **Step 7: Proba** — `VI-TC-23..26` → implemented (level `U`, `tests/vocative.test.ts`).

---

### Task 8: Клієнт сповіщень

**Files:**
- Create: `src/notify.ts`
- Test: `tests/notify-client.test.ts`

**Interfaces:**
- Consumes: — (**без імпортів** — тип імпортує `api/_message.ts`)
- Produces:
  - ```ts
    type NotifyEvent =
      | { type: 'accepted'; name: string; noAttempts: number }
      | { type: 'slot_selected'; name: string; slot: string; timeZone: string }
      | { type: 'calendar_clicked'; name: string; slot: string };
    ```
  - `NOTIFY_ENDPOINT = '/api/notify'`
  - `notify(event: NotifyEvent, fetchFn?: typeof fetch): void` — ніколи не кидає й нічого не повертає.

- [ ] **Step 1: Написати падаючі тести `tests/notify-client.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { notify } from '../src/notify';

describe('notify', () => {
  // VI-TC-30
  it('posts the event as JSON with keepalive', () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 204 }));
    notify({ type: 'accepted', name: 'Андрій', noAttempts: 3 }, fetchFn);
    expect(fetchFn).toHaveBeenCalledWith('/api/notify', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'accepted', name: 'Андрій', noAttempts: 3 }),
    });
  });

  // VI-TC-31
  it('swallows synchronous throws and rejected promises', async () => {
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
```

- [ ] **Step 2: Запустити й переконатися, що падає**

Run: `npm test -- tests/notify-client.test.ts`
Expected: FAIL — `Failed to resolve import "../src/notify"`.

- [ ] **Step 3: Реалізувати `src/notify.ts`**

```ts
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
```

- [ ] **Step 4: Запустити тести**

Run: `npm test -- tests/notify-client.test.ts`
Expected: 2 тести PASS.

- [ ] **Step 5: Commit**

```bash
git add src/notify.ts tests/notify-client.test.ts
git commit -m "feat: add fire-and-forget notify client"
```

- [ ] **Step 6: Proba** — `VI-TC-30, 31` → implemented (level `U`, `tests/notify-client.test.ts`).

---

### Task 9: Функція `/api/notify` → Telegram

**Files:**
- Create: `api/_message.ts`, `api/notify.ts`
- Test: `tests/notify-api.test.ts`

**Interfaces:**
- Consumes: `NotifyEvent` з `src/notify.ts` (type-only), `formatStart(iso, timeZone)` з `src/format.ts`.
- Produces:
  - `validateEvent(body: unknown): NotifyEvent | null` — рядки обрізаються до 100 code point, `name` обовʼязковий, `slot` має парситись як дата, `noAttempts` — ціле 0–10000.
  - `formatMessage(event: NotifyEvent): string`
  - `AUTHOR_TIME_ZONE = 'Europe/Kyiv'`, `MAX_BODY_BYTES = 2048`
  - `interface NotifyEnv { TELEGRAM_BOT_TOKEN?: string; TELEGRAM_CHAT_ID?: string }`
  - `handleNotify(request: Request, env: NotifyEnv, fetchFn: typeof fetch): Promise<Response>`
  - `export default { fetch(request: Request): Promise<Response> }` — точка входу Vercel.

- [ ] **Step 1: Написати падаючі тести `tests/notify-api.test.ts`**

```ts
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
```

- [ ] **Step 2: Запустити й переконатися, що падає**

Run: `npm test -- tests/notify-api.test.ts`
Expected: FAIL — `Failed to resolve import "../api/_message"`.

- [ ] **Step 3: Реалізувати `api/_message.ts`**

```ts
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
```

- [ ] **Step 4: Реалізувати `api/notify.ts`**

```ts
import { formatMessage, validateEvent } from './_message.js';

export const MAX_BODY_BYTES = 2048;

export interface NotifyEnv {
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

const status = (code: number, headers?: HeadersInit) => new Response(null, { status: code, headers });

export async function handleNotify(request: Request, env: NotifyEnv, fetchFn: typeof fetch): Promise<Response> {
  if (request.method !== 'POST') return status(405, { Allow: 'POST' });

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return status(413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return status(400);
  }
  const event = validateEvent(body);
  if (!event) return status(400);

  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = env;
  if (!token || !chatId) return status(500);

  try {
    // No parse_mode: plain text, so user-supplied names cannot inject markup.
    const telegram = await fetchFn(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: formatMessage(event) }),
    });
    return status(telegram.ok ? 204 : 502);
  } catch {
    return status(502);
  }
}

export default {
  fetch: (request: Request) => handleNotify(request, process.env, (input, init) => fetch(input, init)),
};
```

- [ ] **Step 5: Запустити тести й typecheck**

Run: `npm test -- tests/notify-api.test.ts && npx tsc --noEmit`
Expected: 9 тестів PASS; `tsc` без помилок.

- [ ] **Step 6: Commit**

```bash
git add api/_message.ts api/notify.ts tests/notify-api.test.ts
git commit -m "feat: add /api/notify Vercel function relaying events to Telegram"
```

- [ ] **Step 7: Proba** — `VI-TC-32..34` (level `U`) і `VI-TC-35..40` (level `I`) → implemented, файл `tests/notify-api.test.ts`.

---

### Task 10: Сторінка запрошення (`index.html` + `main.ts`)

**Files:**
- Create: `index.html`, `src/main.ts`, `src/style.css`

**Interfaces:**
- Consumes: `parseParams`, `InvitationParams` (Task 2); `toVocative` (Task 7); `formatSlot` (Task 4); `buildCalendarUrl`, `buildMapsUrl` (Task 5); `nextPosition`, `isNear`, `Point` (Task 6); `notify` (Task 8); `import.meta.env.VITE_HOST_EMAIL`.
- Produces: сторінку `/` з трьома екранами. DOM-логіку покривають ручні кейси `VI-TC-44..46` (Task 12).

- [ ] **Step 1: Створити `index.html`**

```html
<!doctype html>
<html lang="uk">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Повайбкодимо? 🤖☕</title>
  </head>
  <body>
    <main id="app" class="app">
      <section id="screen-invite" class="screen">
        <h1 id="invite-title" class="title"></h1>
        <p id="invite-location" class="location" hidden>
          <a id="invite-location-link" target="_blank" rel="noopener"></a>
        </p>
        <div class="actions">
          <button id="yes-btn" class="btn btn-primary" type="button">Так</button>
          <button id="no-btn" class="btn btn-secondary" type="button">Ні</button>
        </div>
      </section>

      <section id="screen-slots" class="screen" hidden>
        <h1 id="slots-title" class="title">Супер, я знав, що ти погодишся! 😎</h1>
        <p id="slots-subtitle" class="subtitle">Обери зручний час:</p>
        <div id="slots-list" class="slots"></div>
      </section>

      <section id="screen-done" class="screen" hidden>
        <h1 class="title">Вайбкодинг-сесію заплановано! 🎉</h1>
        <p id="done-when" class="subtitle"></p>
        <p id="done-location" class="location" hidden></p>
        <a id="calendar-btn" class="btn btn-primary" target="_blank" rel="noopener">Додати в Google Calendar</a>
        <button id="change-slot" class="link-btn" type="button">обрати інший час</button>
      </section>
    </main>
    <footer id="coffee-footer" class="footer">not a big deal, зробив цей додаток поки пив каву</footer>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Створити `src/style.css`**

```css
:root {
  --bg: #0f1115;
  --fg: #f2f3f5;
  --muted: #9aa0aa;
  --accent: #7c5cff;
  --accent-fg: #ffffff;
  --card: #1a1d24;
  --danger: #ff6b6b;
  color-scheme: dark;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

* { box-sizing: border-box; }

/* The hidden attribute must win over any display rule below. */
[hidden] { display: none !important; }

body {
  margin: 0;
  min-height: 100vh;
  background: var(--bg);
  color: var(--fg);
  display: flex;
  flex-direction: column;
}

.app {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  opacity: 0;
  transition: opacity 300ms ease;
}
.app.is-ready { opacity: 1; }

.screen {
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.title { font-size: clamp(1.6rem, 5vw, 2.4rem); line-height: 1.2; margin: 0; }
.subtitle { color: var(--muted); margin: 0; font-size: 1.1rem; }
.location a, .location { color: var(--fg); }

.actions { display: flex; gap: 16px; justify-content: center; }

.btn {
  font: inherit;
  font-size: 1.1rem;
  padding: 12px 28px;
  border-radius: 999px;
  border: 0;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}
.btn-primary { background: var(--accent); color: var(--accent-fg); }
.btn-secondary { background: var(--card); color: var(--fg); }

.btn-no-fixed {
  position: fixed;
  z-index: 10;
  transition: left 150ms ease, top 150ms ease;
}
@media (prefers-reduced-motion: reduce) {
  .btn-no-fixed { transition: none; }
  .app { transition: none; }
}

.slots { display: grid; gap: 12px; width: 100%; }
.slot-card {
  font: inherit;
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid #2a2f3a;
  background: var(--card);
  color: var(--fg);
  cursor: pointer;
  font-size: 1.05rem;
}
.slot-card:hover, .slot-card:focus-visible { border-color: var(--accent); }

.link-btn {
  font: inherit;
  background: none;
  border: 0;
  color: var(--muted);
  text-decoration: underline;
  cursor: pointer;
}

.footer { text-align: center; color: var(--muted); font-size: 0.85rem; padding: 16px; }

/* Builder (/create) */
.builder { max-width: 560px; margin: 0 auto; padding: 24px 16px 48px; display: grid; gap: 20px; }
.builder label, .builder fieldset { display: grid; gap: 6px; border: 0; padding: 0; margin: 0; }
.builder legend { padding: 0; margin-bottom: 6px; }
.builder input, .builder select {
  font: inherit;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #2a2f3a;
  background: var(--card);
  color: var(--fg);
}
.row { display: flex; gap: 8px; align-items: center; }
.row > input { flex: 1; }
.radios { display: flex; gap: 16px; }
.radios label { display: flex; gap: 6px; align-items: center; }
.slot-row { display: grid; grid-template-columns: 1fr auto; gap: 4px 8px; }
.slot-row.is-past input { border-color: var(--danger); }
.slot-error { grid-column: 1 / -1; color: var(--danger); font-size: 0.9rem; }
.hint { color: var(--muted); font-size: 0.9rem; margin: 0; }
.preview { font-size: 1.3rem; margin: 0; }
.result { display: grid; gap: 12px; }
.small-btn { font: inherit; padding: 8px 14px; border-radius: 8px; border: 0; background: var(--card); color: var(--fg); cursor: pointer; }
.small-btn:disabled { opacity: 0.5; cursor: not-allowed; }
```

- [ ] **Step 3: Створити `src/main.ts`**

```ts
import './style.css';
import { buildCalendarUrl, buildMapsUrl } from './calendar';
import { isNear, nextPosition, type Point } from './dodge';
import { formatSlot } from './format';
import { notify } from './notify';
import { parseParams } from './params';
import { toVocative } from './vocative';

type Screen = 'invite' | 'slots' | 'done';

const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const params = parseParams(window.location.search, new Date());
const hostEmail = import.meta.env.VITE_HOST_EMAIL?.trim() || null;
const friendTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
/** Nominative name for Telegram. */
const friendName = params.name ?? 'Друг';

const app = byId('app');
const footer = byId('coffee-footer');
const noBtn = byId<HTMLButtonElement>('no-btn');
const calendarBtn = byId<HTMLAnchorElement>('calendar-btn');

let currentScreen: Screen = 'invite';
let selectedSlot: string | null = null;
let noAttempts = 0;
let accepted = false;

function show(screen: Screen): void {
  currentScreen = screen;
  for (const name of ['invite', 'slots', 'done'] as const) {
    byId(`screen-${name}`).hidden = name !== screen;
  }
  footer.hidden = screen !== 'invite';
}

// Screen 1 — invitation. The title waits for the vocative so it never flips «Андрій» → «Андрію».
toVocative(params.name, params.gender, params.vocative).then((greeting) => {
  byId('invite-title').textContent = `${greeting}, давай повайбкодимо разом? 🤖☕`;
  app.classList.add('is-ready');
});

if (params.location) {
  const link = byId<HTMLAnchorElement>('invite-location-link');
  link.textContent = `📍 ${params.location}`;
  link.href = buildMapsUrl(params.location);
  byId('invite-location').hidden = false;
}

byId('yes-btn').addEventListener('click', () => {
  if (!accepted) {
    accepted = true;
    notify({ type: 'accepted', name: friendName, noAttempts });
  }
  renderSlots();
  show('slots');
});

// «Ні» — every way of reaching it makes it run away; no refusal action exists.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let lastDodgeAt = 0;

function buttonCentre(): Point {
  const rect = noBtn.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function dodge(pointer: Point = buttonCentre()): void {
  const now = performance.now();
  if (now - lastDodgeAt < 100) return; // a burst of events is one attempt
  lastDodgeAt = now;

  const rect = noBtn.getBoundingClientRect();
  if (!noBtn.classList.contains('btn-no-fixed')) {
    const placeholder = document.createElement('span');
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.height = `${rect.height}px`;
    placeholder.style.display = 'inline-block';
    noBtn.after(placeholder);
    noBtn.style.left = `${rect.left}px`;
    noBtn.style.top = `${rect.top}px`;
    noBtn.classList.add('btn-no-fixed');
    if (!reduceMotion.matches) void noBtn.offsetWidth; // start the transition from the current spot
  }
  const pos = nextPosition(
    { width: window.innerWidth, height: window.innerHeight },
    { width: rect.width, height: rect.height },
    pointer,
    Math.random,
  );
  noBtn.style.left = `${pos.x}px`;
  noBtn.style.top = `${pos.y}px`;
  noAttempts += 1;
}

document.addEventListener('pointermove', (event) => {
  if (currentScreen !== 'invite') return;
  const pointer = { x: event.clientX, y: event.clientY };
  if (isNear(pointer, noBtn.getBoundingClientRect())) dodge(pointer);
});
noBtn.addEventListener('pointerenter', (event) => dodge({ x: event.clientX, y: event.clientY }));
noBtn.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  dodge({ x: event.clientX, y: event.clientY });
});
noBtn.addEventListener(
  'touchstart',
  (event) => {
    event.preventDefault();
    const touch = event.touches[0];
    dodge(touch ? { x: touch.clientX, y: touch.clientY } : undefined);
  },
  { passive: false },
);
noBtn.addEventListener('focus', () => dodge());
noBtn.addEventListener('click', (event) => {
  event.preventDefault();
  dodge();
});
noBtn.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    dodge();
  }
});

// Screen 2 — slots.
function renderSlots(): void {
  const list = byId('slots-list');
  list.replaceChildren();
  if (params.slots.length === 0) {
    byId('slots-title').textContent = 'Супер, я знав, що ти погодишся! Напиши мені, коли тобі зручно';
    byId('slots-subtitle').hidden = true;
    return;
  }
  for (const slot of params.slots) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'slot-card';
    card.textContent = formatSlot(slot, params.duration, friendTimeZone);
    card.addEventListener('click', () => selectSlot(slot));
    list.append(card);
  }
}

// Screen 3 — confirmation.
function selectSlot(slot: string): void {
  selectedSlot = slot;
  notify({ type: 'slot_selected', name: friendName, slot, timeZone: friendTimeZone });
  byId('done-when').textContent = formatSlot(slot, params.duration, friendTimeZone);
  const location = byId('done-location');
  location.textContent = params.location ? `📍 ${params.location}` : '';
  location.hidden = !params.location;
  calendarBtn.href = buildCalendarUrl(slot, params.duration, params.location, hostEmail);
  show('done');
}

calendarBtn.addEventListener('click', () => {
  if (selectedSlot) notify({ type: 'calendar_clicked', name: friendName, slot: selectedSlot });
});

byId('change-slot').addEventListener('click', () => show('slots'));

show('invite');
```

- [ ] **Step 4: Перевірити типи**

Run: `npx tsc --noEmit`
Expected: без помилок. `vite build` тут не запускати — `vite.config.ts` уже посилається на `create.html`, що зʼявиться в Task 11; повна збірка — там.

- [ ] **Step 5: Димова перевірка в браузері**

Run: `npm run dev` і відкрити `http://localhost:5173/?name=Андрій&location=Lviv%20IT%20Park&slots=2030-10-01T18:00%2B03:00,2030-10-02T19:30%2B03:00`
Expected: заголовок «Андрію, давай повайбкодимо разом? 🤖☕» зʼявляється одразу у кличному (без «Андрій»); «📍 Lviv IT Park» веде на Google Maps; «Ні» тікає від курсора; «Так» → два слоти, футер зник; клік на слот → екран підтвердження; «обрати інший час» → назад. У консолі — лише помилки `POST /api/notify 404` (функція працює під `vercel dev`, не під `vite`).

- [ ] **Step 6: Commit**

```bash
git add index.html src/main.ts src/style.css
git commit -m "feat: invitation page with escaping No button, slot picker and confirmation"
```

---

### Task 11: Конструктор `/create`

**Files:**
- Create: `create.html`, `src/create.ts`

**Interfaces:**
- Consumes: `formToParams`, `buildInvitationUrl`, `FormState` (Task 3); `toVocative`, `DEFAULT_GREETING` (Task 7); `MAX_SLOTS` (Task 2); `src/style.css` (Task 10).
- Produces: сторінку `/create` (`create.html`). Покривається ручним кейсом `VI-TC-43` (Task 12).

- [ ] **Step 1: Створити `create.html`**

```html
<!doctype html>
<html lang="uk">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Створити запрошення 🤖☕</title>
  </head>
  <body>
    <main class="builder">
      <h1 class="title">Створити запрошення 🤖☕</h1>
      <form id="form" novalidate>
        <div class="builder">
          <label>
            Імʼя друга (як у паспорті)
            <input id="name" maxlength="40" required placeholder="Андрій" autocomplete="off" />
          </label>

          <label>
            Звертання
            <span class="row">
              <input id="vocative" maxlength="40" autocomplete="off" />
              <button id="vocative-reset" class="small-btn" type="button" title="Повернути автоматичне" hidden>↺</button>
            </span>
          </label>

          <fieldset>
            <legend>Стать</legend>
            <div class="radios">
              <label><input type="radio" name="gender" value="" checked /> авто</label>
              <label><input type="radio" name="gender" value="m" /> ч</label>
              <label><input type="radio" name="gender" value="f" /> ж</label>
            </div>
          </fieldset>

          <label>
            Локація
            <input id="location" maxlength="100" placeholder="Lviv IT Park" autocomplete="off" />
          </label>

          <label>
            Тривалість
            <select id="duration">
              <option value="30">30 хв</option>
              <option value="60">60 хв</option>
              <option value="90">90 хв</option>
              <option value="120" selected>120 хв</option>
              <option value="180">180 хв</option>
              <option value="240">240 хв</option>
            </select>
          </label>

          <fieldset>
            <legend>Таймслоти</legend>
            <div id="slots" class="builder" style="padding: 0; gap: 8px"></div>
            <button id="add-slot" class="small-btn" type="button">+ додати слот</button>
            <p id="tz-hint" class="hint"></p>
            <p id="no-slots-warning" class="hint" hidden>Без слотів друг просто напише тобі, коли зручно</p>
          </fieldset>
        </div>
      </form>

      <section class="result">
        <p id="preview" class="preview"></p>
        <input id="link" readonly aria-label="Посилання-запрошення" />
        <div class="row">
          <button id="copy" class="small-btn" type="button">Скопіювати</button>
          <button id="open" class="small-btn" type="button">Переглянути</button>
        </div>
      </section>
    </main>
    <script type="module" src="/src/create.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Створити `src/create.ts`**

```ts
import './style.css';
import { buildInvitationUrl, formToParams, type FormState } from './link';
import { MAX_SLOTS } from './params';
import { DEFAULT_GREETING, toVocative } from './vocative';

const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const form = byId<HTMLFormElement>('form');
const nameInput = byId<HTMLInputElement>('name');
const vocativeInput = byId<HTMLInputElement>('vocative');
const vocativeReset = byId<HTMLButtonElement>('vocative-reset');
const locationInput = byId<HTMLInputElement>('location');
const durationSelect = byId<HTMLSelectElement>('duration');
const slotsBox = byId('slots');
const addSlotBtn = byId<HTMLButtonElement>('add-slot');
const noSlotsWarning = byId('no-slots-warning');
const preview = byId('preview');
const linkInput = byId<HTMLInputElement>('link');
const copyBtn = byId<HTMLButtonElement>('copy');
const openBtn = byId<HTMLButtonElement>('open');

let autoVocative = DEFAULT_GREETING;
let vocativeLocked = false;
let url = '';

byId('tz-hint').textContent =
  `Час у твоєму поясі (${Intl.DateTimeFormat().resolvedOptions().timeZone}). Друг побачить його у своєму`;

function slotRows(): HTMLElement[] {
  return Array.from(slotsBox.querySelectorAll<HTMLElement>('.slot-row'));
}

function readForm(): FormState {
  const gender = form.querySelector<HTMLInputElement>('input[name="gender"]:checked')?.value ?? '';
  return {
    name: nameInput.value,
    vocative: vocativeInput.value,
    gender: gender === 'm' || gender === 'f' ? gender : '',
    location: locationInput.value,
    duration: Number(durationSelect.value),
    slots: slotRows().map((row) => row.querySelector('input')!.value),
  };
}

function render(): void {
  const { params, pastSlots } = formToParams(readForm(), autoVocative, new Date());
  url = params.name ? buildInvitationUrl(window.location.origin, params) : '';
  linkInput.value = url;
  copyBtn.disabled = openBtn.disabled = !url;
  preview.textContent = `${params.vocative ?? autoVocative}, давай повайбкодимо разом? 🤖☕`;

  slotRows().forEach((row, index) => {
    const past = pastSlots.includes(index);
    row.classList.toggle('is-past', past);
    row.querySelector<HTMLElement>('.slot-error')!.hidden = !past;
  });
  addSlotBtn.hidden = slotRows().length >= MAX_SLOTS;
  noSlotsWarning.hidden = params.slots.length > 0;
  vocativeReset.hidden = !vocativeLocked;
}

let vocativeRequest = 0;
async function refreshAutoVocative(): Promise<void> {
  const request = ++vocativeRequest;
  const { name, gender } = readForm();
  const result = await toVocative(name.trim() || null, gender || null);
  if (request !== vocativeRequest) return; // a newer keystroke already asked
  autoVocative = result;
  if (!vocativeLocked) vocativeInput.value = name.trim() ? result : '';
  render();
}

function addSlotRow(): void {
  const row = document.createElement('div');
  row.className = 'slot-row';

  const input = document.createElement('input');
  input.type = 'datetime-local';
  input.step = '900';
  input.addEventListener('input', render);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'small-btn';
  remove.textContent = '✕';
  remove.setAttribute('aria-label', 'Видалити слот');
  remove.addEventListener('click', () => {
    row.remove();
    render();
  });

  const error = document.createElement('span');
  error.className = 'slot-error';
  error.textContent = 'Цей час уже минув';
  error.hidden = true;

  row.append(input, remove, error);
  slotsBox.append(row);
  render();
}

nameInput.addEventListener('input', () => {
  render();
  void refreshAutoVocative();
});
form.querySelectorAll('input[name="gender"]').forEach((radio) =>
  radio.addEventListener('change', () => void refreshAutoVocative()),
);
vocativeInput.addEventListener('input', () => {
  vocativeLocked = true;
  render();
});
vocativeReset.addEventListener('click', () => {
  vocativeLocked = false;
  vocativeInput.value = nameInput.value.trim() ? autoVocative : '';
  render();
});
locationInput.addEventListener('input', render);
durationSelect.addEventListener('change', render);
addSlotBtn.addEventListener('click', addSlotRow);
form.addEventListener('submit', (event) => event.preventDefault());

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    linkInput.focus();
    linkInput.select();
    return;
  }
  copyBtn.textContent = 'Скопійовано ✓';
  setTimeout(() => (copyBtn.textContent = 'Скопіювати'), 2000);
});
openBtn.addEventListener('click', () => window.open(url, '_blank', 'noopener'));

addSlotRow();
```

- [ ] **Step 3: Перевірити типи, тести й збірку**

Run: `npm run build && npm test`
Expected: `tsc` без помилок; `vite build` створює `dist/index.html`, `dist/create.html` і в `dist/assets/` окремий chunk з кодом `shevchenko` (великий файл, не `main-*.js`); усі 42 тести PASS.

- [ ] **Step 4: Димова перевірка**

Run: `npm run dev` → `http://localhost:5173/create.html`
Expected: ввести «Андрій» → у полі «Звертання» «Андрію», прев'ю «Андрію, давай повайбкодимо разом? 🤖☕», посилання `…/?name=%D0%90…`; додати слот → у посиланні `slots=…%2B03%3A00`; «Переглянути» відкриває запрошення.

- [ ] **Step 5: Commit**

```bash
git add create.html src/create.ts
git commit -m "feat: add /create link builder"
```

---

### Task 12: README, деплой і ручна перевірка

**Files:**
- Modify: `README.md` (статус і команда тестів)

**Interfaces:**
- Consumes: усе вище.
- Produces: задеплоєний застосунок; ручні кейси `VI-TC-43..49` із результатами в Proba.

- [ ] **Step 1: Оновити README**

Замінити рядок статусу:
```markdown
> **Статус:** проєктування. Специфікація — [`docs/superpowers/specs/2026-09-28-vibecode-invitation-design.md`](docs/superpowers/specs/2026-09-28-vibecode-invitation-design.md).
```
на:
```markdown
> Специфікація — [`docs/superpowers/specs/2026-09-28-vibecode-invitation-design.md`](docs/superpowers/specs/2026-09-28-vibecode-invitation-design.md), план — [`docs/superpowers/plans/2026-09-28-vibecode-invitation.md`](docs/superpowers/plans/2026-09-28-vibecode-invitation.md).
```
і в блоці «Розробка» замінити `npm test` на:
```bash
npm test         # Vitest, TZ=Europe/Kyiv
npm run build    # typecheck + vite build
```

- [ ] **Step 2: Перевірити функцію під `vercel dev`**

Run (потрібні `npm i -g vercel`, `vercel link` і `.env.local` з трьома змінними):
```bash
vercel dev
curl -i http://localhost:3000/api/notify                                         # → 405
curl -i -X POST http://localhost:3000/api/notify -d '{"type":"nope"}'             # → 400
curl -i -X POST http://localhost:3000/api/notify -d '{"type":"accepted","name":"Тест","noAttempts":1}'  # → 204 і повідомлення в Telegram
```
Якщо `vercel dev` не розпізнає `export default { fetch }` (500 / «No exported function»), замінити в `api/notify.ts` default export на named-експорти й повторити:
```ts
const handler = (request: Request) => handleNotify(request, process.env, (input, init) => fetch(input, init));
export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
```

- [ ] **Step 3: Commit README (і фікс функції, якщо був)**

```bash
git add README.md api/notify.ts
git commit -m "docs: update README for the implemented app"
```

- [ ] **Step 4: Деплой**

Імпортувати репозиторій у Vercel, задати `VITE_HOST_EMAIL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, задеплоїти.

- [ ] **Step 5: Ручні кейси в Proba**

Створити прогін `mcp__proba__create_test_run` для сьюту `VI` з кейсами `VI-TC-43..49`, пройти кожен за його кроками в Proba на задеплоєному URL (десктоп + мобільна емуляція DevTools) і записати `mcp__proba__record_case_result`:
- `VI-TC-43` — конструктор `/create`.
- `VI-TC-44` — «Ні» не натискається мишею, тачем, Tab+Enter/Space; reduced motion.
- `VI-TC-45` — повний флоу друга, зокрема футер лише на екрані 1 та відсутність «стрибка» заголовка.
- `VI-TC-46` — `/?name=Андрій` без слотів → «Супер, я знав, що ти погодишся! Напиши мені, коли тобі зручно» і Telegram «✅ …».
- `VI-TC-47` — три Telegram-повідомлення.
- `VI-TC-48` — `/create` відкривається без `.html`, у коді `create.html` є `noindex`, на `/` немає посилання на `/create`, подія в календарі має автора гостем, `curl -i https://<домен>/api/notify` → 405.
- `VI-TC-49` — `npm run typecheck`, `npm test`, `npm run build` + окремий chunk `shevchenko`.

Для пройдених: `link_implemented_tests` з `level: "M"`, `ref: "docs/superpowers/plans/2026-09-28-vibecode-invitation.md::<назва кейсу>"`, потім `edit_test_case` → `implemented`. Закрити прогін `mcp__proba__close_test_run`.
