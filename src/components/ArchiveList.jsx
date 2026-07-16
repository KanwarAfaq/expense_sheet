import React, { useState } from 'react';

export default function ArchiveList({ archives }) {
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchCategory, setSearchCategory] = useState('All');

  if (archives.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-slate-400 text-sm font-medium">No archived months discovered in history books yet.</p>
      </div>
    );
  }

  let displayCategories = ['All'];
  let filteredCategoryBreakdowns = [];
  let dynamicFilteredTotalSum = 0;

  if (selectedArchive) {
    const breakdowns = selectedArchive.category_breakdowns || {};
    displayCategories = ['All', ...Object.keys(breakdowns)];

    const formattedList = Object.entries(breakdowns).map(([cat, amt]) => ({
      category: cat,
      amount: amt
    }));

    filteredCategoryBreakdowns = formattedList.filter((item) => {
      if (filterType === 'category' && searchCategory !== 'All' && item.category !== searchCategory) return false;
      return true;
    });

    dynamicFilteredTotalSum = filteredCategoryBreakdowns.reduce((s, c) => s + c.amount, 0);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">📂 Historical Month Summaries</h2>

      {/* MONTH SELECTION GRID WITH TIMELINE DATE RANGES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {archives.map((arch) => {
          const isSelected = selectedArchive?.id === arch.id;
          
          // Calculate the percentage spent for the visual progress bar
          const spentPercent = Math.min((parseFloat(arch.total_expense) / parseFloat(arch.total_budget)) * 100, 100);
          const isOverBudget = parseFloat(arch.total_expense) > parseFloat(arch.total_budget);

          return (
            <button
              key={arch.id}
              onClick={() => {
                setSelectedArchive(arch);
                setFilterType('all');
                setSearchCategory('All');
              }}
              className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden select-none active:scale-[0.99]
                ${isSelected 
                  ? 'bg-indigo-950 text-white border-indigo-950 shadow-md' 
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${isSelected ? 'bg-white/10 text-indigo-200' : 'bg-slate-100 text-slate-500'}`}>
                  {arch.month_label}
                </span>
                
                {/* Renders transaction start/end coverage metrics */}
                {arch.date_from && arch.date_to ? (
                  <p className={`text-[11px] font-medium mt-2 ${isSelected ? 'text-indigo-200/80' : 'text-slate-400'}`}>
                    🗓️ {arch.date_from} → {arch.date_to}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-300 italic mt-2">No range recorded</p>
                )}
              </div>

              {/* DYNAMIC METRIC PROGRESS COMPONENT */}
              <div className="w-full space-y-1">
                <div className="flex justify-between text-[11px] font-semibold opacity-90">
                  <span>Spent: ${parseFloat(arch.total_expense).toFixed(0)}</span>
                  <span>{spentPercent.toFixed(0)}%</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                  <div 
                    style={{ width: `${spentPercent}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* SELECTED ARCHIVE LEDGER VIEW */}
      {selectedArchive && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-6 animate-fade-in">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-900">Statement Report: {selectedArchive.month_label}</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Coverage: {selectedArchive.date_from} up to {selectedArchive.date_to}</p>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl font-medium">Budget: <b className="text-slate-900 block mt-0.5">${parseFloat(selectedArchive.total_budget).toFixed(2)}</b></div>
              <div className="bg-slate-50 p-2.5 rounded-xl font-medium">Spent: <b className="text-red-600 block mt-0.5">${parseFloat(selectedArchive.total_expense).toFixed(2)}</b></div>
              <div className="bg-slate-50 p-2.5 rounded-xl font-medium">Net: <b className={`block mt-0.5 ${parseFloat(selectedArchive.net_savings_loss) >= 0 ? 'text-green-600' : 'text-red-600'}`}>${parseFloat(selectedArchive.net_savings_loss).toFixed(2)}</b></div>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Search Filter Option</label>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white font-medium"
            >
              <option value="all">View Whole Monthly Report</option>
              <option value="category">Isolate By Category Title</option>
            </select>

            {filterType === 'category' && (
              <div className="mt-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Choose Category Profile</label>
                <select 
                  value={searchCategory} 
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white font-bold"
                >
                  {displayCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-3.5 flex items-center justify-between text-xs font-bold">
            <span>Query Results Sum:</span>
            <span className="text-sm font-black text-indigo-300">${dynamicFilteredTotalSum.toFixed(2)}</span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {filteredCategoryBreakdowns.map((item) => (
              <div key={item.category} className="p-3.5 flex items-center justify-between text-xs sm:text-sm hover:bg-slate-50/50">
                <span className="font-bold text-slate-800">🏷️ {item.category}</span>
                <span className="font-black text-slate-900">${item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
