import React from 'react';
import Icon from './Icons';

const LINKS = [
  { id: 'home', title: 'Dashboard', short: 'Home', icon: 'home' },
  { id: 'add', title: 'Add expense', short: 'Add', icon: 'plus' },
  { id: 'history', title: 'Ledger', short: 'Ledger', icon: 'list' },
  { id: 'archives', title: 'Archives', short: 'Archive', icon: 'archive' },
];

export default function Navbar({ currentView, setCurrentView, currentUser, onLogout }) {
  const isAdmin = currentUser?.role === 'admin';
  const links = isAdmin ? [...LINKS, { id: 'admin', title: 'Admin', short: 'Admin', icon: 'shield' }] : LINKS;

  return (
    <>
      {/* Top bar (all sizes) + desktop navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <button onClick={() => setCurrentView('home')} className="flex items-center gap-2.5 cursor-pointer">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30"><Icon name="wallet" className="h-5 w-5" /></span>
            <span className="text-base font-extrabold tracking-tight text-slate-900">Expensely</span>
          </button>

          <nav className="hidden items-center gap-1 rounded-2xl bg-slate-100/80 p-1 lg:flex">
            {links.map((l) => (
              <button key={l.id} onClick={() => setCurrentView(l.id)} className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition cursor-pointer ${currentView === l.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
                <Icon name={l.icon} className="h-4 w-4" />{l.title}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="flex items-center gap-2.5">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-bold leading-tight text-slate-900">{currentUser.full_name}</p>
                  <p className={`text-[11px] font-semibold capitalize leading-tight ${isAdmin ? 'text-violet-600' : 'text-slate-400'}`}>{currentUser.role}</p>
                </div>
                {currentUser.avatar_url ? <img src={currentUser.avatar_url} alt="" className="h-9 w-9 rounded-full border border-slate-200 bg-slate-100 object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{currentUser.full_name?.[0] || '?'}</span>}
              </div>
            )}
            <button onClick={onLogout} title="Log out" className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"><Icon name="logout" className="h-5 w-5" /></button>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))` }}>
          {links.map((l) => {
            const on = currentView === l.id;
            return (
              <button key={l.id} onClick={() => setCurrentView(l.id)} className="relative flex flex-col items-center gap-0.5 py-2.5 cursor-pointer">
                {l.id === 'add' ? (
                  <span className="-mt-6 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/40 ring-4 ring-slate-50"><Icon name="plus" className="h-6 w-6" stroke={2.2} /></span>
                ) : (
                  <span className={`grid h-7 place-items-center transition ${on ? 'text-indigo-600' : 'text-slate-400'}`}><Icon name={l.icon} className="h-[22px] w-[22px]" stroke={on ? 2.2 : 1.8} /></span>
                )}
                <span className={`text-[10px] font-bold ${on ? 'text-indigo-600' : 'text-slate-400'} ${l.id === 'add' ? '-mt-0.5' : ''}`}>{l.short}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
