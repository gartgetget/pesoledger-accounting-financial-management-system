import { createRouter } from "../middleware/createRouter.js";
import Customer from "../models/Customer.js";
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

router.get("/:workspaceId/customers", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const customers = await Customer.find({ workspaceId }).sort({ name: 1 });
  res.json(customers);
});

router.post("/:workspaceId/customers", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { name, phone, email, address } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Customer name is required" });
  }

  const customer = await Customer.create({
    workspaceId,
    name,
    phone: phone || "",
    email: email || "",
    address: address || "",
    createdBy: req.user._id.toString(),
  });

  res.status(201).json(customer);
});

router.get("/:workspaceId/customers/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const customer = await Customer.findOne({ _id: id, workspaceId });
  if (!customer) return res.status(404).json({ message: "Customer not found" });
  res.json(customer);
});

router.put("/:workspaceId/customers/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const customer = await Customer.findOne({ _id: id, workspaceId });
  if (!customer) return res.status(404).json({ message: "Customer not found" });

  Object.assign(customer, req.body);
  customer.updatedAt = new Date();
  await customer.save();

  res.json(customer);
});

router.delete("/:workspaceId/customers/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const removed = await Customer.findOneAndDelete({ _id: id, workspaceId });
  if (!removed) return res.status(404).json({ message: "Customer not found" });
  res.json({ message: "Customer deleted" });
});

export default router;
