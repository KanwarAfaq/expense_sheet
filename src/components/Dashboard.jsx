import React, { useMemo, useState } from 'react';
import { money, sumBy, monthKey, toDayInput, fmtDate } from '../lib/utils';
import { Card, Chip, EntryCard, Empty, tone } from './ui';
import Icon from './Icons';

const VIEWS = [['latest', 'Latest'], ['high', 'Highest'], ['low', 'Lowest'], ['cats', 'Categories'], ['freq', 'Frequent']];

function Tile({ label, value, sub, icon }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm shadow-slate-200/40">
      <span className="mb-2 grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon name={icon} className="h-4 w-4" /></span>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="truncate text-xl font-black tabular-nums text-slate-900">{value}</p>
      {sub && <p className="truncate text-[11px] font-semibold text-slate-400">{sub}</p>}
    </div>
  );
}

export default function Dashboard({ expenses, budget, isAdmin, onArchive, goTo, caps }) {
  const [view, setView] = useState('latest');
  const now = new Date();
  const spent = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const left = budget - spent, pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0, over = left < 0;
  const day = now.getDate(), dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const biggest = useMemo(() => expenses.reduce((m, e) => (!m || Number(e.amount) > Number(m.amount) ? e : m), null), [expenses]);

  // last 7 days spend, oldest → newest
  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i)); const k = toDayInput(d);
    return { k, label: d.toLocaleDateString('en-US', { weekday: 'narrow' }), v: expenses.filter((e) => toDayInput(e.created_at) === k).reduce((s, e) => s + Number(e.amount), 0), today: i === 6 };
  }), [expenses]); // eslint-disable-line
  const wmax = Math.max(...week.map((w) => w.v), 1);

  const rows = useMemo(() => {
    const byDate = [...expenses].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (view === 'high') return [...expenses].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 6);
    if (view === 'low') return [...expenses].sort((a, b) => Number(a.amount) - Number(b.amount)).slice(0, 6);
    if (view === 'cats') return Object.entries(sumBy(expenses, 'category')).map(([c, a]) => ({ c, a, n: expenses.filter((e) => e.category === c).length })).sort((x, y) => y.a - x.a);
    if (view === 'freq') {
      const m = new Map();
      expenses.forEach((e) => { const name = (e.note || '').trim() || e.category; const k = name.toLowerCase(); const o = m.get(k) || { name, category: e.category, count: 0, total: 0 }; o.count++; o.total += Number(e.amount); m.set(k, o); });
      return [...m.values()].sort((a, b) => b.count - a.count || b.total - a.total).slice(0, 8);
    }
    return byDate.slice(0, 5);
  }, [expenses, view]);
  const catTotal = view === 'cats' ? rows.reduce((s, r) => s + r.a, 0) || 1 : 1;

  const lastDay = dim === day;
  const oldLeft = expenses.some((e) => monthKey(e.created_at) < monthKey(now));
  const nudge = isAdmin && expenses.length > 0 && (lastDay || oldLeft);
  const setupNeeded = isAdmin && caps.checked && (!caps.settings || !caps.entries);
  const greet = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {setupNeeded && (
        <button onClick={() => goTo('admin')} className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left cursor-pointer">
          <Icon name="db" className="h-5 w-5 shrink-0 text-amber-700" /><span className="text-sm font-semibold text-amber-900">One-time database setup needed. <span className="underline">Open Admin → Settings</span></span>
        </button>
      )}
      {nudge && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="flex items-center gap-2.5 text-sm font-bold text-indigo-900"><Icon name="archive" className="h-5 w-5 text-indigo-600" />{lastDay ? 'Last day of the month — time to archive.' : 'Last month isn’t archived yet.'}</p>
          <button onClick={() => { if (window.confirm('Archive all current entries and start a fresh month?')) onArchive(); }} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white cursor-pointer">Close &amp; archive</button>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-xl shadow-indigo-500/25 sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0"><p className="text-sm font-semibold text-indigo-100">{greet} 👋</p>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-indigo-200">{over ? 'Over budget by' : 'Left this month'}</p>
              <p className="mt-1 text-5xl font-black tracking-tight tabular-nums sm:text-6xl">{money(Math.abs(left))}</p></div>
            <div className="hidden shrink-0 sm:block"><button onClick={() => goTo('add')} className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-extrabold text-indigo-700 shadow-lg shadow-black/10 transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer"><Icon name="plus" className="h-5 w-5" />Add expense</button></div>
          </div>
          <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-white/20"><div className={`h-full rounded-full transition-all duration-700 ${over ? 'bg-rose-300' : 'bg-emerald-300'}`} style={{ width: `${pct}%` }} /></div>
          <div className="mt-3 flex justify-between text-sm font-semibold text-indigo-100"><span>{money(spent)} spent</span><span>{pct.toFixed(0)}% of {money(budget)}</span></div>
        </div>
      </section>

      {/* Overview */}
      <section>
        <h2 className="mb-3 px-1 text-sm font-extrabold uppercase tracking-wider text-slate-400">Overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile icon="wallet" label="Daily average" value={money(spent / Math.max(day, 1))} sub={`day ${day} of ${dim}`} />
          <Tile icon="chart" label="On track for" value={money((spent / Math.max(day, 1)) * dim)} sub={(spent / Math.max(day, 1)) * dim > budget ? 'over budget' : 'within budget'} />
          <Tile icon="list" label="Entries" value={expenses.length} sub="this month" />
          <Tile icon="sparkle" label="Biggest" value={biggest ? money(biggest.amount) : '—'} sub={biggest ? `${biggest.category} · ${fmtDate(biggest.created_at).split(',')[1]?.trim() || ''}` : ''} />
        </div>
        <div className="mt-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm shadow-slate-200/40">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Last 7 days</p>
          <div className="flex h-24 items-end gap-2">{week.map((w) => (
            <div key={w.k} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-16 w-full items-end overflow-hidden rounded-lg bg-slate-100"><div className={`w-full rounded-lg ${w.today ? 'bg-gradient-to-t from-indigo-600 to-violet-400' : 'bg-indigo-300'}`} style={{ height: `${w.v ? Math.max(8, (w.v / wmax) * 100) : 0}%` }} /></div>
              <span className={`text-[10px] font-bold ${w.today ? 'text-indigo-600' : 'text-slate-400'}`}>{w.label}</span>
            </div>))}</div>
        </div>
      </section>

      {/* Entries with view options */}
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-extrabold tracking-tight text-slate-900">{VIEWS.find(([k]) => k === view)[1] === 'Latest' ? 'Latest entries' : VIEWS.find(([k]) => k === view)[1]}</h2><button onClick={() => goTo('history')} className="text-xs font-bold text-indigo-600 cursor-pointer">See all</button></div>
        <div className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">{VIEWS.map(([k, l]) => <button key={k} onClick={() => setView(k)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${view === k ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{l}</button>)}</div>
        {expenses.length === 0 ? <Empty icon="plus">No entries yet. Tap Add to start.</Empty> : view === 'cats' ? (
          <ul className="space-y-4">{rows.map(({ c, a, n }) => (
            <li key={c}><div className="mb-1.5 flex items-center justify-between gap-3"><span className="flex items-center gap-2"><Chip category={c} /><span className="text-xs font-semibold text-slate-400">{n}×</span></span><span className="text-sm font-extrabold tabular-nums text-slate-900">{money(a)}</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone(c)[1]}`} style={{ width: `${(a / catTotal) * 100}%` }} /></div></li>))}</ul>
        ) : view === 'freq' ? (
          <ul className="divide-y divide-slate-100">{rows.map((it) => (
            <li key={it.name} className="flex items-center gap-3 py-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-sm font-black text-indigo-600">{it.count}×</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{it.name}</span><Chip category={it.category} /></span>
              <span className="text-sm font-extrabold tabular-nums text-slate-900">{money(it.total)}</span></li>))}</ul>
        ) : <div className="space-y-2.5">{rows.map((e) => <EntryCard key={e.id} e={e} />)}</div>}
      </Card>
    </div>
  );
}
