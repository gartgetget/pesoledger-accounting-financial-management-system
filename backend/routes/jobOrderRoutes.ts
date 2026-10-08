import { createRouter } from "../middleware/createRouter.js";
import JobOrder from "../models/JobOrder.js";
import RevenueEntry from "../models/RevenueEntry.js";
import ExpenseEntry from "../models/ExpenseEntry.js";
import Category from "../models/Category.js";
import { getJobRevenueLines } from "../jobRevenue.js";
import auth from "../middleware/auth.js";

const router = createRouter();

router.use(auth);

type JobOrderDoc = InstanceType<typeof JobOrder>;

const ensureWorkspaceAccess = (req: any, res: any, next: any) => {
  const { workspaceId } = req.params;
  if (!req.user.workspaces.includes(workspaceId)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

const sanitizeCustomers = (raw: unknown): Array<{
  customerId: string;
  name: string;
  amountCollected: number;
  paymentMethodId: string;
  serviceCategory: string;
  parts: Array<{ sku: string; invoice: string; description: string; price: number; paymentMethodId: string }>;
  installationMaterials: string;
  installationMaterialsPrice: number;
  referral: string;
  referralAmount: number;
}> | null => {
  if (!Array.isArray(raw)) return null;
  const customers: Array<{
    customerId: string;
    name: string;
    amountCollected: number;
    paymentMethodId: string;
    serviceCategory: string;
    parts: Array<{ sku: string; invoice: string; description: string; price: number; paymentMethodId: string }>;
    installationMaterials: string;
    installationMaterialsPrice: number;
    referral: string;
    referralAmount: number;
  }> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const c = item as Record<string, unknown>;
    const amountCollected = Number(c.amountCollected || 0);
    const installationMaterialsPrice = c.installationMaterialsPrice === "" || c.installationMaterialsPrice == null
      ? 0
      : Number(c.installationMaterialsPrice);
    const referralAmount = c.referralAmount === "" || c.referralAmount == null
      ? 0
      : Number(c.referralAmount);
    const parts = sanitizeParts(c.parts ?? []);
    if (
      !Number.isFinite(amountCollected) || amountCollected < 0 ||
      !Number.isFinite(installationMaterialsPrice) || installationMaterialsPrice < 0 ||
      !Number.isFinite(referralAmount) || referralAmount < 0 ||
      !parts
    ) return null;
    const customer = {
      customerId: String(c.customerId || ""),
      name: String(c.name || "").trim(),
      amountCollected,
      paymentMethodId: String(c.paymentMethodId || "").trim(),
      serviceCategory: String(c.serviceCategory || "").trim(),
      parts,
      installationMaterials: String(c.installationMaterials || "").trim(),
      installationMaterialsPrice,
      referral: String(c.referral || "").trim(),
      referralAmount,
    };
    if (
      customer.name || customer.amountCollected > 0 || customer.serviceCategory ||
      customer.paymentMethodId || customer.parts.length || customer.installationMaterials ||
      customer.installationMaterialsPrice > 0 || customer.referral || customer.referralAmount > 0
    ) customers.push(customer);
  }
  return customers;
};

const sanitizeParts = (raw: unknown): Array<{ sku: string; invoice: string; description: string; price: number; paymentMethodId: string }> | null => {
  if (!Array.isArray(raw)) return null;
  const parts: Array<{ sku: string; invoice: string; description: string; price: number; paymentMethodId: string }> = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const part = item as Record<string, unknown>;
    const price = part.price === "" || part.price == null ? 0 : Number(part.price);
    if (!Number.isFinite(price) || price < 0) return null;

    const sanitized = {
      sku: String(part.sku || "").trim(),
      invoice: String(part.invoice || "").trim(),
      description: String(part.description || "").trim(),
      price,
      paymentMethodId: String(part.paymentMethodId || "").trim(),
    };
    if (sanitized.sku || sanitized.invoice || sanitized.description || sanitized.price > 0) {
      parts.push(sanitized);
    }
  }
  return parts;
};

const sumCollected = (rows: Array<{ amountCollected: number }>) =>
  rows.reduce(
    (sum, customer) =>
      sum + (Number(customer.amountCollected) || 0),
    0,
  );

const calculateJobTotals = (
  customers: Array<{ amountCollected: number; installationMaterialsPrice: number }>,
  discountType: "percentage" | "amount",
  discountValue: number,
  fallbackAmount = 0,
) => {
  const customerAmount = customers.reduce(
      (sum, customer) =>
        sum + (Number(customer.amountCollected) || 0),
      0,
    );
  const subtotal = customers.length > 0 ? customerAmount : fallbackAmount;
  const requestedDiscount = discountType === "percentage"
    ? (subtotal * Math.max(0, discountValue)) / 100
    : Math.max(0, discountValue);
  const discountAmount = Math.min(subtotal, requestedDiscount);
  return { subtotal, discountAmount, totalAmount: subtotal - discountAmount };
};

const ensureJobExpenseCategory = async (workspaceId: string, name: string): Promise<string> => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existing = await Category.findOne({
    workspaceId,
    type: "expense",
    name: new RegExp(`^${escapedName}$`, "i"),
  });
  if (existing) return existing._id.toString();

  const category = await Category.create({
    workspaceId,
    type: "expense",
    name,
    description: "Automatically recorded from service and job orders",
    isActive: true,
  });
  return category._id.toString();
};

const getJobExpenseAmounts = (job: JobOrderDoc) => {
  const customers = Array.isArray(job.customers) ? job.customers : [];
  const customerPartsAmount = customers.reduce(
    (sum, customer) =>
      sum + (customer.parts || []).reduce((partSum, part) => partSum + (Number(part.price) || 0), 0),
    0,
  );
  const legacyPartsAmount = (job.parts || []).reduce(
    (sum, part) => sum + (Number(part.price) || 0),
    0,
  );
  const customerInstallationMaterialsAmount = customers.reduce(
    (sum, customer) => sum + (Number(customer.installationMaterialsPrice) || 0),
    0,
  );
  const referralAmount = customers.reduce(
    (sum, customer) => sum + (Number(customer.referralAmount) || 0),
    0,
  );
  const legacyJob = job as JobOrderDoc & {
    installationMaterialsPrice?: number;
    referralAmount?: number;
    referralCost?: number;
  };
  const legacyInstallationMaterialsAmount = Number(legacyJob.installationMaterialsPrice) || 0;

  return {
    referral: referralAmount || Number(legacyJob.referralAmount ?? legacyJob.referralCost ?? 0) || 0,
    parts: customerPartsAmount || legacyPartsAmount,
    installationMaterials: customerInstallationMaterialsAmount || legacyInstallationMaterialsAmount,
  };
};

const getJobPartsByPaymentMethod = (job: JobOrderDoc) => {
  const amounts = new Map<string, number>();
  const customers = Array.isArray(job.customers) ? job.customers : [];
  const addParts = (parts: Array<{ price?: number; paymentMethodId?: string }>, fallbackMethod: string) => {
    for (const part of parts || []) {
      const amount = Number(part.price) || 0;
      if (amount <= 0) continue;
      const paymentMethod = part.paymentMethodId || fallbackMethod || "Cash";
      amounts.set(paymentMethod, (amounts.get(paymentMethod) || 0) + amount);
    }
  };

  if (customers.length > 0) {
    for (const customer of customers) {
      addParts(customer.parts || [], customer.paymentMethodId || job.paymentMethodId || "Cash");
    }
  } else {
    addParts(job.parts || [], job.paymentMethodId || "Cash");
  }
  return [...amounts].map(([paymentMethod, amount]) => ({ paymentMethod, amount }));
};

const getJobInstallationMaterialsByPaymentMethod = (job: JobOrderDoc) => {
  const amounts = new Map<string, number>();
  const customers = Array.isArray(job.customers) ? job.customers : [];
  for (const customer of customers) {
    const amount = Number(customer.installationMaterialsPrice) || 0;
    if (amount <= 0) continue;
    const paymentMethod = customer.paymentMethodId || job.paymentMethodId || "Cash";
    amounts.set(paymentMethod, (amounts.get(paymentMethod) || 0) + amount);
  }
  const legacyInstallationMaterialsAmount = Number(
    (job as JobOrderDoc & { installationMaterialsPrice?: number }).installationMaterialsPrice,
  ) || 0;
  if (amounts.size === 0 && legacyInstallationMaterialsAmount > 0) {
    const paymentMethod = job.paymentMethodId || "Cash";
    amounts.set(paymentMethod, legacyInstallationMaterialsAmount);
  }
  return [...amounts].map(([paymentMethod, amount]) => ({ paymentMethod, amount }));
};

const syncJobRevenue = async (workspaceId: string, job: JobOrderDoc, createdBy: string) => {
  const relatedId = job._id.toString();
  const lines = job.status === "cancelled" ? [] : getJobRevenueLines(job);
  const existing = await RevenueEntry.find({ workspaceId, relatedId });
  if (lines.length === 0) {
    await RevenueEntry.deleteMany({ workspaceId, relatedId });
    job.revenueId = "";
    return;
  }

  const remaining = [...existing];
  const syncedIds: string[] = [];
  for (const line of lines) {
    const matchIndex = remaining.findIndex(
      (rev) => rev.category === line.category && rev.paymentMethod === line.paymentMethod,
    );
    const legacyIndex = matchIndex < 0 && lines.length === 1 && remaining.length === 1 ? 0 : matchIndex;
    const rev = legacyIndex >= 0 ? remaining.splice(legacyIndex, 1)[0] : null;
    if (rev) {
      Object.assign(rev, line, { relatedId, updatedAt: new Date() });
      await rev.save();
      syncedIds.push(rev._id.toString());
    } else {
      const created = await RevenueEntry.create({ workspaceId, ...line, relatedId, createdBy });
      syncedIds.push(created._id.toString());
    }
  }
  if (remaining.length > 0) {
    await RevenueEntry.deleteMany({ _id: { $in: remaining.map((rev) => rev._id) }, workspaceId });
  }
  job.revenueId = syncedIds[0] || "";
};

const syncJobExpenses = async (workspaceId: string, job: JobOrderDoc, createdBy: string) => {
  const relatedId = job._id.toString();
  const shouldPost = job.status !== "cancelled";
  const amounts = getJobExpenseAmounts(job);
  const expenseAmounts = shouldPost
    ? [
        ...(amounts.referral > 0
          ? [{ category: "REFERRAL", amount: amounts.referral, paymentMethod: job.paymentMethodId || "Cash" }]
          : []),
        ...getJobInstallationMaterialsByPaymentMethod(job).map(({ paymentMethod, amount }) => ({
          category: "INSTALLATION MATERIALS",
          amount,
          paymentMethod,
        })),
        ...getJobPartsByPaymentMethod(job).map(({ paymentMethod, amount }) => ({
          category: "PARTS / MATERIALS",
          amount,
          paymentMethod,
        })),
      ]
    : [];
  const linkedExpenses: string[] = [];

  for (const category of ["REFERRAL", "INSTALLATION MATERIALS", "PARTS / MATERIALS"]) {
    const query = { workspaceId, relatedModule: "job", relatedId, category };
    const existingExpenses = await ExpenseEntry.find(query).sort({ createdAt: 1 });
    const remaining = [...existingExpenses];
    const desired = expenseAmounts.filter((expense) => expense.category === category);
    for (const { amount, paymentMethod } of desired) {
      const matchIndex = remaining.findIndex((expense) => expense.paymentMethod === paymentMethod);
      const legacyIndex = matchIndex < 0 && desired.length === 1 && remaining.length === 1 ? 0 : matchIndex;
      const existing = legacyIndex >= 0 ? remaining.splice(legacyIndex, 1)[0] : null;
      const payload = {
        date: job.date,
        categoryId: await ensureJobExpenseCategory(workspaceId, category),
        category,
        description: `${category} — Job ${job.jobNumber}${job.customerName ? ` — ${job.customerName}` : ""}`,
        amount,
        paymentMethod,
        area: job.area || "",
        relatedModule: "job",
        relatedId,
      };
      if (existing) {
        Object.assign(existing, payload);
        existing.updatedAt = new Date();
        await existing.save();
        linkedExpenses.push(existing._id.toString());
      } else {
        const expense = await ExpenseEntry.create({ workspaceId, ...payload, createdBy });
        linkedExpenses.push(expense._id.toString());
      }
    }
    if (remaining.length > 0) {
      await ExpenseEntry.deleteMany({
        ...query,
        _id: { $in: remaining.map((expense) => expense._id) },
      });
    }
    if (desired.length === 0 && existingExpenses.length > 0) {
      await ExpenseEntry.deleteMany(query);
    }
  }

  job.expenseId = linkedExpenses[0] || "";
};

const reconcileWorkspaceJobLedger = async (workspaceId: string, createdBy: string, after?: string) => {
  const pageSize = 40;
  const page = await JobOrder.find({
    workspaceId,
    ...(after ? { _id: { $gt: after } } : {}),
  })
    .sort({ _id: 1 })
    .limit(pageSize + 1)
    .lean();
  const hasMore = page.length > pageSize;
  const jobs = page.slice(0, pageSize);
  const nextCursor = hasMore ? jobs[jobs.length - 1]._id.toString() : null;
  const jobIds = jobs.map((job) => job._id.toString());
  const existingRevenue = jobIds.length
    ? await RevenueEntry.find({ workspaceId, relatedId: { $in: jobIds } }).lean()
    : [];
  const revenueByJob = new Map<string, typeof existingRevenue>();
  for (const revenue of existingRevenue) {
    const matches = revenueByJob.get(revenue.relatedId) || [];
    matches.push(revenue);
    revenueByJob.set(revenue.relatedId, matches);
  }
  const existingExpenses = await ExpenseEntry.find({
    workspaceId,
    relatedModule: "job",
    category: { $in: ["REFERRAL", "INSTALLATION MATERIALS", "PARTS / MATERIALS"] },
  }).lean();
  const expensesByJobCategory = new Map<string, typeof existingExpenses>();
  for (const expense of existingExpenses) {
    const key = `${expense.relatedId}:${expense.category}`;
    const matches = expensesByJobCategory.get(key) || [];
    matches.push(expense);
    expensesByJobCategory.set(key, matches);
  }

  const categoryIds = new Map<string, string>();
  for (const name of ["REFERRAL", "INSTALLATION MATERIALS", "PARTS / MATERIALS"]) {
    categoryIds.set(name, await ensureJobExpenseCategory(workspaceId, name));
  }

  const revenueOperations: Parameters<typeof RevenueEntry.bulkWrite>[0] = [];
  const operations: Parameters<typeof ExpenseEntry.bulkWrite>[0] = [];
  const jobOperations: Parameters<typeof JobOrder.bulkWrite>[0] = [];
  let referralTotal = 0;
  let installationMaterialsTotal = 0;
  let partsMaterialsTotal = 0;
  const now = new Date();
  for (const job of jobs) {
    const relatedId = job._id.toString();
    const customers = job.customers || [];
    const calculatedCustomerSubtotal = customers.reduce(
      (sum, customer) =>
        sum + (Number(customer.amountCollected) || 0),
      0,
    );
    const jobSubtotal = customers.length > 0
      ? calculatedCustomerSubtotal
      : Number(job.amountPaid) || Number(job.subtotal) || 0;
    const discountType = job.discountType === "percentage" ? "percentage" : "amount";
    const discountValue = Math.max(0, Number(job.discountValue) || 0);
    const requestedDiscount = discountType === "percentage"
      ? jobSubtotal * discountValue / 100
      : discountValue;
    const discountAmount = Math.min(jobSubtotal, requestedDiscount);
    jobOperations.push({
      updateOne: {
        filter: { _id: job._id, workspaceId },
        update: {
          $set: {
            laborCost: 0,
            otherCharges: 0,
            subtotal: jobSubtotal,
            discountAmount,
            totalAmount: Math.max(0, jobSubtotal - discountAmount),
            amountPaid: customers.length > 0
              ? calculatedCustomerSubtotal
              : Number(job.amountPaid) || 0,
            updatedAt: now,
          },
        },
      },
    });
    const matchingRevenue = revenueByJob.get(relatedId) || [];
    const revenueQuery = { workspaceId, relatedId };
    const revenueLines = job.status === "cancelled" ? [] : getJobRevenueLines(job);
    const remainingRevenue = [...matchingRevenue];
    for (const line of revenueLines) {
      const matchIndex = remainingRevenue.findIndex(
        (revenue) => revenue.category === line.category && revenue.paymentMethod === line.paymentMethod,
      );
      const legacyIndex = matchIndex < 0 && revenueLines.length === 1 && remainingRevenue.length === 1 ? 0 : matchIndex;
      const existing = legacyIndex >= 0 ? remainingRevenue.splice(legacyIndex, 1)[0] : null;
      revenueOperations.push({
        updateOne: {
          filter: existing
            ? { _id: existing._id, workspaceId }
            : { ...revenueQuery, category: line.category, paymentMethod: line.paymentMethod },
          update: {
            $set: { ...line, relatedId, updatedAt: now },
            $setOnInsert: { workspaceId, createdBy: job.createdBy || createdBy, createdAt: now },
          },
          upsert: true,
        },
      });
    }
    if (remainingRevenue.length > 0) {
      revenueOperations.push({
        deleteMany: {
          filter: { ...revenueQuery, _id: { $in: remainingRevenue.map((revenue) => revenue._id) } },
        },
      });
    }
    if (revenueLines.length === 0 && matchingRevenue.length > 0) {
      revenueOperations.push({ deleteMany: { filter: revenueQuery } });
    }

    const expenseAmounts = getJobExpenseAmounts(job as JobOrderDoc);
    const amounts: Record<string, Array<{ amount: number; paymentMethod: string }>> = {
      REFERRAL: expenseAmounts.referral > 0
        ? [{ amount: expenseAmounts.referral, paymentMethod: job.paymentMethodId || "Cash" }]
        : [],
      "INSTALLATION MATERIALS": getJobInstallationMaterialsByPaymentMethod(job as JobOrderDoc),
      "PARTS / MATERIALS": getJobPartsByPaymentMethod(job as JobOrderDoc),
    };

    for (const [category, desired] of Object.entries(amounts)) {
      const query = { workspaceId, relatedModule: "job", relatedId, category };
      const key = `${relatedId}:${category}`;
      const existing = expensesByJobCategory.get(key) || [];
      if (job.status === "cancelled" || desired.length === 0) {
        if (existing.length > 0) operations.push({ deleteMany: { filter: query } });
        continue;
      }

      const remaining = [...existing];
      for (const line of desired) {
        const matchIndex = remaining.findIndex((expense) => expense.paymentMethod === line.paymentMethod);
        const legacyIndex = matchIndex < 0 && desired.length === 1 && remaining.length === 1 ? 0 : matchIndex;
        const matched = legacyIndex >= 0 ? remaining.splice(legacyIndex, 1)[0] : null;
        if (category === "REFERRAL") referralTotal += line.amount;
        if (category === "INSTALLATION MATERIALS") installationMaterialsTotal += line.amount;
        if (category === "PARTS / MATERIALS") partsMaterialsTotal += line.amount;
        operations.push({
          updateOne: {
            filter: matched
              ? { _id: matched._id, workspaceId }
              : { ...query, paymentMethod: line.paymentMethod },
            update: {
              $set: {
                date: job.date,
                categoryId: categoryIds.get(category) || "",
                category,
                description: `${category} — Job ${job.jobNumber}${job.customerName ? ` — ${job.customerName}` : ""}`,
                amount: line.amount,
                paymentMethod: line.paymentMethod,
                area: job.area || "",
                relatedModule: "job",
                relatedId,
                updatedAt: now,
              },
              $setOnInsert: { workspaceId, createdBy: job.createdBy || createdBy, createdAt: now },
            },
            upsert: true,
          },
        });
      }
      if (remaining.length > 0) {
        operations.push({
          deleteMany: {
            filter: { ...query, _id: { $in: remaining.map((expense) => expense._id) } },
          },
        });
      }
    }
  }

  if (revenueOperations.length > 0) {
    await RevenueEntry.bulkWrite(revenueOperations, { ordered: false });
  }
  if (operations.length > 0) {
    await ExpenseEntry.bulkWrite(operations, { ordered: false });
  }
  if (jobOperations.length > 0) {
    await JobOrder.bulkWrite(jobOperations, { ordered: false });
  }
  return { synced: jobs.length, nextCursor, referralTotal, installationMaterialsTotal, partsMaterialsTotal };
};

router.get("/:workspaceId/job-orders", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const jobs = await JobOrder.find({ workspaceId }).sort({ createdAt: -1 }).lean();
  const jobIds = jobs.map((job) => job._id.toString());
  const linkedExpenses = jobIds.length
    ? await ExpenseEntry.find({
        workspaceId,
        relatedId: { $in: jobIds },
      }).lean()
    : [];
  const expenseTotals = new Map<string, { parts: number; installationMaterials: number; referral: number }>();
  for (const expense of linkedExpenses) {
    const totals = expenseTotals.get(expense.relatedId) || { parts: 0, installationMaterials: 0, referral: 0 };
    const normalizedCategory = expense.category.toUpperCase().replace(/[^A-Z]/g, "");
    if (normalizedCategory.includes("INSTALLATIONMATERIALS")) {
      totals.installationMaterials += expense.amount;
    } else if (normalizedCategory.includes("PARTS") || normalizedCategory.includes("MATERIALS")) {
      totals.parts += expense.amount;
    } else if (normalizedCategory.includes("REFERRAL")) {
      totals.referral += expense.amount;
    }
    expenseTotals.set(expense.relatedId, totals);
  }

  res.json(jobs.map((job) => {
    const jobId = job._id.toString();
    const storedTotals = expenseTotals.get(jobId) || { parts: 0, installationMaterials: 0, referral: 0 };
    const sourceTotals = getJobExpenseAmounts(job as JobOrderDoc);
    return {
      ...job,
      jobPartsExpense: Math.max(sourceTotals.parts, storedTotals.parts),
      jobInstallationMaterialsExpense: Math.max(
        sourceTotals.installationMaterials,
        storedTotals.installationMaterials,
      ),
      jobReferralExpense: Math.max(sourceTotals.referral, storedTotals.referral),
    };
  }));
});

router.post("/:workspaceId/job-orders/sync-ledger", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const after = typeof req.query.after === "string" ? req.query.after : undefined;
  if (after && !/^[a-f\d]{24}$/i.test(after)) {
    return res.status(400).json({ message: "Invalid job-order sync cursor" });
  }
  const result = await reconcileWorkspaceJobLedger(workspaceId, req.user._id.toString(), after);
  res.json(result);
});

router.post("/:workspaceId/job-orders", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const b = req.body || {};

  if (!b.jobNumber) {
    return res.status(400).json({ message: "Job number is required" });
  }

  const duplicate = await JobOrder.exists({ jobNumber: String(b.jobNumber) });
  if (duplicate) {
    return res.status(400).json({ message: "Job number already exists — choose a different Job Order #" });
  }

  const custRows = b.customers === undefined ? [] : sanitizeCustomers(b.customers);
  if (!custRows) {
    return res.status(400).json({ message: "Customer collection and material prices must be valid non-negative numbers" });
  }
  const primary = custRows.find((c) => c.name);
  const discountType = b.discountType === "percentage" ? "percentage" : "amount";
  const discountValue = Math.max(0, Number(b.discountValue ?? 0) || 0);
  const totals = calculateJobTotals(custRows, discountType, discountValue, Number(b.amountPaid) || 0);
  const requestedTotal = Number(b.totalAmount ?? b.total);
  const requestedAmountPaid = Number(b.amountPaid);
  if (
    (b.totalAmount !== undefined || b.total !== undefined) &&
    (!Number.isFinite(requestedTotal) || requestedTotal < 0)
  ) {
    return res.status(400).json({ message: "Job total must be a valid non-negative amount" });
  }
  if (b.amountPaid !== undefined && (!Number.isFinite(requestedAmountPaid) || requestedAmountPaid < 0)) {
    return res.status(400).json({ message: "Job collection must be a valid non-negative amount" });
  }

  const job = await JobOrder.create({
    workspaceId,
    customerId: primary ? primary.customerId || b.customerId : b.customerId,
    customerName: primary ? primary.name : b.customerName || "",
    jobNumber: b.jobNumber,
    assignedTechnician: b.assignedTechnician || b.technicianId || "",
    technicianName: b.technicianName || "",
    area: b.area || "",
    customers: custRows,
    status: b.status || "open",
    paymentStatus: b.paymentStatus || "Unpaid",
    date: b.date ? new Date(b.date) : new Date(),
    description: b.description || "",
    laborCost: 0,
    otherCharges: 0,
    discountType,
    discountValue,
    discountAmount: totals.discountAmount,
    subtotal: custRows.length > 0
      ? totals.subtotal
      : Math.max(totals.subtotal, Number(b.subtotal) || 0),
    totalAmount: custRows.length > 0
      ? totals.totalAmount
      : b.totalAmount !== undefined || b.total !== undefined
        ? requestedTotal
        : totals.totalAmount,
    amountPaid: custRows.length > 0
      ? sumCollected(custRows)
      : b.amountPaid !== undefined
        ? requestedAmountPaid
        : 0,
    paymentMethodId: custRows.find((customer) => customer.amountCollected > 0 && customer.paymentMethodId)?.paymentMethodId
      || b.paymentMethodId
      || "",
    notes: b.notes || "",
    createdBy: req.user._id.toString(),
  });

  const ledgerSyncErrors: string[] = [];
  try {
    await syncJobRevenue(workspaceId, job, req.user._id.toString());
  } catch (e) {
    console.error("Failed to post job order revenue to ledger", e);
    ledgerSyncErrors.push("Revenue could not be posted");
  }
  try {
    await syncJobExpenses(workspaceId, job, req.user._id.toString());
  } catch (e) {
    console.error("Failed to post job order expenses to ledger", e);
    ledgerSyncErrors.push("Job expenses could not be posted");
  }
  job.updatedAt = new Date();
  await job.save();

  res.status(201).json({ ...job.toObject(), ledgerSyncErrors });
});

router.get("/:workspaceId/job-orders/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const job = await JobOrder.findOne({ _id: id, workspaceId });
  if (!job) return res.status(404).json({ message: "Job order not found" });
  res.json(job);
});

router.put("/:workspaceId/job-orders/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const job = await JobOrder.findOne({ _id: id, workspaceId });
  if (!job) return res.status(404).json({ message: "Job order not found" });

  const b = req.body || {};
  const allowed: Record<string, unknown> = {};
  const keys = [
    "customerId", "customerName", "jobNumber", "assignedTechnician", "technicianName", "area", "status", "paymentStatus",
    "date", "description",
    "discountType", "discountValue", "discountAmount", "subtotal",
    "totalAmount", "amountPaid", "paymentMethodId", "notes",
  ];
  for (const k of keys) {
    if (b[k] !== undefined) allowed[k] = b[k];
  }
  if (b.date) allowed.date = new Date(b.date);
  if (b.total !== undefined && b.totalAmount === undefined) allowed.totalAmount = b.total;
  if (b.technicianId !== undefined && b.assignedTechnician === undefined) allowed.assignedTechnician = b.technicianId;
  if (b.customers !== undefined) {
    const customers = sanitizeCustomers(b.customers);
    if (!customers) {
      return res.status(400).json({ message: "Customer collection and material prices must be valid non-negative numbers" });
    }
    allowed.customers = customers;
  }
  const requestedTotal = Number(b.totalAmount ?? b.total);
  const requestedAmountPaid = Number(b.amountPaid);
  if (
    (b.totalAmount !== undefined || b.total !== undefined) &&
    (!Number.isFinite(requestedTotal) || requestedTotal < 0)
  ) {
    return res.status(400).json({ message: "Job total must be a valid non-negative amount" });
  }
  if (b.amountPaid !== undefined && (!Number.isFinite(requestedAmountPaid) || requestedAmountPaid < 0)) {
    return res.status(400).json({ message: "Job collection must be a valid non-negative amount" });
  }

  Object.assign(job, allowed);
  job.laborCost = 0;
  job.otherCharges = 0;
  if (b.customers !== undefined) {
    job.serviceCategory = "";
    job.serviceCategoryId = "";
    job.parts = [];
  }

  const rows = job.customers || [];
  if (b.customers !== undefined) {
    const summed = sumCollected(rows);
    job.amountPaid = summed;
    const paymentCustomer = rows.find((customer) => customer.amountCollected > 0 && customer.paymentMethodId)
      || rows.find((customer) => customer.paymentMethodId);
    job.paymentMethodId = paymentCustomer?.paymentMethodId || "";
    const p = rows.find((c) => c.name);
    if (p) {
      job.customerName = p.name;
      if (p.customerId) job.customerId = p.customerId;
    }
  }
  const totals = calculateJobTotals(
    job.customers || [],
    job.discountType === "percentage" ? "percentage" : "amount",
    Math.max(0, Number(job.discountValue) || 0),
    Number(job.amountPaid) || 0,
  );
  job.subtotal = rows.length > 0
    ? totals.subtotal
    : b.subtotal !== undefined
      ? Math.max(totals.subtotal, Number(b.subtotal) || 0)
      : totals.subtotal;
  job.discountAmount = totals.discountAmount;
  job.totalAmount = rows.length > 0
    ? totals.totalAmount
    : b.totalAmount !== undefined || b.total !== undefined
      ? requestedTotal
      : totals.totalAmount;

  job.updatedAt = new Date();
  await job.save();

  const ledgerSyncErrors: string[] = [];
  try {
    await syncJobRevenue(workspaceId, job, job.createdBy || req.user._id.toString());
  } catch (e) {
    console.error("Failed to sync job order revenue", e);
    ledgerSyncErrors.push("Revenue could not be updated");
  }
  try {
    await syncJobExpenses(workspaceId, job, job.createdBy || req.user._id.toString());
  } catch (e) {
    console.error("Failed to sync job order expenses", e);
    ledgerSyncErrors.push("Job expenses could not be updated");
  }
  job.updatedAt = new Date();
  await job.save();

  res.json({ ...job.toObject(), ledgerSyncErrors });
});

router.delete("/:workspaceId/job-orders/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const job = await JobOrder.findOne({ _id: id, workspaceId });
  if (!job) return res.status(404).json({ message: "Job order not found" });

  await RevenueEntry.deleteMany({ workspaceId, relatedId: job._id.toString() });
  await ExpenseEntry.deleteMany({
    workspaceId,
    relatedModule: "job",
    relatedId: job._id.toString(),
    category: { $in: ["REFERRAL", "INSTALLATION MATERIALS", "PARTS / MATERIALS"] },
  });
  await job.deleteOne();
  res.json({ message: "Job order deleted" });
});

export default router;
