import cron from 'node-cron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Order from '../models/Order.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Retention period in days — orders older than this are eligible for deletion
const RETENTION_DAYS = parseInt(process.env.AUTO_DELETE_DAYS || '30', 10);

// Statuses considered "final" — only these are auto-deleted
const FINAL_STATUSES = ['completed', 'cancelled'];

/**
 * Delete a single file from the uploads directory, ignoring errors if the
 * file is already gone.
 */
const deleteUploadedFile = (fileUrl) => {
  if (!fileUrl) return;
  // fileUrl is stored as "/uploads/<filename>"
  const filename = fileUrl.replace(/^\/uploads\//, '');
  const filePath = path.join(__dirname, '..', 'uploads', filename);
  fs.unlink(filePath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error(`[AutoDelete] Failed to delete file ${filePath}:`, err.message);
    }
  });
};

/**
 * Core cleanup logic — exported so it can also be triggered manually via the
 * admin API endpoint (Task 7 backend route).
 *
 * @returns {{ deleted: number, errors: string[] }}
 */
export const runAutoDelete = async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  let deleted = 0;
  const errors = [];

  try {
    const expiredOrders = await Order.find({
      status: { $in: FINAL_STATUSES },
      updatedAt: { $lt: cutoff },
    }).select('_id fileUrl fileName');

    for (const order of expiredOrders) {
      try {
        deleteUploadedFile(order.fileUrl);
        await order.deleteOne();
        deleted++;
      } catch (err) {
        errors.push(`Order ${order._id}: ${err.message}`);
      }
    }

    if (deleted > 0 || errors.length > 0) {
      console.log(
        `[AutoDelete] Removed ${deleted} order(s) older than ${RETENTION_DAYS} days.` +
          (errors.length ? ` Errors: ${errors.length}` : '')
      );
    }
  } catch (err) {
    console.error('[AutoDelete] Query failed:', err.message);
    errors.push(err.message);
  }

  return { deleted, errors };
};

/**
 * Register all scheduled cron jobs.
 * Call once from server.js after the DB connection is established.
 */
export const initCronJobs = () => {
  // Run every day at 02:00 AM server time
  cron.schedule('0 2 * * *', async () => {
    console.log('[AutoDelete] Starting scheduled cleanup...');
    await runAutoDelete();
  });

  console.log(`[AutoDelete] Scheduled daily cleanup (retention: ${RETENTION_DAYS} days).`);
};
