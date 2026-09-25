import React, { useState } from 'react';
import { formatPHP } from '../../utils/currency';

interface RevenueExpensesBarChartProps {
  data: Array<{
    label: string;
    revenue: number;
    expenses: number;
    netIncome: number;
  }>;
}

export const RevenueExpensesBarChart: React.FC<RevenueExpensesBarChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No comparative financial data available for this range.
      </div>
    );
  }

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.revenue, d.expenses)),
    1000
  );

  const chartHeight = 180;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-emerald-600"></span>
            <span className="text-slate-600 font-medium">Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-rose-500"></span>
            <span className="text-slate-600 font-medium">Expenses</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-sky-500"></span>
            <span className="text-slate-600 font-medium">Net Profit</span>
          </div>
        </div>
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div className="text-xs font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200">
            <strong>{data[hoveredIndex].label}</strong>: Rev {formatPHP(data[hoveredIndex].revenue)} | Exp {formatPHP(data[hoveredIndex].expenses)} | Net {formatPHP(data[hoveredIndex].netIncome)}
          </div>
        )}
      </div>

      <div className="relative h-[200px] flex items-end gap-2 sm:gap-4 pt-4 pb-6 border-b border-slate-200">
        {data.map((item, idx) => {
          const revHeight = Math.max(4, (item.revenue / maxVal) * chartHeight);
          const expHeight = Math.max(4, (item.expenses / maxVal) * chartHeight);
          const isHovered = hoveredIndex === idx;

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Bars container */}
              <div className="w-full flex items-end justify-center gap-1">
                {/* Revenue Bar */}
                <div
                  style={{ height: `${revHeight}px` }}
                  className={`w-1/2 max-w-[24px] bg-emerald-500 rounded-t-sm transition-all duration-200 ${
                    isHovered ? 'bg-emerald-600 ring-2 ring-emerald-300' : 'hover:bg-emerald-600'
                  }`}
                />
                {/* Expenses Bar */}
                <div
                  style={{ height: `${expHeight}px` }}
                  className={`w-1/2 max-w-[24px] bg-rose-500 rounded-t-sm transition-all duration-200 ${
                    isHovered ? 'bg-rose-600 ring-2 ring-rose-300' : 'hover:bg-rose-600'
                  }`}
                />
              </div>

              {/* Bottom Label */}
              <span className="absolute -bottom-5 text-[10px] font-medium text-slate-500 truncate max-w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface CategoryHorizontalBarProps {
  categories: Record<string, number>;
  total: number;
  colorClass?: string;
  emptyMessage?: string;
}

export const CategoryHorizontalBars: React.FC<CategoryHorizontalBarProps> = ({
  categories,
  total,
  colorClass = 'bg-emerald-500',
  emptyMessage = 'No data recorded',
}) => {
  const entries = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (entries.length === 0 || total === 0) {
    return <div className="text-xs text-slate-400 py-6 text-center">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-3">
      {entries.map(([category, amount]) => {
        const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : '0';
        return (
          <div key={category} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-700 truncate min-w-0 max-w-[180px]">{category}</span>
              <span className="font-mono text-slate-900 font-medium tabular-nums shrink-0">
                {formatPHP(amount)} <span className="text-slate-400 font-normal">({percentage}%)</span>
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${colorClass} transition-all duration-300`}
                style={{ width: `${Math.min(100, Math.max(2, Number(percentage)))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface PaymentMethodDistributionProps {
  balances: Array<{
    methodId: string;
    methodName: string;
    revenue: number;
    expenses: number;
    balance: number;
  }>;
}

export const PaymentMethodDistribution: React.FC<PaymentMethodDistributionProps> = ({ balances }) => {
  const totalRev = balances.reduce((s, b) => s + b.revenue, 0);

  if (totalRev === 0) {
    return <div className="text-xs text-slate-400 py-6 text-center">No payment collections found.</div>;
  }

  return (
    <div className="space-y-2.5">
      {balances
        .filter((b) => b.revenue > 0 || b.expenses > 0)
        .map((b) => (
          <div
            key={b.methodId}
            className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition-colors"
          >
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{b.methodName}</p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                  <span>In: <strong className="text-emerald-600 font-mono tabular-nums">{formatPHP(b.revenue)}</strong></span>
                  <span>·</span>
                  <span>Out: <strong className="text-rose-600 font-mono tabular-nums">{formatPHP(b.expenses)}</strong></span>
                </div>
              </div>
              <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Net Inflow</span>
              <span className={`text-xs font-bold font-mono tabular-nums ${b.balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                {formatPHP(b.balance)}
              </span>
            </div>
          </div>
        ))}
    </div>
  );
};
