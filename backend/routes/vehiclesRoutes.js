const express = require("express");
const Vehicle = require("../models/Vehicle");
const Employee = require("../models/Employee");
const PaymentMethod = require("../models/PaymentMethod");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

const ensureWorkspaceAccess = (req, res, next) => {
  const { workspaceId } = req.params;
  if (!req.user.workspaces.includes(workspaceId)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

// Vehicles
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
    workspaceId,
    vehicleName,
    plateNumber,
    model: model || "",
    assignedDriver: assignedDriver || "",
    createdBy: req.user._id.toString()
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

// Vehicle Expenses
router.get("/:workspaceId/vehicle-expenses", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const expenses = await Vehicle.find({ workspaceId }).populate("vehicleId");
  res.json(expenses);
});

router.post("/:workspaceId/vehicle-expenses", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { vehicleId, vehicleName, date, expenseType, amount, paymentMethodId, driverResponsible, odometer, description, notes } = req.body;

  if (!vehicleId || !date || !expenseType || !amount) {
    return res.status(400).json({ message: "Vehicle, date, expense type, and amount are required" });
  }

  const vehicle = await Vehicle.findOne({ _id: vehicleId, workspaceId });
  if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

  const expenseEntry = {
    workspaceId,
    vehicleId,
    vehicleName: vehicleName || vehicle.vehicleName,
    date: new Date(date),
    expenseType,
    amount: Number(amount),
    paymentMethodId: paymentMethodId || "Cash",
    driverResponsible: driverResponsible || "",
    odometer: odometer || 0,
    description: description || "",
    notes: notes || "",
    createdBy: req.user._id.toString()
  };

  res.status(201).json(expenseEntry);
});

// Employees
router.get("/:workspaceId/employees", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const employees = await Employee.find({ workspaceId }).sort({ name: 1 });
  res.json(employees);
});

router.post("/:workspaceId/employees", ensureWorkspaceAccess, async (req, res) => {
  const { workspaceId } = req.params;
  const { name, position, dailyRate, monthlySalary, basicSalary, status, dateStarted, phone } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Employee name is required" });
  }

  const employee = await Employee.create({
    workspaceId,
    name,
    position: position || "",
    dailyRate: Number(dailyRate || 0),
    monthlySalary: Number(monthlySalary || 0),
    basicSalary: Number(basicSalary || 0),
    status: status || "Active",
    dateStarted: dateStarted || "",
    phone: phone || "",
    createdBy: req.user._id.toString()
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

// Payment Methods
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
    workspaceId,
    name,
    accountNumber: accountNumber || "",
    accountHolder: accountHolder || "",
    createdBy: req.user._id.toString()
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

module.exports = router;
