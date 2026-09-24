import { createRouter } from "../middleware/createRouter.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import auth from "../middleware/auth.js";

const router = createRouter();

const normalizeExpiresIn = (): string | number => {
  const raw = (process.env.JWT_EXPIRES_IN || "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw);
    if (Number.isFinite(seconds) && seconds > 0) return seconds;
  }
  if (/^\d+(\.\d+)?(ms|s|m|h|d|w|y)$/i.test(raw)) return raw.toLowerCase();
  return "7d";
};

const signToken = (userId: any) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw Object.assign(new Error("JWT_SECRET is not configured"), {
      status: 500,
      expose: true,
    });
  }
  return jwt.sign({ id: userId }, secret, {
    expiresIn: normalizeExpiresIn(),
  } as any);
};

router.post("/register", async (req, res) => {
  const fullName = String(req.body.fullName || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const workspaceName = String(req.body.workspaceName || "").trim();

  if (!fullName || !email || !password || !workspaceName) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    fullName,
    email,
    passwordHash,
    role: "admin",
  });

  try {
    const workspace = await Workspace.create({
      name: workspaceName,
      ownerId: user._id.toString(),
      settings: {
        currency: "PHP",
        businessName: workspaceName,
      },
    });

    user.workspaces = [workspace._id.toString()];
    await user.save();

    const token = signToken(user._id);

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      workspace,
    });
  } catch (err) {
    await User.deleteOne({ _id: user._id }).catch(() => {});
    throw err;
  }
});

router.post("/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    console.warn(`[auth] login failed: no user for email=${email}`);
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    console.warn(`[auth] login failed: bad password for email=${email}`);
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = signToken(user._id);

  const workspace = user.workspaces?.[0]
    ? await Workspace.findById(user.workspaces[0])
    : null;

  res.json({
    token,
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
    workspace,
  });
});

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-passwordHash");
  res.json(user);
});

export default router;
