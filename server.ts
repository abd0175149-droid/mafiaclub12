import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

// Import database (auto-creates tables + seeds admin)
import './server/database.js';

// Import routes
import authRoutes from './server/routes/auth.js';
import activitiesRoutes from './server/routes/activities.js';
import bookingsRoutes from './server/routes/bookings.js';
import costsRoutes from './server/routes/costs.js';
import foundationalRoutes from './server/routes/foundational.js';
import staffRoutes from './server/routes/staff.js';
import notificationsRoutes from './server/routes/notifications.js';
import settingsRoutes from './server/routes/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000');

  app.use(express.json());

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/activities', activitiesRoutes);
  app.use('/api/bookings', bookingsRoutes);
  app.use('/api/costs', costsRoutes);
  app.use('/api/foundational', foundationalRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/settings', settingsRoutes);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎮 Mafia Club server running on http://localhost:${PORT}`);
  });
}

startServer();
