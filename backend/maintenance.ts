import ExpenseEntry from "./models/ExpenseEntry.js";
import SystemState from "./models/SystemState.js";
import { normalizePaymentMethod } from "./paymentMethods.js";

const LINKED_MODULES = ["job", "vehicle", "salary"];
const SOURCE_MODULES = ["vehicle", "salary"];

const DEDUPE_MARKER_KEY = "expense-dedupe-v1";
const UNIQUE_INDEX = { name: "uniq_linked_expense" };

/**
 * Remove duplicate auto-posted ledger rows that share the same
 * (workspaceId, relatedModule, relatedId, category, paymentMethod) key.
 * The oldest row (by createdAt) is kept; the rest are deleted.
 *
 * This tolerates job rows that legitimately fan out a single category across
 * several payment methods (each method is a distinct key).
 */
export const dedupeLinkedExpenses = async (): Promise<number> => {
  const groups = await ExpenseEntry.aggregate<{ ids: any[] }>([
    { $match: { relatedModule: { $in: LINKED_MODULES } } },
    { $sort: { createdAt: 1, _id: 1 } },
    {
      $group: {
        _id: {
          workspaceId: "$workspaceId",
          relatedModule: "$relatedModule",
          relatedId: "$relatedId",
          category: "$category",
          paymentMethod: "$paymentMethod",
        },
        ids: { $push: "$_id" },
      },
    },
    { $match: { "ids.1": { $exists: true } } },
  ]);

  const duplicates = groups.flatMap((group) => group.ids.slice(1));
  if (duplicates.length === 0) return 0;

  await ExpenseEntry.deleteMany({ _id: { $in: duplicates } });
  return duplicates.length;
};

/**
 * Collapse duplicate vehicle/salary ledger rows that point at the same source
 * document regardless of payment method. Each VehicleExpense / PayrollEntry maps
 * 1:1 to exactly one ledger row, so any extra row for the same relatedId is
 * always an error. Job rows are intentionally excluded (multi-method fan-out).
 */
export const dedupeSourceLinkedExpenses = async (): Promise<number> => {
  const groups = await ExpenseEntry.aggregate<{ ids: any[] }>([
    { $match: { relatedModule: { $in: SOURCE_MODULES } } },
    { $sort: { createdAt: 1, _id: 1 } },
    {
      $group: {
        _id: {
          workspaceId: "$workspaceId",
          relatedModule: "$relatedModule",
          relatedId: "$relatedId",
        },
        ids: { $push: "$_id" },
      },
    },
    { $match: { "ids.1": { $exists: true } } },
  ]);

  const duplicates = groups.flatMap((group) => group.ids.slice(1));
  if (duplicates.length === 0) return 0;

  await ExpenseEntry.deleteMany({ _id: { $in: duplicates } });
  return duplicates.length;
};

/**
 * Normalize legacy vehicle/salary ledger rows whose `paymentMethod` still holds
 * a method name (or stale id) instead of the canonical PaymentMethod id. Only
 * distinct values are resolved, and rows are updated only when the value
 * actually changes. Must run after the source-level dedupe so collapsing
 * name->id cannot create a duplicate row.
 */
export const normalizeLinkedPaymentMethods = async (): Promise<number> => {
  const pairs = await ExpenseEntry.aggregate<{
    _id: { workspaceId: string; paymentMethod: string };
  }>([
    { $match: { relatedModule: { $in: SOURCE_MODULES } } },
    { $group: { _id: { workspaceId: "$workspaceId", paymentMethod: "$paymentMethod" } } },
  ]);

  let changed = 0;
  for (const { _id } of pairs) {
    const workspaceId = String(_id.workspaceId || "");
    const current = String(_id.paymentMethod ?? "");
    const normalized = await normalizePaymentMethod(workspaceId, current);
    if (normalized === current) continue;
    const result = await ExpenseEntry.updateMany(
      { workspaceId, relatedModule: { $in: SOURCE_MODULES }, paymentMethod: current },
      { $set: { paymentMethod: normalized } },
    );
    changed += result.modifiedCount || 0;
  }
  return changed;
};

/**
 * Create the partial unique index that guarantees auto-posted ledger rows are
 * idempotent. Safe to call repeatedly.
 */
export const ensureExpenseIndexes = async (): Promise<void> => {
  await ExpenseEntry.collection.createIndex(
    { workspaceId: 1, relatedModule: 1, relatedId: 1, category: 1, paymentMethod: 1 },
    {
      ...UNIQUE_INDEX,
      unique: true,
      partialFilterExpression: { relatedModule: { $in: LINKED_MODULES } },
    },
  );
};

/**
 * Run the one-time duplicate cleanup + payment-method normalization exactly
 * once (tracked via SystemState). The unique index is permanent, so once the
 * cleanup has run duplicates cannot reappear through normal writes.
 */
export const runExpenseDedupeOnce = async (): Promise<void> => {
  const marker = await SystemState.findOne({ key: DEDUPE_MARKER_KEY });
  if (marker) return;

  const exactRemoved = await dedupeLinkedExpenses();
  const sourceRemoved = await dedupeSourceLinkedExpenses();
  const normalized = await normalizeLinkedPaymentMethods();

  await SystemState.updateOne(
    { key: DEDUPE_MARKER_KEY },
    { $set: { value: new Date().toISOString(), updatedAt: new Date() } },
    { upsert: true },
  );

  const removed = exactRemoved + sourceRemoved;
  if (removed > 0) {
    console.log(`Expense maintenance: removed ${removed} duplicate linked expense row(s)`);
  }
  if (normalized > 0) {
    console.log(`Expense maintenance: normalized payment method on ${normalized} ledger row(s)`);
  }
};

/**
 * Runs the one-time maintenance required before serving traffic:
 * dedupe existing duplicates + normalize methods, then enforce the unique index.
 */
export const runStartupMaintenance = async (): Promise<void> => {
  try {
    await runExpenseDedupeOnce();
  } catch (e: any) {
    console.error("Expense dedupe failed:", e?.message || e);
  }

  try {
    await ensureExpenseIndexes();
  } catch (e: any) {
    console.error("Failed to ensure expense unique index:", e?.message || e);
  }
};

export default runStartupMaintenance;
