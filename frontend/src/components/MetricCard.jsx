import React from 'react';

export default function MetricCard({ title, value, icon: Icon, description, trendColor = 'text-royal-400' }) {
  return (
    <div className="glass-panel border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg transition-transform hover:-translate-y-0.5 duration-200">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">{title}</span>
          <h3 className="text-3xl font-extrabold text-white mt-2 tracking-tight">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl bg-dark-850 border border-slate-800 ${trendColor} shadow-inner`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {description && (
        <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">{description}</span>
        </div>
      )}
    </div>
  );
}
