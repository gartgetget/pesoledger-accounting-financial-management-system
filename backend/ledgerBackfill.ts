import mongoose from "mongoose";
import JobOrder from "./models/JobOrder.js";
import RevenueEntry from "./models/RevenueEntry.js";
import VehicleExpense from "./models/VehicleExpense.js";
import ExpenseEntry from "./models/ExpenseEntry.js";
import PayrollEntry from "./models/PayrollEntry.js";
import PaymentMethod from "./models/PaymentMethod.js";
import Category from "./models/Category.js";
import { getJobRevenueLines } from "./jobRevenue.js";

let ran = false;

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

const resolvePaymentMethod = async (workspaceId: string, value: string): Promise<string> => {
  if (!value) return "Cash";
  if (mongoose.isValidObjectId(value)) {
    const pm = await PaymentMethod.findOne({ _id: value, workspaceId });
    return pm ? value : "Cash";
  }
  const byName = await PaymentMethod.findOne({ workspaceId, name: value });
  return byName ? value : "Cash";
};

const linkAlive = async (
  model: { exists: (q: Record<string, unknown>) => Promise<unknown> },
  id: string | undefined,
  workspaceId: string,
): Promise<boolean> => {
  if (!id || !mongoose.isValidObjectId(id)) return false;
  return (await model.exists({ _id: id, workspaceId })) !== null;
};

export async function runLedgerBackfill(): Promise<void> {
  if (ran) return;
  ran = true;

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
        const paymentMethod = await resolvePaymentMethod(workspaceId, line.paymentMethod);
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

      const customerPartsAmount = customers.reduce(
        (sum: number, customer: any) =>
          sum + (Array.isArray(customer.parts)
            ? customer.parts.reduce((partSum: number, part: any) => partSum + (Number(part.price) || 0), 0)
            : 0),
        0,
      );
      const legacyPartsAmount = Array.isArray(job.parts)
        ? job.parts.reduce((sum: number, part: any) => sum + (Number(part.price) || 0), 0)
        : 0;
      const customerInstallationMaterialsAmount = customers.reduce(
        (sum: number, customer: any) => sum + (Number(customer.installationMaterialsPrice) || 0),
        0,
      );
      const installationMaterialsAmount = customerInstallationMaterialsAmount ||
        Number(job.installationMaterialsPrice ?? job.installationPrice ?? 0) || 0;
      const partsAmount = customerPartsAmount || legacyPartsAmount;
      const nestedReferralAmount = customers.reduce(
        (sum: number, customer: any) => sum + (Number(customer.referralAmount) || 0),
        0,
      );
      const referralAmount = nestedReferralAmount || Number(job.referralAmount ?? job.referralCost ?? 0) || 0;
      const expenses = [
        { category: "REFERRAL", amount: job.status !== "cancelled" ? referralAmount : 0 },
        { category: "INSTALLATION MATERIALS", amount: job.status !== "cancelled" ? installationMaterialsAmount : 0 },
        { category: "PARTS / MATERIALS", amount: job.status !== "cancelled" ? partsAmount : 0 },
      ];
      const expenseIds: string[] = [];
      for (const { category, amount } of expenses) {
        const query = {
          workspaceId,
          relatedModule: "job",
          relatedId: String(job._id),
          category,
        };
        const existingExpense = await ExpenseEntry.findOne(query);
        if (amount <= 0) {
          if (existingExpense) await existingExpense.deleteOne();
          continue;
        }

        const payload = {
          date: job.date || job.createdAt || new Date(),
          categoryId: await resolveCategoryId(workspaceId, category),
          category,
          description: `${category} — Job ${job.jobNumber}${job.customerName ? ` — ${job.customerName}` : ""}`,
          amount,
          paymentMethod: await resolvePaymentMethod(workspaceId, String(job.paymentMethodId || "")),
          area: String(job.area || ""),
          relatedModule: "job",
          relatedId: String(job._id),
        };
        if (existingExpense) {
          Object.assign(existingExpense, payload);
          existingExpense.updatedAt = new Date();
          await existingExpense.save();
          expenseIds.push(existingExpense._id.toString());
        } else {
          const expense = await ExpenseEntry.create({
            workspaceId,
            ...payload,
            createdBy: String(job.createdBy || ""),
          });
          expenseIds.push(expense._id.toString());
          expenseCount++;
        }
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
      const alive = linked ? await linkAlive(ExpenseEntry, linked, workspaceId) : false;
      if (alive) {
        // keep the area tag on vehicle-linked expenses in sync with the source
        const area = String(v.area || "");
        const mirror = await ExpenseEntry.findOne({ _id: linked, workspaceId });
        if (mirror && String(mirror.area || "") !== area) {
          mirror.area = area;
          await mirror.save();
        }
        continue;
      }

      const category = v.expenseType === "Fuel/Gas" ? "GAS" : "SASAKYAN";
      const exp = await ExpenseEntry.create({
        workspaceId,
        date: v.date || v.createdAt || new Date(),
        categoryId: await resolveCategoryId(workspaceId, category),
        category,
        description: v.description || `${v.expenseType} — ${v.vehicleName || ""}`.trim(),
        amount: Number(v.amount || 0),
        paymentMethod: await resolvePaymentMethod(workspaceId, String(v.paymentMethodId || "")),
        area: String(v.area || ""),
        relatedModule: "vehicle",
        relatedId: String(v._id),
        createdBy: String(v.createdBy || ""),
      });
      await VehicleExpense.collection.updateOne(
        { _id: v._id },
        { $set: { expenseId: exp._id.toString() } },
      );
      expenseCount++;
    }

    // ---- Payroll -> SALARY expenses ----
    const payrollDocs = await PayrollEntry.collection.find({}).toArray();
    for (const p of payrollDocs) {
      const workspaceId = String(p.workspaceId || "");
      const linked = p.expenseId ? String(p.expenseId) : "";
      const alive = linked ? await linkAlive(ExpenseEntry, linked, workspaceId) : false;

      const date = p.date || p.createdAt || new Date();
      const gross = Number(p.grossSalary || p.grossPay || 0);
      const net = Number(p.netSalary || p.netPay || 0);

      const legacyFill: Record<string, unknown> = {};
      if (!p.date) legacyFill.date = date;
      if (!p.basicSalary && gross) legacyFill.basicSalary = gross;
      if (!p.grossSalary) legacyFill.grossSalary = gross;
      if (!p.netSalary && net) legacyFill.netSalary = net;

      if (!alive) {
        const exp = await ExpenseEntry.create({
          workspaceId,
          date,
          categoryId: await resolveCategoryId(workspaceId, "SALARY"),
          category: "SALARY",
          description: `Payroll — ${p.employeeName || ""} (${p.period || ""})`.trim(),
          amount: gross,
          paymentMethod: await resolvePaymentMethod(workspaceId, String(p.paymentMethodId || "")),
          area: String(p.area || ""),
          relatedModule: "salary",
          relatedId: String(p._id),
          createdBy: String(p.createdBy || ""),
        });
        legacyFill.expenseId = exp._id.toString();
        expenseCount++;
      } else {
        const expense = await ExpenseEntry.findOne({ _id: linked, workspaceId });
        if (expense && typeof p.area === "string" && String(expense.area || "") !== p.area) {
          expense.area = String(p.area || "");
          await expense.save();
        }
      }

      if (Object.keys(legacyFill).length > 0) {
        await PayrollEntry.collection.updateOne({ _id: p._id }, { $set: legacyFill });
      }
    }

    if (revenueCount > 0 || expenseCount > 0) {
      console.log(`Ledger backfill: +${revenueCount} revenue, +${expenseCount} expenses`);
    } else {
      console.log("Ledger backfill: nothing to link");
    }
  } catch (e: any) {
    ran = false;
    console.error("Ledger backfill failed:", e?.message || e);
  }
}
