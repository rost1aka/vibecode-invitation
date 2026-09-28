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
