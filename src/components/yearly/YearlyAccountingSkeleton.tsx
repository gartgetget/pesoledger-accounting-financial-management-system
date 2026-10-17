import React from 'react';
import { Skeleton, SkeletonChart, SkeletonKpiCard, SkeletonTable } from '../ui/Skeleton';

export const YearlyAccountingSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-busy="true">
    <span className="sr-only">Loading yearly accounting…</span>

    <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
      <div className="space-y-2">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonKpiCard key={i} />
      ))}
    </div>

    <SkeletonChart />

    <SkeletonTable columns={5} rows={12} />
  </div>
);

export default YearlyAccountingSkeleton;
