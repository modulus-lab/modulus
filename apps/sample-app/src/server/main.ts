import express from "express";
import apiRouter from "./api.js";

const app = express();

app.use(express.json());

// API routes
app.use("/api", apiRouter);

// Health check
app.get("/health", (_, res) => {
  res.json({ status: "OK", uptime: process.uptime() });
});

export default app;
