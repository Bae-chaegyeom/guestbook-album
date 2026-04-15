import type { Event, GuestUpload, AlbumJob, ShippingInfo } from '../types/api';

const BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// --- Events ---

export async function createEvent(data: {
  title: string;
  weddingDate: string;
  brideName: string;
  groomName: string;
  tagline?: string;
  hostPin: string;
}): Promise<Event> {
  const res = await fetch(`${BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await handleResponse<{ event: Event }>(res);
  return json.event;
}

export async function getEvent(id: string): Promise<Event> {
  const res = await fetch(`${BASE}/events/${id}`);
  const json = await handleResponse<{ event: Event }>(res);
  return json.event;
}

export async function verifyEventPin(id: string, pin: string): Promise<void> {
  const res = await fetch(`${BASE}/events/${id}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  await handleResponse<{ ok: boolean }>(res);
}

export async function getEventByToken(token: string): Promise<Event> {
  const res = await fetch(`${BASE}/events/token/${token}`);
  const json = await handleResponse<{ event: Event }>(res);
  return json.event;
}

// --- Uploads ---

export async function getUploads(eventId: string): Promise<GuestUpload[]> {
  const res = await fetch(`${BASE}/uploads/event/${eventId}`);
  const json = await handleResponse<{ uploads: GuestUpload[] }>(res);
  return json.uploads;
}

export async function approveUpload(id: string): Promise<GuestUpload> {
  const res = await fetch(`${BASE}/uploads/${id}/approve`, { method: 'PATCH' });
  const json = await handleResponse<{ upload: GuestUpload }>(res);
  return json.upload;
}

export async function unapproveUpload(id: string): Promise<GuestUpload> {
  const res = await fetch(`${BASE}/uploads/${id}/unapprove`, { method: 'PATCH' });
  const json = await handleResponse<{ upload: GuestUpload }>(res);
  return json.upload;
}

export async function deleteUpload(id: string): Promise<void> {
  const res = await fetch(`${BASE}/uploads/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Delete failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
}

export async function submitGuestUpload(
  token: string,
  files: File[],
  message?: string,
  uploaderName?: string
): Promise<{ count: number; message: string }> {
  const form = new FormData();
  files.forEach((f) => form.append('photos', f));
  if (message) form.append('message', message);
  if (uploaderName) form.append('uploaderName', uploaderName);

  const res = await fetch(`${BASE}/uploads/${token}`, {
    method: 'POST',
    body: form,
  });
  return handleResponse<{ count: number; message: string }>(res);
}

// --- Album ---

export async function getBookSpecs(): Promise<unknown[]> {
  const res = await fetch(`${BASE}/album/book-specs`);
  const json = await handleResponse<{ specs: unknown[] }>(res);
  return json.specs;
}

export async function getTemplateParamFields(
  templateUid: string
): Promise<{
  fields: Array<{ key: string; label: string; required: boolean }>;
  supportsImages: boolean;
  imageFieldCount: number;
  usesGallery: boolean;
}> {
  const res = await fetch(`${BASE}/album/template-params/${encodeURIComponent(templateUid)}`);
  return handleResponse<{
    fields: Array<{ key: string; label: string; required: boolean }>;
    supportsImages: boolean;
    imageFieldCount: number;
    usesGallery: boolean;
  }>(res);
}

export async function getTemplates(bookSpecUid?: string, kind?: 'cover' | 'content'): Promise<unknown[]> {
  const params = new URLSearchParams();
  if (bookSpecUid) params.set('bookSpecUid', bookSpecUid);
  if (kind) params.set('kind', kind);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${BASE}/album/templates${qs}`);
  const json = await handleResponse<{ templates: unknown[] }>(res);
  return json.templates;
}


export async function getAlbumJob(eventId: string): Promise<AlbumJob | null> {
  const res = await fetch(`${BASE}/album/${eventId}`);
  const json = await handleResponse<{ job: AlbumJob | null }>(res);
  return json.job;
}

export async function buildAlbum(
  eventId: string,
  params: {
    bookSpecUid: string;
    coverTemplateUid: string;
    contentTemplateUid: string;
    coverTextParams?: Record<string, string>;
    contentTextParams?: Record<string, string>;
  }
): Promise<AlbumJob> {
  const res = await fetch(`${BASE}/album/${eventId}/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await handleResponse<{ job: AlbumJob }>(res);
  return json.job;
}

export async function estimateAlbumOrder(
  eventId: string,
  quantity: number
): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/album/${eventId}/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity }),
  });
  const json = await handleResponse<{ estimate: Record<string, unknown> }>(res);
  return json.estimate;
}

export async function placeAlbumOrder(
  eventId: string,
  quantity: number,
  shipping: ShippingInfo
): Promise<{ job: AlbumJob; orderUid: string }> {
  const res = await fetch(`${BASE}/album/${eventId}/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity, shipping }),
  });
  return handleResponse<{ job: AlbumJob; orderUid: string }>(res);
}

export async function getAlbumOrderStatus(eventId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/album/${eventId}/order-status`);
  return handleResponse<Record<string, unknown>>(res);
}
