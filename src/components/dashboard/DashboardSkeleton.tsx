import React from 'react';
import {
  Skeleton,
  SkeletonBanner,
  SkeletonCard,
  SkeletonChart,
  SkeletonKpiCard,
  SkeletonTable,
} from '../ui/Skeleton';

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-busy="true">
    <span className="sr-only">Loading dashboard…</span>

    <SkeletonBanner />

    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonCard key={i}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="mt-3 space-y-3">
            {Array.from({ length: 4 }).map((_, r) => (
              <div key={r} className="flex items-center justify-between">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            ))}
          </div>
        </SkeletonCard>
      ))}
    </div>

    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonKpiCard key={i} />
      ))}
    </div>

    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <SkeletonTable columns={4} rows={4} />
      <SkeletonTable columns={4} rows={4} />
    </div>

    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <SkeletonChart className="lg:col-span-2" />
      <SkeletonChart />
    </div>

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

    <SkeletonTable columns={7} rows={6} />
  </div>
);

export default DashboardSkeleton;
