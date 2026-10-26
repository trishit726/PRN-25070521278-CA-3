import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import api from "./routes/api.js";

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(helmet());
app.use(
  cors({
    origin: (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(","),
  }),
);
app.use(express.json());
app.use(
  "/api/v1/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
app.get("/api/v1/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      database:
        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    },
  });
});
app.use("/api/v1", api);

app.use((req, res) => {
  res
    .status(404)
    .json({
      success: false,
      error: { message: `Route not found: ${req.method} ${req.path}` },
    });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res
    .status(500)
    .json({ success: false, error: { message: "Internal server error" } });
});

async function start() {
  if (process.env.MONGO_URI && process.env.JWT_SECRET) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log("MongoDB connected");
    } catch (error) {
      console.error(`MongoDB connection failed: ${error.message}`);
      process.exitCode = 1;
      return;
    }
  } else {
    console.error("MONGO_URI and JWT_SECRET must be configured in server/.env");
    process.exitCode = 1;
    return;
  }

  app.listen(port, () => console.log(`LabOps API listening on port ${port}`));
}

start();
