export const CURRENCY = '$';
export const DEFAULT_CATEGORIES = ['Food', 'Bills', 'Leisure', 'Transit'];

export const money = (n, opts = {}) => {
  const v = Number(n) || 0;
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: opts.decimals ?? 2, maximumFractionDigits: opts.decimals ?? 2 });
  return `${v < 0 ? '-' : ''}${CURRENCY}${s}`;
};

const D = (v) => (v instanceof Date ? v : new Date(v));
export const fmtDate = (v) => (v ? D(v).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateShort = (v) => (v ? D(v).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtTime = (v) => (v ? D(v).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '');
export const fmtDateTime = (v) => (v ? `${fmtDateShort(v)}, ${fmtTime(v)}` : '—');
export const toDayInput = (v = new Date()) => { const d = D(v); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
export const monthKey = (v) => toDayInput(v).slice(0, 7);
export const monthLabel = (k) => new Date(`${k}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

// An entry carries two dates: the day the money was spent (created_at) and the moment it was typed in (entered_at).
export const enteredAt = (e) => e.entered_at || e.created_at;
export const hasSeparateEntered = (e) => !!e.entered_at && Math.abs(new Date(e.entered_at) - new Date(e.created_at)) > 12 * 3600e3;

export const memberName = (e) => e.member || e.profiles?.full_name || 'Unknown';

// Free-text search across everything a person could remember about an entry, including the date in several spellings.
export function matchesSearch(e, q) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [e.category, e.note, memberName(e), String(e.amount), fmtDate(e.created_at), fmtDateShort(e.created_at), toDayInput(e.created_at), fmtDateShort(enteredAt(e))].join(' ').toLowerCase();
  return s.split(/\s+/).every((t) => hay.includes(t));
}

export function inRange(e, from, to) {
  const t = new Date(e.created_at);
  if (from && t < new Date(`${from}T00:00:00`)) return false;
  if (to && t > new Date(`${to}T23:59:59`)) return false;
  return true;
}

export const sumBy = (list, key) => {
  const m = {};
  list.forEach((e) => { const k = typeof key === 'function' ? key(e) : e[key]; m[k] = (m[k] || 0) + Number(e.amount); });
  return m;
};

export function toCSV(rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Date', 'Entered at', 'Member', 'Category', 'Amount', 'Note'];
  return [head, ...rows.map((e) => [toDayInput(e.created_at), fmtDateTime(enteredAt(e)), memberName(e), e.category, Number(e.amount).toFixed(2), e.note || ''])].map((r) => r.map(esc).join(',')).join('\n');
}
export function downloadFile(name, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Categories the user has ever used (current ledger + archived entries + old archive totals), most-used first.
export function collectCategories(expenses, archives, saved = []) {
  const count = {};
  const bump = (c, n = 1) => { if (c && String(c).trim()) count[String(c).trim()] = (count[String(c).trim()] || 0) + n; };
  expenses.forEach((e) => bump(e.category));
  archives.forEach((a) => { (a.entries || []).forEach((e) => bump(e.category)); Object.keys(a.category_breakdowns || {}).forEach((c) => bump(c, 0.01)); });
  saved.forEach((c) => bump(c, 0.001));
  DEFAULT_CATEGORIES.forEach((c) => bump(c, 0.0001));
  return Object.entries(count).sort((a, b) => b[1] - a[1]).map(([c]) => c);
}
// note -> most recent category used with that note
export function noteCategoryMap(expenses, archives) {
  const all = [...archives.flatMap((a) => a.entries || []), ...expenses].filter((e) => e.note && e.note.trim()).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const m = {}; all.forEach((e) => { m[e.note.trim().toLowerCase()] = { note: e.note.trim(), category: e.category }; });
  return m;
}
