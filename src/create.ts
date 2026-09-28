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
const previewMeta = byId('preview-meta');
const slotCount = byId('slot-count');
const linkInput = byId<HTMLTextAreaElement>('link');
const copyBtn = byId<HTMLButtonElement>('copy');
const openBtn = byId<HTMLButtonElement>('open');

let autoVocative = DEFAULT_GREETING;
let vocativeLocked = false;
let url = '';

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
byId('bar-tz').textContent = `tz: ${timeZone}`;
byId('tz-hint').textContent = `Час у твоєму поясі (${timeZone}). Друг побачить його у своєму`;

/** 1 слот, 2 слоти, 5 слотів */
function slotsLabel(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} слот`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} слоти`;
  return `${n} слотів`;
}

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
  preview.textContent = `${params.vocative ?? autoVocative}, давай повайбкодимо разом?`;
  previewMeta.textContent = [
    params.location && `@ ${params.location}`,
    params.slots.length ? slotsLabel(params.slots.length) : 'без слотів',
    `${params.duration} хв`,
  ]
    .filter(Boolean)
    .join(' · ');

  const rows = slotRows();
  rows.forEach((row, index) => {
    const past = pastSlots.includes(index);
    row.classList.toggle('is-past', past);
    row.querySelector<HTMLElement>('.slot-num')!.textContent = String(index + 1).padStart(2, '0');
    row.querySelector('input')!.setAttribute('aria-label', `Слот ${index + 1}`);
    row.querySelector('input')!.setAttribute('aria-invalid', String(past));
    row.querySelector('.icon-btn')!.setAttribute('aria-label', `Видалити слот ${index + 1}`);
    row.querySelector<HTMLElement>('.slot-error')!.hidden = !past;
  });
  slotCount.textContent = String(rows.length);
  addSlotBtn.hidden = rows.length >= MAX_SLOTS;
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

  const num = document.createElement('span');
  num.className = 'slot-num';
  num.setAttribute('aria-hidden', 'true');

  const input = document.createElement('input');
  input.type = 'datetime-local';
  input.step = '900';
  input.className = 'in';
  input.addEventListener('input', render);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'icon-btn';
  remove.textContent = '✕';
  remove.addEventListener('click', () => {
    row.remove();
    render();
  });

  const error = document.createElement('span');
  error.className = 'slot-error';
  error.textContent = '! ERR: Цей час уже минув';
  error.hidden = true;

  row.append(num, input, remove, error);
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
