import { createClient } from '@supabase/supabase-js';

export const TZ = 'Asia/Taipei';
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
export const ymd = (d) => fmt.format(new Date(d)); // YYYY-MM-DD in Taipei
const noon = (s) => new Date(`${s}T12:00:00Z`);
export const dow = (d) => noon(ymd(d)).getUTCDay(); // 0 = Sunday
export const isLastDay = (d) => { const t = noon(ymd(d)); return new Date(t.getTime() + 864e5).getUTCMonth() !== t.getUTCMonth(); };
export const money = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const short = (iso) => { const [, m, d] = ymd(iso).split('-'); return `${Number(m)}/${Number(d)}`; };
const sum = (l) => l.reduce((s, e) => s + Number(e.amount), 0);

export const admin = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in Vercel');
  return createClient(url, key, { auth: { persistSession: false } });
};

export function buildReport({ kind, expenses, budget, now = new Date(), remind = false }) {
  const today = ymd(now);
  const weekStart = ymd(new Date(now.getTime() - 6 * 864e5));
  const list = kind === 'daily' ? expenses.filter((e) => ymd(e.created_at) === today)
    : kind === 'weekly' ? expenses.filter((e) => ymd(e.created_at) >= weekStart && ymd(e.created_at) <= today)
    : expenses;
  const title = { daily: `Daily report · ${short(now)}`, weekly: `Weekly report · ${short(new Date(now.getTime() - 6 * 864e5))}–${short(now)}`, monthly: `Monthly report · ${new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'long', year: 'numeric' }).format(now)}`, now: `Expense summary · ${short(now)}` }[kind];
  const total = sum(list), ledger = sum(expenses), left = budget - ledger;
  const cats = Object.entries(list.reduce((m, e) => ((m[e.category] = (m[e.category] || 0) + Number(e.amount)), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const latest = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  const lines = [`📊 ${title}`, '',
    `${kind === 'monthly' || kind === 'now' ? 'Spent this month' : 'Spent in this period'}: ${money(total)} (${list.length} ${list.length === 1 ? 'entry' : 'entries'})`,
    `Budget: ${money(ledger)} of ${money(budget)} used · ${left >= 0 ? `${money(left)} left` : `${money(-left)} over`}`];
  if (cats.length) lines.push('', 'Top categories', ...cats.map(([c, v]) => `• ${c}  ${money(v)}`));
  if (latest.length) lines.push('', 'Latest entries', ...latest.map((e) => `• ${short(e.created_at)}  ${e.category}  ${money(e.amount)}${e.note ? `  (${e.note})` : ''}`));
  if (remind && isLastDay(now)) lines.push('', '⏰ Last day of the month — open Expensely → Admin and close & archive it.');
  return lines.join('\n').slice(0, 4900);
}

export const reminderText = () => '⏰ Expensely: today is the last day of the month. Open Expensely → Admin → Close & archive so the month is saved with every entry.';

export async function linePush(to, text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set in Vercel');
  const r = await fetch('https://api.line.me/v2/bot/message/push', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ to, messages: [{ type: 'text', text }] }) });
  if (!r.ok) throw new Error(`LINE rejected the message (${r.status}): ${(await r.text()).slice(0, 160)}`);
}

export async function loadLedger(db) {
  const [{ data: expenses }, { data: b }] = await Promise.all([db.from('expenses').select('*').order('created_at', { ascending: true }), db.from('app_settings').select('value').eq('key', 'monthly_budget').maybeSingle()]);
  const budget = Number(b?.value) > 0 ? Number(b.value) : 4500;
  return { expenses: expenses || [], budget };
}
