const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const data = require("./data");
require("dotenv").config();

async function seedUsers() {
  try {
    // Clear existing users (optional: uncomment if needed)
    await User.deleteMany({});

    // Hash passwords before inserting users
    const usersWithHashedPasswords = await Promise.all(
      data.users.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        return {
          ...user,
          password: hashedPassword,
        };
      })
    );

    await User.insertMany(usersWithHashedPasswords);

    console.log("Users seeded successfully!");
  } catch (error) {
    console.error("Error seeding users:", error);
  } finally {
    mongoose.disconnect();
  }
}

const uri = require("../config/dbUri");

mongoose
  .connect(uri)
  .then(() => {
    console.log("Connected to MongoDB");
    seedUsers(); // Start seeding after successful connection
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err.message);
  });
