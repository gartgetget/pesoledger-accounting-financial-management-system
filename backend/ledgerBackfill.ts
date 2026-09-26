import mongoose from "mongoose";
import JobOrder from "./models/JobOrder.js";
import RevenueEntry from "./models/RevenueEntry.js";
import VehicleExpense from "./models/VehicleExpense.js";
import ExpenseEntry from "./models/ExpenseEntry.js";
import PayrollEntry from "./models/PayrollEntry.js";
import PaymentMethod from "./models/PaymentMethod.js";
import Category from "./models/Category.js";

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
    // ---- Job orders -> revenue collections ----
    const jobs = await JobOrder.collection.find({}).toArray();
    for (const job of jobs) {
      const workspaceId = String(job.workspaceId || "");
      const amountPaid = Number(job.amountPaid || 0);
      const shouldPost = job.status === "completed" && amountPaid > 0;
      const linked = job.revenueId ? String(job.revenueId) : "";
      const alive = linked ? await linkAlive(RevenueEntry, linked, workspaceId) : false;

      // keep the area tag on job-linked revenue in sync with the job
      if (alive && job.area) {
        const rev = await RevenueEntry.findOne({ _id: linked, workspaceId });
        if (rev && rev.area !== String(job.area)) {
          rev.area = String(job.area);
          await rev.save();
        }
      }

      if (!shouldPost) {
        if (linked) {
          if (alive) {
            await RevenueEntry.deleteOne({ _id: linked, workspaceId });
          }
          await JobOrder.collection.updateOne({ _id: job._id }, { $set: { revenueId: "" } });
        }
        continue;
      }
      if (alive) continue;

      const rev = await RevenueEntry.create({
        workspaceId,
        date: job.date || job.createdAt || new Date(),
        category: job.serviceCategory || "JOB ORDER",
        description: `Job ${job.jobNumber}${job.customerName ? ` — ${job.customerName}` : ""}`,
        amount: amountPaid,
        paymentMethod: await resolvePaymentMethod(workspaceId, String(job.paymentMethodId || "")),
        referenceNo: job.jobNumber || "",
        relatedId: String(job._id),
        area: String(job.area || ""),
        createdBy: String(job.createdBy || ""),
      });
      await JobOrder.collection.updateOne(
        { _id: job._id },
        { $set: { revenueId: rev._id.toString() } },
      );
      revenueCount++;
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
          relatedModule: "salary",
          relatedId: String(p._id),
          createdBy: String(p.createdBy || ""),
        });
        legacyFill.expenseId = exp._id.toString();
        expenseCount++;
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
