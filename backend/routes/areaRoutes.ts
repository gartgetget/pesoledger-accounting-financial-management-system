import { createRouter } from "../middleware/createRouter.js";
import Area from "../models/Area.js";
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

router.get("/:workspaceId/areas", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const areas = await Area.find({ workspaceId }).sort({ name: 1 });
  res.json(areas);
});

router.post("/:workspaceId/areas", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { name } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Area name is required" });
  }

  const trimmed = String(name).trim();
  const dupe = await Area.findOne({
    workspaceId,
    name: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
  });
  if (dupe) {
    return res.status(400).json({ message: "An area with this name already exists" });
  }

  const area = await Area.create({
    workspaceId,
    name: trimmed,
    createdBy: req.user._id.toString(),
  });

  res.status(201).json(area);
});

router.get("/:workspaceId/areas/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const area = await Area.findOne({ _id: id, workspaceId });
  if (!area) return res.status(404).json({ message: "Area not found" });
  res.json(area);
});

router.put("/:workspaceId/areas/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const area = await Area.findOne({ _id: id, workspaceId });
  if (!area) return res.status(404).json({ message: "Area not found" });

  const { name } = req.body;
  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) return res.status(400).json({ message: "Area name is required" });
    const dupe = await Area.findOne({
      workspaceId,
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (dupe) {
      return res.status(400).json({ message: "An area with this name already exists" });
    }
    area.name = trimmed;
  }
  area.updatedAt = new Date();
  await area.save();

  res.json(area);
});

router.delete("/:workspaceId/areas/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const removed = await Area.findOneAndDelete({ _id: id, workspaceId });
  if (!removed) return res.status(404).json({ message: "Area not found" });
  res.json({ message: "Area deleted" });
});

export default router;
