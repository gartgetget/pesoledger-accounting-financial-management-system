const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const customerRoutes = require("./routes/customerRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const jobOrderRoutes = require("./routes/jobOrderRoutes");
const revenueRoutes = require("./routes/revenueRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const reportRoutes = require("./routes/reportRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
const vehiclesRoutes = require("./routes/vehiclesRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true
  })
);
app.use(express.json());

app.get("/", (req, res) => {
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

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
