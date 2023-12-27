const mongoose = require("mongoose");
const Review = require("../models/Review");
const data = require("./data");
require("dotenv").config();

async function seedReviews() {
  try {
    // Clear existing reviews (optional: uncomment if needed)
    await Review.deleteMany({});

    await Review.insertMany(data.reviews);

    console.log("Reviews seeded successfully!");
  } catch (error) {
    console.error("Error seeding reviews:", error);
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

seedReviews();
