#!/usr/bin/env node
/**
 * Filey — Telegram ↔ Claude bridge
 *
 * Standalone Node process. Long-polls Telegram getUpdates, forwards each
 * chat message to the Claude Messages API, streams the reply back to the
 * chat. Per-chat conversation history, a stable cached system prompt, and
 * prompt caching on the growing conversation prefix.
 *
 * Run (Node 20.6+, from the filey-erp directory so @anthropic-ai/sdk resolves):
 *   node --env-file=bot/.env bot/telegram-claude-bot.mjs
 * or with the vars exported in the environment:
 *   node bot/telegram-claude-bot.mjs
 *
 * Required env:
 *   TELEGRAM_BOT_TOKEN   from @BotFather
 *   ANTHROPIC_API_KEY    from console.anthropic.com
 * Optional env:
 *   CLAUDE_MODEL         default "claude-sonnet-4-6"
 *   BOT_SYSTEM_PROMPT    override the system prompt
 *   ALLOWED_CHAT_IDS     comma-separated allowlist; if set, others are ignored
 */

import Anthropic from "@anthropic-ai/sdk";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
const MAX_TOKENS = 1024;
const HISTORY_TURNS = 20; // keep last N messages (user+assistant) per chat
const TG_MAX = 4096; // Telegram hard message-length limit

const SYSTEM_PROMPT =
  process.env.BOT_SYSTEM_PROMPT ||
  "You are Filey's assistant, reached over Telegram. Be concise and direct — " +
    "most replies should be a few sentences. Use plain text (no Markdown " +
    "tables or code fences unless the user asks for code). If you don't know, " +
    "say so.";

const allowList = (process.env.ALLOWED_CHAT_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!TELEGRAM_BOT_TOKEN) {
  console.error("Missing TELEGRAM_BOT_TOKEN. Get one from @BotFather.");
  process.exit(1);
}
if (!ANTHROPIC_API_KEY) {
  console.error(
    "Missing ANTHROPIC_API_KEY. Get one from https://console.anthropic.com."
  );
  process.exit(1);
}

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY from env
const TG = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/** chatId -> Anthropic.MessageParam[] */
const histories = new Map();

// ---------- Telegram helpers ----------

async function tg(method, body) {
  const res = await fetch(`${TG}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram ${method} failed: ${JSON.stringify(data)}`);
  }
  return data.result;
}

async function sendMessage(chatId, text) {
  // Telegram rejects messages over 4096 chars — split on paragraph/space.
  const chunks = [];
  let rest = text.length ? text : "(empty response)";
  while (rest.length > TG_MAX) {
    let cut = rest.lastIndexOf("\n", TG_MAX);
    if (cut < TG_MAX * 0.5) cut = rest.lastIndexOf(" ", TG_MAX);
    if (cut < TG_MAX * 0.5) cut = TG_MAX;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  chunks.push(rest);
  for (const c of chunks) {
    await tg("sendMessage", { chat_id: chatId, text: c });
  }
}

// ---------- Claude ----------

async function askClaude(chatId, userText) {
  const history = histories.get(chatId) || [];
  history.push({ role: "user", content: userText });

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    // Snappy chat: no extended thinking, low effort. Raise if you want
    // deeper answers at the cost of latency/tokens.
    thinking: { type: "disabled" },
    output_config: { effort: "low" },
    // Stable, cached system prompt (frozen — no timestamps/IDs interpolated).
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    // Auto-cache the last cacheable block so the growing conversation
    // prefix is reused across turns.
    cache_control: { type: "ephemeral" },
    messages: history,
  });

  const reply = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  history.push({ role: "assistant", content: response.content });

  // Bound context: keep the last HISTORY_TURNS messages.
  if (history.length > HISTORY_TURNS) {
    history.splice(0, history.length - HISTORY_TURNS);
  }
  histories.set(chatId, history);

  const u = response.usage;
  console.log(
    `[claude] chat=${chatId} in=${u.input_tokens} out=${u.output_tokens} ` +
      `cache_read=${u.cache_read_input_tokens ?? 0} ` +
      `cache_write=${u.cache_creation_input_tokens ?? 0}`
  );

  return reply || "(no text in response)";
}

// ---------- Message handling ----------

async function handleMessage(msg) {
  const chatId = msg.chat?.id;
  const text = msg.text;
  if (chatId == null || typeof text !== "string") return;

  if (allowList.length && !allowList.includes(String(chatId))) {
    console.log(`[skip] chat ${chatId} not in ALLOWED_CHAT_IDS`);
    return;
  }

  const cmd = text.trim().toLowerCase();
  if (cmd === "/start") {
    histories.delete(chatId);
    await sendMessage(
      chatId,
      "Filey assistant connected. Send a message and I'll reply. " +
        "/reset clears our conversation, /help for info."
    );
    return;
  }
  if (cmd === "/reset") {
    histories.delete(chatId);
    await sendMessage(chatId, "Conversation cleared.");
    return;
  }
  if (cmd === "/help") {
    await sendMessage(
      chatId,
      `Bridged to Claude (${MODEL}). Just type to chat. ` +
        "Commands: /start, /reset, /help."
    );
    return;
  }

  try {
    await tg("sendChatAction", { chat_id: chatId, action: "typing" });
    const reply = await askClaude(chatId, text);
    await sendMessage(chatId, reply);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      await sendMessage(chatId, "Rate limited — try again in a moment.");
    } else if (err instanceof Anthropic.APIError) {
      console.error(`[anthropic] ${err.status}: ${err.message}`);
      await sendMessage(chatId, `Claude API error (${err.status}).`);
    } else {
      console.error("[handle] ", err);
      await sendMessage(chatId, "Something went wrong handling that.");
    }
  }
}

// ---------- Long-poll loop ----------

async function main() {
  const me = await tg("getMe", {});
  console.log(
    `Bot @${me.username} online. Model=${MODEL}. ` +
      (allowList.length
        ? `Allowlist: ${allowList.join(", ")}`
        : "Open to all chats.")
  );

  let offset = 0;
  // Drop any backlog so we don't replay old messages on restart.
  try {
    const stale = await tg("getUpdates", { offset: -1, timeout: 0 });
    if (stale.length) offset = stale[stale.length - 1].update_id + 1;
  } catch {
    /* ignore — first poll will establish offset */
  }

  for (;;) {
    let updates;
    try {
      updates = await tg("getUpdates", {
        offset,
        timeout: 50,
        allowed_updates: ["message"],
      });
    } catch (err) {
      console.error("[poll] ", err?.message || err);
      await new Promise((r) => setTimeout(r, 3000)); // backoff, then retry
      continue;
    }

    for (const update of updates) {
      offset = update.update_id + 1;
      if (update.message) {
        // Don't await sequentially-block the loop on a slow Claude call,
        // but do isolate failures per message.
        handleMessage(update.message).catch((e) =>
          console.error("[handle:async] ", e)
        );
      }
    }
  }
}

process.on("SIGINT", () => {
  console.log("\nShutting down.");
  process.exit(0);
});

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
