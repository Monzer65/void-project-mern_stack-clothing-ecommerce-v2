const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const User = require("../models/User");
const mongoose = require("mongoose");
const jwtAuth = require("../middlewares/jwtAuth");

router.get("/:id", async (req, res, next) => {
  try {
    const reviews = await Review.find({ product: req.params.id }).populate(
      "author product"
    );

    if (!reviews) {
      res.status(404);
      throw new Error("Reviews not found");
    }

    res.status(200).json(reviews);
  } catch (error) {
    next(error);
  }
});

router.post("/:id", jwtAuth, async (req, res, next) => {
  try {
    const product = req.params.id;
    const author = req.userId;
    const { rating, comment } = req.body;

    if (!author) {
      res.status(404);
      throw new Error("Author not found");
    }

    if (!product) {
      res.status(404);
      throw new Error("Product not found");
    }

    if (!rating || !comment) {
      res.status(400);
      throw new Error("Rating and comment are required");
    }

    const existingReview = await Review.findOne({
      product,
      author,
    });

    if (existingReview) {
      res.status(400);
      throw new Error("You already have a review for this product");
    }

    const review = new Review({
      author,
      product,
      comment,
      rating: Number(rating),
    });

    const result = await review.save();

    res
      .status(201)
      .json({ message: "Review created successfully", review: result });
  } catch (error) {
    next(error);
  }
});

router.put("/:id", jwtAuth, async (req, res, next) => {
  try {
    const author = req.userId;
    let id = req.params.id;
    const { rating, comment } = req.body;

    console.log("review id", id);
    console.log("rating", rating);
    console.log("comment", comment);

    if (!id) {
      re.status(400);
      throw new Error("Review id is required");
    }

    if (!rating || !comment) {
      res.status(400);
      throw new Error("Rating and comment are required");
    }

    const review = await Review.findByIdAndUpdate({
      _id: id,
    });

    if (!review) {
      re.status(400);
      throw new Error("Review not found");
    }

    if (review.author.toString() !== author) {
      res.status(400);
      throw new Error("you do not have permission");
    }

    review.comment = comment || review.comment;
    review.rating = rating || review.rating;

    const result = await review.save();

    res
      .status(200)
      .json({ message: "Review updated successfully", review: result });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", jwtAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    const { userId } = req;

    console.log(id);
    console.log(userId);

    const deletedReview = await Review.findById(id);

    if (!deletedReview) {
      res.status(404);
      throw new Error("Review not found");
    }

    if (deletedReview.author._id.toString() !== userId) {
      console.log(
        "deletedReview.author._id:",
        deletedReview.author._id.toString()
      );
      res.status(403);
      throw new Error("No permission");
    }

    await deletedReview.deleteOne({ id });

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
