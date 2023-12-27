// const mongoose = require("mongoose");

// const orderSchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   products: [
//     {
//       productId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Product",
//         required: true,
//       },
//       quantity: { type: Number, required: true, min: 1 },
//       price: { type: Number, required: true },
//     },
//   ],
//   totalAmount: Number,
//   shippingAddress: {
//     street: { type: String, required: true },
//     city: { type: String, required: true },
//     state: { type: String, required: true },
//     zipCode: { type: String, required: true },
//     country: { type: String, required: true },
//   },
//   paymentId: { type: String, required: true },
//   paymentMethod: {
//     type: String,
//     required: true,
//   },
//   status: {
//     type: String,
//     enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
//     default: "pending",
//   },
//   createdAt: { type: Date, default: Date.now },
//   updatedAt: { type: Date, default: Date.now },
// });

// const Order = mongoose.model("Order", orderSchema);

// module.exports = Order;
