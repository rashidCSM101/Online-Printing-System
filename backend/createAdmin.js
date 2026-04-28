import 'dotenv/config';
import connectDB from './config/db.js';
import User from './models/User.js';

await connectDB();

const email = 'admin@printsy.com';
const existing = await User.findOne({ email });

if (existing) {
  console.log('Admin already exists:', existing.email, '| role:', existing.role);
} else {
  // Do NOT hash manually — the User model pre('save') hook hashes it automatically
  const admin = await User.create({ name: 'Admin', email, password: 'Admin@123', role: 'admin' });
  console.log('Admin created successfully:', admin.email);
}

process.exit(0);
