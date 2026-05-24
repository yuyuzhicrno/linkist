import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { channelsRouter } from './routes/channels.js';
import { postsRouter } from './routes/posts.js';
import { columnsRouter } from './routes/columns.js';
import { usersRouter } from './routes/users.js';
import { dbRouter } from './routes/discussion.js';
import { friendsRouter } from './routes/friends.js';
import { tagsRouter } from './routes/tags.js';
import { pollsRouter } from './routes/polls.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/channels', channelsRouter);
app.use('/api/posts', postsRouter);
app.use('/api/columns', columnsRouter);
app.use('/api/users', usersRouter);
app.use('/api/discussion', dbRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/polls', pollsRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`Nexus Forum API running on http://localhost:${PORT}`);
});
