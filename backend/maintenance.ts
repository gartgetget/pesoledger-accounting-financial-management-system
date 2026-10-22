import ExpenseEntry from "./models/ExpenseEntry.js";
import SystemState from "./models/SystemState.js";
import { normalizePaymentMethod } from "./paymentMethods.js";

const LINKED_MODULES = ["job", "vehicle", "salary"];
const SOURCE_MODULES = ["vehicle", "salary"];

const DEDUPE_MARKER_V2_KEY = "expense-dedupe-v2";
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
 * Verify the partial unique index actually exists on the collection. The index
 * can fail to materialize (e.g. createIndex rejected due to pre-existing
 * duplicates) while older code still reported success, so this runs after.
 */
export const verifyExpenseUniqueIndex = async (): Promise<boolean> => {
  try {
    const indexes = await ExpenseEntry.collection.indexes();
    const found = indexes.some((idx: Record<string, unknown>) => idx.name === UNIQUE_INDEX.name);
    if (!found) {
      console.error(
        `Expense maintenance: REQUIRED INDEX ${UNIQUE_INDEX.name} IS MISSING — duplicate ledger rows cannot be blocked until the dedupe succeeds and the index is created.`,
      );
    }
    return found;
  } catch (e: any) {
    console.error("Expense maintenance: index verification failed:", e?.message || e);
    return false;
  }
};

/**
 * Run one full idempotent maintenance cycle:
 * 1. Collapse 1:1 source-linked rows (salary/vehicle) that share relatedId.
 * 2. Normalize legacy payment-method values.
 * 3. Remove remaining duplicate rows that share the exact composite key.
 * 4. Ensure the partial unique index exists, then verify it.
 * Safe to run on every startup or on demand.
 */
export const runMaintenanceCycle = async (): Promise<{
  sourceRemoved: number;
  normalized: number;
  exactRemoved: number;
  indexPresent: boolean;
}> => {
  let sourceRemoved = 0;
  let normalized = 0;
  let exactRemoved = 0;

  try {
    sourceRemoved = await dedupeSourceLinkedExpenses();
    normalized = await normalizeLinkedPaymentMethods();
    exactRemoved = await dedupeLinkedExpenses();
  } catch (e: any) {
    console.error("Expense dedupe failed:", e?.message || e);
  }

  let indexPresent = false;
  try {
    await ensureExpenseIndexes();
    indexPresent = await verifyExpenseUniqueIndex();
  } catch (e: any) {
    console.error("Failed to ensure expense unique index:", e?.message || e);
    indexPresent = await verifyExpenseUniqueIndex();
  }

  // Record a cycle marker so deployments can see maintenance has run at least
  // once via the new self-healing path (v1 marker kept for history).
  try {
    await SystemState.updateOne(
      { key: DEDUPE_MARKER_V2_KEY },
      { $set: { value: new Date().toISOString(), updatedAt: new Date() } },
      { upsert: true },
    );
  } catch (e: any) {
    console.error("Expense maintenance: failed to record marker:", e?.message || e);
  }

  const removed = sourceRemoved + exactRemoved;
  if (removed > 0) {
    console.log(`Expense maintenance: removed ${removed} duplicate linked expense row(s)`);
  }
  if (normalized > 0) {
    console.log(`Expense maintenance: normalized payment method on ${normalized} ledger row(s)`);
  }
  if (!indexPresent) {
    console.warn("Expense maintenance: unique index could not be confirmed after this cycle.");
  }

  return { sourceRemoved, normalized, exactRemoved, indexPresent };
};

/**
 * Startup maintenance: the dedupe cycle now runs on EVERY boot (it is cheap and
 * idempotent) so duplicates created after the old one-time marker was consumed
 * are cleaned automatically instead of persisting forever.
 */
export const runStartupMaintenance = async (): Promise<void> => {
  await runMaintenanceCycle();
};

export default runStartupMaintenance;
