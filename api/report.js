import { admin, buildFlex, reminderText, linePush, loadLedger, ymd, dow, isLastDay } from './_lib.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET' && req.query?.health !== undefined) {
      const has = (k) => !!(process.env[k] || '').trim();
      return res.status(200).json({ supabase_url: has('SUPABASE_URL') || has('VITE_SUPABASE_URL'), service_role_key: has('SUPABASE_SERVICE_ROLE_KEY'), line_token: has('LINE_CHANNEL_ACCESS_TOKEN'), cron_secret: has('CRON_SECRET'), vercel_env: process.env.VERCEL_ENV || null });
    }
    const db = admin();
    const auth = req.headers.authorization || '';

    // Manual "send now" from the app: signed-in user, own recipient (or any, for admins)
    if (req.method === 'POST') {
      const { data: u } = await db.auth.getUser(auth.replace(/^Bearer /i, ''));
      if (!u?.user) return res.status(401).json({ error: 'Please sign in again' });
      const { recipient_id } = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const { data: rec } = await db.from('report_recipients').select('*').eq('id', recipient_id).maybeSingle();
      if (!rec) return res.status(404).json({ error: 'Recipient not found' });
      const { data: prof } = await db.from('profiles').select('role').eq('id', u.user.id).maybeSingle();
      if (prof?.role !== 'admin' && rec.user_id !== u.user.id) return res.status(403).json({ error: 'Not allowed' });
      const { expenses, budget } = await loadLedger(db);
      await linePush(rec.line_user_id, buildFlex({ kind: 'now', expenses, budget, remind: rec.remind_archive }));
      return res.status(200).json({ ok: true });
    }

    // Scheduled run (Vercel Cron, once a day)
    if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });
    const now = new Date(), today = ymd(now), last = isLastDay(now), sunday = dow(now) === 0;
    const { data: recs } = await db.from('report_recipients').select('*');
    const { expenses, budget } = await loadLedger(db);
    const out = { sent: 0, skipped: 0, errors: [] };
    for (const r of recs || []) {
      const sentToday = r.last_sent_at && ymd(r.last_sent_at) === today;
      const kind = r.frequency === 'daily' ? 'daily' : r.frequency === 'weekly' && sunday ? 'weekly' : r.frequency === 'monthly' && last ? 'monthly' : null;
      const patch = {};
      try {
        let reportSent = false;
        if (kind && !sentToday) {
          const text = buildFlex({ kind, expenses, budget, now, remind: r.remind_archive });
          const emptyDay = kind === 'daily' && !expenses.some((e) => ymd(e.created_at) === today);
          if (emptyDay) out.skipped++; else { await linePush(r.line_user_id, text); out.sent++; reportSent = true; patch.last_sent_at = now.toISOString(); }
        }
        // Month-end archive reminder (already part of the monthly report when that was just sent)
        if (r.remind_archive && last && r.last_reminded_on !== today) {
          if (!(reportSent && kind === 'monthly')) { await linePush(r.line_user_id, reminderText()); out.sent++; }
          patch.last_reminded_on = today;
        }
        if (Object.keys(patch).length) await db.from('report_recipients').update(patch).eq('id', r.id);
      } catch (e) { out.errors.push(`${r.name || r.id}: ${e.message}`); }
    }
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
