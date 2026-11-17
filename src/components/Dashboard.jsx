import React, { useMemo, useState } from 'react';
import { money, sumBy, inRange, fmtDateShort } from '../lib/utils';
import { Card, Title, Chip, EntryCard, Empty, tone, btnPrimary, inputCls } from './ui';
import Icon from './Icons';

const PERIODS = [['month', '30 days'], ['week', '7 days'], ['all', 'All'], ['range', 'Custom']];

export default function Dashboard({ expenses, budget, isAdmin, onArchive, goTo, caps, limits = {} }) {
  const [period, setPeriod] = useState('all');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const spent = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const left = budget - spent, pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0, over = left < 0;

  const list = useMemo(() => {
    const now = Date.now();
    return expenses.filter((e) => period === 'week' ? new Date(e.created_at) >= now - 7 * 864e5 : period === 'month' ? new Date(e.created_at) >= now - 30 * 864e5 : period === 'range' ? inRange(e, from, to) : true);
  }, [expenses, period, from, to]);
  const byCat = useMemo(() => Object.entries(sumBy(list, 'category')).map(([c, a]) => ({ c, a, n: list.filter((e) => e.category === c).length })).sort((x, y) => y.a - x.a), [list]);
  const catTotal = byCat.reduce((s, x) => s + x.a, 0) || 1;
  const recent = [...expenses].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);
  const first = expenses[0] && fmtDateShort(expenses.reduce((m, e) => (e.created_at < m ? e.created_at : m), expenses[0].created_at));
  const R = 52, C = 2 * Math.PI * R;

  return (
    <div className="space-y-5">
      {isAdmin && caps.checked && (!caps.settings || !caps.entries) && (
        <button onClick={() => goTo('admin')} className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left cursor-pointer">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700"><Icon name="db" className="h-5 w-5" /></span>
          <span className="text-sm font-semibold text-amber-900">One-time setup needed to turn on the editable budget and dated archives. <span className="underline">Open Admin → Setup</span></span>
        </button>
      )}

      {/* Budget hero */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-xl shadow-indigo-500/20 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">{over ? 'Over budget by' : 'Remaining this month'}</p>
            <p className="mt-1 text-5xl font-black tracking-tight tabular-nums sm:text-6xl">{money(Math.abs(left))}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-md">
              <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur"><p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">Spent</p><p className="mt-0.5 text-xl font-extrabold tabular-nums">{money(spent)}</p></div>
              <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur"><p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">Budget</p><p className="mt-0.5 text-xl font-extrabold tabular-nums">{money(budget)}</p></div>
            </div>
            {first && <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-indigo-200"><Icon name="calendar" className="h-3.5 w-3.5" />Current ledger since {first} · {expenses.length} entries</p>}
          </div>
          <div className="relative mx-auto h-36 w-36 sm:h-40 sm:w-40">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90"><circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="11" /><circle cx="60" cy="60" r={R} fill="none" stroke={over ? '#fda4af' : '#a7f3d0'} strokeWidth="11" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100} className="transition-all duration-700" /></svg>
            <div className="absolute inset-0 grid place-items-center text-center"><div><p className="text-3xl font-black tabular-nums">{pct.toFixed(0)}%</p><p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">used</p></div></div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Category breakdown */}
        <Card className="lg:col-span-3">
          <Title icon="chart" right={<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{money(list.reduce((s, e) => s + Number(e.amount), 0))}</span>}>Spending by category</Title>
          <div className="mb-4 flex flex-wrap gap-1.5">{PERIODS.map(([k, l]) => <button key={k} onClick={() => setPeriod(k)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${period === k ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{l}</button>)}</div>
          {period === 'range' && <div className="mb-4 grid grid-cols-2 gap-3"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} /><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} /></div>}
          {byCat.length === 0 ? <Empty icon="chart">No spending in this period.</Empty> : (
            <ul className="space-y-3.5">{byCat.map(({ c, a, n }) => (
              <li key={c}><div className="mb-1.5 flex items-center justify-between gap-3"><span className="flex items-center gap-2"><Chip category={c} /><span className="text-xs font-semibold text-slate-400">{n} {n === 1 ? 'entry' : 'entries'}</span></span><span className={`text-sm font-extrabold tabular-nums ${limits[c] && a > limits[c] ? 'text-rose-600' : 'text-slate-900'}`}>{money(a)}{limits[c] ? <span className="text-xs font-semibold text-slate-400"> / {money(limits[c])}</span> : null}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone(c)[1]} transition-all duration-500`} style={{ width: `${(a / catTotal) * 100}%` }} /></div></li>
            ))}</ul>
          )}
        </Card>

        {/* Recent with dates */}
        <Card className="lg:col-span-2">
          <Title icon="clock" right={<button onClick={() => goTo('history')} className="text-xs font-bold text-indigo-600 cursor-pointer">See all</button>}>Latest entries</Title>
          {recent.length === 0 ? <Empty icon="plus">No entries yet. Add your first expense.</Empty> : <div className="space-y-2.5">{recent.map((e) => <EntryCard key={e.id} e={e} />)}</div>}
        </Card>
      </div>

      {isAdmin && (
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-extrabold text-slate-900">Close this month</p><p className="text-sm text-slate-500">Saves every entry with its date into the archive, then clears the current ledger.</p></div>
          <button onClick={() => { if (window.confirm('Archive all current entries and start a fresh month?')) onArchive(); }} className={btnPrimary}><Icon name="archive" className="h-4 w-4" />Close &amp; archive month</button>
        </Card>
      )}
    </div>
  );
}
