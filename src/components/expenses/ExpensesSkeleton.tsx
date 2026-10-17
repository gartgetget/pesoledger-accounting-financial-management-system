import React from 'react';
import { Skeleton, SkeletonBanner, SkeletonCard, SkeletonTable } from '../ui/Skeleton';

export const ExpensesSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-busy="true">
    <span className="sr-only">Loading expenses…</span>

    <SkeletonBanner />

    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-6">
        <Skeleton className="h-9 md:col-span-2" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 pt-2">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>

    <SkeletonCard>
      <Skeleton className="h-4 w-40" />
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    </SkeletonCard>

    <SkeletonTable columns={10} rows={8} />
  </div>
);

export default ExpensesSkeleton;
