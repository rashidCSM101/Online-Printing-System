import express from 'express';
import {
  createOrder, getMyOrders, getOrderById,
  getAllOrders, updateOrderStatus, getAdminStats, getShopStats,
  assignRider, getRiderDeliveries, updateDeliveryStatus, getRiderStats, getRidersList,
  cancelOrder, getOrderFile, payOrder, autoAssignRider,
  assignShopOwner, autoAssignShopOwner
} from '../controllers/orderController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Multer error handler wrapper
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof Error) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

router.post('/', protect, handleUpload, createOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/all', protect, authorizeRoles('admin', 'shop_owner'), getAllOrders);
router.get('/admin/stats', protect, authorizeRoles('admin'), getAdminStats);
router.get('/shop/stats', protect, authorizeRoles('admin', 'shop_owner'), getShopStats);
router.get('/rider/my-deliveries', protect, authorizeRoles('rider'), getRiderDeliveries);
router.get('/rider/stats', protect, authorizeRoles('rider'), getRiderStats);
router.get('/riders/list', protect, authorizeRoles('admin', 'shop_owner'), getRidersList);
router.put('/:id/status', protect, authorizeRoles('admin', 'shop_owner'), updateOrderStatus);
router.put('/:id/cancel', protect, cancelOrder);
router.put('/:id/pay', protect, payOrder);
router.put('/:id/assign-shop', protect, authorizeRoles('admin'), assignShopOwner);
router.put('/:id/auto-assign-shop', protect, authorizeRoles('admin'), autoAssignShopOwner);
router.put('/:id/assign-rider', protect, authorizeRoles('admin', 'shop_owner'), assignRider);
router.put('/:id/auto-assign-rider', protect, authorizeRoles('admin', 'shop_owner'), autoAssignRider);
router.put('/:id/delivery-status', protect, authorizeRoles('rider'), updateDeliveryStatus);
router.get('/:id/file', protect, getOrderFile);
router.get('/:id', protect, getOrderById);

export default router;
