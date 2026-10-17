import React from 'react';
import { Skeleton, SkeletonBanner, SkeletonTable } from '../ui/Skeleton';

export const JobsSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-busy="true">
    <span className="sr-only">Loading job orders…</span>

    <SkeletonBanner />

    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-4">
        <Skeleton className="h-9 md:col-span-2" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>

    <SkeletonTable columns={11} rows={8} />
  </div>
);

export default JobsSkeleton;
