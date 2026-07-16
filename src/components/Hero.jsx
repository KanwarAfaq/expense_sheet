import React from 'react';

export default function Hero({ totalExpenses = 0, budget = 2000 }) {
  const remaining = budget - totalExpenses;

  return (
    <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl p-6 md:p-8 shadow-xl mb-8">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl mb-2">
          Smart Expense Tracker
        </h1>
        <p className="text-blue-100 text-sm md:text-base mb-6">
          Monitor your daily spending, stay within budget, and optimize your financial health.
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-blue-600/50 pt-6">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
          <p className="text-xs text-blue-200 uppercase tracking-wider font-semibold">Total Budget</p>
          <p className="text-2xl font-bold mt-1">${budget.toFixed(2)}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
          <p className="text-xs text-blue-200 uppercase tracking-wider font-semibold">Total Spent</p>
          <p className="text-2xl font-bold mt-1 text-red-200">${totalExpenses.toFixed(2)}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
          <p className="text-xs text-blue-200 uppercase tracking-wider font-semibold">Remaining</p>
          <p className={`text-2xl font-bold mt-1 ${remaining < 0 ? 'text-red-300' : 'text-green-300'}`}>
            ${remaining.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
