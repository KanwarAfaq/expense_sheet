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
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/^["']|["']$/g, '');
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

const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6'];
const t = (text, o = {}) => ({ type: 'text', text: String(text), wrap: true, ...o });
const bar = (pct, color, track = '#eef2ff', h = '6px') => ({ type: 'box', layout: 'horizontal', height: h, backgroundColor: track, cornerRadius: '4px', contents: [{ type: 'box', layout: 'vertical', width: `${Math.max(2, Math.min(100, Math.round(pct)))}%`, backgroundColor: color, cornerRadius: '4px', contents: [{ type: 'filler' }] }] });

export function buildFlex({ kind, expenses, budget, now = new Date(), remind = false }) {
  const altText = buildReport({ kind, expenses, budget, now, remind }).split('\n').slice(0, 4).join(' · ').slice(0, 390);
  const today = ymd(now), weekStart = ymd(new Date(now.getTime() - 6 * 864e5));
  const list = kind === 'daily' ? expenses.filter((e) => ymd(e.created_at) === today) : kind === 'weekly' ? expenses.filter((e) => ymd(e.created_at) >= weekStart && ymd(e.created_at) <= today) : expenses;
  const label = { daily: 'DAILY REPORT', weekly: 'WEEKLY REPORT', monthly: 'MONTHLY REPORT', now: 'SUMMARY' }[kind];
  const sub = { daily: short(now), weekly: `${short(new Date(now.getTime() - 6 * 864e5))} – ${short(now)}`, monthly: new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'long', year: 'numeric' }).format(now), now: short(now) }[kind];
  const ledger = sum(expenses), left = budget - ledger, pct = budget > 0 ? (ledger / budget) * 100 : 0, over = left < 0;
  const total = sum(list);
  const cats = Object.entries(list.reduce((m, e) => ((m[e.category] = (m[e.category] || 0) + Number(e.amount)), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const top = cats[0]?.[1] || 1;
  const latest = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  const body = [
    { type: 'box', layout: 'horizontal', spacing: 'md', contents: [
      { type: 'box', layout: 'vertical', flex: 1, backgroundColor: '#f8fafc', cornerRadius: '12px', paddingAll: '12px', contents: [t('SPENT', { size: 'xxs', color: '#94a3b8', weight: 'bold' }), t(money(total), { size: 'lg', weight: 'bold', color: '#0f172a' })] },
      { type: 'box', layout: 'vertical', flex: 1, backgroundColor: '#f8fafc', cornerRadius: '12px', paddingAll: '12px', contents: [t('ENTRIES', { size: 'xxs', color: '#94a3b8', weight: 'bold' }), t(String(list.length), { size: 'lg', weight: 'bold', color: '#0f172a' })] },
    ] },
  ];
  if (cats.length) {
    body.push({ type: 'separator', margin: 'lg', color: '#f1f5f9' }, t('TOP CATEGORIES', { size: 'xxs', color: '#94a3b8', weight: 'bold', margin: 'lg' }));
    cats.forEach(([c, v], i) => body.push({ type: 'box', layout: 'vertical', margin: 'md', spacing: 'xs', contents: [
      { type: 'box', layout: 'horizontal', contents: [t(c, { size: 'sm', weight: 'bold', color: '#334155', flex: 3 }), t(money(v), { size: 'sm', weight: 'bold', color: '#0f172a', align: 'end', flex: 2 })] },
      bar((v / top) * 100, PALETTE[i % PALETTE.length], '#f1f5f9'),
    ] }));
  }
  if (latest.length) {
    body.push({ type: 'separator', margin: 'lg', color: '#f1f5f9' }, t('LATEST', { size: 'xxs', color: '#94a3b8', weight: 'bold', margin: 'lg' }));
    latest.forEach((e) => body.push({ type: 'box', layout: 'horizontal', margin: 'md', spacing: 'sm', contents: [
      t(short(e.created_at), { size: 'xs', color: '#94a3b8', flex: 1 }),
      { type: 'box', layout: 'vertical', flex: 4, contents: [t(e.category, { size: 'sm', weight: 'bold', color: '#334155' }), ...(e.note ? [t(e.note, { size: 'xs', color: '#94a3b8' })] : [])] },
      t(money(e.amount), { size: 'sm', weight: 'bold', color: '#0f172a', align: 'end', flex: 2 }),
    ] }));
  }
  if (remind && isLastDay(now)) body.push({ type: 'box', layout: 'vertical', margin: 'xl', backgroundColor: '#fffbeb', cornerRadius: '12px', paddingAll: '12px', contents: [t('⏰ Last day of the month', { size: 'sm', weight: 'bold', color: '#b45309' }), t('Open Expensely → Admin and close & archive this month.', { size: 'xs', color: '#b45309', margin: 'xs' })] });

  return {
    type: 'flex', altText,
    contents: {
      type: 'bubble', size: 'mega',
      header: { type: 'box', layout: 'vertical', paddingAll: '20px', paddingBottom: '18px', background: { type: 'linearGradient', angle: '135deg', startColor: '#4f46e5', endColor: '#7c3aed' }, contents: [
        { type: 'box', layout: 'horizontal', contents: [t(`EXPENSELY · ${label}`, { size: 'xxs', color: '#c7d2fe', weight: 'bold', flex: 5 }), t(sub, { size: 'xxs', color: '#c7d2fe', align: 'end', flex: 3 })] },
        t(over ? 'OVER BUDGET' : 'LEFT THIS MONTH', { size: 'xxs', color: '#c7d2fe', margin: 'lg' }),
        t(money(Math.abs(left)), { size: '3xl', weight: 'bold', color: '#ffffff' }),
        { type: 'box', layout: 'vertical', margin: 'lg', contents: [bar(pct, over ? '#fda4af' : '#a7f3d0', '#6d63e8', '8px')] },
        { type: 'box', layout: 'horizontal', margin: 'sm', contents: [t(`${money(ledger)} spent`, { size: 'xs', color: '#e0e7ff', flex: 1 }), t(`${Math.round(pct)}% of ${money(budget)}`, { size: 'xs', color: '#e0e7ff', align: 'end', flex: 1 })] },
      ] },
      body: { type: 'box', layout: 'vertical', paddingAll: '20px', contents: body },
      footer: { type: 'box', layout: 'vertical', paddingAll: '12px', contents: [{ type: 'button', style: 'primary', color: '#4f46e5', height: 'sm', action: { type: 'uri', label: 'Open Expensely', uri: process.env.APP_URL || 'https://expense-sheet-kmafaq.vercel.app' } }] },
      styles: { footer: { separator: false } },
    },
  };
}

export const reminderText = () => '⏰ Expensely: today is the last day of the month. Open Expensely → Admin → Close & archive so the month is saved with every entry.';

export async function linePush(to, message) {
  const msg = typeof message === 'string' ? { type: 'text', text: message } : message;
  const token = (process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim().replace(/^["']|["']$/g, '');
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set in Vercel');
  const r = await fetch('https://api.line.me/v2/bot/message/push', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ to, messages: [msg] }) });
  if (!r.ok) throw new Error(`LINE rejected the message (${r.status}): ${(await r.text()).slice(0, 160)}`);
}

export async function loadLedger(db) {
  const [{ data: expenses }, { data: b }] = await Promise.all([db.from('expenses').select('*').order('created_at', { ascending: true }), db.from('app_settings').select('value').eq('key', 'monthly_budget').maybeSingle()]);
  const budget = Number(b?.value) > 0 ? Number(b.value) : 4500;
  return { expenses: expenses || [], budget };
}
