const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
  
    });
    console.log("Connection successful");
  } catch (error) {
    console.error("Database connection error:", error);
  }
};

module.exports = connectDB;
