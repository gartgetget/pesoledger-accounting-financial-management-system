import { createRouter } from "../middleware/createRouter.js";
import ExpenseEntry from "../models/ExpenseEntry.js";
import auth from "../middleware/auth.js";
import { runMaintenanceCycle } from "../maintenance.js";

const router = createRouter();

router.use(auth);

const ensureWorkspaceAccess = (req: any, res: any, next: any) => {
  const { workspaceId } = req.params;
  if (!req.user.workspaces.includes(workspaceId)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

const SOURCE_LINKED_MODULES = ["salary", "vehicle"];

/**
 * Diagnostic: list ledger rows whose (workspaceId, relatedModule, relatedId)
 * group has more than one row for 1:1 modules (salary/vehicle), plus rows that
 * collide on the full composite key. Read-only — no deletion happens here.
 */
router.get(
  "/:workspaceId/maintenance/duplicates",
  ensureWorkspaceAccess,
  async (req, res) => {
    const { workspaceId } = req.params;

    const sourceGroups = await ExpenseEntry.aggregate([
      {
        $match: {
          workspaceId,
          relatedModule: { $in: SOURCE_LINKED_MODULES },
        },
      },
      { $sort: { createdAt: 1, _id: 1 } },
      {
        $group: {
          _id: {
            relatedModule: "$relatedModule",
            relatedId: "$relatedId",
          },
          rows: { $push: "$$ROOT" },
        },
      },
      { $match: { "rows.1": { $exists: true } } },
    ]);

    const exactGroups = await ExpenseEntry.aggregate([
      {
        $match: {
          workspaceId,
          relatedModule: { $in: SOURCE_LINKED_MODULES },
        },
      },
      {
        $group: {
          _id: {
            relatedModule: "$relatedModule",
            relatedId: "$relatedId",
            category: "$category",
            paymentMethod: "$paymentMethod",
          },
          rows: {
            $push: {
              _id: "$_id",
              date: "$date",
              amount: "$amount",
              category: "$category",
              paymentMethod: "$paymentMethod",
              description: "$description",
              createdAt: "$createdAt",
            },
          },
        },
      },
      { $match: { "rows.1": { $exists: true } } },
    ]);

    res.json({
      workspaceId,
      sourceDuplicates: sourceGroups.map((g) => ({
        relatedModule: g._id.relatedModule,
        relatedId: g._id.relatedId,
        count: g.rows.length,
        rows: g.rows.map((r: Record<string, unknown>) => ({
          _id: r._id,
          date: r.date,
          amount: r.amount,
          category: r.category,
          paymentMethod: r.paymentMethod,
          description: r.description,
          createdAt: r.createdAt,
        })),
      })),
      exactKeyDuplicates: exactGroups,
    });
  },
);

// Admin-only manual trigger so cleanup can run without a server restart.
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

router.post(
  "/:workspaceId/maintenance/dedupe",
  ensureWorkspaceAccess,
  requireAdmin,
  async (_req, res) => {
    const cycle = await runMaintenanceCycle();
    res.json({ ok: true, ...cycle });
  },
);

export default router;
