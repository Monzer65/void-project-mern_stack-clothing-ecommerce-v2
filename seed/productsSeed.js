const mongoose = require("mongoose");
const Product = require("../models/Product");
const data = require("./data");
require("dotenv").config();

async function seedProducts() {
  try {
    // Clear existing products (optional: uncomment if needed)
    await Product.deleteMany({});

    await Product.insertMany(data.products);

    console.log("products seeded successfully!");
  } catch (error) {
    console.error("Error seeding products:", error);
  } finally {
    mongoose.disconnect();
  }
}

const uri = require("../config/dbUri");

mongoose
  .connect(uri)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err.message);
  });

seedProducts();
