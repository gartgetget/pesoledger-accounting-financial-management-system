import React from 'react';
import { Skeleton, SkeletonBanner, SkeletonCard, SkeletonTable } from '../ui/Skeleton';

export const VehiclesSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-busy="true">
    <span className="sr-only">Loading vehicles…</span>

    <SkeletonBanner />

    <SkeletonCard>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="mt-4 flex gap-4 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-64 shrink-0 rounded-xl border border-slate-200 p-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-24" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </div>
        ))}
      </div>
    </SkeletonCard>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <SkeletonCard key={i}>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-6 w-32" />
        </SkeletonCard>
      ))}
    </div>

    <SkeletonTable columns={9} rows={7} />
  </div>
);

export default VehiclesSkeleton;
