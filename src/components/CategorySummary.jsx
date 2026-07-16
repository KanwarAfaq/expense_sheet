import React, { useState } from 'react';

export default function CategorySummary({ expenses }) {
  const [filterType, setFilterType] = useState('month'); // Defaults to past 30 days
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // STEP 1: Filter by date range
  const filteredExpenses = expenses.filter((item) => {
    const itemDate = new Date(item.created_at);
    const now = new Date();

    if (filterType === 'range') {
      if (startDate && itemDate < new Date(`${startDate}T00:00:00`)) return false;
      if (endDate && itemDate > new Date(`${endDate}T23:59:59`)) return false;
    }
    if (filterType === 'week') return itemDate >= new Date(now.setDate(now.getDate() - 7));
    if (filterType === 'month') return itemDate >= new Date(now.setDate(now.getDate() - 30));
    return true;
  });

  // STEP 2: Group by category and calculate totals
  const categoryMap = {};
  let totalFilteredAmount = 0;

  filteredExpenses.forEach(item => {
    const amount = parseFloat(item.amount);
    if (!categoryMap[item.category]) {
      categoryMap[item.category] = { count: 0, amount: 0 };
    }
    categoryMap[item.category].count += 1;
    categoryMap[item.category].amount += amount;
    totalFilteredAmount += amount;
  });

  // STEP 3: Convert to an array and sort descending by amount
  const sortedCategories = Object.entries(categoryMap)
    .map(([category, data]) => ({
      category,
      count: data.count,
      amount: data.amount
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">📊 Spending by Category</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Total: <span className="text-indigo-600 font-bold">${totalFilteredAmount.toFixed(2)}</span>
          </p>
        </div>

        {/* DATE FILTERS */}
        <div className="flex flex-col sm:flex-row gap-2">
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            className="h-9 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none"
          >
            <option value="all">All Time</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
            <option value="range">Custom Range</option>
          </select>

          {filterType === 'range' && (
            <div className="flex gap-2">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                className="h-9 px-2 border border-slate-200 rounded-xl text-xs bg-slate-50"
              />
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                className="h-9 px-2 border border-slate-200 rounded-xl text-xs bg-slate-50"
              />
            </div>
          )}
        </div>
      </div>

      {/* CATEGORY LISTING */}
      <div className="space-y-3">
        {sortedCategories.length > 0 ? (
          sortedCategories.map((item) => (
            <div key={item.category} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 font-black text-[10px]">
                  {item.count}
                </span>
                <span className="font-bold text-slate-800 text-sm">{item.category}</span>
              </div>
              <span className="font-black text-slate-900">
                ${item.amount.toFixed(2)}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-sm text-slate-400 font-medium">
            No expenses found for this time period.
          </div>
        )}
      </div>
    </div>
  );
}