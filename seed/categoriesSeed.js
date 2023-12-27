const mongoose = require("mongoose");
const Category = require("../models/Category");
const data = require("./data");
require("dotenv").config();

async function seedCategories() {
  try {
    // Clear existing categories (optional: uncomment if needed)
    await Category.deleteMany({});

    await Category.insertMany(data.categories);

    console.log("Categories seeded successfully!");
  } catch (error) {
    console.error("Error seeding categories:", error);
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

seedCategories();
