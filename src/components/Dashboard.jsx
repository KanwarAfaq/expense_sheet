import React, { useMemo, useState } from 'react';
import { money, sumBy, monthKey } from '../lib/utils';
import { Card, Title, Chip, EntryCard, Empty, tone, btnPrimary } from './ui';
import Icon from './Icons';

const PERIODS = [['week', '7 days'], ['month', '30 days'], ['all', 'All']];

export default function Dashboard({ expenses, budget, isAdmin, onArchive, goTo, caps, limits = {} }) {
  const [period, setPeriod] = useState('all');
  const spent = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const left = budget - spent, pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0, over = left < 0;

  const list = useMemo(() => {
    const now = Date.now();
    return expenses.filter((e) => period === 'week' ? new Date(e.created_at) >= now - 7 * 864e5 : period === 'month' ? new Date(e.created_at) >= now - 30 * 864e5 : true);
  }, [expenses, period]);
  const byCat = useMemo(() => Object.entries(sumBy(list, 'category')).map(([c, a]) => ({ c, a })).sort((x, y) => y.a - x.a), [list]);
  const catTotal = byCat.reduce((s, x) => s + x.a, 0) || 1;
  const recent = [...expenses].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  // Month-end nudge for admins
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() === now.getDate();
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

      {/* Hero: one number, one bar */}
      <section className="rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/60 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-sm font-semibold text-slate-400">{greet}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-400">{over ? 'Over budget' : 'Left this month'}</p>
            <p className={`mt-1 text-5xl font-black tracking-tight tabular-nums sm:text-6xl ${over ? 'text-rose-600' : 'text-slate-900'}`}>{money(Math.abs(left))}</p></div>
          <button onClick={() => goTo('add')} className={`${btnPrimary} hidden !h-12 sm:inline-flex`}><Icon name="plus" className="h-5 w-5" />Add expense</button>
        </div>
        <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all duration-700 ${over ? 'bg-rose-500' : pct > 80 ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`} style={{ width: `${pct}%` }} /></div>
        <div className="mt-3 flex justify-between text-sm font-semibold text-slate-500"><span>{money(spent)} spent</span><span>{pct.toFixed(0)}% of {money(budget)}</span></div>
      </section>

      <Card>
        <Title right={<div className="flex gap-1 rounded-full bg-slate-100 p-1">{PERIODS.map(([k, l]) => <button key={k} onClick={() => setPeriod(k)} className={`rounded-full px-3 py-1 text-xs font-bold transition cursor-pointer ${period === k ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>{l}</button>)}</div>}>By category</Title>
        {byCat.length === 0 ? <Empty icon="chart">No spending in this period.</Empty> : (
          <ul className="space-y-4">{byCat.slice(0, 6).map(({ c, a }) => (
            <li key={c}><div className="mb-1.5 flex items-center justify-between gap-3"><Chip category={c} /><span className={`text-sm font-extrabold tabular-nums ${limits[c] && a > limits[c] ? 'text-rose-600' : 'text-slate-900'}`}>{money(a)}{limits[c] ? <span className="text-xs font-semibold text-slate-400"> / {money(limits[c])}</span> : null}</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone(c)[1]} transition-all duration-500`} style={{ width: `${(a / catTotal) * 100}%` }} /></div></li>
          ))}</ul>
        )}
      </Card>

      <Card>
        <Title right={<button onClick={() => goTo('history')} className="text-xs font-bold text-indigo-600 cursor-pointer">See all</button>}>Latest</Title>
        {recent.length === 0 ? <Empty icon="plus">No entries yet. Tap Add to start.</Empty> : <div className="space-y-2.5">{recent.map((e) => <EntryCard key={e.id} e={e} />)}</div>}
      </Card>
    </div>
  );
}
