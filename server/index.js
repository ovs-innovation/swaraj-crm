import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import areaManagerRoutes from './routes/areaManagerRoutes.js';
import dealerRoutes from './routes/dealerRoutes.js';
import visitRoutes from './routes/visitRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import posterRoutes from './routes/posterRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { reportRoutes, settingsRouter } from './routes/reportRoutes.js';
import { ensureDemoUsers } from './utils/ensureDemoUsers.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/area-managers', areaManagerRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/posters', posterRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRouter);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Swaraj CRM API is running' });
});

const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    if (req.method !== 'GET') return next();
    const client = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(302, `${client}${req.originalUrl}`);
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vastora-crm')
  .then(async () => {
    console.log('MongoDB connected');
    try {
      await ensureDemoUsers();
      console.log('Demo logins ready');
    } catch (err) {
      console.error('Demo user setup failed:', err.message);
    }
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

export default app;
