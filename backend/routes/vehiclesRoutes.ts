import { createRouter } from "../middleware/createRouter.js";
import Vehicle from "../models/Vehicle.js";
import VehicleExpense from "../models/VehicleExpense.js";
import Employee from "../models/Employee.js";
import PaymentMethod from "../models/PaymentMethod.js";
import ExpenseEntry from "../models/ExpenseEntry.js";
import Category from "../models/Category.js";
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

const ledgerCategoryForVehicleExpense = (expenseType: string) =>
  expenseType === "Fuel/Gas" ? "GAS" : "SASAKYAN";

const findCategoryIdByName = async (workspaceId: string, name: string) => {
  const exact = await Category.findOne({ workspaceId, name, type: "expense" });
  if (exact) return exact._id.toString();
  const ci = await Category.findOne({ workspaceId, name: new RegExp(`^${name}$`, "i"), type: "expense" });
  return ci ? ci._id.toString() : "";
};

router.get("/:workspaceId/vehicles", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const vehicles = await Vehicle.find({ workspaceId }).sort({ vehicleName: 1 });
  res.json(vehicles);
});

router.post("/:workspaceId/vehicles", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { vehicleName, plateNumber, model, assignedDriver } = req.body;

  if (!vehicleName || !plateNumber) {
    return res.status(400).json({ message: "Vehicle name and plate number are required" });
  }

  const vehicle = await Vehicle.create({
    workspaceId, vehicleName, plateNumber,
    model: model || "",
    assignedDriver: assignedDriver || "",
    createdBy: req.user._id.toString(),
  });

  res.status(201).json(vehicle);
});

router.get("/:workspaceId/vehicles/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const vehicle = await Vehicle.findOne({ _id: id, workspaceId });
  if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
  res.json(vehicle);
});

router.put("/:workspaceId/vehicles/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const vehicle = await Vehicle.findOne({ _id: id, workspaceId });
  if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

  Object.assign(vehicle, req.body);
  vehicle.updatedAt = new Date();
  await vehicle.save();

  res.json(vehicle);
});

router.delete("/:workspaceId/vehicles/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const vehicle = await Vehicle.findOne({ _id: id, workspaceId });
  if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

  await vehicle.deleteOne();
  res.json({ message: "Vehicle deleted" });
});

router.get("/:workspaceId/vehicle-expenses", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const expenses = await VehicleExpense.find({ workspaceId }).sort({ date: -1 });
  res.json(expenses);
});

router.post("/:workspaceId/vehicle-expenses/batch", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { vehicleId, vehicleName, date, area, driverResponsible, odometer, description, notes, expenses } = req.body || {};
  const validTypes = ["Fuel/Gas", "Maintenance", "Repairs", "Toll", "Parking", "Other"];

  if (!vehicleId || !date || !Array.isArray(expenses) || expenses.length !== 2) {
    return res.status(400).json({ message: "Vehicle, date, and exactly two vehicle expense lines are required" });
  }
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({ message: "A valid date is required" });
  }
  const normalizedExpenses = expenses.map((expense: any) => ({
    expenseType: String(expense?.expenseType || ""),
    amount: Number(expense?.amount),
    paymentMethodId: String(expense?.paymentMethodId || "").trim(),
  }));
  if (normalizedExpenses.some((expense: any) =>
    !validTypes.includes(expense.expenseType) ||
    !Number.isFinite(expense.amount) ||
    expense.amount <= 0 ||
    !expense.paymentMethodId
  )) {
    return res.status(400).json({
      message: "Each vehicle expense requires a valid type, positive amount, and payment method",
    });
  }

  const vehicle = await Vehicle.findOne({ _id: vehicleId, workspaceId });
  if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

  const createdVehicleExpenses: Array<InstanceType<typeof VehicleExpense>> = [];
  const createdLedgerIds: string[] = [];
  try {
    for (const line of normalizedExpenses) {
      const vehicleExpense = await VehicleExpense.create({
        workspaceId,
        vehicleId,
        vehicleName: vehicleName || vehicle.vehicleName,
        date: parsedDate,
        expenseType: line.expenseType,
        amount: line.amount,
        paymentMethodId: line.paymentMethodId,
        area: area || "",
        driverResponsible: driverResponsible || "",
        odometer: Number(odometer) || 0,
        description: description || `${line.expenseType} — ${vehicle.vehicleName}`,
        notes: notes || "",
        createdBy: req.user._id.toString(),
      });
      createdVehicleExpenses.push(vehicleExpense);

      const category = ledgerCategoryForVehicleExpense(line.expenseType);
      const categoryId = await findCategoryIdByName(workspaceId, category);
      const ledgerEntry = await ExpenseEntry.create({
        workspaceId,
        date: parsedDate,
        categoryId,
        category,
        description: `${line.expenseType} — ${description || vehicleExpense.vehicleName}`,
        amount: line.amount,
        paymentMethod: line.paymentMethodId,
        area: area || "",
        relatedModule: "vehicle",
        relatedId: vehicleExpense._id.toString(),
        createdBy: req.user._id.toString(),
      });
      createdLedgerIds.push(ledgerEntry._id.toString());
      vehicleExpense.expenseId = ledgerEntry._id.toString();
      vehicleExpense.updatedAt = new Date();
      await vehicleExpense.save();
    }
  } catch (error) {
    await ExpenseEntry.deleteMany({ _id: { $in: createdLedgerIds }, workspaceId });
    await VehicleExpense.deleteMany({
      _id: { $in: createdVehicleExpenses.map((entry) => entry._id) },
      workspaceId,
    });
    throw error;
  }

  res.status(201).json(createdVehicleExpenses);
});

router.post("/:workspaceId/vehicle-expenses", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { vehicleId, vehicleName, date, expenseType, amount, paymentMethodId, area, driverResponsible, odometer, description, notes } = req.body;

  if (!vehicleId || !date || !expenseType || !amount) {
    return res.status(400).json({ message: "Vehicle, date, expense type, and amount are required" });
  }

  const vehicle = await Vehicle.findOne({ _id: vehicleId, workspaceId });
  if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

  const expenseEntry = await VehicleExpense.create({
    workspaceId, vehicleId,
    vehicleName: vehicleName || vehicle.vehicleName,
    date: new Date(date),
    expenseType,
    amount: Number(amount),
    paymentMethodId: paymentMethodId || "Cash",
    area: area || "",
    driverResponsible: driverResponsible || "",
    odometer: odometer || 0,
    description: description || "",
    notes: notes || "",
    createdBy: req.user._id.toString(),
  });

  try {
    const category = ledgerCategoryForVehicleExpense(expenseType);
    const categoryId = await findCategoryIdByName(workspaceId, category);
    const ledgerEntry = await ExpenseEntry.create({
      workspaceId,
      date: new Date(date),
      categoryId,
      category,
      description: description || `${expenseType} — ${expenseEntry.vehicleName}`,
      amount: Number(amount),
      paymentMethod: paymentMethodId || "Cash",
      area: area || "",
      relatedModule: "vehicle",
      relatedId: expenseEntry._id.toString(),
      createdBy: req.user._id.toString(),
    });
    expenseEntry.expenseId = ledgerEntry._id.toString();
    expenseEntry.updatedAt = new Date();
    await expenseEntry.save();
  } catch (e) {
    console.error("Failed to post vehicle expense to ledger", e);
  }

  res.status(201).json(expenseEntry);
});

router.delete("/:workspaceId/vehicle-expenses/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const entry = await VehicleExpense.findOne({ _id: id, workspaceId });
  if (!entry) return res.status(404).json({ message: "Vehicle expense not found" });

  if (entry.expenseId) {
    await ExpenseEntry.deleteOne({ _id: entry.expenseId, workspaceId }).catch(() => null);
  }
  await entry.deleteOne();
  res.json({ message: "Vehicle expense deleted" });
});

router.get("/:workspaceId/employees", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const employees = await Employee.find({ workspaceId }).sort({ name: 1 });
  res.json(employees);
});

router.post("/:workspaceId/employees", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { name, position, dailyRate, monthlySalary, basicSalary, status, dateStarted, phone, area } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Employee name is required" });
  }

  const employee = await Employee.create({
    workspaceId, name,
    position: position || "",
    dailyRate: Number(dailyRate || 0),
    monthlySalary: Number(monthlySalary || 0),
    basicSalary: Number(basicSalary || 0),
    status: status || "Active",
    dateStarted: dateStarted || "",
    phone: phone || "",
    area: area || "",
    createdBy: req.user._id.toString(),
  });

  res.status(201).json(employee);
});

router.get("/:workspaceId/employees/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const employee = await Employee.findOne({ _id: id, workspaceId });
  if (!employee) return res.status(404).json({ message: "Employee not found" });
  res.json(employee);
});

router.put("/:workspaceId/employees/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const employee = await Employee.findOne({ _id: id, workspaceId });
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  Object.assign(employee, req.body);
  employee.updatedAt = new Date();
  await employee.save();

  res.json(employee);
});

router.delete("/:workspaceId/employees/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const employee = await Employee.findOne({ _id: id, workspaceId });
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  await employee.deleteOne();
  res.json({ message: "Employee deleted" });
});

router.get("/:workspaceId/payment-methods", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const methods = await PaymentMethod.find({ workspaceId }).sort({ name: 1 });
  res.json(methods);
});

router.post("/:workspaceId/payment-methods", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { name, accountNumber, accountHolder } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Payment method name is required" });
  }

  const method = await PaymentMethod.create({
    workspaceId, name,
    accountNumber: accountNumber || "",
    accountHolder: accountHolder || "",
    createdBy: req.user._id.toString(),
  });

  res.status(201).json(method);
});

router.put("/:workspaceId/payment-methods/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const method = await PaymentMethod.findOne({ _id: id, workspaceId });
  if (!method) return res.status(404).json({ message: "Payment method not found" });

  Object.assign(method, req.body);
  method.updatedAt = new Date();
  await method.save();

  res.json(method);
});

router.delete("/:workspaceId/payment-methods/:id", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId, id } = req.params;
  const method = await PaymentMethod.findOne({ _id: id, workspaceId });
  if (!method) return res.status(404).json({ message: "Payment method not found" });

  await method.deleteOne();
  res.json({ message: "Payment method deleted" });
});

export default router;
