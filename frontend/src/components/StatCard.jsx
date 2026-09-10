import React from 'react';

export const StatCard = ({ title, value, icon: Icon, color = 'teal', subtitle }) => {
  const colorMap = {
    teal: 'bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400 border-teal-100 dark:border-teal-900',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400 border-sky-100 dark:border-sky-900',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 border-purple-100 dark:border-purple-900',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border-amber-100 dark:border-amber-900',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border-rose-100 dark:border-rose-900',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900',
  };

  const scheme = colorMap[color] || colorMap.teal;

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition duration-200">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</span>
        {Icon && (
          <div className={`p-2.5 rounded-xl border ${scheme}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          {value !== undefined && value !== null ? value : '—'}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
