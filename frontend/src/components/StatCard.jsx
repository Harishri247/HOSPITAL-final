import React from 'react';

export const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle }) => {
  const colorMap = {
    teal: {
      badge: 'bg-blue-500/10 text-blue-700 dark:text-sky-300 border-blue-500/30',
      gradient: 'from-blue-600 via-sky-500 to-cyan-400',
      glow: 'group-hover:shadow-blue-500/25',
      iconBg: 'bg-gradient-to-br from-blue-500/20 to-sky-500/15 dark:from-blue-500/30 dark:to-sky-500/20 text-blue-600 dark:text-sky-300 border-blue-500/30'
    },
    sky: {
      badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
      gradient: 'from-sky-500 via-blue-500 to-cyan-400',
      glow: 'group-hover:shadow-sky-500/25',
      iconBg: 'bg-gradient-to-br from-sky-500/20 to-cyan-500/15 dark:from-sky-500/30 dark:to-cyan-500/20 text-sky-600 dark:text-sky-300 border-sky-500/30'
    },
    purple: {
      badge: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
      gradient: 'from-purple-600 via-violet-500 to-indigo-500',
      glow: 'group-hover:shadow-purple-500/25',
      iconBg: 'bg-gradient-to-br from-purple-500/20 to-violet-500/15 dark:from-purple-500/30 dark:to-violet-500/20 text-purple-600 dark:text-purple-300 border-purple-500/30'
    },
    amber: {
      badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
      gradient: 'from-amber-500 via-orange-400 to-yellow-400',
      glow: 'group-hover:shadow-amber-500/25',
      iconBg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/15 dark:from-amber-500/30 dark:to-orange-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30'
    },
    rose: {
      badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
      gradient: 'from-rose-500 via-pink-500 to-red-400',
      glow: 'group-hover:shadow-rose-500/25',
      iconBg: 'bg-gradient-to-br from-rose-500/20 to-pink-500/15 dark:from-rose-500/30 dark:to-pink-500/20 text-rose-600 dark:text-rose-300 border-rose-500/30'
    },
    emerald: {
      badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
      gradient: 'from-blue-700 via-blue-600 to-sky-400',
      glow: 'group-hover:shadow-sky-500/25',
      iconBg: 'bg-gradient-to-br from-blue-600/20 to-sky-500/15 dark:from-blue-600/30 dark:to-sky-500/20 text-sky-600 dark:text-sky-300 border-sky-500/30'
    },
    indigo: {
      badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
      gradient: 'from-indigo-600 via-blue-600 to-sky-400',
      glow: 'group-hover:shadow-indigo-500/25',
      iconBg: 'bg-gradient-to-br from-indigo-500/20 to-blue-500/15 dark:from-indigo-500/30 dark:to-blue-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-500/30'
    },
    blue: {
      badge: 'bg-blue-500/10 text-blue-700 dark:text-sky-300 border-blue-500/30',
      gradient: 'from-blue-600 via-sky-500 to-cyan-400',
      glow: 'group-hover:shadow-blue-500/25',
      iconBg: 'bg-gradient-to-br from-blue-500/20 to-sky-500/15 dark:from-blue-500/30 dark:to-sky-500/20 text-blue-600 dark:text-sky-300 border-blue-500/30'
    },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className={`relative overflow-hidden bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 shadow-sm hover:shadow-2xl transition-all duration-300 group hover:-translate-y-1.5 ${scheme.glow}`}>
      {/* Top micro gradient line */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${scheme.gradient} opacity-90 group-hover:opacity-100 transition-opacity`} />
      
      {/* Corner colorful ambient glow aura */}
      <div className={`absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-gradient-to-br ${scheme.gradient} opacity-10 group-hover:opacity-25 transition-opacity blur-2xl pointer-events-none`} />

      <div className="flex items-center justify-between relative z-10">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className={`p-3 rounded-2xl border shadow-md transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${scheme.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-4 relative z-10">
        <div className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-slate-50 font-display tracking-tight">
          {value !== undefined && value !== null ? value : '—'}
        </div>
        {subtitle && (
          <p className="mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>{subtitle}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
