const mongoose = require("mongoose");

const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      validate: {
        validator: (email) => {
          const regex = new RegExp(
            /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
          );
          return regex.test(email);
        },
        message: "Invalid email format",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    verificationCode: { type: String },
    verificationCodeExpiration: Date,
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: [String],
      enum: ["admin", "user"],
      default: ["user"],
    },
    address: {
      type: String,
      default: "",
    },
    refreshToken: {
      type: String,
      default: "",
    },
    refreshTokenVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const saltRounds = 10;

// Function to set the password hash before saving the user
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    try {
      this.password = await bcrypt.hash(this.password, saltRounds);
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// Function to compare the password with the stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    throw err;
  }
};

const User = mongoose.model("User", userSchema);

module.exports = User;
