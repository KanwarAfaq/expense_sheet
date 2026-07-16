import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import ArchiveList from './components/ArchiveList';
import Toast from './components/Toast';
import Auth from './components/Auth';
import AdminPanel from './components/AdminPanel';
import CategorySummary from './components/CategorySummary';

export default function App() {
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [archives, setArchives] = useState([]);
  const [currentView, setCurrentView] = useState(() => localStorage.getItem('expensely_view') || 'home');
  
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const budget = 4500;

  // Persist view state
  useEffect(() => {
    localStorage.setItem('expensely_view', currentView);
  }, [currentView]);

  // Handle Authentication & Session Setup
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setExpenses([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch initial data once logged in
  useEffect(() => {
    if (session) {
      fetchExpenses();
      fetchArchives();
    }
  }, [session]);

  const fetchUserProfile = async (userId) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (!error && data) setCurrentUser(data);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentView('home');
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchExpenses = async () => {
    setLoading(true);
    // Join query to grab the user profile data connected to the expense
    const { data, error } = await supabase
      .from('expenses')
      .select('*, profiles(full_name, avatar_url)')
      .order('created_at', { ascending: true });
      
    if (!error && data) setExpenses(data);
    setLoading(false);
  };

  const fetchArchives = async () => {
    const { data, error } = await supabase.from('expense_archives').select('*').order('archived_at', { ascending: false });
    if (!error && data) setArchives(data);
  };

  const handleAddExpense = async (newEntry) => {
    // If user picks today, use accurate current ISO timestamp. 
    // If they picked a past date, parse it with noon UTC so it registers cleanly.
    const todayStr = new Date().toISOString().split('T')[0];
    const finalDate = newEntry.date === todayStr 
      ? new Date().toISOString() 
      : new Date(`${newEntry.date}T12:00:00Z`).toISOString();

    const entryWithUser = { 
      category: newEntry.category,
      amount: newEntry.amount,
      note: newEntry.note,
      created_at: finalDate, // Appends the new generated date
      user_id: session.user.id 
    };
    const { error } = await supabase.from('expenses').insert([entryWithUser]);
    if (!error) {
      showToast('Transaction posted to cloud ledger!');
      fetchExpenses();
    } else {
      showToast('Error uploading ledger entry', 'error');
    }
  };
  const handleUpdateExpense = async (id, updatedEntry) => {
    const { error } = await supabase.from('expenses').update(updatedEntry).eq('id', id);
    if (!error) {
      showToast('Ledger entry successfully updated!');
      fetchExpenses();
    } else {
      showToast('Error updating entry', 'error');
    }
  };
  const handleDeleteExpense = async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) {
      showToast('Entry removed from statement logs.');
      fetchExpenses();
    }
  };

  const handleArchiveMonth = async () => {
    if (expenses.length === 0) {
      showToast('Cannot archive an empty current ledger layout.', 'error');
      return;
    }

    const dateObjects = expenses.map(item => new Date(item.created_at));
    const minDate = new Date(Math.min(...dateObjects)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const maxDate = new Date(Math.max(...dateObjects)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const totalSpent = expenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const savingsLoss = budget - totalSpent;

    const breakdowns = {};
    expenses.forEach((item) => {
      breakdowns[item.category] = (breakdowns[item.category] || 0) + parseFloat(item.amount);
    });

    const currentMonthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const { error: archiveError } = await supabase.from('expense_archives').insert([{
      month_label: currentMonthLabel,
      total_budget: budget,
      total_expense: totalSpent,
      net_savings_loss: savingsLoss,
      category_breakdowns: breakdowns,
      date_from: minDate,
      date_to: maxDate
    }]);

    if (archiveError) {
      showToast('Failed to compile summary database report.', 'error');
      return;
    }

    const { error: deleteError } = await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (!deleteError) {
      showToast(`${currentMonthLabel} closed out and archived safely!`);
      setExpenses([]);
      fetchArchives();
      setCurrentView('archives');
    }
  };

  const currentTotalSpent = expenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);

  // If not authenticated, render the Auth screen
 if (!session || recoveryMode) {
    return (
      <Auth 
        onAuthSuccess={() => {}} 
        enterRecovery={() => setRecoveryMode(true)}
        exitRecovery={() => setRecoveryMode(false)}
      />
    ); 
  }

  return (
    <div className="min-h-screen bg-slate-50 antialiased pb-12 relative">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <Navbar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      
      <main className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center py-12 text-sm text-slate-400 font-semibold">Syncing database data...</div>
        ) : (
          <div className="space-y-6">
          
              
             
                
               {currentView === 'home' && (
              <>
                <Hero totalExpenses={currentTotalSpent} budget={budget} />
                
                {/* NEW CATEGORY SUMMARY COMPONENT */}
                <CategorySummary expenses={expenses} />
                
                {/* Only Admin can archive the month */}
                {currentUser?.role === 'admin' && (
                  <div className="flex justify-end">
                    <button 
                      onClick={handleArchiveMonth}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-2"
                    >
                      📦 Close & Archive Current Month
                    </button>
                  </div>
                )}
              </>
            )}
              
            {currentView === 'add' && (
              <div className="max-w-md mx-auto">
                <ExpenseForm onAddExpense={handleAddExpense} />
              </div>
            )}
           {currentView === 'history' && (
              <ExpenseList 
                rawExpenses={expenses} 
                onDeleteExpense={handleDeleteExpense}
                onUpdateExpense={handleUpdateExpense} // <-- Add this!
                currentUser={currentUser} 
              />
            )}
            {currentView === 'archives' && (
              <ArchiveList archives={archives} />
            )}
            {currentView === 'admin' && currentUser?.role === 'admin' && (
              <AdminPanel />
            )}
          </div>
        )}
      </main>
    </div>
  );
}