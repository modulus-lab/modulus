import { Router } from "express";

const router = Router();

router.get("/hello", (_req, res) => {
  res.json({ message: "Hello from Express API!" });
});

router.get("/users", (_req, res) => {
  res.json({
    users: [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ],
  });
});

router.post("/echo", (req, res) => {
  res.json({ received: req.body });
});

export default router;
