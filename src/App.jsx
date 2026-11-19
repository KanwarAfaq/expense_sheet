import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { collectCategories, noteCategoryMap, fmtDateShort } from './lib/utils';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import ArchiveList from './components/ArchiveList';
import Toast from './components/Toast';
import Auth from './components/Auth';
import AdminPanel from './components/AdminPanel';
import ReportSettings from './components/ReportSettings';

const DEFAULT_BUDGET = 4500;
const loadSaved = () => { try { return JSON.parse(localStorage.getItem('expensely_cats') || '[]'); } catch { return []; } };

export default function App() {
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [archives, setArchives] = useState([]);
  const [budget, setBudget] = useState(DEFAULT_BUDGET);
  const [addedIds, setAddedIds] = useState([]); // entries added during this visit only
  // Which optional database upgrades are in place (see supabase/migration.sql)
  const [caps, setCaps] = useState({ settings: false, entries: false, entered: false, reports: false, checked: false });
  const [savedCats, setSavedCats] = useState(loadSaved);
  const [currentView, setCurrentView] = useState(() => localStorage.getItem('expensely_view') || 'home');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const isAdmin = currentUser?.role === 'admin';
  const showToast = (message, type = 'success') => setToast({ message, type, id: Date.now() });

  useEffect(() => { localStorage.setItem('expensely_view', currentView); }, [currentView]);
  useEffect(() => { if (currentView === 'admin' && currentUser && !isAdmin) setCurrentView('home'); }, [currentView, currentUser, isAdmin]);

  /* ---------- auth ---------- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id); else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else { setCurrentUser(null); setExpenses([]); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!error && data) setCurrentUser(data);
  };

  /* ---------- data ---------- */
  const checkCaps = useCallback(async () => {
    const test = async (table, cols) => !(await supabase.from(table).select(cols).limit(1)).error;
    const [settings, entries, entered, reports] = await Promise.all([test('app_settings', 'key'), test('expense_archives', 'entries'), test('expenses', 'entered_at'), test('report_recipients', 'id')]);
    setCaps({ settings, entries, entered, reports, checked: true });
    if (settings) {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'monthly_budget').maybeSingle();
      const v = Number(data?.value); if (Number.isFinite(v) && v > 0) setBudget(v);
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    const { data, error } = await supabase.from('expenses').select('*, profiles(full_name, avatar_url)').order('created_at', { ascending: true });
    if (!error && data) setExpenses(data);
  }, []);
  const fetchArchives = useCallback(async () => {
    const { data, error } = await supabase.from('expense_archives').select('*').order('archived_at', { ascending: false });
    if (!error && data) setArchives(data);
  }, []);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    Promise.all([checkCaps(), fetchExpenses(), fetchArchives()]).finally(() => setLoading(false));
  }, [session, checkCaps, fetchExpenses, fetchArchives]);

  /* ---------- derived ---------- */
  const categories = useMemo(() => collectCategories(expenses, archives, savedCats), [expenses, archives, savedCats]);
  const noteMap = useMemo(() => noteCategoryMap(expenses, archives), [expenses, archives]);
  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  const rememberCategory = (cat) => {
    const next = [...new Set([cat, ...savedCats])].slice(0, 60);
    setSavedCats(next); localStorage.setItem('expensely_cats', JSON.stringify(next));
  };

  /* ---------- actions ---------- */
  const handleAddExpense = async (entry) => {
    const today = new Date().toISOString().split('T')[0];
    const created_at = entry.date === today ? new Date().toISOString() : new Date(`${entry.date}T12:00:00`).toISOString();
    const { data: ins, error } = await supabase.from('expenses').insert([{ category: entry.category, amount: entry.amount, note: entry.note, created_at, user_id: session.user.id }]).select('id');
    if (error) { showToast('Could not save the entry', 'error'); return false; }
    if (ins?.[0]?.id) setAddedIds((p) => [...p, ins[0].id].slice(-5));
    rememberCategory(entry.category);
    showToast('Entry saved'); fetchExpenses(); return true;
  };
  const handleUpdateExpense = async (id, patch) => {
    const { error } = await supabase.from('expenses').update(patch).eq('id', id);
    if (error) showToast('Could not update the entry', 'error'); else { showToast('Entry updated'); fetchExpenses(); }
  };
  const handleDeleteExpense = async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) showToast('Could not delete the entry', 'error'); else { showToast('Entry deleted'); fetchExpenses(); }
  };

  const handleSaveBudget = async (value) => {
    if (!caps.settings) { showToast('Run the one-time database setup first (Admin → Setup)', 'error'); return false; }
    const { error } = await supabase.from('app_settings').upsert({ key: 'monthly_budget', value: Number(value), updated_at: new Date().toISOString(), updated_by: session.user.id });
    if (error) { showToast('Only admins can change the budget', 'error'); return false; }
    setBudget(Number(value)); showToast('Budget updated for everyone'); return true;
  };

  const handleArchiveMonth = async () => {
    if (!expenses.length) { showToast('There is nothing to archive yet', 'error'); return; }
    if (!caps.entries) { showToast('Run the one-time database setup first, so archived entries keep their dates (Admin → Setup)', 'error'); return; }
    const times = expenses.map((e) => new Date(e.created_at));
    const breakdowns = {};
    expenses.forEach((e) => { breakdowns[e.category] = (breakdowns[e.category] || 0) + Number(e.amount); });
    const entries = expenses.map((e) => ({ id: e.id, created_at: e.created_at, entered_at: e.entered_at || null, category: e.category, amount: Number(e.amount), note: e.note || '', user_id: e.user_id, member: e.profiles?.full_name || 'Unknown' }));
    const label = new Date(Math.max(...times)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const { error: aErr } = await supabase.from('expense_archives').insert([{
      month_label: label, total_budget: budget, total_expense: totalSpent, net_savings_loss: budget - totalSpent,
      category_breakdowns: breakdowns, date_from: fmtDateShort(new Date(Math.min(...times))), date_to: fmtDateShort(new Date(Math.max(...times))), entries,
    }]);
    if (aErr) { showToast('Could not save the archive — nothing was deleted', 'error'); return; }
    const { error: dErr } = await supabase.from('expenses').delete().in('id', expenses.map((e) => e.id));
    if (dErr) { showToast('Archive saved, but the old entries could not be cleared', 'error'); fetchArchives(); return; }
    showToast(`${label} archived with every entry`); setExpenses([]); fetchArchives(); setCurrentView('archives');
  };

  if (!session || recoveryMode) {
    return <Auth onAuthSuccess={() => {}} enterRecovery={() => setRecoveryMode(true)} exitRecovery={() => setRecoveryMode(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-72 bg-gradient-to-b from-indigo-100/70 via-violet-50/40 to-transparent" />
      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <Navbar currentView={currentView} setCurrentView={setCurrentView} currentUser={currentUser} onLogout={async () => { await supabase.auth.signOut(); setCurrentView('home'); }} />
      <main className="relative mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12">
        {loading ? (
          <div className="grid place-items-center py-24 text-sm font-semibold text-slate-400"><span className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />Loading your ledger…</div>
        ) : (
          <>
            {currentView === 'home' && <Dashboard expenses={expenses} budget={budget} isAdmin={isAdmin} onArchive={handleArchiveMonth} goTo={setCurrentView} caps={caps} />}
            {currentView === 'add' && <ExpenseForm onAddExpense={handleAddExpense} categories={categories} noteMap={noteMap} recent={expenses.filter((e) => addedIds.includes(e.id)).reverse()} />}
            {currentView === 'history' && <ExpenseList rawExpenses={expenses} categories={categories} onDeleteExpense={handleDeleteExpense} onUpdateExpense={handleUpdateExpense} currentUser={currentUser} />}
            {currentView === 'reports' && <div className="mx-auto max-w-2xl"><ReportSettings mode="me" userId={session.user.id} caps={caps} showToast={showToast} /></div>}
            {currentView === 'archives' && <ArchiveList archives={archives} />}
            {currentView === 'admin' && isAdmin && (
              <AdminPanel expenses={expenses} archives={archives} budget={budget} caps={caps} onSaveBudget={handleSaveBudget} onArchive={handleArchiveMonth} onUpdateExpense={handleUpdateExpense} onDeleteExpense={handleDeleteExpense} categories={categories} showToast={showToast} recheck={checkCaps} userId={session.user.id} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
