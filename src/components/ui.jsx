import React from 'react';
import { memberName, fmtDate, fmtTime, fmtDateTime, enteredAt, hasSeparateEntered, money } from '../lib/utils';
import Icon from './Icons';

const TONES = [
  ['bg-indigo-50 text-indigo-700', 'bg-indigo-500'], ['bg-emerald-50 text-emerald-700', 'bg-emerald-500'], ['bg-amber-50 text-amber-700', 'bg-amber-500'],
  ['bg-rose-50 text-rose-700', 'bg-rose-500'], ['bg-sky-50 text-sky-700', 'bg-sky-500'], ['bg-violet-50 text-violet-700', 'bg-violet-500'],
  ['bg-teal-50 text-teal-700', 'bg-teal-500'], ['bg-orange-50 text-orange-700', 'bg-orange-500'],
];
export const tone = (c = '') => TONES[[...String(c)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % TONES.length];

export const Card = ({ className = '', children, ...p }) => <section {...p} className={`rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6 ${className}`}>{children}</section>;
export const Title = ({ icon, children, right }) => (
  <div className="mb-4 flex items-center justify-between gap-3">
    <h2 className="flex items-center gap-2 text-base font-extrabold tracking-tight text-slate-900">{icon && <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon name={icon} className="h-4 w-4" /></span>}{children}</h2>{right}
  </div>
);
export const Chip = ({ category }) => <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${tone(category)[0]}`}><span className={`h-1.5 w-1.5 rounded-full ${tone(category)[1]}`} />{category}</span>;
export const Field = ({ label, children }) => <label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>{children}</label>;
export const inputCls = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10';
export const btnPrimary = 'inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 active:scale-[0.98] cursor-pointer disabled:opacity-50';
export const btnGhost = 'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-[0.98] cursor-pointer';

export const Avatar = ({ e, size = 'h-8 w-8' }) => e.profiles?.avatar_url
  ? <img src={e.profiles.avatar_url} alt="" className={`${size} shrink-0 rounded-full border border-slate-200 bg-slate-100 object-cover`} />
  : <span className={`${size} grid shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-500`}>{memberName(e)[0]}</span>;

// Every entry always shows the day it was spent AND when it was typed in.
export function DateStamp({ e, compact = false }) {
  return (
    <span className="inline-flex flex-col leading-tight">
      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-700"><Icon name="calendar" className="h-3.5 w-3.5 text-slate-400" />{fmtDate(e.created_at)}</span>
      {!compact && <span className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400"><Icon name="clock" className="h-3 w-3" />Entered {hasSeparateEntered(e) ? fmtDateTime(enteredAt(e)) : fmtTime(enteredAt(e))}</span>}
    </span>
  );
}

export function EntryCard({ e, actions, running }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 transition hover:border-slate-200">
      <Avatar e={e} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0"><Chip category={e.category} />{e.note && <p className="mt-1.5 break-words text-sm font-medium text-slate-600">{e.note}</p>}</div>
          <p className="shrink-0 text-base font-extrabold tabular-nums text-slate-900">{money(e.amount)}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
          <DateStamp e={e} />
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400"><span>{memberName(e)}</span>{running != null && <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-indigo-600">Total {money(running)}</span>}</div>
        </div>
        {actions}
      </div>
    </div>
  );
}
export const Empty = ({ icon = 'search', children }) => <div className="grid place-items-center rounded-3xl border border-dashed border-slate-200 bg-white/60 px-6 py-14 text-center"><span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Icon name={icon} className="h-6 w-6" /></span><p className="max-w-xs text-sm font-medium text-slate-400">{children}</p></div>;
