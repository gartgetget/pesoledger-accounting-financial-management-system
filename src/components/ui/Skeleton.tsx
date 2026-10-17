import React from 'react';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => (
  <div
    className={`animate-pulse rounded bg-slate-200 motion-reduce:animate-none ${className}`}
    {...props}
  />
);

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="h-3" style={{ width: `${100 - (i % 3) * 12}%` }} />
    ))}
  </div>
);

export const SkeletonTable: React.FC<{ columns: number; rows?: number; className?: string }> = ({
  columns,
  rows = 6,
  className = '',
}) => (
  <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs ${className}`}>
    <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1" />
      ))}
    </div>
    <div className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonKpiCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-xs ${className}`}>
    <Skeleton className="h-3 w-20" />
    <Skeleton className="mt-3 h-5 w-28" />
  </div>
);

export const SkeletonChart: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-xs ${className}`}>
    <Skeleton className="h-4 w-40" />
    <div className="mt-6 flex h-48 items-end gap-3">
      {[60, 90, 45, 75, 100, 55, 80, 40, 70].map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${h}%` }} />
      ))}
    </div>
  </div>
);

export const SkeletonBanner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center ${className}`}
  >
    <div className="space-y-2">
      <Skeleton className="h-5 w-64" />
      <Skeleton className="h-3 w-48" />
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <Skeleton className="h-11 w-36" />
      <Skeleton className="h-11 w-36" />
    </div>
  </div>
);

export const SkeletonCard: React.FC<{ className?: string; children?: React.ReactNode }> = ({
  className = '',
  children,
}) => (
  <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-xs ${className}`}>
    {children}
  </div>
);
