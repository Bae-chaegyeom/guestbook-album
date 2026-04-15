import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const uploadsRouter = Router();

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

const uploadBodySchema = z.object({
  message: z.string().max(300).optional(),
  uploaderName: z.string().max(50).optional(),
});

// POST /api/uploads/:token — guest submits photos
uploadsRouter.post(
  '/:token',
  upload.array('photos', 20),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = await prisma.event.findUnique({
        where: { publicToken: req.params.token },
      });
      if (!event) {
        res.status(404).json({ error: 'Event not found' });
        return;
      }
      if (event.status !== 'ACTIVE') {
        res.status(403).json({ error: 'This event is no longer accepting uploads' });
        return;
      }

      const body = uploadBodySchema.parse(req.body);
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files uploaded' });
        return;
      }

      const uploads = await prisma.$transaction(
        files.map((file) =>
          prisma.guestUpload.create({
            data: {
              eventId: event.id,
              imageUrl: `/uploads/${file.filename}`,
              message: body.message,
              uploaderName: body.uploaderName,
            },
          })
        )
      );

      res.status(201).json({ count: uploads.length, message: 'Upload successful' });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/uploads/event/:eventId — host fetches all uploads for an event
uploadsRouter.get(
  '/event/:eventId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uploads = await prisma.guestUpload.findMany({
        where: { eventId: req.params.eventId },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ uploads });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/uploads/:id/approve — host approves an upload
uploadsRouter.patch(
  '/:id/approve',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const upload = await prisma.guestUpload.update({
        where: { id: req.params.id },
        data: { approved: true },
      });
      res.json({ upload });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/uploads/:id/unapprove — host reverts approval
uploadsRouter.patch(
  '/:id/unapprove',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const upload = await prisma.guestUpload.update({
        where: { id: req.params.id },
        data: { approved: false },
      });
      res.json({ upload });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/uploads/:id — host deletes an upload
uploadsRouter.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const upload = await prisma.guestUpload.findUnique({
        where: { id: req.params.id },
      });
      if (!upload) {
        res.status(404).json({ error: 'Upload not found' });
        return;
      }
      // Remove file from disk
      const filePath = path.join(process.cwd(), upload.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await prisma.guestUpload.delete({ where: { id: req.params.id } });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);
