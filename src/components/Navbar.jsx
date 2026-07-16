import React from 'react';

export default function Navbar({ currentView, setCurrentView, currentUser, onLogout }) {
  const baseLinks = [
    { id: 'home', title: 'Dashboard', icon: '📊' },
    { id: 'add', title: 'Add Expense', icon: '➕' },
    { id: 'history', title: 'Ledger Logs', icon: '📜' },
    { id: 'archives', title: 'Month Archives', icon: '📂' }
  ];

  // Dynamically inject the Admin Panel link if the user has clearance
  const links = currentUser?.role === 'admin' 
    ? [...baseLinks, { id: 'admin', title: 'Admin Panel', icon: '🛡️' }]
    : baseLinks;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Identity / Home Trigger */}
        <button 
          onClick={() => setCurrentView('home')} 
          className="flex items-center gap-2 font-black text-slate-900 tracking-tight text-base cursor-pointer shrink-0"
        >
          <span className="text-xl">💳</span> 
          <span className="hidden sm:block">Expensely</span>
        </button>
        
        {/* Clickable Navigation Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar mx-2">
          {links.map((link) => {
            const isSelected = currentView === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setCurrentView(link.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer select-none active:scale-95 whitespace-nowrap
                  ${isSelected 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }
                `}
              >
                <span>{link.icon}</span>
                <span className={isSelected ? 'block' : 'hidden md:block'}>
                  {link.title}
                </span>
              </button>
            );
          })}
        </div>

       {/* User Profile & Logout System */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* We still only show the avatar if the profile loaded successfully */}
          {currentUser ? (
            <div className="hidden md:flex items-center gap-2 text-right">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser.full_name}
                </span>
                <span className="text-[10px] font-semibold text-indigo-600 capitalize leading-tight">
                  {currentUser.role}
                </span>
              </div>
              <img 
                src={currentUser.avatar_url} 
                alt="Profile Avatar" 
                className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200"
              />
            </div>
          ) : (
             <div className="text-xs font-bold text-slate-400 hidden md:block">
               Syncing profile...
             </div>
          )}
          
          {/* The Logout Button is now GUARANTEED to show up */}
          <button 
            onClick={onLogout}
            className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg transition-colors border border-red-100 cursor-pointer"
          >
            Logout
          </button>
        </div>

      </div>
    </nav>
  );
}