const express = require("express");
const router = express.Router();
const User = require("../models/User");
const RevokedToken = require("../models/RevokedToken");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { authLimmiter } = require("../middlewares/rateLimmiter");

async function sendCodeToEmail(user, contact) {
  const verificationCode = Math.floor(
    100000 + Math.random() * 900000
  ).toString();
  const verificationCodeExpiration = Date.now() + 3 * 60 * 1000;

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to: contact,
      subject: "Verification code",
      text: `Your verification code is: ${verificationCode}`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent");

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          verificationCode: verificationCode,
          verificationCodeExpiration: verificationCodeExpiration,
        },
      }
    );
  } catch (error) {
    console.error(error);
    throw new Error("Failed to send email");
  }
}

router.post("/register", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser && existingUser.isVerified) {
      res.status(409);
      throw new Error("the user is already registered");
    }

    if (
      existingUser &&
      !existingUser.isVerified &&
      existingUser.verificationCodeExpiration > Date.now()
    ) {
      res.status(409);
      throw new Error("the user is already registered");
    }

    if (
      existingUser &&
      !existingUser.isVerified &&
      existingUser.verificationCodeExpiration < Date.now()
    ) {
      try {
        await User.deleteOne({ _id: existingUser._id });
      } catch (error) {
        console.error("Error during deleting user", error);
      }
    }

    const newUser = new User({
      username,
      email,
      password,
    });

    await newUser.save();

    await sendCodeToEmail(newUser, email);

    res.status(201).json({
      success: true,
      _id: newUser._id,
      name: newUser.username,
      email: newUser.email,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/verify", async (req, res, next) => {
  try {
    const { email, verificationCode } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404);
      throw new Error("user not found");
    }

    if (user.isVerified) {
      res.status(409);
      throw new Error("the user is already verified");
    }

    if (
      user.verificationCode !== verificationCode ||
      user.verificationCodeExpiration < Date.now()
    ) {
      res.status(401);
      throw new Error("invalid verification code");
    }

    await User.updateOne(user, {
      $set: {
        isVerified: true,
        verificationCode: null,
        verificationCodeExpiration: null,
      },
    });

    const accessToken = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        email: user.email,
        username: user.username,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "10m" }
    );

    const refreshToken = jwt.sign(
      { email: user.email },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "30d" }
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development" ? true : false,
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      accessToken,
      username: user.username,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", authLimmiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404);
      throw new Error("user not found");
    }

    if (!user.isVerified) {
      res.status(401);
      throw new Error("the user is not verified");
    }

    const isPasswordValid = await user.comparePassword(password);

    if (user && !isPasswordValid) {
      res.status(401);
      throw new Error("invalid password");
    }

    const accessToken = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        email: user.email,
        username: user.username,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "10m",
      }
    );

    const refreshToken = jwt.sign(
      { email: user.email },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "30d" }
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development" ? true : false,
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      accessToken,
      username: user.username,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", authLimmiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404);
      throw new Error("user not found");
    }

    if (!user.isVerified) {
      res.status(401);
      throw new Error("the user is not verified");
    }

    await sendCodeToEmail(user, email);

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { email, verificationCode, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404);
      throw new Error("user not found");
    }

    if (
      user.verificationCode !== verificationCode ||
      user.verificationCodeExpiration < Date.now()
    ) {
      res.status(401);
      throw new Error("invalid verification code");
    }

    user.password = password;
    user.verificationCode = null;
    user.verificationCodeExpiration = null;

    await user.save();

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) {
      res.status(401);
      throw new Error("Authorization header missing");
    }

    const accessToken = authorizationHeader.split(" ")[1];

    const existingrevokedToken = await RevokedToken.findOne({
      token: accessToken,
    });

    if (existingrevokedToken) {
      res.status(401);
      throw new Error("already logged out");
    }

    const revokedToken = await RevokedToken.create({ token: accessToken });

    if (!revokedToken) {
      res.status(500);
      throw new Error("failed to revoke token");
    }

    const cookies = req.cookies;

    if (!cookies?.refreshToken) {
      return res.sendStatus(204);
    }

    const refreshToken = cookies.refreshToken;

    res.clearCookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development" ? true : false,
      sameSite: "strict",
    });

    res
      .status(200)
      .json({ message: "cookie cleared. logged out successfully" });
  } catch (error) {
    next(error);
  }
});

router.get("/refresh-token", async (req, res, next) => {
  try {
    const cookies = req.cookies;

    if (!cookies?.refreshToken) {
      res.status(401);
      throw new Error("no refresh token found");
    }

    const refreshToken = cookies.refreshToken;

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (err, decoded) => {
        if (err) {
          res.status(403);
          throw new Error("forbidden");
        }

        const user = await User.findOne({ email: decoded.email });

        if (!user) {
          res.status(401);
          throw new Error("unauthorized");
        }

        const accessToken = jwt.sign(
          {
            userId: user._id,
            role: user.role,
            email: user.email,
            username: user.username,
          },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "10m" }
        );

        res.status(200).json({ accessToken, username: user.username });
      }
    );
  } catch (error) {
    next(error);
  }
});

module.exports = router;
