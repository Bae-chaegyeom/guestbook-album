/**
 * Sweetbook Book Print API 어댑터
 * 모든 외부 API 호출은 이 파일을 통해서만 이루어짐.
 * 핵심 비즈니스 로직과 Sweetbook SDK를 완전히 분리.
 */
import { SweetbookClient } from 'bookprintapi-nodejs-sdk';
import fs from 'fs/promises';
import path from 'path';

// ── 클라이언트 초기화 (지연 싱글턴) ──────────────────────────────────────────

let _client: InstanceType<typeof SweetbookClient> | null = null;

function getClient(): InstanceType<typeof SweetbookClient> {
  if (!_client) {
    const apiKey = process.env.SWEETBOOK_API_KEY;
    if (!apiKey) throw new SweetbookConfigError('SWEETBOOK_API_KEY 환경변수가 설정되지 않았습니다.');
    _client = new SweetbookClient({
      apiKey,
      environment: (process.env.SWEETBOOK_ENV as 'sandbox' | 'live') ?? 'sandbox',
    });
  }
  return _client;
}

// ── 에러 타입 ────────────────────────────────────────────────────────────────

export class SweetbookConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SweetbookConfigError';
  }
}

export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Sweetbook API 오류가 발생했습니다.';
}

// ── 파일 헬퍼 ────────────────────────────────────────────────────────────────

async function imageUrlToFile(imageUrl: string): Promise<File> {
  const filePath = path.join(process.cwd(), imageUrl);
  const buffer = await fs.readFile(filePath);
  const name = path.basename(filePath);
  const ext = path.extname(name).toLowerCase();
  const type =
    ext === '.png' ? 'image/png'
    : ext === '.gif' ? 'image/gif'
    : ext === '.webp' ? 'image/webp'
    : 'image/jpeg';
  return new File([buffer], name, { type });
}

/** 응답 객체에서 UID를 추출 (SDK 응답 구조 방어적 처리) */
function extractUid(res: unknown, keys: string[]): string {
  if (!res || typeof res !== 'object') throw new Error('빈 응답');
  const obj = res as Record<string, unknown>;
  for (const key of keys) {
    if (typeof obj[key] === 'string' && obj[key]) return obj[key] as string;
    const data = obj['data'];
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (typeof d[key] === 'string' && d[key]) return d[key] as string;
    }
  }
  throw new Error(`응답에서 UID를 찾을 수 없습니다. 키 후보: ${keys.join(', ')}`);
}

// ── 목록 조회 ─────────────────────────────────────────────────────────────────

// ── 직접 REST 호출 헬퍼 ───────────────────────────────────────────────────────

async function sweetbookGet(urlPath: string): Promise<unknown> {
  const apiKey = process.env.SWEETBOOK_API_KEY;
  if (!apiKey) throw new SweetbookConfigError('SWEETBOOK_API_KEY 환경변수가 설정되지 않았습니다.');
  const res = await fetch(`${getSweetbookBaseUrl()}${urlPath}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = (body?.error as Record<string, unknown>)?.message ?? `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function extractList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o['data'])) return o['data'];
    if (Array.isArray(o['items'])) return o['items'];
  }
  return [];
}

function randomUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getSweetbookBaseUrl(): string {
  const env = (process.env.SWEETBOOK_ENV as 'sandbox' | 'live') ?? 'sandbox';
  return env === 'live' ? 'https://api.sweetbook.com/v1' : 'https://api-sandbox.sweetbook.com/v1';
}

/** multipart/form-data POST (커버/본문 생성 시 커스텀 필드명 사용) */
async function sweetbookPostForm(urlPath: string, formData: FormData): Promise<unknown> {
  const apiKey = process.env.SWEETBOOK_API_KEY;
  if (!apiKey) throw new SweetbookConfigError('SWEETBOOK_API_KEY 환경변수가 설정되지 않았습니다.');
  const res = await fetch(`${getSweetbookBaseUrl()}${urlPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Idempotency-Key': randomUuid(),
    },
    body: formData,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const errObj = body?.error as Record<string, unknown> | undefined;
    const msg = errObj?.message ?? `HTTP ${res.status}`;
    console.error('[Sweetbook] postForm error body:', JSON.stringify(body));
    throw new Error(String(msg));
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export interface TemplateTextField {
  key: string;
  label: string;
  required: boolean;
}

interface TemplateSchema {
  fileFields: string[];
  galleryField: string | null;
  textFields: TemplateTextField[];
}

/** 템플릿 파라미터 정의 전체 스키마 조회 */
async function getTemplateSchema(templateUid: string): Promise<TemplateSchema> {
  const raw = await sweetbookGet(`/templates/${templateUid}`) as Record<string, unknown>;
  const data = (raw?.data ?? raw) as Record<string, unknown>;
  const defs = ((data?.parameters as Record<string, unknown>)?.definitions) as
    Record<string, { binding: string; label?: string; required?: boolean }> | undefined;

  console.log(`[Sweetbook] template=${templateUid} raw defs:`, JSON.stringify(defs));

  const fileFields: string[] = [];
  let galleryField: string | null = null;
  const textFields: TemplateTextField[] = [];

  // gallery 관련 binding 타입 목록 (API 버전에 따라 다를 수 있음)
  const GALLERY_BINDINGS = new Set(['rowGallery', 'gallery', 'collage', 'photos', 'multiFile']);

  if (defs) {
    for (const [key, def] of Object.entries(defs)) {
      const binding = def?.binding ?? '';
      if (binding === 'file') {
        fileFields.push(key);
      } else if (GALLERY_BINDINGS.has(binding)) {
        galleryField = key;
      } else if (binding === 'text') {
        textFields.push({ key, label: def.label ?? key, required: def.required ?? false });
      } else if (binding) {
        // 알 수 없는 binding — 파일 업로드 필드로 간주
        console.warn(`[Sweetbook] unknown binding type="${binding}" for key="${key}", treating as file`);
        fileFields.push(key);
      }
    }
  }

  console.log(`[Sweetbook] template=${templateUid} fileFields=${JSON.stringify(fileFields)} galleryField=${galleryField} textFields=${JSON.stringify(textFields.map(t => t.key))}`);
  return { fileFields, galleryField, textFields };
}

/** 템플릿의 텍스트/이미지 파라미터 스키마를 외부에 노출 (선택 UI에서 사용) */
export async function getTemplateParams(templateUid: string): Promise<TemplateTextField[]> {
  const schema = await getTemplateSchema(templateUid);
  return schema.textFields;
}

export async function getTemplateCapabilities(templateUid: string): Promise<{
  textFields: TemplateTextField[];
  supportsImages: boolean;
  imageFieldCount: number;
  usesGallery: boolean;
}> {
  const schema = await getTemplateSchema(templateUid);
  const imageFieldCount = schema.fileFields.length + (schema.galleryField ? 1 : 0);
  return {
    textFields: schema.textFields,
    supportsImages: imageFieldCount > 0,
    imageFieldCount,
    usesGallery: Boolean(schema.galleryField),
  };
}

/** 사용 가능한 책 규격 목록 */
export async function listBookSpecs(): Promise<unknown[]> {
  console.log('[Sweetbook] GET /book-specs');
  const raw = await sweetbookGet('/book-specs') as Record<string, unknown>;
  const list = extractList(raw?.data ?? raw);
  console.log(`[Sweetbook] bookSpecs count=${list.length}`);
  return list;
}

/** 템플릿 목록 (bookSpecUid, templateKind로 필터 가능) */
export async function listTemplates(bookSpecUid?: string, templateKind?: 'cover' | 'content'): Promise<unknown[]> {
  const params = new URLSearchParams();
  if (bookSpecUid) params.set('bookSpecUid', bookSpecUid);
  if (templateKind) params.set('templateKind', templateKind);
  const qs = params.toString() ? `?${params.toString()}` : '';
  console.log(`[Sweetbook] GET /templates${qs}`);
  const raw = await sweetbookGet(`/templates${qs}`) as Record<string, unknown>;
  // 응답 구조: { data: { templates: [...] } }
  const data = raw?.data as Record<string, unknown> | undefined;
  const list = Array.isArray(data?.templates) ? data.templates : extractList(raw);
  console.log(`[Sweetbook] templates count=${list.length}`);
  return list;
}

// ── 빌드 파라미터 타입 ────────────────────────────────────────────────────────

export interface BuildParams {
  title: string;
  imageUrls: string[];
  bookSpecUid: string;
  coverTemplateUid: string;
  contentTemplateUid: string;
}

// ── API 단계별 함수 ──────────────────────────────────────────────────────────

/** 1단계: 책 프로젝트 생성 */
export async function createBook(title: string, bookSpecUid: string): Promise<string> {
  const client = getClient();
  const creationType = 'EBOOK_SYNC';

  console.log(`[Sweetbook] books.create — spec=${bookSpecUid}, type=${creationType}`);
  const res = await client.books.create({ bookSpecUid, title, creationType });
  const bookUid = extractUid(res, ['bookUid', 'uid']);
  console.log(`[Sweetbook] books.create OK — bookUid=${bookUid}`);
  return bookUid;
}

/** 2단계: 사진 일괄 업로드 */
export async function uploadPhotos(bookUid: string, imageUrls: string[]): Promise<void> {
  const client = getClient();
  console.log(`[Sweetbook] photos.upload — bookUid=${bookUid}, count=${imageUrls.length}`);
  for (const imageUrl of imageUrls) {
    const file = await imageUrlToFile(imageUrl);
    await client.photos.upload(bookUid, file);
  }
  console.log('[Sweetbook] photos.upload OK');
}

/** 3단계: 표지 생성 — 템플릿 스키마를 조회해 올바른 이미지/텍스트 필드로 업로드 */
export async function createCover(
  bookUid: string,
  imageUrl: string,
  templateUid: string,
  textParams: Record<string, string> = {}
): Promise<void> {
  console.log(`[Sweetbook] covers.create — bookUid=${bookUid}, template=${templateUid}`);
  const { fileFields } = await getTemplateSchema(templateUid);
  const fieldName = fileFields[0] ?? 'photo';

  const file = await imageUrlToFile(imageUrl);
  const fd = new FormData();
  fd.append('templateUid', templateUid);
  fd.append('parameters', JSON.stringify(textParams));
  fd.append(fieldName, file);

  await sweetbookPostForm(`/Books/${bookUid}/cover`, fd);
  console.log('[Sweetbook] covers.create OK');
}

/** 4단계: 본문 페이지 추가 — 템플릿 스키마를 조회해 올바른 이미지/텍스트 필드로 업로드 */
export async function addContents(
  bookUid: string,
  imageUrls: string[],
  templateUid: string,
  textParams: Record<string, string> = {}
): Promise<void> {
  if (imageUrls.length === 0) return;
  console.log(`[Sweetbook] contents.insert — bookUid=${bookUid}, pages=${imageUrls.length}`);

  const { fileFields, galleryField } = await getTemplateSchema(templateUid);

  if (galleryField) {
    const fd = new FormData();
    fd.append('templateUid', templateUid);
    fd.append('parameters', JSON.stringify(textParams));
    for (const imageUrl of imageUrls) {
      const file = await imageUrlToFile(imageUrl);
      fd.append(galleryField, file);
    }
    await sweetbookPostForm(`/Books/${bookUid}/contents`, fd);
  } else {
    const fieldName = fileFields[0] ?? 'photo';
    for (const imageUrl of imageUrls) {
      const file = await imageUrlToFile(imageUrl);
      const fd = new FormData();
      fd.append('templateUid', templateUid);
      fd.append('parameters', JSON.stringify(textParams));
      fd.append(fieldName, file);
      await sweetbookPostForm(`/Books/${bookUid}/contents`, fd);
    }
  }
  console.log('[Sweetbook] contents.insert OK');
}

/** 5단계: 책 최종화 (비가역적) */
export async function finalizeBook(bookUid: string): Promise<void> {
  console.log(`[Sweetbook] books.finalize — bookUid=${bookUid}`);
  const apiKey = process.env.SWEETBOOK_API_KEY;
  if (!apiKey) throw new SweetbookConfigError('SWEETBOOK_API_KEY 환경변수가 설정되지 않았습니다.');
  const res = await fetch(`${getSweetbookBaseUrl()}/Books/${bookUid}/finalization`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Idempotency-Key': randomUuid(),
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    console.error('[Sweetbook] finalize error body:', JSON.stringify(body));
    const errObj = body?.error as Record<string, unknown> | undefined;
    const msg = errObj?.message ?? (body?.message as string) ?? `HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  console.log('[Sweetbook] books.finalize OK');
}

/** 주문 가격 예상 */
export async function estimateOrder(bookUid: string, quantity: number): Promise<unknown> {
  const client = getClient();
  console.log(`[Sweetbook] orders.estimate — bookUid=${bookUid}, qty=${quantity}`);
  const res = await client.orders.estimate({ items: [{ bookUid, quantity }] });
  console.log('[Sweetbook] orders.estimate OK');
  return res;
}

/** 주문 생성 */
export interface ShippingInfo {
  recipientName: string;
  recipientPhone: string;
  postalCode: string;
  address1: string;
  address2?: string;
  shippingMemo?: string;
  [key: string]: unknown;
}

export async function placeOrder(params: {
  bookUid: string;
  quantity: number;
  shipping: ShippingInfo;
  externalRef?: string;
}): Promise<string> {
  const client = getClient();
  console.log(`[Sweetbook] orders.create — bookUid=${params.bookUid}, qty=${params.quantity}`);
  const res = await client.orders.create({
    items: [{ bookUid: params.bookUid, quantity: params.quantity }],
    shipping: params.shipping,
    externalRef: params.externalRef,
  });
  const orderUid = extractUid(res, ['orderUid', 'uid']);
  console.log(`[Sweetbook] orders.create OK — orderUid=${orderUid}`);
  return orderUid;
}

/** 주문 상태 조회 */
export async function getOrderStatus(orderUid: string): Promise<unknown> {
  const client = getClient();
  console.log(`[Sweetbook] orders.get — orderUid=${orderUid}`);
  return client.orders.get(orderUid);
}
