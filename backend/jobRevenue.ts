interface JobRevenueCustomer {
  amountCollected?: number;
  installationMaterialsPrice?: number;
  paymentMethodId?: string;
  serviceCategory?: string;
}

interface JobRevenueSource {
  customers?: JobRevenueCustomer[];
  amountPaid?: number;
  serviceCategory?: string;
  paymentMethodId?: string;
  jobNumber: string;
  customerName?: string;
  date: Date;
  area?: string;
}

export interface JobRevenueLine {
  category: string;
  amount: number;
  paymentMethod: string;
  description: string;
  referenceNo: string;
  date: Date;
  area: string;
}

export const getJobRevenueLines = (job: JobRevenueSource): JobRevenueLine[] => {
  const fallbackCategory = job.serviceCategory || "JOB ORDER";
  const fallbackPaymentMethod = job.paymentMethodId || "Cash";
  const grouped = new Map<string, JobRevenueLine>();
  const customers = job.customers || [];

  if (customers.length === 0) {
    const amount = Number(job.amountPaid) || 0;
    return amount > 0
      ? [{
          category: fallbackCategory,
          amount,
          paymentMethod: fallbackPaymentMethod,
          description: `Job ${job.jobNumber}${job.customerName ? ` — ${job.customerName}` : ""}`,
          referenceNo: job.jobNumber,
          date: job.date,
          area: job.area || "",
        }]
      : [];
  }

  for (const customer of customers) {
    const amount = (Number(customer.amountCollected) || 0) + (Number(customer.installationMaterialsPrice) || 0);
    if (amount <= 0) continue;

    const category = customer.serviceCategory || fallbackCategory;
    const paymentMethod = customer.paymentMethodId || fallbackPaymentMethod;
    const key = JSON.stringify([category, paymentMethod]);
    const line = grouped.get(key);
    if (line) {
      line.amount += amount;
      continue;
    }

    grouped.set(key, {
      category,
      amount,
      paymentMethod,
      description: `Job ${job.jobNumber}${job.customerName ? ` — ${job.customerName}` : ""}`,
      referenceNo: job.jobNumber,
      date: job.date,
      area: job.area || "",
    });
  }

  return [...grouped.values()];
};
