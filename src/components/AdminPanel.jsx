import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import setupSql from '../../supabase/migration.sql?raw';
import { money, memberName, toCSV, downloadFile, toDayInput } from '../lib/utils';
import { Card, Title, Field, inputCls, btnPrimary, btnGhost } from './ui';
import ExpenseList from './ExpenseList';
import ReportSettings from './ReportSettings';
import Icon from './Icons';

const TABS = [['overview', 'Overview', 'chart'], ['entries', 'Entries', 'list'], ['members', 'Members', 'user'], ['line', 'LINE', 'sparkle'], ['settings', 'Settings', 'sparkle']];

const Stat = ({ label, value, sub, tone = 'text-slate-900' }) => (
  <Card className="!p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className={`text-2xl font-black tabular-nums ${tone}`}>{value}</p>{sub && <p className="mt-0.5 text-xs font-semibold text-slate-400">{sub}</p>}</Card>
);

function Bars({ rows, total }) {
  if (!rows.length) return <p className="text-sm text-slate-400">No entries yet.</p>;
  return (
    <div className="space-y-3.5">{rows.map(([k, v]) => {
      const base = total;
      return (
        <div key={k}>
          <div className="mb-1 flex justify-between text-sm font-bold"><span className="text-slate-600">{k}</span>
            <span className="tabular-nums text-slate-900">{money(v)}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${base ? Math.min(100, (v / base) * 100) : 0}%` }} /></div>
        </div>);
    })}</div>
  );
}

function Trend({ points, budget }) {
  const max = Math.max(budget, ...points.map((p) => p.v), 1);
  return (
    <div className="flex h-40 items-end gap-2 sm:gap-3">
      {points.map((p) => (
        <div key={p.k} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[10px] font-bold tabular-nums text-slate-400">{money(p.v)}</span>
          <div className="relative flex h-24 w-full items-end overflow-hidden rounded-xl bg-slate-100">
            <div className={`w-full rounded-xl ${p.now ? 'bg-gradient-to-t from-indigo-500 to-violet-400' : p.v > p.budget ? 'bg-rose-400' : 'bg-indigo-300'}`} style={{ height: `${(p.v / max) * 100}%` }} />
            <span className="absolute inset-x-0 border-t border-dashed border-slate-400/70" style={{ bottom: `${(budget / max) * 100}%` }} />
          </div>
          <span className="text-[10px] font-bold text-slate-500">{p.k}</span>
        </div>))}
    </div>
  );
}

export default function AdminPanel({ expenses, archives, budget, caps, onSaveBudget, onArchive, onUpdateExpense, onDeleteExpense, categories, showToast, recheck, userId }) {
  const [tab, setTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [newBudget, setNewBudget] = useState(budget);
  const [showSql, setShowSql] = useState(false);
  useEffect(() => setNewBudget(budget), [budget]);
  const loadUsers = async () => { const { data } = await supabase.from('profiles').select('*'); if (data) setUsers(data); };
  useEffect(() => { loadUsers(); }, []);

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const now = new Date();
  const dayOfMonth = now.getDate(); const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projected = total / dayOfMonth * daysInMonth;
  const group = (fn) => Object.entries(expenses.reduce((m, e) => { const k = fn(e); m[k] = (m[k] || 0) + Number(e.amount); return m; }, {})).sort((a, b) => b[1] - a[1]);
  const byMember = useMemo(() => group(memberName), [expenses]); // eslint-disable-line
  const byCat = useMemo(() => group((e) => e.category), [expenses]); // eslint-disable-line
  const trend = useMemo(() => [...archives].reverse().slice(-5).map((a) => ({ k: (a.month_label || '').split(' ')[0].slice(0, 3), v: Number(a.total_expense), budget: Number(a.total_budget) })).concat([{ k: 'Now', v: total, budget, now: true }]), [archives, total, budget]);
  const allOk = caps.settings && caps.entries && caps.entered && caps.reports;

  const setRole = async (u, role) => {
    if (role === 'member' && users.filter((x) => x.role === 'admin').length <= 1) return showToast('Keep at least one admin', 'error');
    const { error } = await supabase.from('profiles').update({ role }).eq('id', u.id);
    if (error) return showToast('Could not change role', 'error');
    showToast(`${u.full_name || 'Member'} is now ${role}`); loadUsers();
  };
  const exportArchives = () => {
    const rows = archives.flatMap((a) => (a.entries || []).map((e) => ({ ...e, month: a.month_label })));
    if (!rows.length) return showToast('No archived entry details to export yet', 'error');
    downloadFile(`archives-${toDayInput()}.csv`, toCSV(rows));
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-slate-100 p-1.5">
        {TABS.map(([k, l, i]) => <button key={k} onClick={() => setTab(k)} className={`flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition cursor-pointer ${tab === k ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}><Icon name={i} className="h-4 w-4" />{l}</button>)}
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Spent" value={money(total)} sub={`${expenses.length} entries`} />
            <Stat label={budget - total >= 0 ? 'Left' : 'Over budget'} value={money(Math.abs(budget - total))} sub={`of ${money(budget)}`} tone={budget - total >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
            <Stat label="Daily average" value={money(total / dayOfMonth)} sub={`day ${dayOfMonth} of ${daysInMonth}`} />
            <Stat label="On track for" value={money(projected)} sub={projected > budget ? 'over budget' : 'within budget'} tone={projected > budget ? 'text-rose-600' : 'text-slate-900'} />
          </div>
          <Card><Title icon="chart">Last months</Title><Trend points={trend} budget={budget} /><p className="mt-3 text-xs font-medium text-slate-400">Dashed line = current budget.</p></Card>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card><Title icon="tag">By category</Title><Bars rows={byCat} total={total} /></Card>
            <Card><Title icon="user">By member</Title><Bars rows={byMember} total={total} /></Card>
          </div>
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-extrabold text-slate-900">Close this month</p><p className="text-sm font-medium text-slate-500">Saves every entry with its dates into the archive, then starts fresh.</p></div>
            <button className={btnPrimary} onClick={() => { if (window.confirm('Archive all current entries and start a fresh month?')) onArchive(); }}><Icon name="archive" className="h-4 w-4" />Close &amp; archive</button>
          </Card>
        </div>
      )}

      {tab === 'entries' && <ExpenseList rawExpenses={expenses} categories={categories} onDeleteExpense={onDeleteExpense} onUpdateExpense={onUpdateExpense} currentUser={{ role: 'admin' }} />}

      {tab === 'members' && (
        <Card><Title icon="user" right={<span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{users.length}</span>}>Members</Title>
          <div className="divide-y divide-slate-100">{users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div className="flex items-center gap-3">{u.avatar_url ? <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 font-bold text-slate-500">{(u.full_name || '?')[0]}</span>}
                <div><p className="font-bold text-slate-800">{u.full_name || 'Unnamed'}</p><p className="text-xs font-semibold text-slate-400">{money(expenses.filter((e) => e.user_id === u.id).reduce((s, e) => s + Number(e.amount), 0))} this month</p></div></div>
              <div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{u.role}</span>
                <button className="text-xs font-bold text-indigo-600 cursor-pointer" onClick={() => setRole(u, u.role === 'admin' ? 'member' : 'admin')}>{u.role === 'admin' ? 'Make member' : 'Make admin'}</button></div>
            </div>))}</div></Card>
      )}

      {tab === 'line' && <div className="max-w-2xl"><ReportSettings mode="admin" userId={userId} users={users} caps={caps} showToast={showToast} /></div>}

      {tab === 'settings' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card><Title icon="wallet">Monthly budget</Title>
            <Field label="Amount"><input type="number" min="0" value={newBudget} onChange={(e) => setNewBudget(e.target.value)} className={`${inputCls} !h-14 !text-2xl font-black`} /></Field>
            <button className={`${btnPrimary} mt-4`} disabled={!caps.settings || !(Number(newBudget) > 0) || Number(newBudget) === Number(budget)} onClick={() => onSaveBudget(Number(newBudget))}>Save budget</button>
          </Card>

          <Card><Title icon="download">Export</Title>
            <div className="flex flex-wrap gap-2"><button className={btnGhost} onClick={() => downloadFile(`expenses-${toDayInput()}.csv`, toCSV(expenses))}>Current month CSV</button><button className={btnGhost} onClick={exportArchives}>All archives CSV</button></div>
          </Card>

          <Card><Title icon="db">Database</Title>
            {allOk ? <p className="flex items-center gap-2 text-sm font-bold text-emerald-700"><Icon name="check" className="h-4 w-4" />All set — everything is connected.</p> : (
              <><p className="mb-3 text-sm font-bold text-amber-700">Setup is incomplete. Run this once in Supabase → SQL Editor.</p>
                <button className={btnGhost} onClick={() => setShowSql(!showSql)}>{showSql ? 'Hide SQL' : 'Show SQL'}</button>
                {showSql && <pre className="mt-3 max-h-60 overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-slate-100">{setupSql}</pre>}
                <button className={`${btnGhost} mt-3`} onClick={async () => { await recheck(); showToast('Checked'); }}>Check again</button></>)}
          </Card>
        </div>
      )}
    </div>
  );
}
