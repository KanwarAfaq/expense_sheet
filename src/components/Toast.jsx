import React, { useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    // We removed onClose from the dependency array below so it only runs once when the toast mounts
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    
    return () => clearTimeout(timer);
  }, []); // <-- Empty array fixes the timer reset bug

  return (
    <div 
      onClick={onClose}
      // Bumped z-index to z-[100] to ensure it clears the Navbar
      className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border cursor-pointer select-none animate-slide-in active:scale-95 transition-all
        ${type === 'success' 
          ? 'bg-slate-900 text-emerald-400 border-slate-800' 
          : 'bg-red-950 text-red-200 border-red-800'
        }
      `}
    >
      <span className="text-sm font-semibold">{message}</span>
      <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/60">Tap to dismiss</span>
    </div>
  );
}