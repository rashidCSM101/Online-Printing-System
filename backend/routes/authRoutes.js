import express from 'express';
import { body } from 'express-validator';
import {
  register, login, getProfile, updateProfile,
  forgotPassword, resetPassword,
  getAllUsers, updateUserRole, deleteUser,
  approveShop, disableShop
} from '../controllers/authController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

// Admin user management
router.get('/admin/users', protect, authorizeRoles('admin'), getAllUsers);
router.put('/admin/users/:id/role', protect, authorizeRoles('admin'), updateUserRole);
router.delete('/admin/users/:id', protect, authorizeRoles('admin'), deleteUser);

// Admin shop approval
router.put('/admin/shops/:id/approve', protect, authorizeRoles('admin'), approveShop);
router.put('/admin/shops/:id/disable', protect, authorizeRoles('admin'), disableShop);

export default router;
