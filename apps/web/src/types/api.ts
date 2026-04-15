export interface Event {
  id: string;
  title: string;
  weddingDate: string;
  brideName: string;
  groomName: string;
  tagline?: string | null;
  publicToken: string;
  status: 'ACTIVE' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export interface GuestUpload {
  id: string;
  eventId: string;
  imageUrl: string;
  message?: string | null;
  uploaderName?: string | null;
  approved: boolean;
  isCoverCandidate: boolean;
  createdAt: string;
}

export type AlbumJobStatus =
  | 'PENDING'
  | 'BOOK_CREATED'
  | 'PHOTOS_UPLOADED'
  | 'COVER_ADDED'
  | 'CONTENTS_ADDED'
  | 'FINALIZED'
  | 'ORDER_PLACED'
  | 'FAILED';

export interface AlbumJob {
  id: string;
  eventId: string;
  sweetbookBookId?: string | null;
  sweetbookOrderId?: string | null;
  status: AlbumJobStatus;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingInfo {
  recipientName: string;
  recipientPhone: string;
  postalCode: string;
  address1: string;
  address2?: string;
  shippingMemo?: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
}
