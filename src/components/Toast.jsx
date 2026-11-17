import React, { useEffect } from 'react';
import Icon from './Icons';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, type === 'error' ? 6000 : 3200); return () => clearTimeout(t); }, []); // eslint-disable-line
  const ok = type === 'success';
  return (
    <div onClick={onClose} className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[100] mx-auto flex max-w-md cursor-pointer items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-2xl shadow-slate-900/30 animate-slide-in sm:left-auto sm:right-6 sm:mx-0">
      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`}><Icon name={ok ? 'check' : 'x'} className="h-4 w-4" stroke={2.6} /></span>
      <span className="text-sm font-semibold leading-snug">{message}</span>
    </div>
  );
}
