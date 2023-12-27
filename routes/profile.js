const express = require("express");
const router = express.Router();
const jwtAuth = require("../middlewares/jwtAuth");
const User = require("../models/User");
const RevokedToken = require("../models/RevokedToken");

router.get("/", jwtAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
      .select("_id username email address")
      .lean();

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});

router.put("/", jwtAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    user.address = req.body.address || user.address;
    user.username = req.body.username || user.username;
    // the email update disabled for now
    // user.email = req.body.email || user.email;
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.status(200).json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      address: updatedUser.address,
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/", jwtAuth, async (req, res, next) => {
  try {
    const tobeDeletedUser = await User.findByIdAndDelete(req.userId);

    if (!tobeDeletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const oldAccessToken = req.headers.authorization.split(" ")[1];

    const revokedToken = await RevokedToken.create({ token: oldAccessToken });

    if (!revokedToken) {
      return res.status(500).json({ message: "Failed to revoke token" });
    }
    const cookies = req.cookies;
    if (!cookies?.refreshToken) {
      return res.sendStatus(204);
    }
    const refreshToken = cookies.refreshToken;
    res.clearCookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "strict",
    });

    res.status(200).json({
      message: `User: ${tobeDeletedUser.username} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
});

// router.get("/:id", jwtAuth, async (req, res, next) => {
//   try {
//     console.log(req.userId, req.email, req.role, req.username);
//     const user = await User.findById(req.params.id)
//       .select("_id username email address")
//       .lean();

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     if (user.email !== req.email && req.role[0] !== "admin") {
//       return res.status(403).json({ message: "Forbidden" });
//     }

//     res.status(200).json("user");
//   } catch (error) {
//     next(error);
//   }
// });

// router.put("/:id", jwtAuth, async (req, res, next) => {
//   try {
//     const user = await User.findById(req.params.id);

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     if (user.email !== req.email && req.role[0] !== "admin") {
//       return res.status(403).json({ message: "Forbidden" });
//     }

//     // Input validation
//     const { username, email, address, oldPassword, newPassword } = req.body;
//     if (!username && !email && !address && !newPassword) {
//       return res.status(400).send("No fields to update");
//     }

//     // Update user fields
//     if (username) {
//       user.username = username;
//     }
//     if (email) {
//       user.email = email;
//     }
//     if (address) {
//       user.address = address;
//     }
//     if (newPassword) {
//       const isOldPasswordValid = await user.comparePassword(oldPassword);
//       if (!isOldPasswordValid) {
//         return res.status(401).send("Invalid old password");
//       }
//       user.password = newPassword;
//     }

//     const updatedUser = await user.save();

//     const sanitizedUser = {
//       _id: updatedUser._id,
//       username: updatedUser.username,
//       email: updatedUser.email,
//       address: updatedUser.address,
//     };

//     return res.status(200).json(sanitizedUser);
//   } catch (error) {
//     if (error.kind === "ObjectId") {
//       return res.status(400).json({ message: "Invalid user ID" });
//     } else {
//       console.error(error);
//       next(error);
//     }
//   }
// });

// router.delete("/:id", jwtAuth, async (req, res, next) => {
//   try {
//     const deletedUser = await User.findByIdAndDelete(req.params.id);

//     if (!deletedUser) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     if (deletedUser.email !== req.email || req.role[0] !== "admin") {
//       return res.status(403).json({ message: "Forbidden" });
//     }
//     //clear refresh token and revoke access token (log out the user)
//     const oldAccessToken = req.headers.authorization.split(" ")[1];

//     const revokedToken = await RevokedToken.create({ token: oldAccessToken });

//     if (!revokedToken) {
//       return res.status(500).json({ message: "Failed to revoke token" });
//     }

//     const cookies = req.cookies;

//     if (!cookies?.refreshToken) {
//       return res.sendStatus(204);
//     }

//     const refreshToken = cookies.refreshToken;

//     res.clearCookie("refreshToken", refreshToken, {
//       httpOnly: true,
//       secure: false,
//       sameSite: "none",
//     });

//     res
//       .status(200)
//       .json({ message: `User: ${deletedUser.username} deleted successfully` });
//   } catch (error) {
//     next(error);
//   }
// });

module.exports = router;
