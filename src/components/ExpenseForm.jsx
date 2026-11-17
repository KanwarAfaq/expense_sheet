import React, { useState, useRef, useEffect } from 'react';
import { toDayInput, money, fmtDate } from '../lib/utils';
import { Card, Title, Field, Chip, EntryCard, inputCls, btnPrimary } from './ui';
import Icon from './Icons';

export default function ExpenseForm({ onAddExpense, categories, noteMap, recent }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => toDayInput());
  const [category, setCategory] = useState(() => localStorage.getItem('expensely_lastcat') || '');
  const [newCat, setNewCat] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [autoHint, setAutoHint] = useState('');
  const [busy, setBusy] = useState(false);
  const amountRef = useRef(null);

  useEffect(() => { if (!category && categories[0]) setCategory(categories[0]); }, [categories, category]);
  const top = categories.slice(0, showAll ? categories.length : 8);

  // Typing/choosing an item that was entered before brings its category back automatically.
  const onNote = (v) => {
    setNote(v);
    const hit = noteMap[v.trim().toLowerCase()];
    if (hit) { setCategory(hit.category); setAutoHint(`Category “${hit.category}” filled in from your last “${hit.note}”`); } else setAutoHint('');
  };
  const addCategory = () => {
    const t = newCat.trim(); if (!t) return;
    const name = categories.find((c) => c.toLowerCase() === t.toLowerCase()) || t.charAt(0).toUpperCase() + t.slice(1);
    setCategory(name); setNewCat(''); setAutoHint('');
  };

  const submit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !category || busy) return;
    setBusy(true);
    const ok = await onAddExpense({ category, amount: amt, note: note.trim(), date });
    setBusy(false);
    if (ok) { localStorage.setItem('expensely_lastcat', category); setAmount(''); setNote(''); setAutoHint(''); setDate(toDayInput()); amountRef.current?.focus(); }
  };
  const sugg = Object.values(noteMap).map((x) => x.note);

  return (
    <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <Title icon="plus">New expense</Title>
        <form onSubmit={submit} className="space-y-5">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 p-4 ring-1 ring-indigo-100">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-indigo-400">Amount</span>
            <div className="flex items-center gap-2"><span className="text-3xl font-black text-indigo-300">$</span>
              <input ref={amountRef} type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required className="w-full bg-transparent text-4xl font-black tabular-nums text-slate-900 outline-none placeholder:text-indigo-200" />
            </div>
          </div>

          <Field label="Item / note">
            <input list="note-list" value={note} onChange={(e) => onNote(e.target.value)} placeholder="e.g. Rice, Electricity bill…" className={inputCls} maxLength={120} />
            <datalist id="note-list">{sugg.map((s) => <option key={s} value={s} />)}</datalist>
            {autoHint && <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><Icon name="sparkle" className="h-3.5 w-3.5" />{autoHint}</p>}
          </Field>

          <div>
            <span className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400"><span>Category</span>{category && <span className="normal-case tracking-normal"><Chip category={category} /></span>}</span>
            <div className="flex flex-wrap gap-2">
              {top.map((c) => <button type="button" key={c} onClick={() => { setCategory(c); setAutoHint(''); }} className={`rounded-full border px-3.5 py-2 text-sm font-bold transition cursor-pointer ${category === c ? 'border-transparent bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'}`}>{c}</button>)}
              {categories.length > 8 && <button type="button" onClick={() => setShowAll(!showAll)} className="rounded-full border border-dashed border-slate-300 px-3.5 py-2 text-sm font-bold text-slate-400 cursor-pointer">{showAll ? 'Less' : `+${categories.length - 8} more`}</button>}
            </div>
            <div className="mt-3 flex gap-2"><input value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }} placeholder="New category (saved for next time)" className={inputCls} maxLength={40} /><button type="button" onClick={addCategory} className="h-11 shrink-0 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white cursor-pointer">Add</button></div>
          </div>

          <Field label="Date of expense"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={toDayInput()} className={inputCls} required /></Field>
          <p className="-mt-2 text-xs font-medium text-slate-400">{fmtDate(date)} · the time you press save is recorded as “entered”.</p>
          <button type="submit" disabled={busy || !category} className={`${btnPrimary} w-full !h-12 text-base`}>{busy ? 'Saving…' : `Save ${amount ? money(amount) : 'expense'}`}</button>
        </form>
      </Card>

      <div className="lg:col-span-2">
        <Title icon="clock">Just added</Title>
        <div className="space-y-2.5">{recent.length ? recent.map((e) => <EntryCard key={e.id} e={e} />) : <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">Entries you add will show up here with their date.</p>}</div>
      </div>
    </div>
  );
}
