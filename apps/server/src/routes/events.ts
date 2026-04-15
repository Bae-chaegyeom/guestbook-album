import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';

export const eventsRouter = Router();

const BCRYPT_ROUNDS = 10;

const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  weddingDate: z.string().datetime({ message: 'Invalid date format, use ISO 8601' }),
  brideName: z.string().min(1, 'Bride name is required').max(50),
  groomName: z.string().min(1, 'Groom name is required').max(50),
  tagline: z.string().max(200).optional(),
  hostPin: z.string().min(4, '비밀번호는 최소 4자 이상이어야 합니다').max(50),
});

// hostPin을 응답에서 제거하는 헬퍼
function sanitizeEvent(event: Record<string, unknown>) {
  const { hostPin: _, ...rest } = event;
  return rest;
}

// POST /api/events — host creates a new event
eventsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createEventSchema.parse(req.body);
    const hashedPin = await bcrypt.hash(data.hostPin, BCRYPT_ROUNDS);
    const event = await prisma.event.create({
      data: {
        title: data.title,
        weddingDate: new Date(data.weddingDate),
        brideName: data.brideName,
        groomName: data.groomName,
        tagline: data.tagline,
        hostPin: hashedPin,
      },
    });
    res.status(201).json({ event: sanitizeEvent(event as unknown as Record<string, unknown>) });
  } catch (err) {
    next(err);
  }
});

// POST /api/events/:id/verify — host verifies PIN to access dashboard
eventsRouter.post('/:id/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pin } = z.object({ pin: z.string().min(1) }).parse(req.body);
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    const ok = await bcrypt.compare(pin, event.hostPin);
    if (!ok) {
      res.status(401).json({ error: '비밀번호가 올바르지 않습니다' });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/events/:id — host fetches event by internal ID (hostPin never returned)
eventsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.json({ event: sanitizeEvent(event as unknown as Record<string, unknown>) });
  } catch (err) {
    next(err);
  }
});

// GET /api/events/token/:token — guest fetches event by public token (hostPin never returned)
eventsRouter.get('/token/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await prisma.event.findUnique({
      where: { publicToken: req.params.token },
    });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.json({ event: sanitizeEvent(event as unknown as Record<string, unknown>) });
  } catch (err) {
    next(err);
  }
});
