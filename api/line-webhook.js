import crypto from 'node:crypto';

const raw = (req) => new Promise((resolve, reject) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => resolve(Buffer.concat(c))); req.on('error', reject); });

// Message the bot anything → it replies with your LINE user ID to paste into Expensely.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).send('ok');
  try {
    const body = await raw(req);
    const secret = process.env.LINE_CHANNEL_SECRET;
    if (secret) {
      const sig = crypto.createHmac('sha256', secret).update(body).digest('base64');
      if (sig !== req.headers['x-line-signature']) return res.status(401).send('bad signature');
    }
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const events = JSON.parse(body.toString() || '{}').events || [];
    for (const ev of events) {
      const id = ev.source?.userId;
      if (!id || !ev.replyToken || !token) continue;
      await fetch('https://api.line.me/v2/bot/message/reply', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ replyToken: ev.replyToken, messages: [{ type: 'text', text: `Your LINE user ID:\n${id}\n\nPaste it in Expensely → Reports (tap your photo, top right) to get reports here.` }] }) });
    }
  } catch { /* always acknowledge */ }
  return res.status(200).send('ok');
}
