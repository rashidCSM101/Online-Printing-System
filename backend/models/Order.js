import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    printType: {
      type: String,
      enum: ['black-white', 'color'],
      required: true,
    },
    paperSize: {
      type: String,
      enum: ['A4', 'A3', 'Letter'],
      default: 'A4',
    },
    copies: {
      type: Number,
      default: 1,
      min: 1,
    },
    printSides: {
      type: String,
      enum: ['single', 'double'],
      default: 'single',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'cancelled'],
      default: 'pending',
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    deliveryAddress: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', orderSchema);

export default Order;
