const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Product name is required"],
    trim: true,
    maxlength: [100, "Product name cannot exceed 100 characters"],
  },
  shortDescription: {
    type: String,
    trim: true,
  },
  longDescription: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    required: [true, "Product price is required"],
    min: [0, "Product price cannot be negative"],
  },
  discount: {
    isActive: {
      type: Boolean,
      default: false,
    },
    discountPercentage: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: [true, "Product category is required"],
  },
  variations: [
    {
      color: {
        type: String,
        trim: true,
      },
      size: {
        type: String,
        trim: true,
      },
      quantity: {
        type: Number,
        default: 0,
      },
    },
  ],
  brand: {
    featured: Boolean,
    image: String,
    name: { type: String, trim: true },
  },
  images: [
    {
      type: String, // Assuming storing image URLs
      trim: true,
    },
  ],
  averageRating: {
    type: Number,
    default: 0,
  },
  reviewsCount: {
    type: Number,
    default: 0,
  },
  slug: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

productSchema.pre("save", function (next) {
  this.slug = this.name.toLowerCase().replace(/\s+/g, "-");
  next();
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
