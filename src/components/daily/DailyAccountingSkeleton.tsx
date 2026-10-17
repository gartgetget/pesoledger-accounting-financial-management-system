import React from 'react';
import { Skeleton, SkeletonCard, SkeletonTable } from '../ui/Skeleton';

export const DailyAccountingSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-busy="true">
    <span className="sr-only">Loading daily accounting…</span>

    <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
      <div className="space-y-2">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonCard key={i}>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-6 w-32" />
          <Skeleton className="mt-3 h-3 w-20" />
        </SkeletonCard>
      ))}
    </div>

    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-28" />
          </div>
        ))}
      </div>
    </div>

    <SkeletonCard>
      <Skeleton className="h-4 w-40" />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </SkeletonCard>

    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <SkeletonTable columns={5} rows={5} />
      <SkeletonTable columns={4} rows={5} />
    </div>

    <SkeletonTable columns={4} rows={4} />
  </div>
);

export default DailyAccountingSkeleton;
