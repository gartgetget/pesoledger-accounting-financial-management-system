import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./db.js";
import authRoutes from "./routes/authRoutes.js";
import workspaceRoutes from "./routes/workspaceRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import jobOrderRoutes from "./routes/jobOrderRoutes.js";
import revenueRoutes from "./routes/revenueRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import payrollRoutes from "./routes/payrollRoutes.js";
import vehiclesRoutes from "./routes/vehiclesRoutes.js";

dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((_req, _res, next) => {
  connectDB()
    .then(() => next())
    .catch(next);
});

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

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  const status =
    err.name === "CastError"
      ? 400
      : err.code === 11000
        ? 409
        : err.name === "ValidationError"
          ? 400
          : err.status && err.status >= 400 && err.status < 600
            ? err.status
            : /buffering timed out|ECONNREFUSED|MONGO_URI|Invalid scheme|MongoServerError|MongoNetworkError|MongooseError|MongooseServerSelectionError|MongoServerSelectionError|Server selection timed out/i.test(
                  `${err.name || ""} ${err.message || ""}`,
                )
              ? 503
              : 500;
  const message =
    /MongooseServerSelectionError|MongoServerSelectionError|Server selection timed out|ECONNREFUSED|buffering timed out|Invalid scheme/i.test(
      `${err.name || ""} ${err.message || ""}`,
    )
      ? `Database unavailable — check MONGO_URI and Atlas IP allowlist (${err.message || err.name})`
      : err.message || "Internal server error";
  if (res.headersSent || res.writableEnded) return;
  res.status(status).json({
    message,
    ...(err.mongoUriPreview ? { mongoUriPreview: err.mongoUriPreview } : {}),
  });
});

export default app;
export { app };
