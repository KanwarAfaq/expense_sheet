import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (!error) setUsers(data);
    setLoading(false);
  };

  const promoteToAdmin = async (id) => {
    const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', id);
    if (!error) fetchUsers();
  };

  if (loading) return <div className="text-center py-10">Loading admin logs...</div>;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
      <div className="border-b border-slate-100 pb-4 mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-900">🛡️ Admin Control Center</h2>
          <p className="text-sm text-slate-500 font-medium">Manage members and system access</p>
        </div>
        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
          {users.length} Total Users
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {users.map(user => (
          <div key={user.id} className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={user.avatar_url} alt="avatar" className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200" />
              <div>
                <p className="font-bold text-slate-900">{user.full_name}</p>
                <p className="text-xs text-slate-500 font-medium capitalize">{user.role}</p>
              </div>
            </div>
            
            {user.role === 'member' && (
              <button 
                onClick={() => promoteToAdmin(user.id)}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                Make Admin
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}