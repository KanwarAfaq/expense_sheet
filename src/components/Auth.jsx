import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) onAuthSuccess();
      else alert(error.message);
    } else {
      // Create user with metadata for our trigger to catch
      const randomAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${fullName}`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, avatar_url: randomAvatar } }
      });
      if (!error) {
        alert('Signup successful! You can now log in.');
        setIsLogin(true);
      } else {
        alert(error.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 mb-2">💳 Expensely</h1>
          <p className="text-slate-500 font-medium">
            {isLogin ? 'Welcome back to your ledger' : 'Create your tracking account'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm" />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm" />
          </div>

          <button type="submit" disabled={loading} className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all mt-4">
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6 font-medium">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-indigo-600 font-bold hover:underline">
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}