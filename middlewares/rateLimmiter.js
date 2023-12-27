const rateLimit = require("express-rate-limit");
module.exports = {
  authLimmiter: rateLimit({
    windowMs: 2 * 60 * 1000,
    max: 3,
    message: "Too many requests. please try again after 2 minutes",
    standardHeaders: true,
    legacyHeaders: false,
  }),
};
