import React, { useMemo, useState } from 'react';
import { money, matchesSearch, inRange, memberName, fmtDate, fmtDateTime, enteredAt, hasSeparateEntered, toDayInput, toCSV, downloadFile } from '../lib/utils';
import { Card, Chip, Avatar, EntryCard, Empty, Field, inputCls, btnGhost, btnPrimary } from './ui';
import Icon from './Icons';

const PERIODS = [['all', 'All'], ['week', '7 days'], ['month', '30 days'], ['range', 'Dates']];

export function EditBox({ item, categories, onSave, onCancel }) {
  const [d, setD] = useState({ amount: item.amount, category: item.category, note: item.note || '', date: toDayInput(item.created_at) });
  return (
    <div className="mt-3 rounded-2xl bg-indigo-50/70 p-4 ring-1 ring-indigo-100">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Date"><input type="date" className={inputCls} value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} /></Field>
        <Field label="Category"><input list="cat-edit" className={inputCls} value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} /><datalist id="cat-edit">{categories.map((c) => <option key={c} value={c} />)}</datalist></Field>
        <Field label="Amount"><input type="number" step="0.01" className={inputCls} value={d.amount} onChange={(e) => setD({ ...d, amount: e.target.value })} /></Field>
        <Field label="Note"><input className={inputCls} value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} /></Field>
      </div>
      <div className="mt-3 flex gap-2">
        <button className={`${btnPrimary} !h-10`} onClick={() => onSave({ amount: parseFloat(d.amount), category: d.category.trim(), note: d.note, created_at: d.date === toDayInput(item.created_at) ? item.created_at : new Date(`${d.date}T12:00:00`).toISOString() })}>Save changes</button>
        <button className={`${btnGhost} !h-10`} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function ExpenseList({ rawExpenses, categories, onDeleteExpense, onUpdateExpense, currentUser }) {
  const isAdmin = currentUser?.role === 'admin';
  const [q, setQ] = useState('');
  const [period, setPeriod] = useState('all');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [cat, setCat] = useState('All'); const [who, setWho] = useState('All');
  const [order, setOrder] = useState('new');
  const [mode, setMode] = useState('entries'); // entries | items
  const [itemSort, setItemSort] = useState('count');
  const [skip, setSkip] = useState([]);
  const [editing, setEditing] = useState(null);

  const members = useMemo(() => ['All', ...new Set(rawExpenses.map(memberName))], [rawExpenses]);
  const cats = useMemo(() => ['All', ...new Set(rawExpenses.map((e) => e.category))], [rawExpenses]);

  const rows = useMemo(() => {
    const now = Date.now();
    const f = rawExpenses.filter((e) => matchesSearch(e, q) && (cat === 'All' || e.category === cat) && (who === 'All' || memberName(e) === who)
      && (period === 'week' ? new Date(e.created_at) >= now - 7 * 864e5 : period === 'month' ? new Date(e.created_at) >= now - 30 * 864e5 : period === 'range' ? inRange(e, from, to) : true));
    let run = 0;
    const withRun = f.map((e) => { run += skip.includes(e.id) ? 0 : Number(e.amount); return { ...e, running: run }; });
    if (order === 'high') return [...withRun].sort((a, b) => Number(b.amount) - Number(a.amount));
    if (order === 'low') return [...withRun].sort((a, b) => Number(a.amount) - Number(b.amount));
    return order === 'new' ? withRun.reverse() : withRun;
  }, [rawExpenses, q, cat, who, period, from, to, skip, order]);

  const items = useMemo(() => {
    const m = new Map();
    rows.forEach((e) => {
      const name = (e.note || '').trim() || e.category; const k = name.toLowerCase();
      const o = m.get(k) || { name, category: e.category, count: 0, total: 0, last: e.created_at };
      o.count += 1; o.total += Number(e.amount); if (e.created_at > o.last) o.last = e.created_at; m.set(k, o);
    });
    const arr = [...m.values()];
    return arr.sort((a, b) => itemSort === 'total' ? b.total - a.total : itemSort === 'recent' ? (a.last < b.last ? 1 : -1) : b.count - a.count || b.total - a.total);
  }, [rows, itemSort]);
  const byDay = order === 'new' || order === 'old';
  const total = rows.reduce((s, e) => s + (skip.includes(e.id) ? 0 : Number(e.amount)), 0);
  const groups = useMemo(() => { const m = new Map(); rows.forEach((e) => { const k = toDayInput(e.created_at); m.set(k, [...(m.get(k) || []), e]); }); return [...m.entries()]; }, [rows]);
  const toggle = (id) => setSkip((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const filtered = q || cat !== 'All' || who !== 'All' || period !== 'all';

  const actions = (e) => (isAdmin ? (
    <div className="mt-2 flex gap-1.5">
      <button onClick={() => setEditing(editing === e.id ? null : e.id)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 cursor-pointer"><Icon name="edit" className="h-3.5 w-3.5" />Edit</button>
      <button onClick={() => { if (window.confirm('Delete this entry?')) onDeleteExpense(e.id); }} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-rose-100 hover:text-rose-700 cursor-pointer"><Icon name="trash" className="h-3.5 w-3.5" />Delete</button>
    </div>
  ) : null);

  return (
    <div className="space-y-5">
      <Card className="space-y-4 !p-4 sm:!p-5">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item, category, member, amount or date (e.g. “rice”, “12 Nov”)…" className={`${inputCls} !h-12 !pl-11 !pr-10`} />
          {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"><Icon name="x" className="h-4 w-4" /></button>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map(([k, l]) => <button key={k} onClick={() => setPeriod(k)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${period === k ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{l}</button>)}
          <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600">{cats.map((c) => <option key={c} value={c}>{c === 'All' ? 'All categories' : c}</option>)}</select>
          <select value={who} onChange={(e) => setWho(e.target.value)} className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600">{members.map((c) => <option key={c} value={c}>{c === 'All' ? 'All members' : c}</option>)}</select>
          <select value={order} onChange={(e) => setOrder(e.target.value)} className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600"><option value="new">Newest first</option><option value="old">Oldest first</option><option value="high">Highest amount</option><option value="low">Lowest amount</option></select>
          {filtered && <button onClick={() => { setQ(''); setPeriod('all'); setCat('All'); setWho('All'); }} className="text-xs font-bold text-rose-500 cursor-pointer">Clear</button>}
        </div>
        {period === 'range' && <div className="grid grid-cols-2 gap-3"><Field label="From"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} /></Field><Field label="To"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} /></Field></div>}
      </Card>

      <div className="inline-flex rounded-full bg-slate-100 p-1">{[['entries', 'Entries'], ['items', 'Items & frequency']].map(([k, l]) => <button key={k} onClick={() => setMode(k)} className={`rounded-full px-4 py-2 text-sm font-bold transition cursor-pointer ${mode === k ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>{l}</button>)}</div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-slate-900 p-5 text-white">
        <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{filtered ? 'Matching total' : 'Total'}</p><p className="text-3xl font-black tabular-nums">{money(total)}</p></div>
        <div className="flex items-center gap-2 text-xs font-bold"><span className="rounded-full bg-white/10 px-3 py-1.5">{rows.length} {rows.length === 1 ? 'entry' : 'entries'}</span>{skip.length > 0 && <button onClick={() => setSkip([])} className="rounded-full bg-rose-500/20 px-3 py-1.5 text-rose-200 cursor-pointer">{skip.length} unchecked · reset</button>}<button onClick={() => downloadFile(`expenses-${toDayInput()}.csv`, toCSV(rows))} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/20 cursor-pointer"><Icon name="download" className="h-3.5 w-3.5" />CSV</button></div>
      </div>

      {mode === 'items' && rows.length > 0 && (
        <Card className="!p-4 sm:!p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-extrabold text-slate-900">{items.length} different items</p>
            <div className="flex gap-1 rounded-full bg-slate-100 p-1">{[['count', 'Most often'], ['total', 'Highest total'], ['recent', 'Latest']].map(([k, l]) => <button key={k} onClick={() => setItemSort(k)} className={`rounded-full px-3 py-1 text-xs font-bold cursor-pointer ${itemSort === k ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>{l}</button>)}</div></div>
          <ul className="divide-y divide-slate-100">{items.map((it) => (
            <li key={it.name.toLowerCase()}><button onClick={() => { setQ(it.name); setMode('entries'); }} className="flex w-full items-center gap-3 py-3 text-left cursor-pointer">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-sm font-black text-indigo-600">{it.count}×</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{it.name}</span><span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] font-semibold text-slate-400"><Chip category={it.category} /><span>avg {money(it.total / it.count)}</span><span>last {fmtDate(it.last)}</span></span></span>
              <span className="text-right text-sm font-extrabold tabular-nums text-slate-900">{money(it.total)}</span>
            </button></li>))}</ul>
        </Card>
      )}

      {mode === 'entries' && (rows.length === 0 ? <Empty>{filtered ? 'Nothing matches your search. Try fewer words or clear the filters.' : 'No entries in the ledger yet.'}</Empty> : (
        <>
          {/* Mobile / tablet: cards grouped by day */}
          <div className="space-y-5 lg:hidden">
            {(byDay ? groups : [['', rows]]).map(([day, list]) => (
              <div key={day}>
                {byDay && <div className="mb-2 flex items-center justify-between px-1"><p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">{fmtDate(day + 'T12:00:00')}</p><p className="text-xs font-bold tabular-nums text-slate-400">{money(list.reduce((s, e) => s + Number(e.amount), 0))}</p></div>}
                <div className="space-y-2.5">{list.map((e) => (
                  <div key={e.id} className={skip.includes(e.id) ? 'opacity-50' : ''}>
                    <EntryCard e={e} running={byDay ? e.running : null} actions={<div className="flex items-center justify-between"><label className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-400"><input type="checkbox" checked={!skip.includes(e.id)} onChange={() => toggle(e.id)} className="h-4 w-4 rounded accent-indigo-600" />Count in total</label>{actions(e)}</div>} />
                    {editing === e.id && <EditBox item={e} categories={categories} onCancel={() => setEditing(null)} onSave={(p) => { onUpdateExpense(e.id, p); setEditing(null); }} />}
                  </div>))}</div>
              </div>
            ))}
          </div>

          {/* Desktop: full table with both dates */}
          <div className="hidden overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm lg:block">
            <table className="w-full border-collapse text-left">
              <thead><tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="w-12 px-4 py-3.5" /><th className="px-4 py-3.5">Date of expense</th><th className="px-4 py-3.5">Entered at</th><th className="px-4 py-3.5">Member</th><th className="px-4 py-3.5">Category / note</th><th className="px-4 py-3.5 text-right">Amount</th><th className="px-4 py-3.5 text-right">{byDay ? 'Running' : ''}</th>{isAdmin && <th className="w-24 px-4 py-3.5" />}
              </tr></thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {rows.map((e) => (
                  <React.Fragment key={e.id}>
                    <tr className={`transition hover:bg-slate-50/60 ${skip.includes(e.id) ? 'opacity-45' : ''}`}>
                      <td className="px-4 py-3.5 text-center"><input type="checkbox" checked={!skip.includes(e.id)} onChange={() => toggle(e.id)} className="h-4 w-4 rounded accent-indigo-600" title="Count in total" /></td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-800">{fmtDate(e.created_at)}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs font-medium text-slate-400">{hasSeparateEntered(e) ? fmtDateTime(enteredAt(e)) : `${fmtDateTime(enteredAt(e))}`}</td>
                      <td className="px-4 py-3.5"><span className="flex items-center gap-2 font-semibold text-slate-600"><Avatar e={e} size="h-7 w-7" />{memberName(e)}</span></td>
                      <td className="px-4 py-3.5"><Chip category={e.category} />{e.note && <span className="ml-2 text-slate-500">{e.note}</span>}</td>
                      <td className="px-4 py-3.5 text-right font-extrabold tabular-nums text-slate-900">{money(e.amount)}</td>
                      <td className="px-4 py-3.5 text-right text-xs font-bold tabular-nums text-indigo-500">{byDay ? money(e.running) : ''}</td>
                      {isAdmin && <td className="px-4 py-3.5"><div className="flex justify-end gap-1"><button onClick={() => setEditing(editing === e.id ? null : e.id)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer" title="Edit"><Icon name="edit" className="h-4 w-4" /></button><button onClick={() => { if (window.confirm('Delete this entry?')) onDeleteExpense(e.id); }} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer" title="Delete"><Icon name="trash" className="h-4 w-4" /></button></div></td>}
                    </tr>
                    {editing === e.id && <tr><td colSpan={8} className="bg-slate-50/50 px-4 pb-4"><EditBox item={e} categories={categories} onCancel={() => setEditing(null)} onSave={(p) => { onUpdateExpense(e.id, p); setEditing(null); }} /></td></tr>}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ))}
      {mode === 'items' && rows.length === 0 && <Empty>Nothing matches your search.</Empty>}
    </div>
  );
}
