const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Category = require("../models/Category");
const mongoose = require("mongoose");
const { ObjectId } = require("mongoose").Types;
// const jwtAuth = require("../middlewares/jwtAuth");

router.get("/", async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy,
      sortOrder,
      search,
      minPrice,
      maxPrice,
      brand,
      discount,
      newArrival,
      category,
      ratings,
    } = req.query;

    const numericLimit = parseInt(limit, 10);
    if (isNaN(numericLimit)) {
      return res.status(400).send("Limit must be a number");
    }

    const startIndex = (page - 1) * numericLimit;
    const endIndex = page * numericLimit;
    let pipeline = [];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { longDescription: { $regex: search, $options: "i" } },
            { shortDescription: { $regex: search, $options: "i" } },
            { category: { $regex: search, $options: "i" } },
            { brand: { $regex: search, $options: "i" } },
          ],
        },
      });
    } else {
      pipeline.push({
        $match: {},
      });
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceMatch = {};

      if (minPrice !== undefined) {
        priceMatch.$gte = parseInt(minPrice);
      }
      if (maxPrice !== undefined) {
        priceMatch.$lte = parseInt(maxPrice);
      }

      pipeline.push({
        $match: { price: priceMatch },
      });
    }

    if (brand) {
      const brandRegex = new RegExp(brand, "i"); // 'i' flag for case insensitivity
      pipeline.push({ $match: { "brand.name": { $regex: brandRegex } } });
    }

    if (newArrival) {
      pipeline.push({
        $match: {
          $expr: {
            $and: [
              {
                $gte: [
                  "$createdAt",
                  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                ],
              }, // Check for newArrival
            ],
          },
        },
      });
    }

    if (discount) {
      pipeline.push({
        $match: {
          "discount.isActive": true,
          $and: [
            { "discount.discountPercentage": { $lte: Number(discount) } },
            { "discount.discountPercentage": { $gte: Number(discount) - 10 } },
          ],
        },
      });
    }

    if (ratings) {
      pipeline.push({
        $match: { "reviews.rating": { $gte: parseInt(ratings) } },
      });
    }

    if (category) {
      let categoryPipeline = [];

      categoryPipeline.push(
        {
          $match: { slug: category },
        },
        {
          $graphLookup: {
            from: "categories",
            startWith: "$_id",
            connectFromField: "_id", // The field to connect from (current document)
            connectToField: "parentCategory", // The field to connect to (target document)
            as: "allCategories",
          },
        }
      );

      const foundCategories = await Category.aggregate(categoryPipeline);

      const firstCategory = foundCategories[0];

      const categoryIds =
        firstCategory && firstCategory.allCategories
          ? firstCategory.allCategories.map((category) => category._id)
          : [];

      categoryIds.push(firstCategory._id);

      pipeline.push({
        $match: { category: { $in: categoryIds } },
      });
    }

    const sortOptions = {};

    if (sortBy && sortOrder) {
      if (sortBy === "discount") {
        pipeline.push({
          $match: {
            "discount.isActive": true,
          },
        });
        sortOptions["discount.discountPercentage"] =
          sortOrder === "desc" ? -1 : 1;
      } else {
        sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
      }
    } else {
      sortOptions.createdAt = -1;
    }

    pipeline.push(
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "product",
          as: "reviews",
        },
      },
      {
        $addFields: {
          ratings: "$reviews.rating",
          reviewsCount: { $size: "$reviews" },
        },
      },
      {
        $unset: "reviews",
      },
      {
        $addFields: {
          averageRating: { $avg: "$ratings" },
          reviewsCount: { $sum: "$reviewsCount" },
        },
      }
    );

    const countPipeline = [...pipeline, { $count: "total_count" }];

    pipeline.push(
      { $sort: sortOptions },
      { $skip: startIndex },
      { $limit: numericLimit }
    );

    const minMaxPipeline = [
      {
        $group: {
          _id: null,
          setMinPrice: { $min: "$price" },
          setMaxPrice: { $max: "$price" },
        },
      },
    ];

    const minMaxResult = await Product.aggregate(minMaxPipeline);

    // Extract minPrice and maxPrice from the aggregation result
    const { setMinPrice, setMaxPrice } = minMaxResult[0] || {
      setMinPrice: 0,
      setMaxPrice: 0,
    };

    const products = await Product.aggregate(pipeline);
    const countResult = await Product.aggregate(countPipeline);

    let total;
    if (!countResult[0]) {
      total = 0;
    } else {
      total = countResult[0].total_count;
    }

    res.status(200).json({
      totalProducts: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      resultsInThePage: products.length,
      hasnextPage: endIndex < total,
      nextPage: endIndex < total ? page + 1 : null,
      hasPreviousPage: startIndex > 0,
      previousPage: startIndex > 0 ? page - 1 : null,
      setMinPrice,
      setMaxPrice,
      products,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/brands", async (req, res, next) => {
  try {
    const brands = await Product.aggregate([
      {
        $group: {
          _id: "$brand.name",
          featured: { $first: "$brand.featured" },
          image: { $first: "$brand.image" },
        },
      },
      {
        $project: {
          _id: 0, // Exclude the _id field
          name: "$_id",
          featured: 1,
          image: 1, // Include the 'image' field
        },
      },
    ]);
    res.status(200).json(brands);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send("Invalid ID format");
    }

    const product = await Product.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "product",
          as: "reviews",
        },
      },
      {
        $addFields: {
          reviewRatings: "$reviews.rating",
          reviewsCount: { $size: "$reviews" },
        },
      },
      {
        $addFields: {
          averageRating: {
            $cond: {
              if: { $eq: [{ $size: "$reviewRatings" }, 0] },
              then: 0, // Set a default value when there are no reviews
              else: { $avg: "$reviewRatings" },
            },
          },
          // Unset the unnecessary reviewRatings field after calculating averageRating
          reviewRatings: { $ifNull: ["$reviewRatings", "$$REMOVE"] },
        },
      },
      {
        $lookup: {
          from: "categories",
          let: { category: "$category" }, // Define a variable for the category field
          pipeline: [
            {
              $match: {
                $expr: {
                  // Use the $toObjectId operator to convert the _id field to an ObjectId
                  $eq: [{ $toObjectId: "$_id" }, "$$category"],
                },
              },
            },
          ],
          as: "populatedCategory",
        },
      },
    ]);

    if (product.length === 0) {
      const error = new Error("Product not found");
      error.status = 404;
      throw error;
    }

    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
});

// router.post("/", jwtAuth, async (req, res, next) => {
//   if (req.role[0] !== "admin") {
//     return res
//       .status(403)
//       .json({ message: "Forbidden. Admin access required." });
//   }
//   try {
//     const newProduct = await Product.create(req.body);
//     res.status(201).json(newProduct);
//   } catch (error) {
//     next(error);
//   }
// });

// router.put("/:id", jwtAuth, async (req, res, next) => {
//   if (req.role[0] !== "admin") {
//     return res
//       .status(403)
//       .json({ message: "Forbidden. Admin access required." });
//   }
//   try {
//     const updatedProduct = await Product.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true }
//     );
//     if (!updatedProduct) {
//       const error = new Error("Product not found");
//       error.status = 404;
//       throw error;
//     }
//     res.status(200).json(updatedProduct);
//   } catch (error) {
//     if (error.kind === "ObjectId") {
//       res.status(400).json({ message: "Invalid product ID" });
//     } else {
//       next(error);
//     }
//   }
// });

// router.delete("/:id", jwtAuth, async (req, res, next) => {
//   if (req.role[0] !== "admin") {
//     return res
//       .status(403)
//       .json({ message: "Forbidden. Admin access required." });
//   }
//   try {
//     const deletedProduct = await Product.findByIdAndDelete(req.params.id);
//     if (!deletedProduct) {
//       const error = new Error("Product not found");
//       error.status = 404;
//       throw error;
//     }
//     res.status(200).json(deletedProduct);
//   } catch (error) {
//     if (error.kind === "ObjectId") {
//       res.status(400).json({ message: "Invalid product ID" });
//     } else {
//       next(error);
//     }
//   }
// });

module.exports = router;
