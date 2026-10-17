import React from 'react';
import { Skeleton, SkeletonCard, SkeletonKpiCard, SkeletonTable } from '../ui/Skeleton';

export const MonthlyAccountingSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-busy="true">
    <span className="sr-only">Loading monthly accounting…</span>

    <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
      <div className="space-y-2">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonKpiCard key={i} />
      ))}
    </div>

    <SkeletonTable columns={5} rows={10} />

    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <SkeletonCard key={i}>
          <Skeleton className="h-4 w-44" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, r) => (
              <Skeleton key={r} className="h-3" />
            ))}
          </div>
        </SkeletonCard>
      ))}
    </div>
  </div>
);

export default MonthlyAccountingSkeleton;
