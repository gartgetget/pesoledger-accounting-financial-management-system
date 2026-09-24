import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import "./db";
import authRoutes from "./routes/authRoutes";
import workspaceRoutes from "./routes/workspaceRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import customerRoutes from "./routes/customerRoutes";
import inventoryRoutes from "./routes/inventoryRoutes";
import jobOrderRoutes from "./routes/jobOrderRoutes";
import revenueRoutes from "./routes/revenueRoutes";
import expenseRoutes from "./routes/expenseRoutes";
import reportRoutes from "./routes/reportRoutes";
import payrollRoutes from "./routes/payrollRoutes";
import vehiclesRoutes from "./routes/vehiclesRoutes";

dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({ message: "ChaChing API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api", categoryRoutes);
app.use("/api", customerRoutes);
app.use("/api", inventoryRoutes);
app.use("/api", jobOrderRoutes);
app.use("/api", revenueRoutes);
app.use("/api", expenseRoutes);
app.use("/api", reportRoutes);
app.use("/api", payrollRoutes);
app.use("/api", vehiclesRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

export default app;
export { app };
