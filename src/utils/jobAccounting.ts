import { Expense, ServiceJob } from '../types';

export interface JobCollectionTotals {
  grossCollection: number;
  partsExpense: number;
  referralExpense: number;
  totalExpenses: number;
  netCollection: number;
}

const getExpenseKind = (category: string): 'parts' | 'referral' | null => {
  const normalized = category.toUpperCase().replace(/[^A-Z]/g, '');
  if (normalized.includes('PARTS') || normalized.includes('MATERIALS')) return 'parts';
  if (normalized.includes('REFERRAL') || normalized.includes('REFERAL')) return 'referral';
  return null;
};

export const getJobCollectionTotals = (
  job: ServiceJob,
  expenses: Expense[],
): JobCollectionTotals => {
  const customers = job.customers || [];
  const customerCollection = customers.reduce(
    (sum, customer) =>
      sum +
      (Number(customer.amountCollected) || 0) +
      (Number(customer.installationMaterialsPrice) || 0),
    0,
  );
  const hasCustomerCollection = customerCollection > 0;
  const grossCollection = hasCustomerCollection
    ? customerCollection
    : Math.max(
        Number(job.amountPaid) || 0,
        Number(job.total) || 0,
        Number(job.subtotal) || 0,
      );
  const customerPartsExpense = customers.reduce(
    (sum, customer) =>
      sum +
      (customer.parts || []).reduce(
        (partsSum, part) => partsSum + (Number(part.price) || 0),
        0,
      ),
    0,
  );
  const customerReferralExpense = customers.reduce(
    (sum, customer) => sum + (Number(customer.referralAmount) || 0),
    0,
  );
  const legacyJob = job as ServiceJob & {
    parts?: Array<{ price?: number }>;
    referralAmount?: number;
    referralCost?: number;
    jobPartsExpense?: number;
    jobReferralExpense?: number;
  };
  const legacyPartsExpense = (legacyJob.parts || []).reduce(
    (sum, part) => sum + (Number(part.price) || 0),
    0,
  );
  const legacyReferralExpense = Number(legacyJob.referralAmount ?? legacyJob.referralCost) || 0;
  const linkedExpenses = expenses.filter(
    (expense) =>
      (
        String(expense.relatedId || '') === String(job.id) ||
        Boolean(job.jobNumber && expense.description.toLowerCase().includes(`job ${job.jobNumber.toLowerCase()}`))
      ) &&
      !expense.isVoid &&
      getExpenseKind(expense.category) !== null,
  );
  const ledgerPartsExpense = linkedExpenses
    .filter((expense) => getExpenseKind(expense.category) === 'parts')
    .reduce((sum, expense) => sum + expense.amount, 0);
  const ledgerReferralExpense = linkedExpenses
    .filter((expense) => getExpenseKind(expense.category) === 'referral')
    .reduce((sum, expense) => sum + expense.amount, 0);
  const partsExpense = Math.max(
    customerPartsExpense,
    legacyPartsExpense,
    ledgerPartsExpense,
    Number(legacyJob.jobPartsExpense) || 0,
  );
  const referralExpense = Math.max(
    customerReferralExpense,
    legacyReferralExpense,
    ledgerReferralExpense,
    Number(legacyJob.jobReferralExpense) || 0,
  );
  const totalExpenses = partsExpense + referralExpense;

  return {
    grossCollection,
    partsExpense,
    referralExpense,
    totalExpenses,
    netCollection: grossCollection - totalExpenses,
  };
};
