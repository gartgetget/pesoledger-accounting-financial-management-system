import mongoose from "mongoose";
import PaymentMethod from "./models/PaymentMethod.js";

/**
 * Resolve any payment-method reference (id or name) to the canonical
 * PaymentMethod id for the workspace, falling back to "Cash" when the
 * reference is empty, unknown, or points at a deleted method.
 *
 * Every module that mirrors an entry into the expense ledger must use this
 * helper so that the stored `paymentMethod` value is consistent and the
 * idempotent upserts can match existing rows.
 */
export const normalizePaymentMethod = async (
  workspaceId: string,
  value: unknown,
): Promise<string> => {
  const raw = String(value ?? "").trim();
  if (!raw) return "Cash";

  if (mongoose.isValidObjectId(raw)) {
    const byId = await PaymentMethod.findOne({ _id: raw, workspaceId });
    return byId ? byId._id.toString() : "Cash";
  }

  const byName = await PaymentMethod.findOne({ workspaceId, name: raw });
  return byName ? byName._id.toString() : "Cash";
};

export default normalizePaymentMethod;
