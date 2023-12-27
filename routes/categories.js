const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
// const jwtAuth = require("../middlewares/jwtAuth");

router.get("/", async (req, res, next) => {
  try {
    const categoriesWithHierarchy = await Category.aggregate([
      {
        $graphLookup: {
          from: "categories",
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "parentCategory",
          as: "hierarchy",
          maxDepth: 10,
        },
      },
      {
        $addFields: {
          hierarchy: {
            $reverseArray: "$hierarchy", // Reverse the hierarchy to get from parent to child
          },
        },
      },
    ]).exec();

    res.json(categoriesWithHierarchy);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      const error = new Error("Category not found");
      error.status = 404;
      throw error;
    }
    res.status(200).json(category);
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

//   const category = new Category(req.body);
//   try {
//     const newCategory = await category.save();
//     res.status(201).json(newCategory);
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
//     const updatedCategory = await Category.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true }
//     );
//     if (!updatedCategory) {
//       const error = new Error("Category not found");
//       error.status = 404;
//       throw error;
//     }
//     res.status(200).json(updatedCategory);
//   } catch (error) {
//     if (error.kind === "ObjectId") {
//       res.status(400).json({ message: "Invalid category ID" });
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
//     const deletedCategory = await Category.findByIdAndDelete(req.params.id);
//     if (!deletedCategory) {
//       const error = new Error("Category not found");
//       error.status = 404;
//       throw error;
//     }
//     res.status(200).json({ message: "Category deleted successfully" });
//   } catch (error) {
//     if (error.kind === "ObjectId") {
//       res.status(400).json({ message: "Invalid category ID" });
//     } else {
//       next(error);
//     }
//   }
// });

module.exports = router;
