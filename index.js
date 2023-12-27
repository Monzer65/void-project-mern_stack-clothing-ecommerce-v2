const express = require("express");
const { errorHandler, notFound } = require("./middlewares/errorHandler");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const mongoose = require("mongoose");
const uri = require("./config/dbUri");
// const cors = require("cors");
// const corsOptions = require("./config/corsOptions");

const app = express();

mongoose
  .connect(uri)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("Error connecting to MongoDB:", err);
  });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// app.use(cors(corsOptions));

app.use(express.static("dist"));

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use("/api/categories", require("./routes/categories"));
app.use("/api/products", require("./routes/products"));
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/profile", require("./routes/profile"));

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// echo "# mern-same-server" >> README.md
// git init
// git add README.md
// git commit -m "first commit"
// git branch -M main
// git remote add origin https://github.com/Monzer65/mern-same-server.git
// git push -u origin main
