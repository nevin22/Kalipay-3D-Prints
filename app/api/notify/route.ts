// Tells the owner on Discord that a 3MF was downloaded. The webhook URL stays on the server.
const lastSeen = new Map<string, number>();

export async function POST(request: Request) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return new Response(null, { status: 204 });

  // shortcut: in-memory limit is per server instance, move to a shared store if abused.
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const now = Date.now();
  if (now - (lastSeen.get(ip) ?? 0) < 5000) return new Response(null, { status: 429 });
  lastSeen.set(ip, now);

  const { text } = await request.json().catch(() => ({ text: "" }));
  if (typeof text !== "string" || !text) return new Response(null, { status: 400 });

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // No mentions, so a crafted legend text can't ping anyone.
    body: JSON.stringify({ content: text.slice(0, 500), allowed_mentions: { parse: [] } }),
  }).catch(() => {});
  return new Response(null, { status: 204 });
}
