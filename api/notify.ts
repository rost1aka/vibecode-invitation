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
