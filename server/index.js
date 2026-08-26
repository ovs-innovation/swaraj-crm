import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import areaManagerRoutes from './routes/areaManagerRoutes.js';
import dealerRoutes from './routes/dealerRoutes.js';
import visitRoutes from './routes/visitRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { reportRoutes, settingsRouter } from './routes/reportRoutes.js';
import User from './models/User.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/area-managers', areaManagerRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRouter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Vastora CRM API is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

const ensureSuperAdmin = async () => {
  try {
    const exists = await User.findOne({ role: 'super_admin' });
    if (exists) return;
    const hashedPassword = await bcrypt.hash('super123', 10);
    await User.create({
      name: 'Super Admin',
      email: 'superadmin@vastora.com',
      password: hashedPassword,
      role: 'super_admin',
      status: 'active',
    });
    console.log('Default Super Admin created: superadmin@vastora.com / super123');
  } catch (err) {
    console.error('Could not ensure Super Admin:', err.message);
  }
};

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vastora-crm')
  .then(async () => {
    console.log('MongoDB connected');
    await ensureSuperAdmin();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

export default app;
