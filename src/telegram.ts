// Telegram Bot API helpers

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; username?: string; first_name: string };
    chat: { id: number; type: string };
    text?: string;
    date: number;
  };
}

export interface TelegramSendResult {
  ok: boolean;
  result?: { message_id: number };
  description?: string;
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string | number,
  text: string,
  parseMode: "HTML" | "Markdown" | undefined = "HTML"
): Promise<TelegramSendResult> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
  };
  if (parseMode) body.parse_mode = parseMode;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return res.json() as Promise<TelegramSendResult>;
}

export async function setWebhook(
  botToken: string,
  webhookUrl: string,
  secret?: string
): Promise<{ ok: boolean; description?: string }> {
  const url = `https://api.telegram.org/bot${botToken}/setWebhook`;
  const body: Record<string, unknown> = { url: webhookUrl };
  if (secret) body.secret_token = secret;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ ok: boolean; description?: string }>;
}

export async function deleteWebhook(
  botToken: string
): Promise<{ ok: boolean }> {
  const url = `https://api.telegram.org/bot${botToken}/deleteWebhook`;
  const res = await fetch(url, { method: "POST" });
  return res.json() as Promise<{ ok: boolean }>;
}

export async function getBotInfo(
  botToken: string
): Promise<{ ok: boolean; result?: { id: number; username: string; first_name: string } }> {
  const url = `https://api.telegram.org/bot${botToken}/getMe`;
  const res = await fetch(url);
  return res.json() as Promise<{ ok: boolean; result?: { id: number; username: string; first_name: string } }>;
}
