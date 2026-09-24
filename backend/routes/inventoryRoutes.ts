import { createRouter } from "../middleware/createRouter.js";
import InventoryItem from "../models/InventoryItem.js";
import auth from "../middleware/auth.js";

const router = createRouter();

router.use(auth);

const ensureWorkspaceAccess = (req: any, res: any, next: any) => {
  const { workspaceId } = req.params;
  if (!req.user.workspaces.includes(workspaceId)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

router.get("/:workspaceId/inventory", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const inventory = await InventoryItem.find({ workspaceId }).sort({ partName: 1 });
  res.json(inventory);
});

router.post("/:workspaceId/inventory", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { partName, sku, category, stock, unitPrice, reorderLevel } = req.body;

  if (!partName || !sku) {
    return res.status(400).json({ message: "Part name and SKU are required" });
  }

  const item = await InventoryItem.create({
    workspaceId,
    partName,
    sku,
    category: category || "",
    stock: Number(stock || 0),
    unitPrice: Number(unitPrice || 0),
    reorderLevel: Number(reorderLevel || 0),
    createdBy: req.user._id.toString(),
  });

  res.status(201).json(item);
});

router.get("/:workspaceId/inventory/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const item = await InventoryItem.findOne({ _id: id, workspaceId });
  if (!item) return res.status(404).json({ message: "Inventory item not found" });
  res.json(item);
});

router.put("/:workspaceId/inventory/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const item = await InventoryItem.findOne({ _id: id, workspaceId });
  if (!item) return res.status(404).json({ message: "Inventory item not found" });

  Object.assign(item, req.body);
  item.updatedAt = new Date();
  await item.save();

  res.json(item);
});

router.delete("/:workspaceId/inventory/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const item = await InventoryItem.findOne({ _id: id, workspaceId });
  if (!item) return res.status(404).json({ message: "Inventory item not found" });

  await item.deleteOne();
  res.json({ message: "Inventory item deleted" });
});

router.post("/:workspaceId/inventory/:id/adjust-stock", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const { quantity, reason } = req.body;

  const item = await InventoryItem.findOne({ _id: id, workspaceId });
  if (!item) return res.status(404).json({ message: "Inventory item not found" });

  item.stock = Number(item.stock) + Number(quantity || 0);
  item.updatedAt = new Date();
  await item.save();

  res.json({
    message: reason || "Stock adjusted",
    item,
  });
});

export default router;
