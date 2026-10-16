export interface JobExpenseCustomer {
  paymentMethodId?: string;
  referralAmount?: number;
  installationMaterialsPrice?: number;
  parts?: Array<{ price?: number; paymentMethodId?: string }>;
}

export interface JobExpenseSource {
  customers?: JobExpenseCustomer[];
  parts?: Array<{ price?: number; paymentMethodId?: string }>;
  paymentMethodId?: string;
  installationMaterialsPrice?: number;
  installationPrice?: number;
  referralAmount?: number;
  referralCost?: number;
}

export interface JobExpenseLine {
  paymentMethod: string;
  amount: number;
}

const addAmount = (
  amounts: Map<string, number>,
  paymentMethod: string | undefined,
  fallback: string | undefined,
  amount: number,
) => {
  if (amount <= 0) return;
  const method = paymentMethod || fallback || "Cash";
  amounts.set(method, (amounts.get(method) || 0) + amount);
};

const toLines = (amounts: Map<string, number>): JobExpenseLine[] =>
  [...amounts].map(([paymentMethod, amount]) => ({ paymentMethod, amount }));

export const getJobReferralByPaymentMethod = (job: JobExpenseSource): JobExpenseLine[] => {
  const amounts = new Map<string, number>();
  const customers = Array.isArray(job.customers) ? job.customers : [];
  for (const customer of customers) {
    addAmount(amounts, customer.paymentMethodId, job.paymentMethodId, Number(customer.referralAmount) || 0);
  }
  if (amounts.size === 0) {
    const legacy = Number(job.referralAmount ?? job.referralCost ?? 0) || 0;
    addAmount(amounts, job.paymentMethodId, "Cash", legacy);
  }
  return toLines(amounts);
};

export const getJobInstallationMaterialsByPaymentMethod = (job: JobExpenseSource): JobExpenseLine[] => {
  const amounts = new Map<string, number>();
  const customers = Array.isArray(job.customers) ? job.customers : [];
  for (const customer of customers) {
    addAmount(
      amounts,
      customer.paymentMethodId,
      job.paymentMethodId,
      Number(customer.installationMaterialsPrice) || 0,
    );
  }
  if (amounts.size === 0) {
    const legacy = Number(job.installationMaterialsPrice ?? job.installationPrice ?? 0) || 0;
    addAmount(amounts, job.paymentMethodId, "Cash", legacy);
  }
  return toLines(amounts);
};

export const getJobPartsByPaymentMethod = (job: JobExpenseSource): JobExpenseLine[] => {
  const amounts = new Map<string, number>();
  const customers = Array.isArray(job.customers) ? job.customers : [];
  if (customers.length > 0) {
    for (const customer of customers) {
      for (const part of customer.parts || []) {
        addAmount(amounts, part.paymentMethodId, customer.paymentMethodId || job.paymentMethodId, Number(part.price) || 0);
      }
    }
  } else {
    for (const part of job.parts || []) {
      addAmount(amounts, part.paymentMethodId, job.paymentMethodId, Number(part.price) || 0);
    }
  }
  return toLines(amounts);
};

export const getJobExpenseTotals = (job: JobExpenseSource) => ({
  referral: getJobReferralByPaymentMethod(job).reduce((sum, line) => sum + line.amount, 0),
  installationMaterials: getJobInstallationMaterialsByPaymentMethod(job).reduce((sum, line) => sum + line.amount, 0),
  parts: getJobPartsByPaymentMethod(job).reduce((sum, line) => sum + line.amount, 0),
});
