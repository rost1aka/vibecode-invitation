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
