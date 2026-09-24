import { createRouter } from "../middleware/createRouter";
import Category from "../models/Category";
import auth from "../middleware/auth";

const router = createRouter();

router.use(auth);

const ensureWorkspaceAccess = (req: any, res: any, next: any) => {
  const { workspaceId } = req.params;
  if (!req.user.workspaces.includes(workspaceId)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

router.get("/:workspaceId/categories", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { type } = req.query;

  const filter: any = { workspaceId, isActive: true };
  if (type) filter.type = type;

  const categories = await Category.find(filter).sort({ name: 1 });
  res.json(categories);
});

router.post("/:workspaceId/categories", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { type, name, description } = req.body;

  if (!type || !name) {
    return res.status(400).json({ message: "Type and name are required" });
  }

  const category = await Category.create({
    workspaceId,
    type,
    name,
    description: description || "",
    createdBy: req.user._id.toString(),
  });

  res.status(201).json(category);
});

router.put("/:workspaceId/categories/:id", ensureWorkspaceAccess, async (req, res) => {
  const { id, workspaceId } = req.params;
  const { name, description, type } = req.body;

  const category = await Category.findOne({ _id: id, workspaceId });
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  category.name = name || category.name;
  category.description = description ?? category.description;
  category.type = type || category.type;
  category.updatedAt = new Date();
  await category.save();

  res.json(category);
});

router.delete("/:workspaceId/categories/:id", ensureWorkspaceAccess, async (req, res) => {
  const { id, workspaceId } = req.params;

  const category = await Category.findOne({ _id: id, workspaceId });
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  category.isActive = false;
  category.updatedAt = new Date();
  await category.save();

  res.json({ message: "Category deleted" });
});

export default router;
