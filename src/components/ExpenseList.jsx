import React, { useState } from 'react';

export default function ExpenseList({ rawExpenses, onDeleteExpense, onUpdateExpense, currentUser }) {
  const [filterType, setFilterType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [excludedIds, setExcludedIds] = useState([]);

  // NEW: State variables to manage the inline admin edit form
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ amount: '', category: '', note: '', date: '' });

  const uniqueCategories = ['All', ...new Set(rawExpenses.map(item => item.category))];
  const activeCategories = [...new Set(rawExpenses.map(item => item.category))];

  const itemsMatchingFilter = rawExpenses.filter((item) => {
    const itemDate = new Date(item.created_at);
    const now = new Date();

    if (filterType === 'category' && selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (filterType === 'range') {
      if (startDate && itemDate < new Date(`${startDate}T00:00:00`)) return false;
      if (endDate && itemDate > new Date(`${endDate}T23:59:59`)) return false;
    }
    if (filterType === 'week') return itemDate >= new Date(now.setDate(now.getDate() - 7));
    if (filterType === 'month') return itemDate >= new Date(now.setDate(now.getDate() - 30));
    return true;
  });

  const toggleExclusion = (id) => {
    setExcludedIds(prev => prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]);
  };

  const handleBulkExcludeCategory = (e) => {
    if (e.target.value === 'None') return;
    const ids = itemsMatchingFilter.filter(i => i.category === e.target.value).map(i => i.id);
    setExcludedIds(prev => [...new Set([...prev, ...ids])]);
    e.target.value = 'None';
  };

  // NEW: Open the inline edit tool
  const startEdit = (item) => {
    setEditingId(item.id);
    const itemDate = new Date(item.created_at).toISOString().split('T')[0];
    setEditData({ amount: item.amount, category: item.category, note: item.note || '', date: itemDate });
  };

  // NEW: Save the edited data
  const saveEdit = (id) => {
    onUpdateExpense(id, {
      amount: parseFloat(editData.amount),
      category: editData.category,
      note: editData.note,
      created_at: new Date(`${editData.date}T12:00:00Z`).toISOString() // Restore formatted date
    });
    setEditingId(null);
  };

  let currentRunningTotal = 0;
  let totalExcludedAmount = 0;

  const processedDisplayItems = itemsMatchingFilter.map((item) => {
    const previousTotal = currentRunningTotal;
    const amount = parseFloat(item.amount);
    currentRunningTotal += amount;
    const isExcluded = excludedIds.includes(item.id);
    if (isExcluded) totalExcludedAmount += amount;

    const dateObj = new Date(item.created_at);
    return {
      ...item,
      displayDate: `${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      lastAmount: previousTotal,
      totalAmount: currentRunningTotal,
      isExcluded
    };
  });

  const finalAdjustedTotal = currentRunningTotal - totalExcludedAmount;
  const displayHistoryList = [...processedDisplayItems].reverse();

  return (
    <div className="space-y-6">
      
      {/* FILTER CONTROL PANEL */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter Ledger By:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white font-medium">
            <option value="all">Full Chronological Statement</option>
            <option value="week">Past 7 Days Expenses (Weekly)</option>
            <option value="month">Past 30 Days Expenses (Monthly)</option>
            <option value="range">Custom Date Range (From → To)</option>
            <option value="category">Isolate Specific Category Tag</option>
          </select>
        </div>
        {filterType === 'range' && (
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-xl text-xs bg-slate-50" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-xl text-xs bg-slate-50" />
          </div>
        )}
        {filterType === 'category' && (
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs bg-slate-50 font-semibold">
            {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        )}
      </div>

      {/* ISOLATED VIEW METRIC BOX */}
      <div className="bg-indigo-900 text-white rounded-2xl p-5 flex flex-col gap-4 shadow-xs">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">Calculated Total</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p className="text-3xl font-black">${finalAdjustedTotal.toFixed(2)}</p>
              {totalExcludedAmount > 0 && <p className="text-sm font-semibold text-indigo-300 line-through">${currentRunningTotal.toFixed(2)}</p>}
            </div>
          </div>
          <span className="text-xs bg-white/10 px-3 py-1 rounded-full border border-white/10 font-medium mt-1">{displayHistoryList.length} rows</span>
        </div>
        <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Bulk Uncheck:</label>
            <select defaultValue="None" onChange={handleBulkExcludeCategory} className="w-40 h-8 px-2 bg-indigo-950 border border-indigo-500/30 rounded-lg text-xs font-bold text-white">
              <option value="None">Select Category...</option>
              {activeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          {totalExcludedAmount > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-rose-300 bg-rose-500/20 px-2 py-1.5 rounded-md">Excluded: ${totalExcludedAmount.toFixed(2)}</span>
              <button onClick={() => setExcludedIds([])} className="text-[10px] bg-white/10 hover:bg-white/20 text-white font-bold px-2 py-1.5 rounded-md">Reset All</button>
            </div>
          )}
        </div>
      </div>

      {/* DATA STATEMENT LIST MATRIX */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3 text-center w-16">Include</th>
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Category / Memo</th>
                <th className="px-5 py-3 text-right">Added Cost</th>
                <th className="px-5 py-3 text-right">Running Bal</th>
                {currentUser?.role === 'admin' && <th className="px-5 py-3 text-center">Manage</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-600">
              {displayHistoryList.map((item) => (
                editingId === item.id ? (
                  // INLINE EDIT FORM FOR ADMINS
                  <tr key={`edit-${item.id}`} className="bg-indigo-50/60 border-y border-indigo-100">
                    <td colSpan={currentUser?.role === 'admin' ? "7" : "6"} className="px-5 py-4">
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[120px]">
                          <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Date</label>
                          <input type="date" value={editData.date} onChange={e => setEditData({...editData, date: e.target.value})} className="w-full h-8 px-2 border border-indigo-200 rounded-lg text-xs font-semibold text-slate-800" />
                        </div>
                        <div className="flex-1 min-w-[120px]">
                          <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Category</label>
                          <input type="text" value={editData.category} onChange={e => setEditData({...editData, category: e.target.value})} className="w-full h-8 px-2 border border-indigo-200 rounded-lg text-xs font-semibold text-slate-800" />
                        </div>
                        <div className="flex-1 min-w-[100px]">
                          <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Amount ($)</label>
                          <input type="number" step="0.01" value={editData.amount} onChange={e => setEditData({...editData, amount: e.target.value})} className="w-full h-8 px-2 border border-indigo-200 rounded-lg text-xs font-semibold text-slate-800" />
                        </div>
                        <div className="flex-2 min-w-[150px]">
                          <label className="block text-[10px] font-bold text-indigo-400 uppercase mb-1">Note / Memo</label>
                          <input type="text" value={editData.note} onChange={e => setEditData({...editData, note: e.target.value})} className="w-full h-8 px-2 border border-indigo-200 rounded-lg text-xs font-semibold text-slate-800" />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                          <button onClick={() => saveEdit(item.id)} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm">Save</button>
                          <button onClick={() => setEditingId(null)} className="flex-1 sm:flex-none bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors">Cancel</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // STANDARD ROW VIEW
                  <tr key={item.id} className={`transition-colors ${item.isExcluded ? 'bg-slate-50/80 opacity-60 grayscale-[50%]' : 'hover:bg-slate-50/40'}`}>
                    <td className="px-4 py-3.5 text-center">
                      <input type="checkbox" checked={!item.isExcluded} onChange={() => toggleExclusion(item.id)} className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500 cursor-pointer" />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {item.profiles?.avatar_url ? (
                          <img src={item.profiles.avatar_url} alt="User" className="w-6 h-6 rounded-full bg-slate-200 border border-slate-300" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">?</div>
                        )}
                        <span className="font-bold text-slate-700 whitespace-nowrap">{item.profiles?.full_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-400 font-medium">{item.displayDate}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-800">
                      <div className="flex flex-col">
                        <span className={item.isExcluded ? 'line-through decoration-slate-400/50' : ''}>{item.category}</span>
                        {item.note && <span className="text-[10px] text-red-600 font-medium mt-0.5">⚠️ {item.note}</span>}
                      </div>
                    </td>
                    <td className={`px-5 py-3.5 text-right font-black ${item.isExcluded ? 'text-slate-400 line-through' : 'text-slate-900'}`}>+${parseFloat(item.amount).toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-right font-black text-indigo-600 bg-indigo-50/10">${item.totalAmount.toFixed(2)}</td>
                    
                    {/* NEW: Admin Edit & Delete Actions */}
                    {currentUser?.role === 'admin' && (
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <button onClick={() => startEdit(item)} className="text-slate-400 hover:text-indigo-600 transition-colors px-1.5 py-1 cursor-pointer font-bold text-sm" title="Edit Entry">✏️</button>
                        <button onClick={() => onDeleteExpense(item.id)} className="text-slate-400 hover:text-red-600 transition-colors px-1.5 py-1 cursor-pointer font-bold text-sm" title="Delete Entry">✕</button>
                      </td>
                    )}
                  </tr>
                )
              ))}
              {displayHistoryList.length === 0 && (
                <tr>
                  <td colSpan={currentUser?.role === 'admin' ? "7" : "6"} className="text-center py-12 text-slate-400 font-medium">No matching ledger records exist for this filter setup scope.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}