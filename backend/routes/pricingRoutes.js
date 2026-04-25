import express from 'express';
import { getPricing, getMyPricing, upsertMyPricing } from '../controllers/pricingController.js';
import { protect, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public — customers use this to calculate price preview
router.get('/', getPricing);

// Shop owner
router.get('/my', protect, authorizeRoles('shop_owner'), getMyPricing);
router.put('/my', protect, authorizeRoles('shop_owner'), upsertMyPricing);

export default router;
