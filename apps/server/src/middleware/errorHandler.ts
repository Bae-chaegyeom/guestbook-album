import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation error', details: err.errors });
  }
  if (err instanceof Error) {
    console.error('[Error]', err.message);
    return res.status(500).json({ error: err.message });
  }
  res.status(500).json({ error: 'Unknown error' });
}
