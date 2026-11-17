import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import setupSql from '../../supabase/migration.sql?raw';
import { money, memberName, monthKey, monthLabel } from '../lib/utils';
import { Card, Title, Field, inputCls, btnPrimary, btnGhost } from './ui';
import ExpenseList from './ExpenseList';
import Icon from './Icons';

const TABS = [['overview', 'Overview', 'chart'], ['budget', 'Budget', 'wallet'], ['entries', 'All entries', 'list'], ['members', 'Members', 'user'], ['setup', 'Setup', 'db']];

function Bars({ rows, total }) {
  return <div className="space-y-3">{rows.map(([k, v]) => (
    <div key={k}><div className="mb-1 flex justify-between text-sm font-bold"><span className="text-slate-600">{k}</span><span className="tabular-nums text-slate-900">{money(v)}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${total ? (v / total) * 100 : 0}%` }} /></div></div>))}</div>;
}

export default function AdminPanel({ expenses, archives, budget, caps, onSaveBudget, onArchive, onUpdateExpense, onDeleteExpense, categories, showToast, recheck }) {
  const [tab, setTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [newBudget, setNewBudget] = useState(budget);
  useEffect(() => setNewBudget(budget), [budget]);
  const loadUsers = async () => { const { data } = await supabase.from('profiles').select('*'); if (data) setUsers(data); };
  useEffect(() => { loadUsers(); }, []);

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const by = (fn) => Object.entries(expenses.reduce((m, e) => { const k = fn(e); m[k] = (m[k] || 0) + Number(e.amount); return m; }, {})).sort((a, b) => b[1] - a[1]);
  const byMember = useMemo(() => by(memberName), [expenses]); // eslint-disable-line
  const byCat = useMemo(() => by((e) => e.category), [expenses]); // eslint-disable-line
  const byMonth = useMemo(() => by((e) => monthLabel(monthKey(e.created_at))), [expenses]); // eslint-disable-line

  const setRole = async (u, role) => {
    if (role === 'member' && users.filter((x) => x.role === 'admin').length <= 1) return showToast('Keep at least one admin', 'error');
    const { error } = await supabase.from('profiles').update({ role }).eq('id', u.id);
    if (error) return showToast('Could not change role', 'error');
    showToast(`${u.full_name || 'Member'} is now ${role}`); loadUsers();
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-slate-100 p-1.5">
        {TABS.map(([k, l, i]) => <button key={k} onClick={() => setTab(k)} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition cursor-pointer ${tab === k ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}><Icon name={i} className="h-4 w-4" />{l}</button>)}
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-4">
            {[['Budget', money(budget)], ['Spent now', money(total)], ['Left', money(budget - total)], ['Entries', expenses.length]].map(([l, v]) => <Card key={l} className="!p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{l}</p><p className="text-2xl font-black tabular-nums text-slate-900">{v}</p></Card>)}
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <Card><Title icon="user">By member</Title>{byMember.length ? <Bars rows={byMember} total={total} /> : <p className="text-sm text-slate-400">No entries.</p>}</Card>
            <Card><Title icon="tag">By category</Title>{byCat.length ? <Bars rows={byCat} total={total} /> : <p className="text-sm text-slate-400">No entries.</p>}</Card>
            <Card><Title icon="calendar">By month</Title>{byMonth.length ? <Bars rows={byMonth} total={total} /> : <p className="text-sm text-slate-400">No entries.</p>}</Card>
          </div>
          <Card><Title icon="archive" right={<button className={`${btnPrimary} !h-10`} onClick={() => { if (window.confirm('Archive all current entries and start a fresh month? Every entry is saved inside the archive.')) onArchive(); }}>Close &amp; archive</button>}>Archived months</Title>
            <p className="text-sm font-medium text-slate-500">{archives.length} archived · entries are kept with their dates inside each archive.</p></Card>
        </div>
      )}

      {tab === 'budget' && (
        <Card className="max-w-lg">
          <Title icon="wallet">Monthly budget</Title>
          <p className="mb-4 text-sm font-medium text-slate-500">Changing this updates the dashboard for every member immediately. Existing entries and archives are not touched.</p>
          <Field label="Budget amount"><input type="number" min="0" step="1" value={newBudget} onChange={(e) => setNewBudget(e.target.value)} className={`${inputCls} !h-14 !text-2xl font-black`} /></Field>
          <div className="mt-4 flex gap-2"><button className={btnPrimary} disabled={!caps.settings || !(Number(newBudget) >= 0) || Number(newBudget) === Number(budget)} onClick={() => onSaveBudget(Number(newBudget))}>Save budget</button>{[3000, 4500, 6000].map((v) => <button key={v} className={btnGhost} onClick={() => setNewBudget(v)}>{money(v)}</button>)}</div>
          {!caps.settings && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-700">One-time setup needed first — open the Setup tab.</p>}
        </Card>
      )}

      {tab === 'entries' && <ExpenseList rawExpenses={expenses} categories={categories} onDeleteExpense={onDeleteExpense} onUpdateExpense={onUpdateExpense} currentUser={{ role: 'admin' }} />}

      {tab === 'members' && (
        <Card><Title icon="user" right={<span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{users.length} users</span>}>Members</Title>
          <div className="divide-y divide-slate-100">{users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div className="flex items-center gap-3">{u.avatar_url ? <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 font-bold text-slate-500">{(u.full_name || '?')[0]}</span>}
                <div><p className="font-bold text-slate-800">{u.full_name || 'Unnamed'}</p><p className="text-xs font-semibold text-slate-400">{money(expenses.filter((e) => e.user_id === u.id).reduce((s, e) => s + Number(e.amount), 0))} this month</p></div></div>
              <div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{u.role}</span>
                <button className="text-xs font-bold text-indigo-600 cursor-pointer" onClick={() => setRole(u, u.role === 'admin' ? 'member' : 'admin')}>{u.role === 'admin' ? 'Make member' : 'Make admin'}</button></div>
            </div>))}</div></Card>
      )}

      {tab === 'setup' && (
        <Card><Title icon="db">One-time database setup</Title>
          <p className="mb-4 text-sm font-medium text-slate-500">Adds new optional columns and a settings table to your existing Supabase database. It never deletes or changes existing rows, and is safe to run again.</p>
          <div className="mb-4 grid gap-2 sm:grid-cols-3">{[['Entered-at date', caps.entered], ['Archive entry details', caps.entries], ['Admin budget', caps.settings]].map(([l, ok]) => <div key={l} className={`flex items-center gap-2 rounded-xl p-3 text-sm font-bold ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><Icon name={ok ? 'check' : 'x'} className="h-4 w-4" />{l}</div>)}</div>
          <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm font-medium text-slate-600"><li>Copy the SQL below.</li><li>Supabase → SQL Editor → paste → Run.</li><li>Come back and press “Check again”.</li></ol>
          <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">{setupSql}</pre>
          <div className="mt-4 flex gap-2"><button className={btnPrimary} onClick={() => { navigator.clipboard?.writeText(setupSql); showToast('SQL copied'); }}>Copy SQL</button><button className={btnGhost} onClick={async () => { await recheck(); showToast('Checked'); }}>Check again</button></div></Card>
      )}
    </div>
  );
}
