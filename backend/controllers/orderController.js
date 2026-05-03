import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import Order from '../models/Order.js';
import User from '../models/User.js';
import PrintPricing from '../models/PrintPricing.js';
import sendEmail from '../utils/sendEmail.js';
import {
  orderConfirmationEmail,
  orderStatusEmail,
  deliveryStatusEmail,
} from '../utils/emailTemplates.js';
import { convertToPdf } from '../utils/fileConverter.js';
import { notifyUser } from '../utils/notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PRICING = {
  blackWhiteNormal: 3,
  blackWhiteGlossy: 5,
  blackWhiteMatte: 5,
  colorNormal: 10,
  colorGlossy: 15,
  colorMatte: 15,
  bindingStaple: 10,
  bindingSpiral: 30,
};

const PAYMENT_METHODS = ['cod', 'card', 'bank_transfer', 'wallet', 'jazzcash', 'easypaisa'];

const getLatestPricing = async () => {
  const pricing = await PrintPricing.findOne().sort({ updatedAt: -1 }).lean();
  return pricing || DEFAULT_PRICING;
};

const calculateServerPrice = ({ printType, paperType, printSides, copies, binding, pricing }) => {
  const normalizedType = printType === 'color' ? 'color' : 'blackWhite';
  const normalizedPaper =
    paperType === 'glossy' ? 'Glossy' : paperType === 'matte' ? 'Matte' : 'Normal';

  const perPage =
    pricing[`${normalizedType}${normalizedPaper}`] ||
    (normalizedType === 'blackWhite' ? DEFAULT_PRICING.blackWhiteNormal : DEFAULT_PRICING.colorNormal);

  const safeCopies = Math.max(parseInt(copies, 10) || 1, 1);
  const doubleSurcharge = printSides === 'double' ? Math.floor(Number(perPage) * 0.6) : 0;
  const bindingExtra =
    binding === 'staple'
      ? Number(pricing.bindingStaple || DEFAULT_PRICING.bindingStaple)
      : binding === 'spiral'
      ? Number(pricing.bindingSpiral || DEFAULT_PRICING.bindingSpiral)
      : 0;

  return Number((((Number(perPage) + doubleSurcharge) * safeCopies) + bindingExtra).toFixed(2));
};

const normalizeText = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const STOP_WORDS = new Set(['road', 'street', 'town', 'city', 'block', 'house', 'near', 'area']);

const tokenizeAddress = (value = '') =>
  new Set(
    normalizeText(value)
      .split(' ')
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
  );

const scoreAddressMatch = (deliveryAddress, shopAddress) => {
  const normalizedDelivery = normalizeText(deliveryAddress);
  const normalizedShop = normalizeText(shopAddress);
  if (!normalizedDelivery || !normalizedShop) return { score: 0, matchedTokens: [] };

  const deliveryTokens = tokenizeAddress(normalizedDelivery);
  const shopTokens = tokenizeAddress(normalizedShop);
  const matchedTokens = [...deliveryTokens].filter((token) => shopTokens.has(token));

  let score = matchedTokens.length;
  if (normalizedDelivery.includes(normalizedShop) || normalizedShop.includes(normalizedDelivery)) {
    score += 8;
  }

  return { score, matchedTokens };
};

const selectShopByLocation = async (deliveryAddress) => {
  const approvedShops = await User.find({ role: 'shop_owner', shopStatus: 'approved' })
    .select('_id name shopName shopAddress createdAt')
    .lean();

  if (!approvedShops.length) return null;

  const scored = approvedShops
    .map((shop) => {
      const { score, matchedTokens } = scoreAddressMatch(deliveryAddress, shop.shopAddress || '');
      return { shop, score, matchedTokens };
    })
    .filter((item) => item.score > 0);

  if (!scored.length) return null;

  const withLoad = await Promise.all(
    scored.map(async (item) => {
      const activeOrders = await Order.countDocuments({
        shopOwner: item.shop._id,
        status: { $in: ['pending', 'processing'] },
      });
      return { ...item, activeOrders };
    })
  );

  withLoad.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.activeOrders !== b.activeOrders) return a.activeOrders - b.activeOrders;
    return new Date(a.shop.createdAt) - new Date(b.shop.createdAt);
  });

  return withLoad[0];
};

// @desc    Create new order with real file upload
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file to print.' });
    }

    const {
      printType,
      paperSize,
      copies,
      printSides,
      orientation,
      paperType,
      binding,
      deliveryAddress,
      paymentMethod,
    } = req.body;

    if (!deliveryAddress) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Delivery address is required.' });
    }

    const safeCopies = Math.max(parseInt(copies, 10) || 1, 1);
    const safePaymentMethod = PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : 'cod';
    const pricing = await getLatestPricing();
    const totalPrice = calculateServerPrice({
      printType,
      paperType,
      printSides,
      copies: safeCopies,
      binding,
      pricing,
    });

    const locationShopMatch = await selectShopByLocation(deliveryAddress);
    const assignedShopOwnerId = locationShopMatch?.shop?._id || null;

    // Attempt DOCX → PDF conversion (graceful: keeps original if browser not found)
    const { filename, originalname, converted } = await convertToPdf(req.file);

    const order = await Order.create({
      user: req.user._id,
      fileName: originalname,
      fileUrl: `/uploads/${filename}`,
      printType,
      paperSize: paperSize || 'A4',
      copies: safeCopies,
      printSides: printSides || 'single',
      orientation: orientation || 'portrait',
      paperType: paperType || 'normal',
      binding: binding || 'none',
      totalPrice,
      paymentMethod: safePaymentMethod,
      paymentStatus: 'unpaid',
      shopOwner: assignedShopOwnerId,
      shopAssignmentMethod: assignedShopOwnerId ? 'location' : 'none',
      shopAssignedAt: assignedShopOwnerId ? new Date() : null,
      deliveryAddress,
      converted,
    });

    notifyUser({
      userId: req.user._id,
      title: 'Order placed successfully',
      message: `Your order #${order._id.toString().slice(-6).toUpperCase()} is now pending.`,
      type: 'order',
      metadata: { orderId: order._id, status: order.status, actorRole: req.user.role },
    });

    if (assignedShopOwnerId) {
      notifyUser({
        userId: assignedShopOwnerId,
        title: 'New order assigned by location',
        message: `Order #${order._id.toString().slice(-6).toUpperCase()} was routed to your shop based on location.`,
        type: 'order',
        metadata: { orderId: order._id, status: order.status, actorRole: 'system' },
      });
    }

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
    const orders = await Order.find({ user: req.user._id })
      .populate('rider', 'name email phone')
      .sort({ createdAt: -1 });
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
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('shopOwner', 'name email shopName shopAddress')
      .populate('rider', 'name email phone');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Allow owner, admin, assigned shop owner, or assigned rider.
    const isOwner = order.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isAssignedShopOwner =
      req.user.role === 'shop_owner' &&
      order.shopOwner &&
      order.shopOwner._id.toString() === req.user._id.toString();
    const isAssignedRider =
      req.user.role === 'rider' &&
      order.rider &&
      order.rider._id.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin && !isAssignedShopOwner && !isAssignedRider) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Download order file securely
// @route   GET /api/orders/:id/file
// @access  Private
export const getOrderFile = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isOwner = order.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isAssignedShopOwner =
      req.user.role === 'shop_owner' &&
      order.shopOwner &&
      order.shopOwner.toString() === req.user._id.toString();
    const isAssignedRider = order.rider && order.rider.toString() === req.user._id.toString();
    if (!isOwner && !isAdmin && !isAssignedShopOwner && !isAssignedRider) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const fileName = path.basename(order.fileUrl || '');
    if (!fileName) {
      return res.status(404).json({ message: 'File path is missing for this order.' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server.' });
    }

    return res.download(filePath, order.fileName);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Pay for an order (mock payment flow)
// @route   PUT /api/orders/:id/pay
// @access  Customer (order owner)
export const payOrder = async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to pay this order.' });
    }
    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'Cancelled orders cannot be paid.' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Order is already paid.' });
    }

    const safePaymentMethod = PAYMENT_METHODS.includes(paymentMethod)
      ? paymentMethod
      : order.paymentMethod || 'cod';

    order.paymentStatus = 'paid';
    order.paymentMethod = safePaymentMethod;
    order.paidAt = new Date();
    order.paymentReference = `PAY-${Date.now()}-${crypto.randomInt(1000, 9999)}`;
    await order.save();

    notifyUser({
      userId: req.user._id,
      title: 'Payment successful',
      message: `Payment received for order #${order._id.toString().slice(-6).toUpperCase()}.`,
      type: 'payment',
      metadata: { orderId: order._id, status: order.paymentStatus, actorRole: req.user.role },
    });

    sendEmail({
      to: order.user.email,
      subject: `Payment Received — #${order._id.toString().slice(-6).toUpperCase()}`,
      html: `<p>Hi ${order.user.name},</p><p>We received your payment of <strong>Rs. ${order.totalPrice}</strong> for order <strong>#${order._id
        .toString()
        .slice(-6)
        .toUpperCase()}</strong>.</p><p>Payment Reference: <strong>${order.paymentReference}</strong></p>`,
    }).catch(() => {});

    return res.json({ message: 'Payment completed successfully.', order });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Assign order to a shop owner manually (admin)
// @route   PUT /api/orders/:id/assign-shop
// @access  Admin
export const assignShopOwner = async (req, res) => {
  try {
    const { shopOwnerId } = req.body;
    if (!shopOwnerId) {
      return res.status(400).json({ message: 'shopOwnerId is required.' });
    }

    const shop = await User.findById(shopOwnerId);
    if (!shop || shop.role !== 'shop_owner') {
      return res.status(400).json({ message: 'Invalid shop owner.' });
    }
    if (shop.shopStatus !== 'approved') {
      return res.status(400).json({ message: 'Only approved shop owners can receive assignments.' });
    }

    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const previousShopOwnerId = order.shopOwner ? order.shopOwner.toString() : null;

    order.shopOwner = shop._id;
    order.shopAssignmentMethod = 'admin';
    order.shopAssignedAt = new Date();
    await order.save();

    if (previousShopOwnerId && previousShopOwnerId !== shop._id.toString()) {
      notifyUser({
        userId: previousShopOwnerId,
        title: 'Order reassigned',
        message: `Order #${order._id.toString().slice(-6).toUpperCase()} was reassigned by admin.`,
        type: 'order',
        metadata: { orderId: order._id, status: order.status, actorRole: req.user.role },
      });
    }

    notifyUser({
      userId: shop._id,
      title: 'New order assigned by admin',
      message: `Order #${order._id.toString().slice(-6).toUpperCase()} has been assigned to your shop.`,
      type: 'order',
      metadata: { orderId: order._id, status: order.status, actorRole: req.user.role },
    });

    const populated = await Order.findById(order._id)
      .populate('user', 'name email phone')
      .populate('shopOwner', 'name email shopName shopAddress')
      .populate('rider', 'name email phone');

    return res.json({ message: `Order assigned to ${shop.name}.`, order: populated });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Auto-assign order to nearest matching shop owner by location (admin)
// @route   PUT /api/orders/:id/auto-assign-shop
// @access  Admin
export const autoAssignShopOwner = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const match = await selectShopByLocation(order.deliveryAddress);
    if (!match) {
      return res.status(400).json({ message: 'No location-based shop match found. Assign manually.' });
    }

    order.shopOwner = match.shop._id;
    order.shopAssignmentMethod = 'location';
    order.shopAssignedAt = new Date();
    await order.save();

    notifyUser({
      userId: match.shop._id,
      title: 'New order assigned by location',
      message: `Order #${order._id.toString().slice(-6).toUpperCase()} was auto-assigned to your shop by location.`,
      type: 'order',
      metadata: { orderId: order._id, status: order.status, actorRole: 'system' },
    });

    const populated = await Order.findById(order._id)
      .populate('user', 'name email phone')
      .populate('shopOwner', 'name email shopName shopAddress')
      .populate('rider', 'name email phone');

    return res.json({
      message: `Order auto-assigned to ${match.shop.name} based on location matching.`,
      order: populated,
      algorithm: {
        strategy: 'address-token-match',
        score: match.score,
        matchedTokens: match.matchedTokens,
        activeOrders: match.activeOrders,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders (admin/shop_owner)
// @route   GET /api/orders/all
// @access  Admin, Shop Owner
export const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    if (req.user.role === 'shop_owner') {
      filter.shopOwner = req.user._id;
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email phone')
        .populate('shopOwner', 'name email shopName shopAddress')
        .populate('rider', 'name email phone')
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

    if (
      req.user.role === 'shop_owner' &&
      (!order.shopOwner || order.shopOwner.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ message: 'Not authorized for this shop order.' });
    }

    if (['processing', 'completed'].includes(status) && order.paymentStatus !== 'paid') {
      return res.status(400).json({ message: 'Order must be paid before processing/completion.' });
    }

    order.status = status;
    await order.save();

    notifyUser({
      userId: order.user?._id,
      title: 'Order status updated',
      message: `Your order #${order._id.toString().slice(-6).toUpperCase()} is now ${status}.`,
      type: 'order',
      metadata: { orderId: order._id, status, actorRole: req.user.role },
    });

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

    const baseFilter = req.user.role === 'shop_owner' ? { shopOwner: req.user._id } : {};

    const [pending, processing, completedToday, revenueResult] = await Promise.all([
      Order.countDocuments({ ...baseFilter, status: 'pending' }),
      Order.countDocuments({ ...baseFilter, status: 'processing' }),
      Order.countDocuments({ ...baseFilter, status: 'completed', updatedAt: { $gte: today } }),
      Order.aggregate([
        { $match: { ...baseFilter, status: 'completed', updatedAt: { $gte: today } } },
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
    if (
      req.user.role === 'shop_owner' &&
      (!order.shopOwner || order.shopOwner.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ message: 'Not authorized for this shop order.' });
    }
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

    notifyUser({
      userId: populated.user?._id,
      title: 'Rider assigned',
      message: `A rider has been assigned for order #${order._id.toString().slice(-6).toUpperCase()}.`,
      type: 'delivery',
      metadata: { orderId: order._id, status: 'assigned', actorRole: req.user.role },
    });

    notifyUser({
      userId: populated.rider?._id,
      title: 'New delivery assigned',
      message: `You have been assigned order #${order._id.toString().slice(-6).toUpperCase()}.`,
      type: 'delivery',
      metadata: { orderId: order._id, status: 'assigned', actorRole: req.user.role },
    });

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

// @desc    Auto-assign rider using least-active-deliveries algorithm
// @route   PUT /api/orders/:id/auto-assign-rider
// @access  Admin, Shop Owner
export const autoAssignRider = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (
      req.user.role === 'shop_owner' &&
      (!order.shopOwner || order.shopOwner.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ message: 'Not authorized for this shop order.' });
    }
    if (order.status !== 'completed') {
      return res.status(400).json({ message: 'Only completed orders can be assigned for delivery.' });
    }
    if (order.rider) {
      return res.status(400).json({ message: 'Order already has an assigned rider.' });
    }

    const riders = await User.find({ role: 'rider' }).select('_id name email phone createdAt');
    if (!riders.length) {
      return res.status(400).json({ message: 'No riders are available for assignment.' });
    }

    const riderStats = await Promise.all(
      riders.map(async (rider) => {
        const activeDeliveries = await Order.countDocuments({
          rider: rider._id,
          deliveryStatus: { $in: ['assigned', 'picked_up', 'in_transit'] },
        });

        const deliveredToday = await Order.countDocuments({
          rider: rider._id,
          deliveryStatus: 'delivered',
          updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        });

        return { rider, activeDeliveries, deliveredToday };
      })
    );

    riderStats.sort((a, b) => {
      if (a.activeDeliveries !== b.activeDeliveries) {
        return a.activeDeliveries - b.activeDeliveries;
      }
      if (a.deliveredToday !== b.deliveredToday) {
        return a.deliveredToday - b.deliveredToday;
      }
      return new Date(a.rider.createdAt) - new Date(b.rider.createdAt);
    });

    const chosen = riderStats[0].rider;

    order.rider = chosen._id;
    order.deliveryStatus = 'assigned';
    await order.save();

    const populated = await Order.findById(order._id).populate([
      { path: 'user', select: 'name email' },
      { path: 'rider', select: 'name email phone' },
    ]);

    notifyUser({
      userId: populated.user?._id,
      title: 'Rider auto-assigned',
      message: `A rider has been assigned for order #${order._id.toString().slice(-6).toUpperCase()}.`,
      type: 'delivery',
      metadata: { orderId: order._id, status: 'assigned', actorRole: req.user.role },
    });

    notifyUser({
      userId: chosen._id,
      title: 'New auto-assigned delivery',
      message: `You have been auto-assigned order #${order._id.toString().slice(-6).toUpperCase()}.`,
      type: 'delivery',
      metadata: { orderId: order._id, status: 'assigned', actorRole: req.user.role },
    });

    if (populated.user?.email) {
      const { subject, html } = deliveryStatusEmail({
        name: populated.user.name,
        order: populated,
        newStatus: 'assigned',
      });
      sendEmail({ to: populated.user.email, subject, html }).catch(() => {});
    }

    res.json({
      message: `Rider ${chosen.name} assigned by workload algorithm.`,
      order: populated,
      algorithm: {
        strategy: 'least-active-deliveries',
        activeDeliveries: riderStats[0].activeDeliveries,
        deliveredToday: riderStats[0].deliveredToday,
      },
    });
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
    notifyUser({
      userId: populated?.user?._id,
      title: 'Delivery status updated',
      message: `Order #${order._id.toString().slice(-6).toUpperCase()} is now ${deliveryStatus.replace(/_/g, ' ')}.`,
      type: 'delivery',
      metadata: { orderId: order._id, status: deliveryStatus, actorRole: req.user.role },
    });

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
    notifyUser({
      userId: populated?.user?._id,
      title: 'Order cancelled',
      message: `Order #${order._id.toString().slice(-6).toUpperCase()} has been cancelled.`,
      type: 'order',
      metadata: { orderId: order._id, status: 'cancelled', actorRole: req.user.role },
    });

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
