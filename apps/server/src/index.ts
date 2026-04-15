import express from 'express';
import cors from 'cors';
import path from 'path';
import { eventsRouter } from './routes/events';
import { uploadsRouter } from './routes/uploads';
import { albumRouter } from './routes/album';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/events', eventsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/album', albumRouter);

app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// errorHandler must be last — 4-arg signature is required by Express
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
