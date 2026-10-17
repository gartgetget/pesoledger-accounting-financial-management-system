import React from 'react';
import { Skeleton, SkeletonBanner, SkeletonTable } from '../ui/Skeleton';

export const RevenueSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-busy="true">
    <span className="sr-only">Loading revenue…</span>

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

    <SkeletonTable columns={9} rows={8} />
  </div>
);

export default RevenueSkeleton;
