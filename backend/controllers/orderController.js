import path from 'path';
import fs from 'fs';
import Order from '../models/Order.js';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';
import {
  orderConfirmationEmail,
  orderStatusEmail,
  deliveryStatusEmail,
} from '../utils/emailTemplates.js';
import { convertToPdf } from '../utils/fileConverter.js';

// @desc    Create new order with real file upload
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file to print.' });
    }

    const { printType, paperSize, copies, printSides, orientation, paperType, binding, totalPrice, deliveryAddress } = req.body;

    if (!deliveryAddress) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Delivery address is required.' });
    }

    // Attempt DOCX → PDF conversion (graceful: keeps original if browser not found)
    const { filename, originalname, converted } = await convertToPdf(req.file);

    const order = await Order.create({
      user: req.user._id,
      fileName: originalname,
      fileUrl: `/uploads/${filename}`,
      printType,
      paperSize: paperSize || 'A4',
      copies: parseInt(copies) || 1,
      printSides: printSides || 'single',
      orientation: orientation || 'portrait',
      paperType: paperType || 'normal',
      binding: binding || 'none',
      totalPrice: parseFloat(totalPrice),
      deliveryAddress,
      converted,
    });

    // Send order confirmation email (non-blocking)
    const { subject, html } = orderConfirmationEmail({ name: req.user.name, order });
    sendEmail({ to: req.user.email, subject, html }).catch(() => {});

    res.status(201).json(order);
  } catch (error) {
    // If DB save fails, remove the uploaded file
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/my-orders
// @access  Private
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get order by ID
// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Allow owner, admin, or shop_owner
    const isOwner = order.user._id.toString() === req.user._id.toString();
    const isPrivileged = ['admin', 'shop_owner'].includes(req.user.role);
    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders (admin/shop_owner)
// @route   GET /api/orders/all
// @access  Admin, Shop Owner
export const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter),
    ]);

    res.json({ orders, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status (admin/shop_owner)
// @route   PUT /api/orders/:id/status
// @access  Admin, Shop Owner
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'processing', 'completed', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value.' });
    }

    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    await order.save();

    // Notify customer (non-blocking)
    if (order.user?.email) {
      const { subject, html } = orderStatusEmail({ name: order.user.name, order, newStatus: status });
      sendEmail({ to: order.user.email, subject, html }).catch(() => {});
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get admin stats
// @route   GET /api/orders/admin/stats
// @access  Admin
export const getAdminStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrders, totalUsers, revenueResult, todayOrders] = await Promise.all([
      Order.countDocuments(),
      User.countDocuments(),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      Order.countDocuments({ createdAt: { $gte: today } }),
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;
    const shopOwners = await User.countDocuments({ role: 'shop_owner' });

    res.json({ totalOrders, totalUsers, totalRevenue, todayOrders, shopOwners });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get shop stats
// @route   GET /api/orders/shop/stats
// @access  Shop Owner
export const getShopStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, processing, completedToday, revenueResult] = await Promise.all([
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'processing' }),
      Order.countDocuments({ status: 'completed', updatedAt: { $gte: today } }),
      Order.aggregate([
        { $match: { status: 'completed', updatedAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
    ]);

    res.json({
      pending,
      processing,
      completedToday,
      todayRevenue: revenueResult[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Assign a rider to a completed order (admin/shop_owner)
// @route   PUT /api/orders/:id/assign-rider
// @access  Admin, Shop Owner
export const assignRider = async (req, res) => {
  try {
    const { riderId } = req.body;
    if (!riderId) return res.status(400).json({ message: 'riderId is required.' });

    const rider = await User.findById(riderId);
    if (!rider || rider.role !== 'rider') {
      return res.status(400).json({ message: 'Invalid rider.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'completed') {
      return res.status(400).json({ message: 'Only completed orders can be assigned for delivery.' });
    }

    order.rider = riderId;
    order.deliveryStatus = 'assigned';
    await order.save();

    const populated = await order.populate([
      { path: 'user', select: 'name email' },
      { path: 'rider', select: 'name email phone' },
    ]);

    // Notify customer that a rider has been assigned (non-blocking)
    if (populated.user?.email) {
      const { subject, html } = deliveryStatusEmail({
        name: populated.user.name,
        order: populated,
        newStatus: 'assigned',
      });
      sendEmail({ to: populated.user.email, subject, html }).catch(() => {});
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get orders assigned to the logged-in rider
// @route   GET /api/orders/rider/my-deliveries
// @access  Rider
export const getRiderDeliveries = async (req, res) => {
  try {
    const { deliveryStatus } = req.query;
    const filter = { rider: req.user._id };
    if (deliveryStatus) filter.deliveryStatus = deliveryStatus;

    const orders = await Order.find(filter)
      .populate('user', 'name email phone')
      .sort({ updatedAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update delivery status by rider
// @route   PUT /api/orders/:id/delivery-status
// @access  Rider
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { deliveryStatus, deliveryNotes } = req.body;
    const allowed = ['picked_up', 'in_transit', 'delivered'];
    if (!allowed.includes(deliveryStatus)) {
      return res.status(400).json({ message: 'Invalid delivery status.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!order.rider || order.rider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this delivery.' });
    }

    order.deliveryStatus = deliveryStatus;
    if (deliveryNotes !== undefined) order.deliveryNotes = deliveryNotes;
    await order.save();

    // Populate customer info then notify (non-blocking)
    const populated = await Order.findById(order._id).populate('user', 'name email');
    if (populated?.user?.email) {
      const { subject, html } = deliveryStatusEmail({
        name: populated.user.name,
        order: populated,
        newStatus: deliveryStatus,
      });
      sendEmail({ to: populated.user.email, subject, html }).catch(() => {});
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get rider stats
// @route   GET /api/orders/rider/stats
// @access  Rider
export const getRiderStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [assigned, pickedUp, inTransit, deliveredToday] = await Promise.all([
      Order.countDocuments({ rider: req.user._id, deliveryStatus: 'assigned' }),
      Order.countDocuments({ rider: req.user._id, deliveryStatus: 'picked_up' }),
      Order.countDocuments({ rider: req.user._id, deliveryStatus: 'in_transit' }),
      Order.countDocuments({ rider: req.user._id, deliveryStatus: 'delivered', updatedAt: { $gte: today } }),
    ]);

    res.json({ assigned, pickedUp, inTransit, deliveredToday });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all riders (admin/shop_owner)
// @route   GET /api/orders/riders/list
// @access  Admin, Shop Owner
export const getRidersList = async (req, res) => {
  try {
    const riders = await User.find({ role: 'rider' }).select('name email phone');
    res.json(riders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Customer cancels their own pending order
// @route   PUT /api/orders/:id/cancel
// @access  Customer (order owner)
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    // Only the order owner can cancel
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this order.' });
    }

    // Can only cancel if still pending
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending orders can be cancelled.' });
    }

    order.status = 'cancelled';
    await order.save();

    // Notify customer via email (non-blocking)
    const populated = await Order.findById(order._id).populate('user', 'name email');
    if (populated?.user?.email) {
      const { subject, html } = orderStatusEmail({
        name: populated.user.name,
        order: populated,
        newStatus: 'cancelled',
      });
      sendEmail({ to: populated.user.email, subject, html }).catch(() => {});
    }

    res.json({ message: 'Order cancelled successfully.', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
