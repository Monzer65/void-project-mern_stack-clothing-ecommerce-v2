const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Review author is required"],
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: [true, "Reviewed product is required"],
  },
  rating: {
    type: Number,
    required: [true, "Review rating is required"],
    min: [1, "Rating must be between 1 and 5"],
    max: [5, "Rating must be between 1 and 5"],
  },
  comment: {
    type: String,
    trim: true,
    required: [true, "Review text is required"],
    minlength: [10, "Review text must be at least 10 characters"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
