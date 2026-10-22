import { Employee } from '../types';

// Single source of truth for the employee base daily rate, shared by the
// Process Payroll modal seeding and the Weekly Payroll Report recomputation.
// Rule: profile dailyRate if > 0, else profile basicSalary / 6, else 0.
// Lookup by employeeId first, then case-insensitive employee name (covers
// legacy vouchers whose employeeId is blank).
export const resolveEmployeeBaseRate = (
  employees: Employee[],
  employeeId: string | undefined,
  employeeName: string | undefined
): number => {
  const nameKey = (employeeName || '').trim().toLowerCase();
  const profile = employees.find((e) => e.id === employeeId) ||
    (nameKey
      ? employees.find((e) => (e.name || '').trim().toLowerCase() === nameKey)
      : undefined);
  if (!profile) return 0;
  if (profile.dailyRate && profile.dailyRate > 0) return profile.dailyRate;
  if (profile.basicSalary && profile.basicSalary > 0) return profile.basicSalary / 6;
  return 0;
};
