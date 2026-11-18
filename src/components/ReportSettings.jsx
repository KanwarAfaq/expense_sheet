import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { fmtDateShort } from '../lib/utils';
import { Card, Title, Field, inputCls, btnPrimary, btnGhost } from './ui';
import Icon from './Icons';

const FREQ = [['off', 'Off'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']];
const FREQ_HELP = { daily: 'Every evening (only on days with entries)', weekly: 'Every Sunday evening', monthly: 'On the last day of the month', off: 'No reports' };

function Segmented({ value, onChange }) {
  return <div className="inline-flex rounded-full bg-slate-100 p-1">{FREQ.map(([k, l]) => <button key={k} type="button" onClick={() => onChange(k)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition cursor-pointer ${value === k ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>{l}</button>)}</div>;
}

async function sendNow(id) {
  const { data } = await supabase.auth.getSession();
  const r = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ recipient_id: id }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${j.error || 'Could not send'} (HTTP ${r.status} · ${location.host})`);
}

export default function ReportSettings({ mode, userId, users = [], caps, showToast }) {
  const admin = mode === 'admin';
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: '', line_user_id: '', frequency: 'weekly', user_id: '', remind_archive: false });
  const [busy, setBusy] = useState('');
  const [health, setHealth] = useState(null);
  const check = async () => { try { const r = await fetch('/api/report?health'); setHealth({ ...(await r.json()), host: location.host }); } catch { setHealth({ error: true, host: location.host }); } };

  const load = useCallback(async () => {
    let q = supabase.from('report_recipients').select('*').order('created_at');
    if (!admin) q = q.eq('user_id', userId);
    const { data } = await q; setRows(data || []);
  }, [admin, userId]);
  useEffect(() => { if (caps.reports) load(); }, [caps.reports, load]);

  if (!caps.reports) return <Card><Title icon="db">LINE reports</Title><p className="text-sm font-medium text-slate-500">Run the latest setup SQL once (Admin → Settings → Database) to turn on LINE reports.</p></Card>;

  const add = async (e) => {
    e.preventDefault();
    const id = form.line_user_id.trim();
    if (!/^U[0-9a-f]{32}$/i.test(id)) return showToast('A LINE user ID starts with U and has 33 characters', 'error');
    const { error } = await supabase.from('report_recipients').insert([{ name: form.name.trim() || users.find((u) => u.id === form.user_id)?.full_name || 'Me', line_user_id: id, frequency: form.frequency, remind_archive: form.remind_archive, user_id: admin ? form.user_id || null : userId, created_by: userId }]);
    if (error) return showToast('Could not save', 'error');
    setForm({ name: '', line_user_id: '', frequency: 'weekly', user_id: '', remind_archive: false }); showToast('Saved'); load();
  };
  const update = async (r, patch) => { const { error } = await supabase.from('report_recipients').update(patch).eq('id', r.id); if (error) showToast('Could not update', 'error'); else load(); };
  const remove = async (r) => { if (!window.confirm(`Remove ${r.name || 'this recipient'}?`)) return; await supabase.from('report_recipients').delete().eq('id', r.id); load(); };
  const test = async (r) => { setBusy(r.id); try { await sendNow(r.id); showToast('Sent — check LINE'); } catch (e) { showToast(e.message, 'error'); } setBusy(''); };

  return (
    <div className="space-y-5">
      <Card>
        <Title icon="sparkle">{admin ? 'LINE report recipients' : 'My LINE reports'}</Title>
        {rows.length === 0 ? <p className="mb-2 text-sm font-medium text-slate-400">{admin ? 'No recipients yet. Add one below.' : 'You are not receiving reports yet. Add your LINE user ID below.'}</p> : (
          <ul className="divide-y divide-slate-100">{rows.map((r) => (
            <li key={r.id} className="space-y-3 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0"><p className="truncate font-bold text-slate-800">{r.name || 'Recipient'}</p><p className="truncate text-xs font-semibold text-slate-400">{r.line_user_id.slice(0, 6)}…{r.line_user_id.slice(-4)}{r.last_sent_at ? ` · last sent ${fmtDateShort(r.last_sent_at)}` : ''}</p></div>
                <div className="flex shrink-0 items-center gap-1">
                  <button disabled={busy === r.id} onClick={() => test(r)} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 cursor-pointer">{busy === r.id ? 'Sending…' : 'Send now'}</button>
                  <button onClick={() => remove(r)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600 cursor-pointer" title="Remove"><Icon name="trash" className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3"><Segmented value={r.frequency} onChange={(f) => update(r, { frequency: f })} />
                {admin && <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-500"><input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={r.remind_archive} onChange={(e) => update(r, { remind_archive: e.target.checked })} />Remind to archive</label>}</div>
              <p className="text-xs font-medium text-slate-400">{FREQ_HELP[r.frequency]}</p>
            </li>))}</ul>
        )}
      </Card>

      <Card>
        <Title icon="plus">{admin ? 'Add a recipient' : 'Add my LINE'}</Title>
        <form onSubmit={add} className="space-y-4">
          {admin && <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ahmed" className={inputCls} /></Field>
            <Field label="Member (optional)"><select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className={inputCls}><option value="">— not linked —</option>{users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.id.slice(0, 6)}</option>)}</select></Field>
          </div>}
          <Field label="LINE user ID"><input value={form.line_user_id} onChange={(e) => setForm({ ...form, line_user_id: e.target.value })} placeholder="U1234…  (33 characters)" className={inputCls} /></Field>
          <div className="flex flex-wrap items-center justify-between gap-3"><Segmented value={form.frequency} onChange={(f) => setForm({ ...form, frequency: f })} />
            {admin && <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-500"><input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={form.remind_archive} onChange={(e) => setForm({ ...form, remind_archive: e.target.checked })} />Remind to archive</label>}</div>
          <button className={btnPrimary}>Save</button>
        </form>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs font-medium leading-relaxed text-slate-500">
          <p className="mb-1 font-bold text-slate-700">How to find a LINE user ID</p>
          Add the Expensely LINE bot as a friend and send it any message — it replies with that person’s ID. Everyone you add must be friends with the bot to receive messages.
        </div>
        {admin && <div className="mt-4"><button type="button" onClick={check} className={btnGhost}>Check connection</button>
          {health && <ul className="mt-3 space-y-1 text-xs font-bold">{health.error ? <li className="text-rose-600">Could not reach the server</li> : [['Supabase URL', health.supabase_url], ['Supabase service role key', health.service_role_key], ['LINE access token', health.line_token], ['Schedule secret', health.cron_secret]].map(([l, ok]) => <li key={l} className={ok ? 'text-emerald-600' : 'text-rose-600'}>{ok ? '✓' : '✗'} {l}</li>)}<li className="font-semibold text-slate-400">Server: {health.host}{health.vercel_env ? ` · ${health.vercel_env}` : ''}</li></ul>}</div>}
      </Card>
    </div>
  );
}
