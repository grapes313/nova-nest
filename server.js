const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Temporary in-memory storage (resets when server restarts)
let orders = [];

// ✅ Create new order
app.post("/api/orders", (req, res) => {
  const order = { id: Date.now(), ...req.body };
  orders.push(order);
  res.json({ success: true, order });
});

// ✅ Get all orders
app.get("/api/orders", (req, res) => {
  res.json(orders);
});

// ✅ Confirm order
app.put("/api/orders/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const order = orders.find(o => o.id === id);
  if (order) {
    order.status = "confirmed";
    res.json({ success: true, order });
  } else {
    res.status(404).json({ error: "Order not found" });
  }
});

// ✅ Delete order
app.delete("/api/orders/:id", (req, res) => {
  const id = parseInt(req.params.id);
  orders = orders.filter(o => o.id !== id);
  res.json({ success: true });
});

// ✅ Start server
app.listen(3000, () => console.log("Server running on http://localhost:3000"));
