import { Expense, ServiceJob } from '../types';

export interface JobCollectionTotals {
  grossCollection: number;
  partsExpense: number;
  installationMaterialsExpense: number;
  referralExpense: number;
  totalExpenses: number;
  netCollection: number;
}

const getExpenseKind = (category: string): 'parts' | 'installationMaterials' | 'referral' | null => {
  const normalized = category.toUpperCase().replace(/[^A-Z]/g, '');
  if (normalized.includes('INSTALLATIONMATERIALS')) return 'installationMaterials';
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
    (sum, customer) => sum + (Number(customer.amountCollected) || 0),
    0,
  );
  const hasCustomerCollection = customerCollection > 0;
  const legacyJob = job as ServiceJob & {
    parts?: Array<{ price?: number }>;
    installationMaterialsPrice?: number;
    installationPrice?: number;
    referralAmount?: number;
    referralCost?: number;
    jobPartsExpense?: number;
    jobInstallationMaterialsExpense?: number;
    jobReferralExpense?: number;
  };
  const legacyInstallationMaterialsExpense = Number(
    legacyJob.installationMaterialsPrice ?? legacyJob.installationPrice,
  ) || 0;
  const grossCollection = hasCustomerCollection
    ? customerCollection
    : Math.max(
        Number(job.amountPaid) || 0,
        Number(job.total) || 0,
        Number(job.subtotal) || 0,
      ) - legacyInstallationMaterialsExpense;
  const customerPartsExpense = customers.reduce(
    (sum, customer) =>
      sum +
      (customer.parts || []).reduce(
        (partsSum, part) => partsSum + (Number(part.price) || 0),
        0,
      ),
    0,
  );
  const customerInstallationMaterialsExpense = customers.reduce(
    (sum, customer) => sum + (Number(customer.installationMaterialsPrice) || 0),
    0,
  );
  const customerReferralExpense = customers.reduce(
    (sum, customer) => sum + (Number(customer.referralAmount) || 0),
    0,
  );
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
  const ledgerInstallationMaterialsExpense = linkedExpenses
    .filter((expense) => getExpenseKind(expense.category) === 'installationMaterials')
    .reduce((sum, expense) => sum + expense.amount, 0);
  const partsExpense = Math.max(
    customerPartsExpense,
    legacyPartsExpense,
    ledgerPartsExpense,
    Number(legacyJob.jobPartsExpense) || 0,
  );
  const installationMaterialsExpense = Math.max(
    customerInstallationMaterialsExpense,
    legacyInstallationMaterialsExpense,
    ledgerInstallationMaterialsExpense,
    Number(legacyJob.jobInstallationMaterialsExpense) || 0,
  );
  const referralExpense = Math.max(
    customerReferralExpense,
    legacyReferralExpense,
    ledgerReferralExpense,
    Number(legacyJob.jobReferralExpense) || 0,
  );
  const totalExpenses = partsExpense + installationMaterialsExpense + referralExpense;

  return {
    grossCollection,
    partsExpense,
    installationMaterialsExpense,
    referralExpense,
    totalExpenses,
    netCollection: grossCollection - totalExpenses,
  };
};
