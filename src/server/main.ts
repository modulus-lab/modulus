import express from "express";
import ViteExpress from "vite-express";
import cors from "cors";
import apiRouter from "./api.js";
import { loadMockRouters } from "./mockLoader.js";
import { configureStorage, createInMemoryStorage } from "./storage.js";
import { globalErrorHandler } from "./errorHandler.js";

const storage = createInMemoryStorage();
configureStorage(storage);
storage.createCollection('responses');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_, res) => {
  res.json({ status: 'OK', uptime: process.uptime() });
});

app.use('/api', apiRouter);
app.use('/api/mocks', await loadMockRouters());

app.use(globalErrorHandler);

ViteExpress.listen(app, 4000, () =>
  console.log("Server is listening on port 4000..."),
);
