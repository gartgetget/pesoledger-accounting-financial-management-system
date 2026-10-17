import mongoose from "mongoose";
import JobOrder from "./models/JobOrder.js";
import RevenueEntry from "./models/RevenueEntry.js";
import VehicleExpense from "./models/VehicleExpense.js";
import ExpenseEntry from "./models/ExpenseEntry.js";
import PayrollEntry from "./models/PayrollEntry.js";
import Category from "./models/Category.js";
import SystemState from "./models/SystemState.js";
import { getJobRevenueLines } from "./jobRevenue.js";
import {
  JobExpenseSource,
  getJobInstallationMaterialsByPaymentMethod,
  getJobPartsByPaymentMethod,
  getJobReferralByPaymentMethod,
} from "./jobExpenses.js";
import { normalizePaymentMethod } from "./paymentMethods.js";

const BACKFILL_MARKER_KEY = "ledger-backfill-v1";

const categoryCache = new Map<string, string>();

const resolveCategoryId = async (workspaceId: string, name: string): Promise<string> => {
  const key = `${workspaceId}:${name}`;
  if (categoryCache.has(key)) return categoryCache.get(key)!;

  let id = "";
  const exact = await Category.findOne({ workspaceId, name, type: "expense" });
  if (exact) {
    id = exact._id.toString();
  } else {
    const ci = await Category.findOne({
      workspaceId,
      name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      type: "expense",
    });
    if (ci) id = ci._id.toString();
  }
  if (!id && (name === "REFERRAL" || name === "INSTALLATION MATERIALS" || name === "PARTS / MATERIALS")) {
    const category = await Category.create({
      workspaceId,
      type: "expense",
      name,
      description: "Automatically recorded from service and job orders",
      isActive: true,
    });
    id = category._id.toString();
  }
  categoryCache.set(key, id);
  return id;
};

const upsertLinkedExpense = async (
  workspaceId: string,
  relatedModule: string,
  relatedId: string,
  linked: string,
  payload: Record<string, unknown>,
): Promise<string> => {
  const now = new Date();
  const updateSet = { ...payload, updatedAt: now };
  const setOnInsert = { workspaceId, relatedModule, relatedId, createdAt: now };

  try {
    // Prefer the row the source already points at so an existing link is
    // refreshed in place instead of being duplicated.
    if (mongoose.isValidObjectId(linked)) {
      const linkedDoc = await ExpenseEntry.findOneAndUpdate(
        { _id: linked, workspaceId },
        { $set: updateSet },
        { new: true },
      );
      if (linkedDoc) return String(linkedDoc._id);
    }

    const doc = await ExpenseEntry.findOneAndUpdate(
      { workspaceId, relatedModule, relatedId },
      { $set: updateSet, $setOnInsert: setOnInsert },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return doc ? String(doc._id) : "";
  } catch (e: any) {
    if (e?.code === 11000) {
      const doc = await ExpenseEntry.findOne({ workspaceId, relatedModule, relatedId });
      return doc ? String(doc._id) : "";
    }
    throw e;
  }
};

export async function runLedgerBackfill(force = false): Promise<void> {
  const marker = await SystemState.findOne({ key: BACKFILL_MARKER_KEY });
  if (marker && !force) return;

  let revenueCount = 0;
  let expenseCount = 0;

  try {
    // ---- Job orders -> revenue collections and operating expenses ----
    const jobs = await JobOrder.collection.find({}).toArray();
    for (const job of jobs) {
      const workspaceId = String(job.workspaceId || "");
      const customers = Array.isArray(job.customers) ? job.customers : [];
      const customerRevenue = customers.reduce(
        (sum: number, customer: any) =>
          sum + (Number(customer.amountCollected) || 0),
        0,
      );
      const legacyInstallationMaterials = Number(
        job.installationMaterialsPrice ?? job.installationPrice,
      ) || 0;
      const calculatedSubtotal = customers.length > 0
        ? customerRevenue
        : Math.max(0, (Number(job.amountPaid) || 0) - legacyInstallationMaterials);
      const subtotal = calculatedSubtotal;
      const discountValue = Number(job.discountValue || 0);
      const requestedDiscount = job.discountType === "amount"
        ? discountValue
        : (subtotal * discountValue) / 100;
      const discountAmount = Math.min(subtotal, Math.max(0, requestedDiscount));
      job.subtotal = subtotal;
      job.discountAmount = discountAmount;
      job.totalAmount = Math.max(0, subtotal - discountAmount);
      if (customers.length > 0) job.amountPaid = customerRevenue;
      else if (legacyInstallationMaterials > 0) {
        job.amountPaid = Math.max(
          0,
          (Number(job.amountPaid) || 0) - legacyInstallationMaterials,
        );
      }
      const revenueLines = job.status === "cancelled"
        ? []
        : getJobRevenueLines({
            ...job,
            jobNumber: String(job.jobNumber || ""),
            customerName: String(job.customerName || ""),
            date: job.date || job.createdAt || new Date(),
            area: String(job.area || ""),
          });
      const relatedId = String(job._id);
      const remainingRevenue = await RevenueEntry.find({ workspaceId, relatedId });
      const syncedRevenueIds: string[] = [];
      for (const line of revenueLines) {
        const paymentMethod = await normalizePaymentMethod(workspaceId, line.paymentMethod);
        const matchIndex = remainingRevenue.findIndex(
          (revenue) => revenue.category === line.category && revenue.paymentMethod === paymentMethod,
        );
        const legacyIndex = matchIndex < 0 && revenueLines.length === 1 && remainingRevenue.length === 1 ? 0 : matchIndex;
        const existingRevenue = legacyIndex >= 0 ? remainingRevenue.splice(legacyIndex, 1)[0] : null;
        const payload = { ...line, paymentMethod, relatedId };
        if (existingRevenue) {
          Object.assign(existingRevenue, payload);
          existingRevenue.updatedAt = new Date();
          await existingRevenue.save();
          syncedRevenueIds.push(existingRevenue._id.toString());
        } else {
          const revenue = await RevenueEntry.create({
            workspaceId,
            ...payload,
            createdBy: String(job.createdBy || ""),
          });
          syncedRevenueIds.push(revenue._id.toString());
          revenueCount++;
        }
      }
      if (remainingRevenue.length > 0) {
        await RevenueEntry.deleteMany({ _id: { $in: remainingRevenue.map((revenue) => revenue._id) }, workspaceId });
      }
      job.revenueId = syncedRevenueIds[0] || "";

      const shouldPost = job.status !== "cancelled";
      const expenseSource = job as unknown as JobExpenseSource;
      const desiredExpenses: Record<string, Array<{ paymentMethod: string; amount: number }>> = {
        REFERRAL: shouldPost ? getJobReferralByPaymentMethod(expenseSource) : [],
        "INSTALLATION MATERIALS": shouldPost ? getJobInstallationMaterialsByPaymentMethod(expenseSource) : [],
        "PARTS / MATERIALS": shouldPost ? getJobPartsByPaymentMethod(expenseSource) : [],
      };
      const expenseIds: string[] = [];
      for (const category of ["REFERRAL", "INSTALLATION MATERIALS", "PARTS / MATERIALS"]) {
        const desired = desiredExpenses[category];
        const desiredPaymentMethods: string[] = [];
        for (const { amount, paymentMethod } of desired) {
          const normalizedMethod = await normalizePaymentMethod(workspaceId, String(paymentMethod || ""));
          const now = new Date();
          const filter = {
            workspaceId,
            relatedModule: "job",
            relatedId: String(job._id),
            category,
            paymentMethod: normalizedMethod,
          };
          const update = {
            $set: {
              date: job.date || job.createdAt || new Date(),
              categoryId: await resolveCategoryId(workspaceId, category),
              category,
              description: `${category} — Job ${job.jobNumber}${job.customerName ? ` — ${job.customerName}` : ""}`,
              amount,
              area: String(job.area || ""),
              updatedAt: now,
            },
            $setOnInsert: {
              workspaceId,
              relatedModule: "job",
              relatedId: String(job._id),
              category,
              paymentMethod: normalizedMethod,
              createdBy: String(job.createdBy || ""),
              createdAt: now,
            },
          };
          let doc: any = null;
          try {
            const result: any = await ExpenseEntry.findOneAndUpdate(filter, update, {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
              includeResultMetadata: true,
            });
            doc = result?.value;
            if (result?.lastErrorObject?.upserted) expenseCount++;
          } catch (e: any) {
            if (e?.code === 11000) {
              doc = await ExpenseEntry.findOne(filter);
            } else {
              throw e;
            }
          }
          if (doc) expenseIds.push(String(doc._id));
          desiredPaymentMethods.push(normalizedMethod);
        }

        const staleQuery: Record<string, unknown> = {
          workspaceId,
          relatedModule: "job",
          relatedId: String(job._id),
          category,
        };
        if (desiredPaymentMethods.length > 0) {
          staleQuery.paymentMethod = { $nin: desiredPaymentMethods };
        }
        await ExpenseEntry.deleteMany(staleQuery);
      }
      job.expenseId = expenseIds[0] || "";
      await JobOrder.collection.updateOne(
        { _id: job._id },
        {
          $set: {
            subtotal: Number(job.subtotal || 0),
            laborCost: 0,
            otherCharges: 0,
            discountAmount: Number(job.discountAmount || 0),
            totalAmount: Number(job.totalAmount || 0),
            amountPaid: Number(job.amountPaid || 0),
            revenueId: String(job.revenueId || ""),
            expenseId: String(job.expenseId || ""),
          },
        },
      );
    }

    // ---- Vehicle expenses -> GAS / SASAKYAN expenses ----
    const vexpDocs = await VehicleExpense.collection.find({}).toArray();
    for (const v of vexpDocs) {
      const workspaceId = String(v.workspaceId || "");
      const linked = v.expenseId ? String(v.expenseId) : "";

      const category = v.expenseType === "Fuel/Gas" ? "GAS" : "SASAKYAN";
      const expenseId = await upsertLinkedExpense(
        workspaceId,
        "vehicle",
        String(v._id),
        linked,
        {
          date: v.date || v.createdAt || new Date(),
          categoryId: await resolveCategoryId(workspaceId, category),
          category,
          description: v.description || `${v.expenseType} — ${v.vehicleName || ""}`.trim(),
          amount: Number(v.amount || 0),
          paymentMethod: await normalizePaymentMethod(workspaceId, String(v.paymentMethodId || "")),
          area: String(v.area || ""),
          createdBy: String(v.createdBy || ""),
        },
      );
      await VehicleExpense.collection.updateOne(
        { _id: v._id },
        { $set: { expenseId } },
      );
      if (!linked) expenseCount++;
    }

    // ---- Payroll -> SALARY expenses ----
    const payrollDocs = await PayrollEntry.collection.find({}).toArray();
    for (const p of payrollDocs) {
      const workspaceId = String(p.workspaceId || "");
      const linked = p.expenseId ? String(p.expenseId) : "";

      const date = p.date || p.createdAt || new Date();
      const gross = Number(p.grossSalary || p.grossPay || 0);
      const net = Number(p.netSalary || p.netPay || 0);

      const legacyFill: Record<string, unknown> = {};
      if (!p.date) legacyFill.date = date;
      if (!p.basicSalary && gross) legacyFill.basicSalary = gross;
      if (!p.grossSalary) legacyFill.grossSalary = gross;
      if (!p.netSalary && net) legacyFill.netSalary = net;

      const expenseId = await upsertLinkedExpense(
        workspaceId,
        "salary",
        String(p._id),
        linked,
        {
          date,
          categoryId: await resolveCategoryId(workspaceId, "SALARY"),
          category: "SALARY",
          description: `Payroll — ${p.employeeName || ""} (${p.period || ""})`.trim(),
          amount: gross,
          paymentMethod: await normalizePaymentMethod(workspaceId, String(p.paymentMethodId || "")),
          area: String(p.area || ""),
          createdBy: String(p.createdBy || ""),
        },
      );
      legacyFill.expenseId = expenseId;
      if (!linked) expenseCount++;

      if (Object.keys(legacyFill).length > 0) {
        await PayrollEntry.collection.updateOne({ _id: p._id }, { $set: legacyFill });
      }
    }

    await SystemState.updateOne(
      { key: BACKFILL_MARKER_KEY },
      { $set: { value: new Date().toISOString(), updatedAt: new Date() } },
      { upsert: true },
    );

    if (revenueCount > 0 || expenseCount > 0) {
      console.log(`Ledger backfill: +${revenueCount} revenue, +${expenseCount} expenses`);
    } else {
      console.log("Ledger backfill: nothing to link");
    }
  } catch (e: any) {
    // Do not mark the backfill complete; it will retry on the next startup.
    console.error("Ledger backfill failed:", e?.message || e);
  }
}
