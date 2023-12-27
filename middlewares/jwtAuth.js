const jwt = require("jsonwebtoken");
const RevokedToken = require("../models/RevokedToken");

const jwtAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401);
      throw new Error("No token provided");
    }

    const token = authHeader.split(" ")[1];

    const isRevoked = await RevokedToken.findOne({ token });

    if (isRevoked) {
      res.status(403);
      throw new Error("Token revoked");
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        res.status(403);
        throw new Error("Invalid token");
      }

      req.userId = decoded.userId;
      req.email = decoded.email;
      req.role = decoded.role;
      req.username = decoded.username;

      next();
    });
  } catch (error) {
    next(error);
  }
};

module.exports = jwtAuth;
