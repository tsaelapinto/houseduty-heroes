import 'express-async-errors';
import * as dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import kidsRoutes from './routes/kids';
import dutiesRoutes from './routes/duties';
import householdRoutes from './routes/household';
import cyclesRoutes from './routes/cycles';
import rewardsRoutes from './routes/rewards';
import uploadsRoutes from './routes/uploads';
import { errorHandler } from './middleware/errorHandler';

export const app = express();
const PORT = process.env.PORT || 4000;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://harelitos.com',
  'https://www.harelitos.com',
  'https://app.harelitos.com',
  'https://houseduty-client.onrender.com',
  /\.vercel\.app$/,
  /\.railway\.app$/,
];
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json());

// Serve uploaded photos statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/kids', kidsRoutes);
app.use('/api/duties', dutiesRoutes);
app.use('/api/household', householdRoutes);
app.use('/api/cycles', cyclesRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/uploads', uploadsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`HouseDuty Heroes Server running on http://localhost:${PORT}`);
  });
}
