require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

(async () => {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("database:", mongoose.connection.name);
  console.log("users total:", await User.countDocuments());
  console.log("admins:", await User.countDocuments({ role: "admin" }));
  console.log("admins with isDeleted false:", await User.countDocuments({ role: "admin", isDeleted: false }));
  console.log("admins missing isDeleted:", await User.countDocuments({ role: "admin", isDeleted: { $exists: false } }));
  console.log("staff:", await User.countDocuments({ role: "staff" }));
  await mongoose.disconnect();
})();