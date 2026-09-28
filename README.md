# vibecode-invitation 🤖☕

Персональне запрошення повайбкодити разом. Надсилаєш другу посилання з його імʼям — він погоджується (кнопка «Ні» тікає, тож вибору немає), обирає зручний час і додає подію в Google Calendar. Ти отримуєш інвайт у календар і повідомлення в Telegram.

> not a big deal, зробив цей додаток поки пив каву

> Специфікація — [`docs/superpowers/specs/2026-09-28-vibecode-invitation-design.md`](docs/superpowers/specs/2026-09-28-vibecode-invitation-design.md), план — [`docs/superpowers/plans/2026-09-28-vibecode-invitation.md`](docs/superpowers/plans/2026-09-28-vibecode-invitation.md).

## Як створити запрошення

1. Відкрий `https://<домен>/create`.
2. Введи імʼя друга (у називному відмінку) — звертання «Андрію» підставиться автоматично, за потреби виправ його чи вкажи стать.
3. Додай локацію, тривалість і таймслоти (у своєму часовому поясі; друг побачить їх у своєму).
4. Натисни **«Переглянути»**, щоб перевірити, і **«Скопіювати»**.
5. Надішли посилання другу.
6. Чекай: у Telegram прийде, що друг погодився і який час обрав, а в Google Calendar — інвайт, якщо він збереже подію.

## Як скласти посилання вручну

```
https://<домен>/?name=Андрій&location=Lviv%20IT%20Park&slots=2026-10-01T18:00%2B03:00,2026-10-02T19:30%2B03:00&duration=120
```

| Параметр | Опис | За замовчуванням |
|---|---|---|
| `name` | Імʼя друга **в називному відмінку** (до 40 символів). На сторінці автоматично стає кличним: Андрій → «Андрію» | «Друже» |
| `gender` | `m` / `f` — підказка для відмінювання, якщо автовизначення помиляється | автоматично |
| `vocative` | Готова форма звертання, якщо автоматична не подобається (`Андрійку`) | з `name` |
| `location` | Місце зустрічі, стає посиланням на Google Maps | не показується |
| `slots` | Часові вікна через кому, ISO 8601 з offset (`+` кодуй як `%2B`) | крок вибору часу пропускається |
| `duration` | Тривалість сесії у хвилинах (15–480) | 120 |

Минулі й невалідні слоти автоматично відкидаються.

## Дизайн

Хакерсько-піксельний термінал: фосфорно-зелений на чорному, Press Start 2P + JetBrains Mono, сканлайни. Макет — [artifact](https://claude.ai/artifact/Gv6V2WXDXPuhx7npvZKDj1), деталі — у специфікації (§5, «Візуальний стиль»).

## Стек

- Vite + TypeScript (vanilla)
- Vercel: статика + serverless function `api/notify.ts` для Telegram
- Vitest

## Налаштування

### Env-змінні

| Змінна | Опис |
|---|---|
| `VITE_HOST_EMAIL` | Твій email — додається гостем у подію календаря |
| `TELEGRAM_BOT_TOKEN` | Токен бота від [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | Твій chat id (напиши боту, потім відкрий `https://api.telegram.org/bot<TOKEN>/getUpdates`) |

Локально — у `.env.local` (не комітиться), на Vercel — у Project Settings → Environment Variables.

### CI і Proba

`.github/workflows/ci.yml` на кожен push у `main` і на кожен PR запускає тести, відправляє JUnit-звіт у [Proba](https://r-voitovych.proba-app.com/vibecode-invitation) (сьют `unit`) і перевіряє збірку. Деплой робить Vercel сам із `main`.

Потрібен секрет GitHub Actions `PROBA_TOKEN` (Repository → Settings → Secrets and variables → Actions) — CI-токен Proba з роллю editor. У Vercel він не потрібен.

### Розробка

```bash
npm install
npm run dev      # лише фронтенд
vercel dev       # фронтенд + /api/notify
npm test         # Vitest, TZ=Europe/Kyiv
npm run build    # typecheck + vite build
```

### Деплой

Імпортуй репозиторій у Vercel — Vite визначиться автоматично, `api/notify.ts` стане serverless-функцією. Додай env-змінні й задеплой.

## Що приходить у Telegram

- ✅ {імʼя} погодився вайбкодити! (спроб натиснути «Ні»: N)
- 🕐 {імʼя} обрав час: …
- 📅 {імʼя} натиснув «Додати в Google Calendar»
