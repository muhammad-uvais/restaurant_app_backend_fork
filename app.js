const express = require("express");
const app = express();
// const cors = require("cors");

// Middleware
app.use(express.json());
// app.use(cors());       

// Route imports
const menuRoutes = require("./routes/menuRoutes");
const orderRoutes = require("./routes/orderRoutes");
const authRoutes = require("./routes/authRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes")
const analyticsRoutes = require("./routes/analyticsRoutes")
const notificationRoute = require("./routes/notificationRoute")
const accessRoutes = require("./routes/accessRoutes")
const superadminRoutes = require("./routes/superadminRoutes")
const roleRoutes = require("./routes/roleRoutes")

// Mount routes
app.use("/api/menu", menuRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/restaurant", restaurantRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api", notificationRoute);
app.use("/api/access", accessRoutes)
app.use("/api/superadmin", superadminRoutes)
app.use("/api/roles", roleRoutes)

module.exports = app;