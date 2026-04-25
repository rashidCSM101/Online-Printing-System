import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';
import { welcomeEmail, passwordResetEmail } from '../utils/emailTemplates.js';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, email, password, phone, address, role, shopName, shopAddress } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Only allow customer or shop_owner self-registration
    const allowedSelfRoles = ['customer', 'shop_owner'];
    const assignedRole = allowedSelfRoles.includes(role) ? role : 'customer';

    if (assignedRole === 'shop_owner' && !shopName) {
      return res.status(400).json({ message: 'Shop name is required for shop owner registration.' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone,
      address,
      role: assignedRole,
      ...(assignedRole === 'shop_owner' && { shopName, shopAddress, shopStatus: 'pending' }),
    });

    if (user) {
      // Send welcome email (non-blocking)
      const { subject, html } = welcomeEmail({ name: user.name });
      sendEmail({ to: user.email, subject, html }).catch(() => {});

      // For shop owners, respond without token (must wait for approval)
      if (user.role === 'shop_owner') {
        return res.status(201).json({
          message: 'Shop owner account created. Please wait for admin approval before logging in.',
        });
      }

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        token: generateToken(user._id),
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;

    // Check user
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      // Block unapproved shop owners
      if (user.role === 'shop_owner' && user.shopStatus !== 'approved') {
        const statusMsg = user.shopStatus === 'disabled'
          ? 'Your shop account has been disabled. Please contact support.'
          : 'Your shop owner account is pending admin approval. Please wait.';
        return res.status(403).json({ message: statusMsg });
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        shopName: user.shopName,
        shopStatus: user.shopStatus,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -resetPasswordToken -resetPasswordExpire');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, phone, address, password } = req.body;

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      user.password = password;
    }

    const updated = await user.save();
    res.json({
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      address: updated.address,
      role: updated.role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Forgot password — generate reset token
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) {
      // Generic message to prevent email enumeration
      return res.json({ message: 'If this email exists, a reset link has been sent.' });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const { subject, html } = passwordResetEmail({ name: user.name, resetUrl });
    await sendEmail({ to: user.email, subject, html });

    res.json({ message: 'Password reset email sent. Please check your inbox.' });
  } catch (error) {
    // If email fails, clear the token so user can retry
    try {
      const user = await User.findOne({ email: req.body.email });
      if (user) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });
      }
    } catch (_) { /* ignore secondary error */ }
    res.status(500).json({ message: 'Email could not be sent. Please try again later.' });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: 'Password reset successful. You can now login.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/auth/admin/users
// @access  Admin
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const filter = role ? { role } : {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password -resetPasswordToken -resetPasswordExpire')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user role (admin only)
// @route   PUT /api/auth/admin/users/:id/role
// @access  Admin
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const allowed = ['customer', 'shop_owner', 'admin', 'rider'];
    if (!allowed.includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Prevent admin from demoting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot change your own role.' });
    }

    user.role = role;
    await user.save();

    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/auth/admin/users/:id
// @access  Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    await user.deleteOne();
    res.json({ message: 'User removed.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve a shop owner (admin only)
// @route   PUT /api/auth/admin/shops/:id/approve
// @access  Admin
export const approveShop = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role !== 'shop_owner') return res.status(400).json({ message: 'User is not a shop owner.' });

    user.shopStatus = 'approved';
    await user.save();
    res.json({ message: `${user.name}'s shop has been approved.`, user: { _id: user._id, name: user.name, shopStatus: user.shopStatus } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Disable a shop owner (admin only)
// @route   PUT /api/auth/admin/shops/:id/disable
// @access  Admin
export const disableShop = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role !== 'shop_owner') return res.status(400).json({ message: 'User is not a shop owner.' });

    user.shopStatus = 'disabled';
    await user.save();
    res.json({ message: `${user.name}'s shop has been disabled.`, user: { _id: user._id, name: user.name, shopStatus: user.shopStatus } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
