import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

// Add the new props here
export default function Auth({ onAuthSuccess, enterRecovery, exitRecovery }) {
  const [view, setView] = useState('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const showMessage = (text, type = 'success') => setMessage({ text, type });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showMessage(error.message, 'error');
    else onAuthSuccess();
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    const randomAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${fullName}`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, avatar_url: randomAvatar } }
    });

    if (error) {
      showMessage(error.message, 'error');
    } else {
      showMessage('Code sent! Check your email.', 'success');
      setView('verify-signup');
    }
    setLoading(false);
  };

  const handleVerifySignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup'
    });

    if (error) showMessage(error.message, 'error');
    else onAuthSuccess();
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      showMessage(error.message, 'error');
    } else {
      showMessage('Reset code sent! Check your email.', 'success');
      setView('verify-reset');
    }
    setLoading(false);
  };

  // UPDATED: Triggers enterRecovery() before verifying the code
  const handleVerifyReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (enterRecovery) enterRecovery(); // Tells App.jsx NOT to hide this screen yet

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'recovery'
    });

    if (error) {
      showMessage(error.message, 'error');
      if (exitRecovery) exitRecovery(); // Reverts state if they type the wrong code
    } else {
      showMessage('Code verified. Enter your new password.', 'success');
      setView('update-password');
      setOtp('');
    }
    setLoading(false);
  };

  // UPDATED: Triggers exitRecovery() when the new password is saved
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      showMessage(error.message, 'error');
    } else {
      showMessage('Password updated successfully!', 'success');
      if (exitRecovery) exitRecovery(); // Drops them straight into the dashboard!
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-slate-900 mb-2">💳 Expensely</h1>
          <p className="text-slate-500 font-medium">
            {view === 'login' && 'Welcome back to your ledger'}
            {view === 'signup' && 'Create your tracking account'}
            {view === 'forgot-password' && 'Reset your password'}
            {view === 'verify-signup' && 'Verify your email address'}
            {view === 'verify-reset' && 'Enter recovery code'}
            {view === 'update-password' && 'Create new password'}
          </p>
        </div>

        {message.text && (
          <div className={`p-3 rounded-lg text-sm font-bold mb-6 text-center ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {message.text}
          </div>
        )}

        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm" />
            </div>
            <button type="submit" disabled={loading} className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all mt-2">
              {loading ? 'Processing...' : 'Sign In'}
            </button>
            <div className="flex justify-between text-sm font-medium mt-4">
              <button type="button" onClick={() => setView('forgot-password')} className="text-slate-500 hover:text-indigo-600">Forgot Password?</button>
              <button type="button" onClick={() => setView('signup')} className="text-indigo-600 font-bold hover:underline">Create Account</button>
            </div>
          </form>
        )}

        {view === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm" />
            </div>
            <button type="submit" disabled={loading} className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all mt-2">
              {loading ? 'Sending Code...' : 'Sign Up'}
            </button>
            <p className="text-center text-sm font-medium mt-4 text-slate-500">
              Already have an account? <button type="button" onClick={() => setView('login')} className="text-indigo-600 font-bold hover:underline">Log in</button>
            </p>
          </form>
        )}

        {view === 'forgot-password' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email Address</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm" />
            </div>
            <button type="submit" disabled={loading} className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all mt-2">
              {loading ? 'Sending...' : 'Send Recovery Code'}
            </button>
            <button type="button" onClick={() => setView('login')} className="w-full text-sm font-bold text-slate-500 hover:text-slate-800 mt-2">Back to Login</button>
          </form>
        )}

        {(view === 'verify-signup' || view === 'verify-reset') && (
          <form onSubmit={view === 'verify-signup' ? handleVerifySignup : handleVerifyReset} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">6-Digit Code</label>
              <input type="text" required placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full h-12 px-3 border border-slate-200 rounded-xl text-lg tracking-widest text-center font-black text-slate-800" maxLength={6} />
            </div>
            <button type="submit" disabled={loading} className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all mt-2">
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            <button type="button" onClick={() => {
              setView('login');
              if (exitRecovery) exitRecovery();
            }} className="w-full text-sm font-bold text-slate-500 hover:text-slate-800 mt-2">Cancel</button>
          </form>
        )}

        {view === 'update-password' && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">New Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm" />
            </div>
            <button type="submit" disabled={loading} className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all mt-2">
              {loading ? 'Saving...' : 'Save New Password'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}