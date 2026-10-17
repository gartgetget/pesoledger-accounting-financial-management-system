import React from 'react';
import { Skeleton, SkeletonBanner, SkeletonCard } from '../ui/Skeleton';

export const CustomersSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-busy="true">
    <span className="sr-only">Loading customers…</span>

    <SkeletonBanner />

    <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
      <Skeleton className="h-9 w-full sm:w-72" />
      <Skeleton className="h-9 w-40" />
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-4" />
          </div>
          <Skeleton className="mt-3 h-3 w-40" />
          <Skeleton className="mt-2 h-3 w-48" />
          <Skeleton className="mt-2 h-3 w-28" />
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  </div>
);

export default CustomersSkeleton;
