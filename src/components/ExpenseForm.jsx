import React, { useState, useRef, useEffect } from 'react';

export default function ExpenseForm({ onAddExpense }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  
  // NEW: State for the custom date picker (Defaults to today's date)
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [categories, setCategories] = useState(['Food', 'Bills', 'Leisure', 'Transit']);
  const [selectedCategory, setSelectedCategory] = useState('Food');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCategories = categories.filter(cat =>
    cat.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const handleAddCustomCategory = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    
    if (!categories.includes(formatted)) {
      setCategories(prev => [...prev, formatted]);
    }
    setSelectedCategory(formatted);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

 const handleSubmit = (e) => {
  e.preventDefault();
  if (!amount) return;

  // Pass the selected date up to App.jsx
  onAddExpense({
    category: selectedCategory,
    amount: parseFloat(amount),
    note: note.trim(),
    date: entryDate
  });

  setAmount('');
  setNote('');
  setEntryDate(new Date().toISOString().split('T')[0]); // Reset to today after submitting
};

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs transition-all duration-300">
      <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
        <span>➕</span> New Transaction
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* NEW: Date Input Field */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Transaction Date
          </label>
          <input 
            type="date" 
            value={entryDate} 
            onChange={(e) => setEntryDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]} // Prevents picking future dates
            className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-semibold text-slate-700 bg-white cursor-pointer"
            required
          />
        </div>

        {/* Searchable Category Selector */}
        <div className="relative" ref={dropdownRef}>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category</label>
          <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm flex items-center justify-between cursor-pointer bg-white transition-all hover:border-slate-300 select-none">
            <span className="text-slate-800 font-semibold">{selectedCategory}</span>
            <span className="text-slate-400 text-xs">{isDropdownOpen ? '▲' : '▼'}</span>
          </div>

          {isDropdownOpen && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="p-2 border-b border-slate-100">
                <input type="text" placeholder="Type to search or create custom category..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500" autoFocus />
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-50">
                {filteredCategories.map((cat) => (
                  <button key={cat} type="button" onClick={() => handleSelectCategory(cat)} className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex justify-between items-center">
                    <span>{cat}</span>
                    {cat === selectedCategory && <span className="text-indigo-600 text-xs">✓</span>}
                  </button>
                ))}
                {searchQuery.trim() && !categories.some(c => c.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                  <button type="button" onClick={handleAddCustomCategory} className="w-full text-left px-3 py-2.5 text-xs font-semibold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 transition-colors cursor-pointer flex items-center gap-1.5">
                    <span>✨ Create new category:</span> <span className="italic truncate font-bold text-slate-800">"{searchQuery}"</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Amount ($)</label>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium" required />
        </div>

        {/* Memo Box */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Optional Memo / Note</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write a reminder note..." className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
        </div>

        <button type="submit" className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold rounded-xl text-sm shadow-sm cursor-pointer mt-2 transition-all">
          Add to Ledger
        </button>
      </form>
    </div>
  );
}