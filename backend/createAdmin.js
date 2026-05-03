import 'dotenv/config';
import connectDB from './config/db.js';
import User from './models/User.js';

await connectDB();

const email = process.env.ADMIN_EMAIL || 'admin@printsy.com';
const password = process.env.ADMIN_PASSWORD || 'Admin@123';

if (!process.env.ADMIN_PASSWORD) {
  console.warn('ADMIN_PASSWORD is not set. Using development default password.');
}

const existing = await User.findOne({ email });

if (existing) {
  console.log('Admin already exists:', existing.email, '| role:', existing.role);
} else {
  // Do NOT hash manually — the User model pre('save') hook hashes it automatically
  const admin = await User.create({ name: 'Admin', email, password, role: 'admin' });
  console.log('Admin created successfully:', admin.email);
}

process.exit(0);
