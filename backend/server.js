import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import pricingRoutes from './routes/pricingRoutes.js';
import { initCronJobs, runAutoDelete } from './utils/cronJobs.js';
import { protect, authorizeRoles } from './middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Start scheduled jobs after DB is ready
initCronJobs();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files as static assets (protected downloads can be added later)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/pricing', pricingRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Online Printing System API' });
});

// Admin: manually trigger auto-deletion
app.post(
  '/api/admin/auto-delete',
  protect,
  authorizeRoles('admin'),
  async (req, res) => {
    const result = await runAutoDelete();
    res.json({
      message: `Auto-delete complete. Removed ${result.deleted} order(s).`,
      ...result,
    });
  }
);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
