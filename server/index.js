import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import rateLimit from 'express-rate-limit';
import { initDatabase, getRepository } from './data/db.js';
import { initSocket } from './services/socket.js';
import { validateConfig, getJwtSecret } from './config/index.js';
import { initServices } from './services-registry.js';
import { authRouter } from './routes/auth.js';
import { channelsRouter } from './routes/channels.js';
import { postsRouter } from './routes/posts.js';
import { columnsRouter } from './routes/columns.js';
import { usersRouter } from './routes/users.js';
import { dbRouter } from './routes/discussion.js';
import { friendsRouter } from './routes/friends.js';
import { tagsRouter } from './routes/tags.js';
import { pollsRouter } from './routes/polls.js';
import { notificationsRouter } from './routes/notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

try {
  validateConfig();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' }
});

app.use(globalLimiter);
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/posts', postsRouter);
app.use('/api/columns', columnsRouter);
app.use('/api/users', usersRouter);
app.use('/api/discussion', dbRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/polls', pollsRouter);
app.use('/api/notifications', notificationsRouter);

app.get('/api/health', (_, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime()
  });
});

app.get('/api/health/full', async (_, res) => {
  try {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      uptime: process.uptime(),
      memory: {
        rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
      },
      services: {
        database: 'online',
        auth: 'online',
        channels: 'online',
        posts: 'online',
        columns: 'online',
        friends: 'online',
        tags: 'online',
        polls: 'online'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

app.use('/uploads', express.static(path.join(__dirname, './uploads')));

if (NODE_ENV === 'production') {
  const clientDistPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDistPath));
  
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
}

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

async function startServer() {
  try {
    console.log('Initializing database...');
    const DB_TYPE = process.env.DB_TYPE || 'file';
    console.log(`Database type: ${DB_TYPE}`);

    await initDatabase();
    console.log('Database initialized successfully');

    await initServices();
    console.log('Services initialized successfully');

    const server = http.createServer(app);
    initSocket(server);

    server.listen(PORT, () => {
      console.log(`\n🚀 Linkist API running in ${NODE_ENV} mode`);
      console.log(`📍 Listening on http://localhost:${PORT}`);
      console.log(`🔗 Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
      console.log(`🔌 WebSocket ready`);
      console.log(`\n✅ Ready to serve requests`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();