import React, { useMemo, useState } from 'react';
import { money, matchesSearch, fmtDate, fmtDateTime, enteredAt, memberName, toCSV, downloadFile } from '../lib/utils';
import { Card, Chip, Empty, EntryCard, inputCls, btnGhost } from './ui';
import Icon from './Icons';

export default function ArchiveList({ archives }) {
  const [openId, setOpenId] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const arch = archives.find((a) => a.id === openId);

  const entries = useMemo(() => (arch?.entries || []).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), [arch]);
  const cats = useMemo(() => ['All', ...new Set(entries.map((e) => e.category))], [entries]);
  const shown = entries.filter((e) => matchesSearch(e, q) && (cat === 'All' || e.category === cat));
  const shownTotal = shown.reduce((s, e) => s + Number(e.amount), 0);

  if (!archives.length) return <Empty icon="archive">No archived months yet. When an admin closes a month it appears here with every dated entry.</Empty>;

  if (arch) {
    const bd = Object.entries(arch.category_breakdowns || {}).sort((a, b) => b[1] - a[1]);
    const net = Number(arch.net_savings_loss ?? (arch.total_budget - arch.total_expense));
    return (
      <div className="space-y-5">
        <button onClick={() => { setOpenId(null); setQ(''); setCat('All'); }} className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 cursor-pointer"><Icon name="down" className="h-4 w-4 rotate-90" />All months</button>
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-xl font-black text-slate-900">{arch.month_label}</h2>
              <p className="mt-1 text-xs font-semibold text-slate-400">Expenses dated {arch.date_from} → {arch.date_to}{arch.archived_at && <> · Archived {fmtDateTime(arch.archived_at)}</>}</p></div>
            {entries.length > 0 && <button className={`${btnGhost} !h-10`} onClick={() => downloadFile(`${arch.month_label}.csv`, toCSV(entries))}><Icon name="download" className="h-4 w-4" />CSV</button>}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[['Budget', money(arch.total_budget), 'text-slate-900'], ['Spent', money(arch.total_expense), 'text-slate-900'], [net >= 0 ? 'Saved' : 'Over', money(Math.abs(net)), net >= 0 ? 'text-emerald-600' : 'text-rose-600']].map(([l, v, c]) => (
              <div key={l} className="rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{l}</p><p className={`text-lg font-black tabular-nums ${c}`}>{v}</p></div>))}
          </div>
          {bd.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{bd.map(([c, v]) => <span key={c} className="inline-flex items-center gap-2"><Chip category={c} /><span className="text-xs font-bold tabular-nums text-slate-500">{money(v)}</span></span>)}</div>}
        </Card>

        {entries.length === 0 ? (
          <Empty icon="clock">This month was archived before entry details were saved, so only the category totals above exist. Months archived from now on keep every entry with its date.</Empty>
        ) : (
          <>
            <Card className="!p-4 space-y-3">
              <div className="relative"><Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this month…" className={`${inputCls} !h-12 !pl-11`} /></div>
              <div className="flex flex-wrap gap-2">{cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold cursor-pointer ${cat === c ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{c}</button>)}</div>
              <p className="text-xs font-bold text-slate-400">{shown.length} entries · {money(shownTotal)}</p>
            </Card>
            <div className="space-y-2.5 lg:hidden">{shown.map((e) => <EntryCard key={e.id} e={e} />)}</div>
            <div className="hidden overflow-hidden rounded-3xl border border-slate-200/70 bg-white lg:block">
              <table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400"><th className="px-4 py-3.5">Date of expense</th><th className="px-4 py-3.5">Entered at</th><th className="px-4 py-3.5">Member</th><th className="px-4 py-3.5">Category / note</th><th className="px-4 py-3.5 text-right">Amount</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{shown.map((e) => (
                  <tr key={e.id}><td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-800">{fmtDate(e.created_at)}</td><td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-400">{fmtDateTime(enteredAt(e))}</td><td className="px-4 py-3.5 font-semibold text-slate-600">{memberName(e)}</td><td className="px-4 py-3.5"><Chip category={e.category} />{e.note && <span className="ml-2 text-slate-500">{e.note}</span>}</td><td className="px-4 py-3.5 text-right font-extrabold tabular-nums">{money(e.amount)}</td></tr>))}</tbody></table>
            </div>
            {shown.length === 0 && <Empty>No entries match.</Empty>}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {archives.map((a) => {
        const net = Number(a.net_savings_loss ?? (a.total_budget - a.total_expense));
        const pct = a.total_budget > 0 ? Math.min(100, (a.total_expense / a.total_budget) * 100) : 0;
        const n = (a.entries || []).length;
        return (
          <button key={a.id} onClick={() => setOpenId(a.id)} className="rounded-3xl border border-slate-200/70 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer">
            <div className="flex items-start justify-between"><h3 className="text-lg font-black text-slate-900">{a.month_label}</h3><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${net >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{net >= 0 ? 'Saved' : 'Over'} {money(Math.abs(net))}</span></div>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-400"><Icon name="calendar" className="h-3.5 w-3.5" />{a.date_from} → {a.date_to}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${net >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} /></div>
            <div className="mt-2 flex justify-between text-xs font-bold text-slate-500"><span>Spent {money(a.total_expense)}</span><span>of {money(a.total_budget)}</span></div>
            <p className="mt-3 text-[11px] font-semibold text-slate-400">{n ? `${n} dated entries` : 'Totals only'}{a.archived_at && <> · archived {fmtDate(a.archived_at)}</>}</p>
          </button>
        );
      })}
    </div>
  );
}
