import React from 'react';
import { Skeleton, SkeletonBanner, SkeletonCard, SkeletonTable } from '../ui/Skeleton';

export const PayrollSkeleton: React.FC = () => (
  <div className="space-y-6" role="status" aria-busy="true">
    <span className="sr-only">Loading payroll…</span>

    <SkeletonBanner />

    <SkeletonCard>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="mt-4 flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-56 shrink-0 rounded-xl border border-slate-200 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="mt-3 h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-24" />
            <Skeleton className="mt-3 h-3 w-full" />
          </div>
        ))}
      </div>
    </SkeletonCard>

    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-24" />
    </div>
    <SkeletonTable columns={11} rows={6} />
  </div>
);

export default PayrollSkeleton;
