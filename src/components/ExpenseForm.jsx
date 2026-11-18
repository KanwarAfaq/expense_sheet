import React, { useState, useRef, useMemo } from 'react';
import { toDayInput, money, fmtDate } from '../lib/utils';
import { Card, Title, EntryCard, inputCls, btnPrimary } from './ui';
import Icon from './Icons';

export default function ExpenseForm({ onAddExpense, categories, noteMap, recent }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [date, setDate] = useState(() => toDayInput());
  const [category, setCategory] = useState(() => localStorage.getItem('expensely_lastcat') || '');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const amountRef = useRef(null);
  const dateRef = useRef(null);

  const q = category.trim().toLowerCase();
  const exact = categories.find((c) => c.toLowerCase() === q);
  // Suggestions only exist while typing — nothing takes up space otherwise.
  const matches = useMemo(() => (q ? categories.filter((c) => c.toLowerCase().includes(q) && c.toLowerCase() !== q).slice(0, 6) : []), [categories, q]);
  const showList = open && q && (matches.length > 0 || !exact);

  const pick = (c) => { setCategory(c); setOpen(false); amountRef.current?.focus(); };
  const onNote = (v) => {
    setNote(v);
    const hit = noteMap[v.trim().toLowerCase()];
    if (hit) setCategory(hit.category);
  };

  const submit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    const t = category.trim();
    if (!amt || amt <= 0 || !t || busy) return;
    const name = categories.find((c) => c.toLowerCase() === t.toLowerCase()) || t.charAt(0).toUpperCase() + t.slice(1);
    setBusy(true);
    const ok = await onAddExpense({ category: name, amount: amt, note: note.trim(), date });
    setBusy(false);
    if (ok) { localStorage.setItem('expensely_lastcat', name); setAmount(''); setNote(''); setShowNote(false); setDate(toDayInput()); amountRef.current?.focus(); }
  };
  const sugg = Object.values(noteMap).map((x) => x.note);
  const isToday = date === toDayInput();

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <Title icon="plus">New expense</Title>
        <form onSubmit={submit} className="space-y-4">
          {/* Category first: type to search, suggestions appear only while typing */}
          <div className="relative">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Category</span>
            <div className="relative">
              <Icon name="tag" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={category} onChange={(e) => { setCategory(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
                onKeyDown={(e) => { if (e.key === 'Enter' && showList && matches[0]) { e.preventDefault(); pick(matches[0]); } }}
                placeholder="Start typing a category…" autoComplete="off" maxLength={40} required className={`${inputCls} !h-12 !pl-10 !text-base`} />
            </div>
            {showList && (
              <ul className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10">
                {matches.map((c) => <li key={c}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)} className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-indigo-50 cursor-pointer">{c}</button></li>)}
                {!exact && <li><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(category.trim().charAt(0).toUpperCase() + category.trim().slice(1))} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-indigo-600 hover:bg-indigo-50 cursor-pointer"><Icon name="plus" className="h-4 w-4" />New category “{category.trim()}”</button></li>}
              </ul>
            )}
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Amount</span>
            <div className="flex items-center gap-2"><span className="text-3xl font-black text-slate-300">$</span>
              <input ref={amountRef} type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required className="w-full bg-transparent text-4xl font-black tabular-nums text-slate-900 outline-none placeholder:text-slate-300" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => dateRef.current?.showPicker?.() || dateRef.current?.focus()} className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-600 cursor-pointer"><Icon name="calendar" className="h-4 w-4 text-slate-400" />{isToday ? 'Today' : fmtDate(date)}</button>
            <input ref={dateRef} type="date" value={date} onChange={(e) => setDate(e.target.value || toDayInput())} max={toDayInput()} className="sr-only" tabIndex={-1} />
            {!showNote && <button type="button" onClick={() => setShowNote(true)} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3.5 text-sm font-bold text-slate-500 hover:border-indigo-300 hover:text-indigo-600 cursor-pointer"><Icon name="plus" className="h-4 w-4" />Note</button>}
          </div>

          {showNote && (
            <div>
              <input autoFocus list="note-list" value={note} onChange={(e) => onNote(e.target.value)} placeholder="Note (optional)" className={inputCls} maxLength={120} />
              <datalist id="note-list">{sugg.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
          )}

          <button type="submit" disabled={busy || !category.trim()} className={`${btnPrimary} w-full !h-12 text-base`}>{busy ? 'Saving…' : `Save ${amount ? money(amount) : 'expense'}`}</button>
          <p className="text-center text-xs font-medium text-slate-400">The time you press save is recorded as “entered”.</p>
        </form>
      </Card>

      <div className="lg:col-span-2">
        <Title icon="clock">Just added</Title>
        <div className="space-y-2.5">{recent.length ? recent.map((e) => <EntryCard key={e.id} e={e} />) : <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">Entries you add will show up here with their date.</p>}</div>
      </div>
    </div>
  );
}
