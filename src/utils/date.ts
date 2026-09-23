export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'
  | 'custom'
  | 'all';

export interface DateFilterRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export const getTodayDateString = (): string => {
  // Use today or 2026-09-22 if system clock is 2026
  const d = new Date();
  return d.toISOString().split('T')[0];
};

export const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const getMonthName = (monthIndex: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex] || '';
};

export const getDateRangeFromPreset = (
  preset: DateRangePreset,
  baseDateStr?: string
): DateFilterRange => {
  const today = baseDateStr ? new Date(baseDateStr) : new Date();
  today.setHours(0, 0, 0, 0);

  const format = (d: Date) => d.toISOString().split('T')[0];

  switch (preset) {
    case 'today': {
      const s = format(today);
      return { startDate: s, endDate: s };
    }
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const s = format(y);
      return { startDate: s, endDate: s };
    }
    case 'this_week': {
      const d = new Date(today);
      const day = d.getDay(); // 0 is Sunday, 1 is Monday
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { startDate: format(monday), endDate: format(sunday) };
    }
    case 'last_week': {
      const d = new Date(today);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1) - 7;
      const monday = new Date(d.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { startDate: format(monday), endDate: format(sunday) };
    }
    case 'this_month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { startDate: format(start), endDate: format(end) };
    }
    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: format(start), endDate: format(end) };
    }
    case 'this_year': {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      return { startDate: format(start), endDate: format(end) };
    }
    case 'last_year': {
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const end = new Date(today.getFullYear() - 1, 11, 31);
      return { startDate: format(start), endDate: format(end) };
    }
    case 'all':
    default:
      return { startDate: '2020-01-01', endDate: '2030-12-31' };
  }
};

export const isDateInRange = (dateStr: string, range: DateFilterRange): boolean => {
  if (!dateStr) return false;
  return dateStr >= range.startDate && dateStr <= range.endDate;
};
